// ── Capa delgada de voz sobre el agente de /chat ────────────────────────────
//
// A diferencia de /voice (que delega la pregunta al agente vía `ask_agent`),
// esta capa NO le da tools al modelo realtime: la sesión realtime es SOLO un
// canal de voz que controla al agente de Eve que ya corre en /chat.
//
//   STT: el usuario habla → server-vad transcribe → onTranscript(text).
//        El modelo realtime NO responde (autoCancelAfterTranscript cancela la
//        respuesta automática del VAD); la capa escribe el texto en el chat y
//        lo envía al agente, con tool calls visibles en pantalla.
//   TTS: cuando el agente termina su respuesta COMPLETA, la capa llama
//        `speak(text)` y el modelo la lee en voz alta, verbatim (instrucciones
//        de sesión del endpoint chat-token).
//
// El manejo de audio va blindado en try/catch: un fallo del micrófono o del
// playback NUNCA debe crashear el turno (convención del proyecto).
import { GrokVoiceClient, type AecInfo, type AecMode } from "./grok-voice";

export type ChatVoiceCallbacks = {
	/** Transcripción final del usuario (una por frase detectada por el VAD).
	 *  `meta.peakRms` = energía pico del commit que la produjo (el consumidor la
	 *  usa para distinguir voz real de ECO del altavoz — bucle 2026-08-17). */
	onTranscript?: (text: string, meta?: { peakRms?: number }) => void;
	onListeningChange?: (listening: boolean) => void;
	onSpeakingChange?: (speaking: boolean) => void;
	onStatus?: (status: string) => void;
	onError?: (message: string) => void;
	/**
	 * Telemetría durable de la capa de voz (radiografía `voice_events`): eventos
	 * del cliente (vad/mic drops/commits/STT/playback/respuestas). El consumidor
	 * los persiste en lote (POST /api/voice/telemetry). Blindado.
	 */
	onTelemetry?: (ev: { at: string; type: string; data?: Record<string, unknown> }) => void;
	/**
	 * El modo AEC/no-AEC del cliente de voz cambió (Fase B2): detectado en cada
	 * `startMic` (o por el override conductual al degradar en caliente). La UI lo
	 * usa para mostrar el aviso "modo sin cancelación de eco" o el chip de AEC
	 * activo. Blindado: nunca lanza.
	 */
	onAecChange?: (mode: AecMode, aec: AecInfo) => void;
	/**
	 * Inactividad del mic (Fase B3, idle watchdog): tier 1 = aviso "¿Sigues ahí?",
	 * tier 2 = desconexión amable por inactividad. Propagado desde el cliente.
	 */
	onIdle?: (tier: 1 | 2) => void;
};

/** Limpia la respuesta del agente para leerla en voz alta. */
export function normalizeForSpeech(text: string, maxChars = 3000): string {
	try {
		const t = text
			.replace(/```[\s\S]*?```/g, " ")
			.replace(/`([^`]*)`/g, "$1")
			.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
			.replace(/[*_~#>|]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		if (t.length === 0) return "";
		return t.length > maxChars ? `${t.slice(0, maxChars)}…` : t;
	} catch {
		return text.slice(0, 3000);
	}
}

// ── Canal de voz (Canal-Aware Dual-Brain) ───────────────────────────────────
// El agente de texto (DeepSeek) sabe cuándo la voz está activa (vía clientContext)
// y emite al final de su respuesta secciones `**SPEECH:**` (resumen hablado con
// datos exactos) y opcionalmente `**INSIGHT:**` (dato accionable extra). Esta capa
// las parsea y decide QUÉ leer: SPEECH verbatim si existe; si no, respuestas cortas
// completas y largas condensadas (umbral adaptativo). La voz COMPLEMENTA la pantalla.

/** Modo de lectura aplicado por `speakAgentAnswer` (para el chip de la UI). */
export type SpeakMode = 'speech' | 'full' | 'truncated' | 'none';

/** Umbral adaptativo: ≤ este tamaño la respuesta se lee completa; mayor → se condensa. */
export const SPEECH_THRESHOLD_CHARS = 180;

export type VoiceSections = {
	/** Resumen hablado formulado por el agente (SPEECH:). */
	speech?: string;
	/** Dato accionable extra (INSIGHT:), no visible en pantalla. */
	insight?: string;
	/** Texto sin las secciones SPEECH/INSIGHT. */
	rest: string;
};

const VOICE_SECTION = (name: 'SPEECH' | 'INSIGHT') =>
	new RegExp(
		`^\\s*(?:\\*\\*)?${name}:(?:\\*\\*)?\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?(?:SPEECH|INSIGHT):|\\s*$)`,
		'im',
	);

/**
 * Extrae las secciones SPEECH:/INSIGHT: del texto del agente (tolerante a `**SPEECH:**`).
 * El orden del texto original se conserva en `rest` (sin las secciones).
 */
export function extractVoiceSections(text: string): VoiceSections {
	try {
		let speech: string | undefined;
		let insight: string | undefined;
		const rest = text
			.replace(VOICE_SECTION('SPEECH'), (_m, g: string) => {
				speech = g.trim();
				return '';
			})
			.replace(VOICE_SECTION('INSIGHT'), (_m, g: string) => {
				insight = g.trim();
				return '';
			})
			.trim();
		return { speech, insight, rest };
	} catch {
		return { rest: text };
	}
}

/** Condensa texto largo para voz: corta en el primer límite de frase tras `minChars`. */
export function condenseForSpeech(text: string, minChars = 120, maxChars = 220): string {
	try {
		if (text.length <= maxChars) return text;
		const search = text.slice(minChars, maxChars);
		const end = search.search(/[.!?…]\s/);
		if (end !== -1) return text.slice(0, minChars + end + 1).trim();
		return `${text.slice(0, maxChars).trim()}…`;
	} catch {
		return text.slice(0, maxChars);
	}
}

/**
 * Conectores en minúscula típicos de nombres propios en español
 * ("Comercial de Tubos del Bajío", "Poly Películas Impresas"…).
 */
const NAME_CONNECTORS = 'de|del|la|las|los|el|y|e|o|al|a|en';

/**
 * Extrae de una frase narrada (SPEECH) la ENTIDAD CLAVE (nombre propio) que la
 * voz va a decir, para poder resaltarla en el cuerpo visible (coherencia
 * voz = pantalla). Heurística determinista y blindada:
 *  1. Toma todas las secuencias capitalizadas de ≥2 palabras del SPEECH,
 *     generando también SUB-FRASES al quitar palabras iniciales (la voz puede
 *     encadenar un verbo capitalizado: "Encabeza Poly Películas Impresas…" →
 *     la entidad real es "Poly Películas Impresas").
 *  2. Si recibe el `body`, prefiere la candidata MÁS LARGA que aparezca en el
 *     cuerpo (matching tolerante): la voz dice el nombre corto, el cuerpo suele
 *     tener la razón social completa en mayúsculas.
 *  3. Fallback: la candidata más larga con ≥2 palabras.
 */
export function extractNarratedEntity(speech: string, body?: string): string | null {
	try {
		const re = new RegExp(
			`\\b[\\p{Lu}\\p{Lt}][\\p{L}\\p{N}'&-]*(?:\\s+(?:${NAME_CONNECTORS})\\s+[\\p{Lu}\\p{Lt}][\\p{L}\\p{N}'&-]*|\\s+[\\p{Lu}\\p{Lt}][\\p{L}\\p{N}'&-]*)*\\b`,
			// `u` + property escapes: `\p{L}`/`\p{Lu}` cubren vocales acentuadas
			// (Películas, Bajío…) que `\w` NO matchea en este runtime.
			'gu',
		);
		const candidates: string[] = [];
		for (const raw of speech.match(re) ?? []) {
			const words = raw.replace(/[.,;:!?…()"'«»]+$/g, '').trim().split(/\s+/);
			for (let i = 0; i < words.length; i++) {
				const sub = words.slice(i).join(' ');
				if (sub.split(/\s+/).length >= 2) candidates.push(sub);
			}
		}
		if (candidates.length === 0) return null;
		if (body) {
			const bodyKey = normalizeNameKey(body);
			const inBody = candidates.filter((c) => bodyKey.includes(normalizeNameKey(c)));
			if (inBody.length > 0) return inBody.sort((a, b) => b.length - a.length)[0];
		}
		return candidates.sort((a, b) => b.length - a.length)[0];
	} catch {
		return null;
	}
}

/**
 * Normaliza un nombre para MATCHING tolerante: minúsculas, sin acentos, sin
 * puntuación, espacios colapsados. Permite emparejar la entidad que la voz dice
 * ("Poly Películas Impresas") con su forma en tabla/cuerpo, que suele ser la
 * razón social completa en MAYÚSCULAS ("POLY PELICULAS IMPRESAS, S. A. DE C. V.").
 */
export function normalizeNameKey(s: string): string {
	try {
		return s
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	} catch {
		return '';
	}
}

/**
 * Resalta en el cuerpo markdown la entidad que el SPEECH narra (lo que la voz
 * dice == lo que la pantalla resalta):
 *  - En TABLAS: la FILA que contiene la entidad se pone en negrita COMPLETA
 *    (todas sus celdas) — contextualiza el renglón, no solo la celda.
 *  - En PROSA: la entidad se envuelve en `**…**`.
 * El matching es TOLERANTE (normalizeNameKey): la voz puede decir el nombre
 * corto mientras la tabla tiene la razón social completa en mayúsculas.
 * Si el modelo ya la puso en negrita con el texto exacto, NO duplica. Blindada.
 */
export function highlightNarratedEntity(body: string, speech: string): string {
	try {
		const entity = extractNarratedEntity(speech, body);
		if (!entity) return body;
		const key = normalizeNameKey(entity);
		if (!key) return body;
		const has = (text: string) => normalizeNameKey(text).includes(key);
		const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const SEPARATOR = /^\|[\s:]*---+[\s:]*\|/;
		return body
			.split('\n')
			.map((line) => {
				const t = line.trim();
				const isTableRow = t.startsWith('|');
				const isSeparator = SEPARATOR.test(t);
				if (isTableRow && !isSeparator && has(line)) {
					// Fila con la entidad → negrita en TODAS las celdas.
					const cells = line.split('|');
					return cells
						.map((cell, idx) => {
							if (idx === 0 || idx === cells.length - 1) return cell; // bordes vacíos
							const inner = cell.trim().replace(/^\*+|\*+$/g, ''); // quita negrita previa
							return inner ? ` **${inner}** ` : cell;
						})
						.join('|');
				}
				if (!isTableRow && has(line) && !line.includes(`**${entity}**`)) {
					return line.replace(new RegExp(escaped, 'gi'), `**${entity}**`);
				}
				return line;
			})
			.join('\n');
	} catch {
		return body;
	}
}

// ── Cantidades habladas (match voz → número en pantalla) ──────────────────
// La voz dice las cantidades de forma VERBAL/APROXIMADA ("casi diez millones",
// "54 millones", "un poco más de 12 millones", "84") mientras el cuerpo tiene
// el número EXACTO ("$9,868,562", "$53,943,631", "12,000,100", "84"). Estas
// funciones extraen las cantidades del SPEECH (dígitos con/sin magnitud y
// números en PALABRAS en español) y las matchean contra los tokens numéricos
// del cuerpo (exacto o ±2% si la forma hablada es aproximada/redonda).

export type SpokenAmount = {
	/** Valor numérico (normalizado, sin separadores). */
	value: number;
	/** true si la forma hablada es aproximada (prefijo "casi/unos/…" o magnitud redonda "millones"). */
	approx: boolean;
	/** Texto crudo capturado del SPEECH (diagnóstico/UI). */
	raw: string;
};

/** Números en español (palabras) → valor. Cubre unidades, decenas, centenas y medios. */
const ES_NUM: Record<string, number> = {
	cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
	siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
	quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
	veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
	veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
	veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
	ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200,
	trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
	quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
	setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
	novecientos: 900, novecientas: 900,
};

/** Magnitudes en español → multiplicador. */
const ES_MAG: Record<string, number> = { mil: 1000, miles: 1000, millon: 1_000_000, millones: 1_000_000 };

/** Prefijos de aproximación ("casi diez millones", "un poco más de 12 millones", "~42M").
 *  Grupo CAPTURING OPCIONAL (`(...)?`): `m[1]` es el prefijo (o undefined) en ambos
 *  regex de cantidades, `m[2]` el número/palabras y `m[3]` la magnitud. */
const ES_APROX =
	'(casi|unos?|unas?|un poco más de|algo más de|aproximadamente|alrededor de|cerca de|más de|menos de|poco más de|~)?';

/** Token numérico en palabras (una parte de "cincuenta y cuatro", "dos y media", "once"). */
const ES_WORD_PART =
	'(?:cien|ciento|doscient[oa]s|trescient[oa]s|cuatrocient[oa]s|quinient[oa]s|seiscient[oa]s|setecient[oa]s|ochocient[oa]s|novecient[oa]s|veint[iu]n[oa]?|dieciseis|diecisiete|dieciocho|diecinueve|veintidos|veintitres|veinticuatro|veinticinco|veintiseis|veintisiete|veintiocho|veintinueve|cero|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|medio|media)';

/**
 * Normaliza un token numérico del cuerpo ("$12,000,100", "9,868,562", "22,500.00")
 * a su valor numérico (quita $, comas y espacios; el punto se toma como decimal).
 * Devuelve null si no es un número válido. Blindada.
 */
export function normalizeNumeric(s: string): number | null {
	try {
		const t = (s ?? '').replace(/[\s$,]/g, '');
		if (!t || !/^[0-9.]+$/.test(t)) return null;
		const v = Number(t);
		return Number.isFinite(v) ? v : null;
	} catch {
		return null;
	}
}

/** Convierte una secuencia de palabras numéricas ("cincuenta y cuatro", "dos y media") a número. */
function parseSpanishNumber(words: string[]): number | null {
	try {
		let total = 0;
		let acc = 0;
		let frac = 0;
		let saw = false;
		for (const w of words) {
			if (w === 'y') continue;
			const mag = ES_MAG[w];
			if (mag !== undefined) {
				const base = acc === 0 ? 1 : acc;
				total += base * mag;
				acc = 0;
				saw = true;
				continue;
			}
			const n = ES_NUM[w];
			if (n === undefined) return null;
			saw = true;
			if (w === 'media' || w === 'medio') {
				frac += 0.5;
				continue;
			}
			acc += n;
		}
		return saw ? total + acc + frac : null;
	} catch {
		return null;
	}
}

/**
 * Extrae del SPEECH las cantidades que la voz va a decir: dígitos con/sin
 * magnitud ("84", "54 millones", "$22,500") y números en palabras ("diez
 * millones", "once", "cincuenta y cuatro"). Cada una con su valor numérico y
 * si la forma hablada es aproximada (prefijo "casi/un poco más de/…" o
 * magnitud redonda "millones/mil"). Blindada y sin duplicados por valor.
 */
export function extractSpokenAmounts(speech: string): SpokenAmount[] {
	try {
		const amounts: SpokenAmount[] = [];
		const lower = (speech ?? '').toLowerCase();
		if (!lower) return amounts;
		const seen = new Set<number>();
		const push = (value: number, approx: boolean, raw: string): void => {
			if (!Number.isFinite(value)) return;
			const key = Math.round(value);
			if (seen.has(key)) return;
			seen.add(key);
			amounts.push({ value, approx, raw });
		};

		// 1) Dígitos [con magnitud]: "casi 12 millones", "84", "22,500"
		const digitRe = new RegExp(`${ES_APROX}\\s*(\\d[\\d.,]*)\\s*(millones?|miles?|mil)?`, 'gi');
		for (const m of lower.matchAll(digitRe)) {
			const num = normalizeNumeric(m[2] ?? '');
			if (num == null) continue;
			const value = m[3] ? num * (ES_MAG[m[3]] ?? 1) : num;
			// La magnitud redonda hace la cifra inherentemente aproximada (12M ≠ 12,000,100).
			push(value, !!m[1] || !!m[3], m[0].trim());
		}

		// 2) Palabras [con magnitud]: "casi diez millones", "once", "cincuenta y cuatro"
		const wordRe = new RegExp(
			`${ES_APROX}\\s*(${ES_WORD_PART}(?:\\s+y\\s+${ES_WORD_PART})*)\\s*(millones?|miles?|mil)?`,
			'gi',
		);
		for (const m of lower.matchAll(wordRe)) {
			if (/\d/.test(m[2] ?? '')) continue; // ya cubierto por dígitos
			const value = parseSpanishNumber((m[2] ?? '').split(/\s+/));
			if (value == null) continue;
			const final = m[3] ? value * (ES_MAG[m[3]] ?? 1) : value;
			push(final, !!m[1] || !!m[3], m[0].trim());
		}

		return amounts;
	} catch {
		return [];
	}
}

/** ¿La cantidad hablada matchea un token numérico del cuerpo? Exacto o ±2% si es aproximada. */
function amountMatchesToken(a: SpokenAmount, tokenValue: number): boolean {
	if (a.approx) {
		const tol = Math.max(a.value * 0.02, 1);
		return Math.abs(a.value - tokenValue) <= tol;
	}
	return Math.abs(a.value - tokenValue) < 1e-6;
}

/**
 * true si `text` (textContent de un elemento de la UI) contiene un token
 * numérico que matchea alguna cantidad hablada (para el flash sincronizado).
 * Ignora tokens con leading zeros (códigos tipo "PP-0084" → "0084").
 */
export function textContainsAmount(text: string, amounts: SpokenAmount[]): boolean {
	try {
		if (!amounts.length) return false;
		for (const m of (text ?? '').matchAll(/\$?\s*\d[\d.,]*/g)) {
			const raw = m[0].trim();
			const num = normalizeNumeric(raw);
			if (num == null) continue;
			if (/^0\d/.test(raw.replace(/[\s$,]/g, ''))) continue; // código, no cantidad
			if (amounts.some((a) => amountMatchesToken(a, num))) return true;
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Resalta en el cuerpo las CANTIDADES que el SPEECH narra (lo que la voz dice
 * == lo que la pantalla resalta). Matchea el valor hablado (exacto o ±2% si la
 * forma es aproximada/redonda) contra los tokens numéricos del cuerpo y los
 * envuelve en `**…**` (prosa Y celdas de tabla). Complementa a
 * `highlightNarratedEntity` (entidad nombrada). Blindada.
 */
export function highlightSpokenAmounts(body: string, speech: string): string {
	try {
		const amounts = extractSpokenAmounts(speech);
		if (!amounts.length) return body;
		const used = new Set<number>();
		return body
			.split('\n')
			.map((line) => {
				const tokens = Array.from(line.matchAll(/\$?\s*\d[\d.,]*/g)).reverse();
				for (const m of tokens) {
					const raw = m[0].trim();
					const num = normalizeNumeric(raw);
					if (num == null) continue;
					if (/^0\d/.test(raw.replace(/[\s$,]/g, ''))) continue; // código, no cantidad
					// ¿ya en negrita (el modelo o la entidad la marcaron)?
					const start = m.index ?? 0;
					if (line.slice(start, start + 2) === '**') continue;
					const before = line.slice(Math.max(0, start - 2), start);
					if (before === '**') continue;
					const hit = amounts.find((a) => !used.has(Math.round(a.value)) && amountMatchesToken(a, num));
					if (!hit) continue;
					used.add(Math.round(hit.value));
					// Envuelve el token recortando espacios y puntuación de cierre (".",",")
					// para que el `**` quede pegado al número:
					//   "de 12,000,100 pesos" → "de **12,000,100** pesos"
					//   "$53,943,631."       → "$**53,943,631**."
					let wrapped = m[0].trim();
					if (/[.,]$/.test(wrapped)) wrapped = wrapped.slice(0, -1);
					if (!wrapped) continue;
					const offset = Math.max(0, m[0].indexOf(wrapped));
					const wStart = start + offset;
					line = line.slice(0, wStart) + '**' + wrapped + '**' + line.slice(wStart + wrapped.length);
				}
				return line;
			})
			.join('\n');
	} catch {
		return body;
	}
}

/** Preámbulos de voz mientras el agente trabaja (eliminan el silencio muerto). */
const PREAMBLES = ['Déjame revisarlo…', 'Un momento…', 'Déjame consultarlo…'];

export class ChatVoiceLayer {
	private client: GrokVoiceClient | null = null;
	private callbacks: ChatVoiceCallbacks;
	private _listening = false;
	private _speaking = false;
	private preambleIndex = 0;

	constructor(callbacks: ChatVoiceCallbacks = {}) {
		this.callbacks = callbacks;
	}

	get connected(): boolean {
		return !!this.client?.connected;
	}

	get listening(): boolean {
		return this._listening;
	}

	get speaking(): boolean {
		return this._speaking;
	}

	/** Abre (o reabre) la sesión realtime con la config STT/TTS de chat-token. */
	async connect(): Promise<void> {
		try {
			await this.disconnect();
			const client = new GrokVoiceClient(
				{
					onStatus: (s) => this.callbacks.onStatus?.(s),
					onUserTranscript: (t, meta) => this.callbacks.onTranscript?.(t, meta),
					onListeningChange: (l) => {
						this._listening = l;
						this.callbacks.onListeningChange?.(l);
					},
					onPlayingChange: (p) => {
						this._speaking = p;
						this.callbacks.onSpeakingChange?.(p);
					},
					onError: (e) => this.callbacks.onError?.(e),
					onTelemetry: (ev) => this.callbacks.onTelemetry?.(ev),
					onModeChange: (mode, aec) => this.callbacks.onAecChange?.(mode, aec),
					onIdle: (tier) => this.callbacks.onIdle?.(tier),
				},
				{ autoCancelAfterTranscript: true, tokenUrl: "/api/realtime/chat-token" },
			);
			this.client = client;
			await client.connect();
		} catch (err) {
			this.client = null;
			this.callbacks.onError?.(err instanceof Error ? err.message : String(err));
			throw err;
		}
	}

	/** Abre el micrófono y deja que el VAD del servidor detecte el fin de frase. */
	async startListening(): Promise<void> {
		const client = this.client;
		if (!client?.connected) return;
		try {
			await client.startMic();
		} catch {
			/* el error ya se reportó vía onError */
		}
	}

	stopListening(): void {
		try {
			this.client?.stopMic();
		} catch {
			/* noop */
		}
	}

	/** Lee la respuesta COMPLETA del agente en voz alta (verbatim). */
	speak(text: string): void {
		const client = this.client;
		if (!client?.connected) return;
		const clean = normalizeForSpeech(text);
		if (!clean) return;
		try {
			client.speak(clean);
		} catch (err) {
			this.callbacks.onError?.(`hablar: ${String(err)}`);
		}
	}

	/**
	 * Filler hablado mientras el agente piensa/consulta el ERP (elimina el
	 * silencio muerto entre la pregunta por voz y la respuesta). Rotativo.
	 */
	speakPreamble(): void {
		const client = this.client;
		if (!client?.connected) return;
		try {
			client.speak(PREAMBLES[this.preambleIndex++ % PREAMBLES.length]);
		} catch (err) {
			this.callbacks.onError?.(`hablar: ${String(err)}`);
		}
	}

	/** Narra una fase del agente (skill/twin/ERP) en voz alta, encolada tras el filler. */
	speakNarration(text: string, options?: { instructions?: string }): void {
		const client = this.client;
		if (!client?.connected) return;
		const clean = normalizeForSpeech(text);
		if (!clean) return;
		try {
			client.speak(clean, options);
		} catch (err) {
			this.callbacks.onError?.(`hablar: ${String(err)}`);
		}
	}

	/** Descarta las utterances pendientes (barge-in: el usuario interrumpió). */
	clearSpokenQueue(): void {
		try {
			this.client?.clearSpokenQueue();
		} catch {
			/* noop */
		}
	}

	/** Corta el audio en reproducción y descarta el encolado (la respuesta manda). */
	cutPlayback(): void {
		try {
			this.client?.cutPlayback();
		} catch {
			/* noop */
		}
	}

	/**
	 * Rearma el idle watchdog del cliente (actividad del usuario). La UI lo llama
	 * mientras el AGENTE de /chat trabaja (isBusy): en turnos largos de DeepSeek
	 * el mic queda en silencio pero el usuario NO está ausente — sin este rearmado
	 * el watchdog apagaba la voz a los 90s y se perdía la siguiente pregunta
	 * (validado en el E2E de conversación larga 2026-08-17).
	 */
	noteActivity(): void {
		try {
			this.client?.noteActivity();
		} catch {
			/* noop */
		}
	}

	/**
	 * Lee la respuesta del agente por el canal de voz (Canal-Aware Dual-Brain):
	 *  - Si el agente emitió `SPEECH:` → se lee verbatim (resumen con datos exactos).
	 *  - Si hay `INSIGHT:` → se lee después como nota (dato accionable extra).
	 *  - Sin SPEECH: respuestas cortas (≤ umbral) se leen completas; largas se condensan.
	 * Devuelve el modo aplicado (para el chip de estado de la UI).
	 */
	speakAgentAnswer(text: string): SpeakMode {
		const client = this.client;
		if (!client?.connected) return 'none';
		const { speech, insight, rest } = extractVoiceSections(text);
		if (speech) {
			const spoken = [speech, insight ? `Nota: ${insight}` : ''].filter(Boolean).join(' ');
			// Cap defensivo: si el resumen del agente salió largo, se condensa a 1-2 frases.
			let clean = normalizeForSpeech(spoken);
			if (!clean) return 'none';
			if (clean.length > 260) clean = condenseForSpeech(clean, 120, 240);
			try {
				// `narrate: true`: el cliente emite narrate:start/end para que la UI
				// PRENDA el resaltado de la entidad mientras la voz la narra.
				client.speak(clean, { narrate: true });
				return 'speech';
			} catch (err) {
				this.callbacks.onError?.(`hablar: ${String(err)}`);
				return 'none';
			}
		}
		const clean = normalizeForSpeech(rest || text);
		if (!clean) {
			// Respuesta vacía salvo secciones: leer el insight como último recurso.
			if (insight) {
				const ci = normalizeForSpeech(insight);
				if (!ci) return 'none';
				try {
					client.speak(ci);
					return 'full';
			} catch (err) {
					this.callbacks.onError?.(`hablar: ${String(err)}`);
					return 'none';
			}
			}
			return 'none';
		}
		if (clean.length <= SPEECH_THRESHOLD_CHARS) {
			const full = insight ? `${clean} ${insight}` : clean;
			try {
				client.speak(full);
				return 'full';
			} catch (err) {
				this.callbacks.onError?.(`hablar: ${String(err)}`);
				return 'none';
			}
		}
		const condensed = condenseForSpeech(clean);
		if (!condensed) return 'none';
		try {
			client.speak(condensed);
			return 'truncated';
		} catch (err) {
			this.callbacks.onError?.(`hablar: ${String(err)}`);
			return 'none';
		}
	}

	disconnect(): void {
		try {
			this.client?.disconnect();
		} catch {
			/* noop */
		}
		this.client = null;
		this._listening = false;
		this._speaking = false;
		this.callbacks.onListeningChange?.(false);
		this.callbacks.onSpeakingChange?.(false);
	}
}
