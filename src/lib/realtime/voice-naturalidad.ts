// ── Naturalidad conversacional: anti-eco de la pregunta + anti-duplicados ──
// 2026-08-18 (psicología de conversación, análisis de la sesión de 20 turnos):
// el cerebro narraba frases que PARAFRASEABAN la pregunta del usuario
// ("Buscando el inventario del chícharo mitad…" justo después de preguntar por
// el chícharo mitad) y 2 narraciones casi idénticas en el mismo turno
// ("Buscando el inventario del chícharo mitad…" + "Consulto las existencias
// del chícharo mitad por almacén…"). Un asistente humano NO repite lo que el
// usuario acaba de decir — narra la ACCIÓN del módulo, no el objeto de la
// pregunta. Estas heurísticas deterministas permiten a la capa de voz DESCARTAR
// las narraciones del modelo que violan esa regla (el modelo es la fuente, la
// capa es el filtro de naturalidad).
//
// Módulo PURO (cero dependencias, sin imports de grok-voice): testable en Node
// con el ts-hook del repo (probe-narration-naturalidad.ts). chat-voice.ts lo
// reexporta para el consumidor (ChatSession.svelte).

/** Normaliza para comparación léxica: minúsculas, sin acentos, sin puntuación. */
export function normCompare(s: string): string {
	try {
		return s
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	} catch {
		return "";
	}
}

/** Palabras sin valor informativo: no cuentan como "eco" de la pregunta. */
const NARRATION_STOPWORDS = new Set([
	"de", "del", "la", "las", "los", "el", "un", "una", "unos", "unas", "y", "o", "u",
	"a", "en", "por", "para", "con", "que", "es", "son", "hay", "tiene", "tienen",
	"cuanto", "cuanta", "cuantos", "cuantas", "cual", "cuales", "como", "me", "te",
	"se", "su", "sus", "al", "lo", "le", "les", "esta", "este", "estas", "esto",
	"muy", "ya", "no", "si", "mas", "menos", "ser", "estan", "quien", "cuando",
	"donde", "asi", "ahora", "tambien", "hace", "hacen", "ver", "voy", "vamos",
]);

/** Tokens significativos (sin stopwords) de una frase. */
export function significantTokens(s: string): string[] {
	return normCompare(s)
		.split(" ")
		.filter((w) => w && !NARRATION_STOPWORDS.has(w));
}

/** Verbos de narración de progreso: el verbo NO indica duplicado (la acción puede cambiar; el OBJETO es la señal). */
const NARRATION_ACTION_VERBS = new Set([
	"buscando", "buscar", "busco", "consulto", "consultando", "consulta", "reviso",
	"revisando", "revisar", "contando", "cuento", "sumo", "sumando", "sumar",
	"calculando", "calculo", "verifico", "verificando", "cruzo", "cruzando",
	"identifico", "identificando", "revisa", "revisan", "revisemos",
]);

/**
 * ¿La narración del cerebro es un ECO de la pregunta que el usuario acaba de
 * hacer? (la misma acción con los mismos términos). P. ej. usuario: "¿cuánto
 * inventario tiene el chícharo mitad?" → narración: "Buscando el inventario
 * del chícharo mitad…". Heurística: ≥60% de los tokens significativos de la
 * narración están en la pregunta → el usuario la acaba de decir → NO se habla.
 */
export function narrationEchoesQuestion(narration: string, question: string): boolean {
	try {
		const q = significantTokens(question);
		const n = significantTokens(narration);
		if (!q.length || !n.length || n.length < 2) return false;
		const overlap = n.filter((t) => q.includes(t)).length;
		return overlap / n.length >= 0.6;
	} catch {
		return false;
	}
}

/**
 * ¿Dos narraciones son casi la misma (duplicado)? P. ej. "Buscando el
 * inventario del chícharo mitad…" vs "Consulto las existencias del chícharo
 * mitad por almacén…". La señal NO es el verbo (puede cambiar: buscar/consultar/
 * sumar) sino el OBJETO: se quitan los verbos de narración y se compara el
 * solape del resto. Si la más corta (sin verbos) tiene ≥2 tokens y el solape
 * ≥50% → la 2ª repite el objeto de la 1ª → NO se habla (evita la cacofonía de
 * 2-3 narraciones por turno).
 */
export function isNearDuplicateNarration(a: string, b: string): boolean {
	try {
		const ta = significantTokens(a).filter((t) => !NARRATION_ACTION_VERBS.has(t));
		const tb = significantTokens(b).filter((t) => !NARRATION_ACTION_VERBS.has(t));
		if (!ta.length || !tb.length) return false;
		const shorter = ta.length <= tb.length ? ta : tb;
		const longer = ta.length <= tb.length ? tb : ta;
		if (shorter.length < 2) return false;
		const overlap = shorter.filter((t) => longer.includes(t)).length;
		return overlap / shorter.length >= 0.5;
	} catch {
		return false;
	}
}
