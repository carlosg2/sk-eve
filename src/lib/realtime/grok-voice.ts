// Cliente de la sesión realtime de voz (Grok Voice Think Fast 2.0) contra el
// AI Gateway de Vercel, ejecutado en el navegador.
//
// El Gateway habla el PROTOCOLO NORMALIZADO del AI SDK (eventos kebab-case:
// `session-update`, `input-audio-append`, `audio-delta`…), no el protocolo
// crudo de OpenAI — ver `gateway-realtime-model.ts` en @ai-sdk/gateway.
//
// Flujo:
//   1. POST /api/realtime/token  → { token, url, sessionConfig }
//   2. `model.getWebSocketConfig({token, url})` → url + subprotocolos
//   3. `session-update` con la config (instrucciones, voz, VAD, formatos)
//   4. Micrófono (AudioWorklet) → PCM16 24k mono → base64 → `input-audio-append`
//   5. Servidor → `audio-delta` → PCM16 → cola de playback sin cortes
//
// TODO el manejo de audio va envuelto en try/catch: un fallo del micrófono o
// de playback NUNCA debe crashear el turno (convención del proyecto).
//
// Refactor 2026-08-14 (investigación de patrones realtime + AI SDK):
//   - Se usa el MODELO realtime del AI SDK (`gateway.experimental_realtime`) en
//     lugar de helpers sueltos + parse manual. `getWebSocketConfig()` devuelve
//     url+protocols (envuelve getGatewayRealtimeProtocols), `parseServerEvent()`
//     normaliza a eventos TIPADOS y `serializeClientEvent()` produce el payload
//     correcto por provider (gateway hoy; xAI nativo mañana sin tocar el cliente).
//   - El micrófono migra de ScriptProcessorNode (deprecado) a AudioWorkletNode
//     con un batcher de 4096 muestras (~171ms @24kHz), patrón de arabclue-platform
//     y del propio AI SDK. El worklet corre fuera del hilo principal.
import {
	experimental_decodeRealtimeAudio,
	experimental_encodeRealtimeAudio,
	experimental_resampleAudio,
	type Experimental_RealtimeModel as RealtimeModel,
	type Experimental_RealtimeClientEvent as RealtimeClientEvent,
	type Experimental_RealtimeServerEvent as RealtimeServerEvent,
	type Experimental_RealtimeSessionConfig as RealtimeSessionConfig,
} from "ai";
import { gateway } from "@ai-sdk/gateway";

export const REALTIME_MODEL = "xai/grok-voice-think-fast-2.0";

/** Sample rate del protocolo (PCM16 mono). */
const TARGET_RATE = 24000;

/** Umbral RMS (0-1 sobre PCM Float32): por debajo es silencio. */
const VOICE_RMS_THRESHOLD = 0.012;
/** Silencio requerido tras hablar para considerar fin de frase (no corta prematuramente). */
const VOICE_SILENCE_MS = 1200;
/** Umbral RMS para barge-in REAL: el usuario hablando MUY fuerte encima del audio del asistente. */
const VOICE_BARGE_IN_RMS = 0.08;
/** Cooldown tras terminar un playback: no commitear el residuo del asistente como habla del usuario. */
const VOICE_PLAYBACK_COOLDOWN_MS = 1500;
/** Piso de RMS para commits tras hablar el asistente: por debajo es ECO del
 *  altavoz (evidencia 2026-08-17: ecos de 0.022/0.032 vs voz real 0.125/0.143),
 *  no voz real del usuario. */
const VOICE_ECHO_RMS_FLOOR = 0.045;
/** Ventana tras el último audio del asistente en la que se aplica el piso de eco. */
const VOICE_ECHO_WINDOW_MS = 6000;

/** Nombre del processor de AudioWorklet registrado. */
const WORKLET_NAME = "sk-eve-pcm-capture";

/** ~171ms por chunk a 24kHz (mismo batch del SDK y arabclue). */
const CAPTURE_BATCH_SAMPLES = 4096;

/** Source del processor de captura (se registra vía Blob → URL). */
const WORKLET_SOURCE = `
class SkEvePcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      // Copia — el AudioWorklet reutiliza el buffer subyacente entre callbacks.
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', SkEvePcmCaptureProcessor);
`;

let workletModuleUrl: string | null = null;

function getWorkletModuleUrl(): string {
	if (!workletModuleUrl) {
		const blob = new Blob([WORKLET_SOURCE], { type: "application/javascript" });
		workletModuleUrl = URL.createObjectURL(blob);
	}
	return workletModuleUrl;
}

/**
 * Acumula muestras Float32 y emite batches del tamaño exacto del protocolo
 * (4096 = ~171ms @24kHz). Copia del RealtimePcmBatcher de arabclue-platform.
 */
class RealtimePcmBatcher {
	private readonly batchSamples: number;
	private pending = new Float32Array(0);

	constructor(batchSamples = CAPTURE_BATCH_SAMPLES) {
		this.batchSamples = batchSamples;
	}

	push(samples: Float32Array): Float32Array[] {
		if (samples.length === 0) return [];
		const batches: Float32Array[] = [];
		let offset = 0;

		if (this.pending.length > 0) {
			const needed = this.batchSamples - this.pending.length;
			if (samples.length < needed) {
				const next = new Float32Array(this.pending.length + samples.length);
				next.set(this.pending);
				next.set(samples, this.pending.length);
				this.pending = next;
				return batches;
			}
			const batch = new Float32Array(this.batchSamples);
			batch.set(this.pending);
			batch.set(samples.subarray(0, needed), this.pending.length);
			batches.push(batch);
			this.pending = new Float32Array(0);
			offset = needed;
		}

		while (offset + this.batchSamples <= samples.length) {
			batches.push(samples.slice(offset, offset + this.batchSamples));
			offset += this.batchSamples;
		}
		if (offset < samples.length) {
			this.pending = samples.slice(offset);
		}
		return batches;
	}

	reset(): void {
		this.pending = new Float32Array(0);
	}
}

export type GrokVoiceCallbacks = {
	onStatus?: (status: string) => void;
	/** Transcripción final del usuario. `meta.peakRms` = energía pico del commit
	 *  que la produjo (el consumidor la usa para distinguir voz real de ECO). */
	onUserTranscript?: (text: string, meta?: { peakRms?: number }) => void;
	/**
	 * Texto del asistente. `delta` = fragmento en streaming (se anexa al
	 * segmento actual); `done` = transcript final del item (reemplaza el
	 * segmento para evitar duplicar cuando el servidor re-emite el texto
	 * completo tras los deltas).
	 */
	onAssistantTranscript?: (text: string, kind: "delta" | "done") => void;
	onError?: (message: string) => void;
	onListeningChange?: (listening: boolean) => void;
	onPlayingChange?: (playing: boolean) => void;
	/** El modelo está generando una respuesta (incluye ejecución de tools). */
	onRespondingChange?: (responding: boolean) => void;
	/** Ejecuta un tool call declarado en `tools` de la sesión. */
	onToolCall?: (call: { callId: string; name: string; arguments: string }) => Promise<unknown> | unknown;
	/**
	 * Telemetría durable de la capa de voz (radiografía): eventos estructurados
	 * de conexión/mic/drops/vad/commits/STT/playback/respuestas. El consumidor
	 * los persiste (POST /api/voice/telemetry → tabla `voice_events`). El
	 * diagnóstico de "dijo algo por voz y no se registró" ocurre client-side y
	 * el espejo de Eve no tiene rastro — esta es la única evidencia durable.
	 * Blindado: nunca lanza.
	 */
	onTelemetry?: (ev: { at: string; type: string; data?: Record<string, unknown> }) => void;
};

type TokenResponse = {
	token: string;
	url: string;
	expiresAt?: number;
	sessionConfig?: Partial<RealtimeSessionConfig>;
};

export class GrokVoiceClient {
	private ws: WebSocket | null = null;
	private connecting = false;
	private _responding = false;
	// Cola de tool calls: el modelo puede emitir VARIOS function-call en una
	// respuesta. Cada output se envía al completar, pero la respuesta de
	// continuación solo se pide cuando TODOS tienen output y la respuesta con
	// tools cerró (response-done) — mismo patrón que el AI SDK.
	private pendingToolOutputs = new Set<string>();
	private toolCallsClosed = false;
	private callbacks: GrokVoiceCallbacks;
	private sessionConfig: Partial<RealtimeSessionConfig> | null = null;
	/** Modelo realtime del AI SDK (gateway): codec y tipos de eventos. */
	private model: RealtimeModel | null = null;
	/**
	 * Modo "capa delgada": tras cada transcripción de entrada se cancela la
	 * respuesta automática (el modelo solo transcribe; la respuesta la genera
	 * el agente de /chat). Lo usa ChatVoiceLayer, no la página /voice.
	 */
	private autoCancelAfterTranscript = false;
	/** Endpoint que minta el client-secret (default: delegación de /voice). */
	private tokenUrl = "/api/realtime/token";

	// Cola de utterances habladas (filler → narración → respuesta). El modelo
	// realtime procesa UNA respuesta a la vez; sin serializar, los
	// `response-create` se encolan/reordenan en el provider y suenan TODOS
	// juntos al final (bug observado: el "Déjame revisarlo…" se escuchaba
	// pegado a la respuesta). Cada utterance espera a que la anterior cierre
	// (`response-done`) antes de enviarse.
	// Cada utterance puede llevar `instructions` opcionales (contexto/tono para
	// ESA respuesta — el protocolo normalizado soporta `response-create.options.instructions`).
	// `narrate: true` = esta utterance es la NARRACIÓN del SPEECH (la voz dice la
	// entidad) → el cliente emite `narrate:start` al reproducirla y `narrate:end`
	// al terminar, para que la UI PRENDA el resaltado mientras se narra.
	private speakQueue: Array<{ text: string; instructions?: string; narrate?: boolean }> = [];
	private speaking = false;
	private lastResponseAt = 0;
	// true desde que la utterance narrada del SPEECH entra en playback hasta que
	// su audio termina (activeSources vuelve a 0) o se corta (barge-in / cut).
	private narrateInFlight = false;

	// VAD cliente (capa delgada, push-to-talk natural). Con `turnDetection: disabled`
	// en la sesión, el modelo NUNCA responde solo (cero eco de la pregunta); la capa
	// detecta el fin de frase por energía RMS y hace el commit manual que dispara la
	// transcripción. `_playing` = la voz del asistente está sonando (el mic la capta
	// por el altavoz → no debe contar como habla del usuario, y si el usuario habla
	// mientras suena, es un barge-in que corta la voz).
	private vadSpeaking = false;
	private vadLastVoiceAt = 0;
	// Para diagnosticar commits sin STT: inicio de la frase y pico RMS alcanzado
	// (un commit con speechDurationMs ~0 / peakRms bajo = el buffer no tenía voz
	// real → el gateway puede no emitir input-transcription-completed).
	private vadSpeechStartAt = 0;
	private vadPeakRms = 0;
	private _playing = false;
	private lastVadLog = 0;
	// true desde que la capa pide UNA respuesta (drainSpeakQueue) hasta que el
	// modelo la crea; cualquier response-created con expectResponse=false es una
	// respuesta AUTOMÁTICA no pedida (eco) → se cancela al instante.
	private expectResponse = false;
	// Momento en que la capa pidió UNA respuesta propia (drainSpeakQueue).
	// Guard anti-colisión: si pedimos una utterance hace poco (<3s) o tenemos
	// una en vuelo, NUNCA auto-cancelar un response-created — un commit fantasma
	// (ruido de bajo RMS) puede crear un eco cuya response-created colisiona con
	// la de NUESTRA respuesta y, si la cancelamos, la respuesta NUNCA suena
	// (observado 2026-08-17: speak_answer mode:speech + resp_auto_cancel → sin
	// audio de la respuesta final).
	private lastRequestedResponseAt = 0;
	// momento en que terminó el último playback del asistente (cooldown del VAD).
	private lastPlaybackEndAt = 0;
	// Último momento en que el asistente EMITIÓ audio (play_start/play_end):
	// ancla del gate anti-eco (un commit de bajo RMS poco después es el eco de
	// su propia voz por el altavoz — bucle observado 2026-08-17).
	private lastAssistantSpeakAt = 0;
	// Peak RMS del ÚLTIMO commit (se propaga en onUserTranscript para que el
	// consumidor distinga eco de voz real al decidir sobre la transcripción).
	private lastCommitPeakRms = 0;
	// Throttle de telemetría `mic_drop` (solo si hay voz real, máx 1 por 1.5s).
	private lastMicDropTelAt = 0;
	// Watchdog del commit + RECUPERACIÓN: si el servidor NO devuelve
	// `input-transcription-completed` tras un `input-audio-commit` (fallo
	// observado 2026-08-17: tras la 1ª transcripción de la sesión, el STT del
	// AI Gateway deja de responder a los commits — 4 commits con voz real de 6-7s
	// sin transcripción), se reintenta y, si falla, se avisa al usuario y se
	// re-conecta la sesión realtime (sesión nueva = STT del gateway fresco; el
	// chat del agente NO se pierde porque es otra capa).
	private commitWatchdog: ReturnType<typeof setTimeout> | null = null;
	private lastCommitAt = 0;
	// Buffer del audio de la frase EN CURSO (base64 PCM ya enviado) para poder
	// RE-APPEND + RE-COMMIT si el buffer del servidor se perdió. Cap ~12s.
	private utteranceChunks: string[] = [];
	private utteranceBytes = 0;
	private readonly UTT_MAX_BYTES = 12 * 24000 * 2; // ~12s PCM16
	private readonly COMMIT_RETRY_MS = 5000;
	// Re-conexión automática tras rendirse (máx por ciclo de conexión del usuario).
	private recoveryCount = 0;
	private readonly MAX_RECOVERIES = 2;
	private recovering = false;
	// Reciclaje PROACTIVO (prevención): el STT del gateway muere tras la 1ª
	// transcripción de la sesión (patrón observado), así que se re-conecta la
	// sesión realtime al terminar de hablar el asistente — cada pregunta arranca
	// en una sesión NUEVA donde la 1ª commit siempre funciona. El usuario NUNCA
	// repite: simplemente sigue hablando.
	private recycledSinceTranscript = false;
	private recycleTimer: ReturnType<typeof setTimeout> | null = null;

	// Captura (micrófono, AudioWorklet)
	private stream: MediaStream | null = null;
	private captureCtx: AudioContext | null = null;
	private captureSource: MediaStreamAudioSourceNode | null = null;
	private captureWorklet: AudioWorkletNode | null = null;
	private captureBatcher = new RealtimePcmBatcher();

	// Playback
	private playbackCtx: AudioContext | null = null;
	private nextPlaybackTime = 0;
	private activeSources = 0;

	// itemId del último item que emitió transcript de AUDIO: si un item tiene
	// transcript de audio, ignoramos su canal de texto (evita duplicados).
	private lastAudioItemId: string | null = null;

	constructor(
		callbacks: GrokVoiceCallbacks = {},
		options: { autoCancelAfterTranscript?: boolean; tokenUrl?: string } = {},
	) {
		this.callbacks = callbacks;
		this.autoCancelAfterTranscript = options.autoCancelAfterTranscript ?? false;
		this.tokenUrl = options.tokenUrl ?? "/api/realtime/token";
	}

	/** Emite un evento de telemetría durable si el consumidor lo registró. Blindado. */
	private tel(type: string, data?: Record<string, unknown>): void {
		try {
			this.callbacks.onTelemetry?.({ at: new Date().toISOString(), type, data });
		} catch {
			/* noop */
		}
	}

	/**
	 * Telemetría de audio descartado por el gate anti-eco: si el usuario estaba
	 * HABLANDO (RMS ≥ umbral) mientras sonaba el asistente o en la ventana de
	 * cooldown, su voz se pierde en silencio (trade-off documentado sin AEC).
	 * Se registra con throttling (1 por 1.5s) para no inundar la radiografía.
	 */
	private telMicDrop(reason: "playing" | "cooldown", samples: Float32Array): void {
		try {
			const now = Date.now();
			if (now - this.lastMicDropTelAt < 1500) return;
			let sum = 0;
			for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
			const rms = Math.sqrt(sum / samples.length);
			if (rms < VOICE_RMS_THRESHOLD) return;
			this.lastMicDropTelAt = now;
			this.tel("mic_drop", {
				reason,
				rms: Number(rms.toFixed(4)),
				sincePlaybackEndMs: now - this.lastPlaybackEndAt,
			});
		} catch {
			/* noop */
		}
	}

	get connected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	/** Stream del micrófono activo (para visualizadores de audio reales). */
	get micStream(): MediaStream | null {
		return this.stream;
	}

	/** true mientras el modelo genera una respuesta (response-created → response-done). */
	get responding(): boolean {
		return this._responding;
	}

	// ── Ciclo de vida ────────────────────────────────────────────────────

	async connect(): Promise<void> {
		if (this.connecting) return;
		// Solo un connect del USUARIO (no la auto-recuperación) renueva el
		// presupuesto de re-conexiones.
		if (!this.recovering) this.recoveryCount = 0;
		this.connecting = true;
		try {
			this.callbacks.onStatus?.("obteniendo token…");
			const res = await fetch(this.tokenUrl, { method: "POST" });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(body.error ?? `HTTP ${res.status}`);
			}
			const { token, url, sessionConfig } = (await res.json()) as TokenResponse;
			this.sessionConfig = sessionConfig ?? null;
			// Modelo realtime del AI SDK: codec de eventos y sesión del provider.
			// Para el gateway es identity (eventos ya normalizados); si mañana
			// apuntamos a xAI nativo, el mismo modelo traduce el wire protocol.
			this.model = gateway.experimental_realtime(REALTIME_MODEL);

			this.callbacks.onStatus?.("conectando…");
			const wsConfig = this.model.getWebSocketConfig({ token, url });
			await new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsConfig.url, wsConfig.protocols);
				this.ws = ws;
				// GUARD DE IDENTIDAD: los handlers de un WebSocket VIEJO (p. ej. el
				// cerrado por un recycle/reconnect) pueden dispararse DESPUÉS de
				// asignar el socket NUEVO (el evento `close` se entrega asíncrono y
				// con delay si el socket tenía audio en buffer). Sin este guard, el
				// `onclose` del socket viejo hacía `this.ws = null` incondicional y
				// mataba la conexión nueva → al llegar la respuesta del agente,
				// `client.connected` era false → `speakAgentAnswer` devolvía 'none'
				// → la respuesta NUNCA se leía en voz (síntoma observado 2026-08-17:
				// `speak_answer mode:none` tras cada recycle, con SPEECH presente).
				const isCurrent = () => this.ws === ws;
				ws.onopen = () => {
					if (!isCurrent()) return;
					this.tel("ws_open");
					this.callbacks.onStatus?.("sesión abierta");
					this.sendSessionUpdate();
					resolve();
				};
				ws.onmessage = (ev) => {
					if (!isCurrent()) return;
					try {
						this.handleMessage(ev.data);
					} catch (err) {
						this.callbacks.onError?.(`evento: ${String(err)}`);
						this.tel("event_error", { message: String(err) });
					}
				};
				ws.onerror = () => {
					if (!isCurrent()) return;
					this.tel("ws_error");
					this.callbacks.onError?.("error de WebSocket");
					reject(new Error("WebSocket error"));
				};
				ws.onclose = () => {
					if (!isCurrent()) return;
					this.tel("ws_close");
					this.ws = null;
					this.connecting = false;
					this.stopMic();
					this.callbacks.onStatus?.("desconectado");
				};
			});
		} catch (err) {
			this.connecting = false;
			this.tel("connect_error", { message: err instanceof Error ? err.message : String(err) });
			this.callbacks.onError?.(err instanceof Error ? err.message : String(err));
			throw err;
		}
	}

	disconnect(): void {
		this.stopMic();
		this.stopPlayback();
		this.speakQueue = [];
		this.speaking = false;
		try {
			this.ws?.close();
		} catch {
			/* noop */
		}
		this.ws = null;
		this.connecting = false;
		this.callbacks.onStatus?.("desconectado");
	}

	// ── Mensajería ───────────────────────────────────────────────────────

	sendTextMessage(text: string): void {
		this.send({
			type: "conversation-item-create",
			item: { type: "text-message", role: "user", text },
		});
		this.requestResponse();
	}

	/** Pide una respuesta tras una tool call (una sola vez por respuesta). */
	requestResponse(options?: { modalities?: string[] }): void {
		this.send({ type: "response-create", ...(options ? { options } : {}) });
	}

	/** Cancela la respuesta en curso (capa delgada: tras transcribir, el modelo no responde). */
	cancelResponse(): void {
		const wasActive = this._responding || this.speaking;
		this.speaking = false;
		this._responding = false;
		this.lastResponseAt = Date.now();
		this.tel("resp_cancel", { active: wasActive });
		// Enviar response-cancel SIN respuesta activa hace que el gateway devuelva
		// el error espurio "Cancellation failed: no active response found" (carrera:
		// en el flujo normal el usuario habla y la respuesta automática aún no se ha
		// creado). Solo se cancela si hay una respuesta en vuelo (nuestra o auto);
		// la respuesta automática la cancela `resp_auto_cancel` en `response-created`
		// con el timing correcto (cuando ya existe).
		if (!wasActive) return;
		this.send({ type: "response-cancel" });
	}

	/**
	 * Pide al modelo leer un texto EN VOZ ALTA de forma verbatim (TTS de la
	 * capa delgada). Se ENCOLA y se envía solo cuando el modelo está libre
	 * (ver `drainSpeakQueue`): garantiza el orden filler → narración →
	 * respuesta y evita que varias respuestas suenen juntas al final.
	 */
	speak(text: string, options?: { instructions?: string; narrate?: boolean }): void {
		const clean = text.trim();
		if (!clean) return;
		this.speakQueue.push({ text: clean, instructions: options?.instructions, narrate: options?.narrate });
		this.drainSpeakQueue();
	}

	/**
	 * Envía la siguiente utterance hablada SOLO cuando el modelo está libre
	 * (sin respuesta en vuelo). Si una respuesta lleva colgada >8s sin
	 * `response-done` (p. ej. una cancelación que el provider nunca confirma),
	 * se fuerza el avance para no quedarse mudo.
	 */
	private drainSpeakQueue(): void {
		if (this.speaking) return;
		if (this._responding) {
			if (Date.now() - this.lastResponseAt < 8000) return;
			this._responding = false;
			this.callbacks.onRespondingChange?.(false);
		}
		const item = this.speakQueue.shift();
		if (!item) return;
		const { text, instructions, narrate } = item;
		// La NARRACIÓN del SPEECH empieza a sonar ahora → la UI PRENDE el resaltado
		// de la entidad (se apaga cuando el audio termina en `playAudio`/`stopPlayback`).
		if (narrate) {
			this.narrateInFlight = true;
			this.dispatchNarrate?.("start");
		}
		this.speaking = true;
		this.lastResponseAt = Date.now();
		// Diagnóstico del timing de voz (orden filler → narración → respuesta).
		try {
			console.info(`[voz] ${new Date().toISOString().slice(11, 19)} · ${text.slice(0, 80)}`);
		} catch {
			/* noop */
		}
		this.tel("speak", { text: text.slice(0, 80), narrate: !!narrate, queue: this.speakQueue.length });
		this.send({
			type: "conversation-item-create",
			item: { type: "text-message", role: "user", text: `Lee en voz alta: ${text}` },
		});
		// `instructions` opcional por respuesta: tono/contexto para ESTA utterance
		// (solo se envía si la capa lo pidió — default sin cambios).
		this.send({
			type: "response-create",
			options: { modalities: ["audio"], ...(instructions ? { instructions } : {}) },
		});
		// Esta respuesta SÍ la pedimos nosotros: no es un eco automático.
		this.expectResponse = true;
		this.lastRequestedResponseAt = Date.now();
	}

	/** Descarta las utterances pendientes (barge-in: el usuario interrumpió). */
	clearSpokenQueue(): void {
		this.tel("speak_queue_cleared", { pending: this.speakQueue.length });
		this.speakQueue = [];
		this.speaking = false;
	}

	// ── Micrófono (AudioWorkletNode) ────────────────────────────────────

	async startMic(): Promise<void> {
		if (this.captureCtx) return;
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			// AudioContext a la tasa objetivo (24kHz): el worklet recibe ya a la
			// tasa correcta y el resample se convierte en no-op en la mayoría
			// de los casos (el SO puede entregar otra tasa → resample defensivo).
			const ctx = new AudioContext({ sampleRate: TARGET_RATE });
			await ctx.audioWorklet.addModule(getWorkletModuleUrl());
			const source = ctx.createMediaStreamSource(this.stream);
			const worklet = new AudioWorkletNode(ctx, WORKLET_NAME);
			const silentGain = ctx.createGain();
			silentGain.gain.value = 0;

			worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
				try {
					const input = e.data;
					if (!input?.length) return;
					// ⚠️⚠️ SUPRESIÓN DEL MIC durante el playback del asistente (+ cooldown).
					// Sin AEC, el mic capta el audio del asistente por el altavoz. Si ese audio
					// entrara al buffer del servidor (input-audio-append), el próximo
					// input-audio-commit lo transcribiría como "pregunta del usuario" → el
					// agente responde de nuevo = REPITE LA RESPUESTA (loop de eco, visto en
					// el espejo: "Lee en voz alta: Armando el análisis…" como user message).
					// Se corta ANTES del batcher: nada del asistente llega al servidor.
					// (El commit ya estaba gateado en vadTick; aquí se cierra la fuente real.)
					if (this._playing) {
						this.telMicDrop("playing", input);
						return;
					}
					if (Date.now() - this.lastPlaybackEndAt < VOICE_PLAYBACK_COOLDOWN_MS) {
						this.telMicDrop("cooldown", input);
						return;
					}
					const samples =
						ctx.sampleRate === TARGET_RATE
							? input
							: experimental_resampleAudio(input, ctx.sampleRate, TARGET_RATE);
					for (const batch of this.captureBatcher.push(samples)) {
						const audio = experimental_encodeRealtimeAudio(batch);
						if (audio) this.send({ type: "input-audio-append", audio });
						this.vadTick(batch);
						// Buffer de la frase para recuperación de commits sin STT: se
						// guarda el MISMO audio ya enviado mientras el VAD cree que hay
						// habla (se resetea al iniciar frase y al commitear).
						if (audio && this.vadSpeaking && this.utteranceBytes < this.UTT_MAX_BYTES) {
							this.utteranceChunks.push(audio);
							this.utteranceBytes += audio.length;
						}
					}
				} catch (err) {
					this.callbacks.onError?.(`mic: ${String(err)}`);
				}
			};

			source.connect(worklet);
			// Mantiene vivo el grafo sin monitor audible.
			worklet.connect(silentGain);
			silentGain.connect(ctx.destination);

			if (ctx.state === "suspended") await ctx.resume();

			this.captureCtx = ctx;
			this.captureSource = source;
			this.captureWorklet = worklet;
			this.captureBatcher.reset();
			this.tel("mic_start");
			this.callbacks.onListeningChange?.(true);
		} catch (err) {
			this.tel("mic_error", { message: String(err) });
			this.callbacks.onError?.(`no se pudo acceder al micrófono: ${String(err)}`);
			throw err;
		}
	}

	stopMic(): void {
		try {
			this.captureWorklet?.port.close();
			this.captureWorklet?.disconnect();
			this.captureSource?.disconnect();
			void this.captureCtx?.close();
			this.stream?.getTracks().forEach((t) => t.stop());
		} catch {
			/* noop */
		}
		this.captureWorklet = null;
		this.captureSource = null;
		this.captureCtx = null;
		this.stream = null;
		this.captureBatcher.reset();
		this.vadSpeaking = false;
		this.vadLastVoiceAt = 0;
		this.vadSpeechStartAt = 0;
		this.vadPeakRms = 0;
		this.utteranceChunks = [];
		this.utteranceBytes = 0;
		// Al detener el mic se cancela cualquier recuperación/reciclaje pendiente
		// (no debe reintentar sobre una sesión cerrada).
		if (this.commitWatchdog) {
			clearTimeout(this.commitWatchdog);
			this.commitWatchdog = null;
		}
		if (this.recycleTimer) {
			clearTimeout(this.recycleTimer);
			this.recycleTimer = null;
		}
		this.tel("mic_stop");
		this.callbacks.onListeningChange?.(false);
	}

	/**
	 * VAD cliente por energía RMS (turnDetection disabled → el commit manual es la
	 * ÚNICA vía de transcripción; no hay respuesta automática del modelo = sin eco).
	 *
	 * ⚠️ HARDWARE SIN AEC (mic + altavoz en la misma máquina): el altavoz del
	 * asistente es captado por el mic con la MISMA energía que la voz del usuario.
	 * Por eso NO hay barge-in por energía mientras suena la voz del asistente:
	 *   - `_playing` → el mic se ignora por completo (un barge-in falso cortaba la
	 *     narración y commiteaba el residuo del altavoz → atropello / loop).
	 *   - Ventana de cooldown tras el playback (VOICE_PLAYBACK_COOLDOWN_MS) → el
	 *     residuo del altavoz que aún suena no dispara un COMMIT falso.
	 * El barge-in real queda disponible vía UI (texto / botón Detener) y, en
	 * hardware con echo cancellation, re-habilitar con `_playing → cutPlayback()`.
	 *
	 * - Energía alta: inicio de habla.
	 * - Silencio ≥ VOICE_SILENCE_MS tras haber hablado: fin de frase → commit.
	 */
	private vadTick(samples: Float32Array): void {
		try {
			const now = Date.now();
			// El mic capta el audio del asistente: ignorar mientras suena y en la
			// ventana de cooldown posterior (residuo del altavoz).
			if (this._playing) return;
			if (now - this.lastPlaybackEndAt < VOICE_PLAYBACK_COOLDOWN_MS) return;
			let sum = 0;
			for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
			const rms = Math.sqrt(sum / samples.length);
			if (rms >= VOICE_RMS_THRESHOLD) {
				if (!this.vadSpeaking) {
					this.vadSpeaking = true;
					this.vadSpeechStartAt = now;
					this.vadPeakRms = rms;
					// Frase nueva → reinicia el buffer de recuperación.
					this.utteranceChunks = [];
					this.utteranceBytes = 0;
					this.tel("vad_speech", { rms: Number(rms.toFixed(4)) });
				} else if (rms > this.vadPeakRms) {
					this.vadPeakRms = rms;
				}
				this.vadLastVoiceAt = now;
				return;
			}
			if (!this.vadSpeaking) return;
			if (now - this.vadLastVoiceAt >= VOICE_SILENCE_MS) {
				this.vadSpeaking = false;
				this.finalizeUtterance();
			}
		} catch {
			/* noop */
		}
	}

	/** Commit manual del audio capturado: dispara la transcripción del servidor.
	 *  El mic NO se detiene: queda activo durante el turno para permitir el
	 *  barge-in continuo (el usuario puede añadir contexto "al vuelo"). */
	private finalizeUtterance(): void {
		try {
			// ⚠️ Gate anti-ECO (2026-08-17): tras hablar el asistente, un commit de
			// BAJO RMS es el eco de su PROPIA voz por el altavoz (evidencia: ecos
			// 0.022/0.032 vs voz real 0.125/0.143). Rechazarlo ANTES de enviarlo al
			// servidor corta el bucle "respuesta → eco → re-ejecución → respuesta…"
			// (la narración decía "es Leticia" y el eco se re-enviaba como pregunta).
			// La voz real (≥0.05) y el barge-in (≥0.08) pasan siempre; la voz del
			// usuario cuando el asistente NO habló recientemente también.
			const sinceSpeak = Date.now() - this.lastAssistantSpeakAt;
			if (this.vadPeakRms < VOICE_ECHO_RMS_FLOOR && sinceSpeak < VOICE_ECHO_WINDOW_MS) {
				console.info(`[vad] ECO rechazado (peakRms=${this.vadPeakRms.toFixed(4)} < piso, asistente habló hace ${sinceSpeak}ms)`);
				this.tel("echo_reject_vad", {
					peakRms: Number(this.vadPeakRms.toFixed(4)),
					sinceSpeakMs: sinceSpeak,
				});
				this.utteranceChunks = [];
				this.utteranceBytes = 0;
				return;
			}
			this.lastCommitPeakRms = this.vadPeakRms;
			console.info(`[vad] ${new Date().toISOString().slice(11, 19)} · COMMIT audio (enviando input-audio-commit)`);
			this.send({ type: "input-audio-commit" });
			this.lastCommitAt = Date.now();
			this.tel("vad_commit", {
				// silencio previo al commit + duración y pico de la frase detectada
				silenceMs: Date.now() - this.vadLastVoiceAt,
				speechDurationMs: this.vadSpeechStartAt ? Date.now() - this.vadSpeechStartAt : 0,
				peakRms: Number(this.vadPeakRms.toFixed(4)),
			});
			const chunks = this.utteranceChunks;
			this.utteranceChunks = [];
			this.utteranceBytes = 0;
			this.startCommitWatchdog(chunks, 1);
		} catch {
			/* noop */
		}
	}

	/**
	 * Watchdog del commit + RECUPERACIÓN (ver campos arriba):
	 *  - intent 1 (8s): RE-COMMIT — el gateway puede retener el audio sin transcribir.
	 *  - intent 2 (5s): RE-APPEND el audio bufferizado de la frase + RE-COMMIT
	 *    (el buffer del servidor se perdió con el commit fallido).
	 *  - intent 3 (5s): rendirse — avisar al usuario POR VOZ (el TTS sí funciona
	 *    aunque el STT esté muerto) + telemetría + re-conectar la sesión realtime
	 *    (sesión nueva = STT del gateway fresco; el chat del agente NO se pierde).
	 */
	private startCommitWatchdog(chunks: string[], attempt: number): void {
		if (this.commitWatchdog) clearTimeout(this.commitWatchdog);
		const delay = attempt === 1 ? 8000 : this.COMMIT_RETRY_MS;
		this.commitWatchdog = setTimeout(() => {
			const elapsed = Date.now() - this.lastCommitAt;
			this.tel("commit_no_transcript", { elapsedMs: elapsed, attempt });
			if (attempt === 1) {
				// Etapa 1: re-enviar el commit (el audio puede seguir en el servidor).
				this.tel("commit_retry", { attempt });
				this.lastCommitAt = Date.now();
				this.send({ type: "input-audio-commit" });
				this.startCommitWatchdog(chunks, 2);
				return;
			}
			if (attempt === 2 && chunks && chunks.length > 0) {
				// Etapa 2: el buffer del servidor se perdió → re-append + commit.
				this.tel("commit_reappend", { chunks: chunks.length });
				for (const c of chunks) this.send({ type: "input-audio-append", audio: c });
				this.lastCommitAt = Date.now();
				this.send({ type: "input-audio-commit" });
				this.startCommitWatchdog(chunks, 3);
				return;
			}
			// Rendirse en la recuperación: re-conectar en silencio. La sesión nueva
			// reinicia el STT del gateway y el usuario sigue hablando con normalidad
			// (su próxima pregunta se transcribe en la sesión fresca) — NUNCA se le
			// pide repetir. La telemetría registra la pérdida para el diagnóstico.
			this.tel("commit_gave_up", { chunks: chunks?.length ?? 0 });
			void this.reconnectVoiceSession("give_up");
		}, delay);
	}

	/**
	 * Reciclaje PROACTIVO (prevención): al terminar de hablar el asistente
	 * (play_end con cola vacía y sin respuestas en vuelo) se re-conecta la sesión
	 * realtime. La conversación del AGENTE de /chat NO se pierde (el WS realtime
	 * es solo el canal STT/TTS), y la PRÓXIMA pregunta arranca en una sesión
	 * nueva donde la 1ª commit del STT siempre funciona (el fallo observado era
	 * que el STT moría tras la 1ª transcripción de la sesión). Máx 1 por turno
	 * (recycledSinceTranscript se rearma en cada transcripción).
	 */
	private maybeRecycleIdle(): void {
		if (!this.autoCancelAfterTranscript) return; // solo la capa delgada de /chat
		if (this.recycledSinceTranscript) return;
		if (this._responding || this.speaking || this.speakQueue.length > 0) return;
		if (this.recycleTimer) clearTimeout(this.recycleTimer);
		this.recycleTimer = setTimeout(() => {
			this.recycleTimer = null;
			if (this.recycledSinceTranscript) return;
			if (this._responding || this.speaking || this.speakQueue.length > 0) return;
			this.recycledSinceTranscript = true;
			void this.reconnectVoiceSession("recycle");
		}, 1000);
	}

	/**
	 * Re-conecta la sesión realtime (disconnect → connect con token nuevo → mic).
	 * `reason`:
	 *  - "recycle": prevención proactiva tras cada turno de audio.
	 *  - "give_up": recuperación tras agotar re-commit/re-append de una frase.
	 * El usuario NUNCA tiene que repetir la pregunta: la sesión nueva reinicia el
	 * STT del gateway y su siguiente enunciado se transcribe con normalidad.
	 */
	private async reconnectVoiceSession(reason: "recycle" | "give_up"): Promise<void> {
		if (reason === "give_up" && this.recoveryCount >= this.MAX_RECOVERIES) return;
		if (reason === "give_up") this.recoveryCount += 1;
		this.recovering = true;
		this.tel(
			reason === "recycle" ? "session_recycle" : "session_recover",
			reason === "give_up" ? { attempt: this.recoveryCount } : undefined,
		);
		try {
			this.disconnect();
			await this.connect();
			await this.startMic();
			this.tel(reason === "recycle" ? "session_recycled" : "session_recovered");
		} catch (err) {
			this.tel(reason === "recycle" ? "session_recycle_failed" : "session_recover_failed", {
				message: String(err),
			});
		} finally {
			this.recovering = false;
		}
	}

	// ── Internos ─────────────────────────────────────────────────────────

	/**
	 * Serializa un evento CLIENTE normalizado con el modelo realtime del SDK
	 * y lo envía por el WebSocket. `serializeClientEvent` produce el payload
	 * exacto del provider (gateway normalizado hoy; xAI nativo mañana).
	 */
	private send(event: RealtimeClientEvent): void {
		const ws = this.ws;
		const model = this.model;
		if (!ws || ws.readyState !== WebSocket.OPEN || !model) return;
		try {
			const serialized = model.serializeClientEvent(event);
			// `undefined` = el provider dice NO enviar este evento (p.ej. xAI
			// ignora conversation-item-truncate sobre WebSocket).
			if (serialized == null) return;
			ws.send(JSON.stringify(serialized));
		} catch (err) {
			this.callbacks.onError?.(`enviar: ${String(err)}`);
		}
	}

	private sendSessionUpdate(): void {
		if (!this.sessionConfig) return;
		this.send({ type: "session-update", config: this.sessionConfig as RealtimeSessionConfig });
	}

	private handleMessage(data: unknown): void {
		const model = this.model;
		if (!model) return;
		let raw: unknown;
		try {
			raw = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
		} catch {
			return;
		}
		// Normaliza el wire event del provider al evento TIPADO del SDK.
		// El gateway ya emite normalizado (identity); xAI nativo lo mapea.
		const parsed = model.parseServerEvent(raw);
		const events = Array.isArray(parsed) ? parsed : [parsed];
		for (const ev of events) this.handleEvent(ev);
	}

	private handleEvent(ev: RealtimeServerEvent): void {
		switch (ev.type) {
			case "session-updated":
			case "session-created":
				this.callbacks.onStatus?.("listo");
				break;
			// El VAD del servidor es informativo; el estado real del micrófono
			// lo gobiernan startMic/stopMic (sin mic local el servidor no oye).
			case "speech-started":
			case "speech-stopped":
				break;
			case "input-transcription-completed":
				if (this.commitWatchdog) {
					clearTimeout(this.commitWatchdog);
					this.commitWatchdog = null;
				}
				// Cada transcripción del usuario rearma el reciclaje proactivo de la
				// sesión (1 reciclaje por turno, tras el audio de la respuesta).
				this.recycledSinceTranscript = false;
				console.info(`[stt] ${new Date().toISOString().slice(11, 19)} · transcript="${(ev.transcript ?? '').slice(0, 140)}"`);
				this.tel("stt", {
					text: (ev.transcript ?? '').slice(0, 120),
					empty: !ev.transcript?.trim(),
				});
				if (ev.transcript && ev.transcript.trim()) {
					this.callbacks.onUserTranscript?.(ev.transcript, { peakRms: this.lastCommitPeakRms });
					// Capa delgada: el VAD dispararía una respuesta automática
					// (que puede ECOAR la pregunta del usuario); se corta su audio YA
					// reproducido, se descartan utterances pendientes y se cancela la
					// respuesta en curso (barge-in: el usuario interrumpió, manda lo nuevo).
					if (this.autoCancelAfterTranscript) {
						this.cutPlayback();
						this.clearSpokenQueue();
						this.cancelResponse();
						// Re-sync PREVENTIVO: tras el response-cancel el gateway puede
						// quedar con el STT en un estado que ignora los commits
						// posteriores (fallo observado 2026-08-17: la 1ª transcripción
						// funciona y las siguientes mueren). Re-enviar la config de la
						// sesión rearma la transcripción sin reconectar (barato; el
						// reciclaje proactivo de la sesión es la garantía de respaldo).
						this.tel("session_resync");
						this.sendSessionUpdate();
					}
				}
				break;
			case "audio-delta":
				if (ev.delta) {
					console.info(`[play] ${new Date().toISOString().slice(11, 19)} · audio-delta bytes=${ev.delta.length}`);
					this.playAudio(ev.delta);
				}
				break;
			case "audio-transcript-delta":
				if (ev.delta) {
					if (ev.itemId) this.lastAudioItemId = ev.itemId;
					this.callbacks.onAssistantTranscript?.(ev.delta, "delta");
				}
				break;
			case "audio-transcript-done":
				if (ev.transcript) this.callbacks.onAssistantTranscript?.(ev.transcript, "done");
				break;
			case "text-delta":
				if (ev.delta && ev.itemId !== this.lastAudioItemId) {
					this.callbacks.onAssistantTranscript?.(ev.delta, "delta");
				}
				break;
			case "text-done":
				if (ev.text && ev.itemId !== this.lastAudioItemId) {
					this.callbacks.onAssistantTranscript?.(ev.text, "done");
				}
				break;
			case "function-call-arguments-done":
				void this.handleToolCall({
					callId: ev.callId,
					name: ev.name,
					arguments: ev.arguments,
				});
				break;
			case "response-created":
				// Anti-colisión: si hay una utterance propia ENCOLADA o HABLANDO, o si
				// pedimos una respuesta hace <3s, NO cancelar — el response-created
				// (nuestro o el eco de un commit fantasma) alimenta esa utterance y
				// cancelarlo pierde el audio de la respuesta final. Solo se auto-cancela
				// un eco cuando NO tenemos nada propio que decir.
				const hasOwnSpeak = this.speakQueue.length > 0 || this.speaking;
				const recentlyRequested = Date.now() - this.lastRequestedResponseAt < 3000;
				if (this.autoCancelAfterTranscript && !this.expectResponse && !hasOwnSpeak && !recentlyRequested) {
					// Respuesta del modelo NO pedida por nosotros (auto tras commit):
					// cancelar AL INSTANTE para evitar el eco — turnDetection disabled no
					// siempre lo impide en el gateway.
					console.info(`[resp] ${new Date().toISOString().slice(11, 19)} · CREATED AUTOMÁTICA → CANCEL`);
					this.tel("resp_auto_cancel");
					this.send({ type: "response-cancel" });
					this._responding = false;
					this.callbacks.onRespondingChange?.(false);
					break;
				}
				this.expectResponse = false;
				console.info(`[resp] ${new Date().toISOString().slice(11, 19)} · CREATED (pedida) autoCancel=${this.autoCancelAfterTranscript}`);
				this.tel("resp_created");
				this._responding = true;
				this.lastResponseAt = Date.now();
				this.toolCallsClosed = false;
				this.callbacks.onRespondingChange?.(true);
				break;
			case "response-done":
				console.info(`[resp] ${new Date().toISOString().slice(11, 19)} · DONE (cola=${this.speakQueue.length} pending)`);
				this.tel("resp_done", { queue: this.speakQueue.length });
				this.expectResponse = false;
				this._responding = false;
				this.callbacks.onRespondingChange?.(false);
				this.callbacks.onStatus?.("listo");
				// Libera la siguiente utterance hablada (filler → narración → respuesta).
				this.speaking = false;
				this.drainSpeakQueue();
				// Si la respuesta que cerró llevaba tool calls, cierra la cola y
				// pide la continuación cuando todos los outputs estén enviados.
				if (this.pendingToolOutputs.size > 0) this.toolCallsClosed = true;
				this.maybeRequestResponse();
				break;
			case "error": {
				const message = ev.message || "error desconocido";
				// "Cancellation failed: no active response found" es una carrera BENIGNA:
				// enviamos un response-cancel para una respuesta que el gateway ya cerró
				// (o que nunca llegó a existir). NO es un fallo del sistema ni del turno:
				// se registra en telemetría durable pero NO se muestra como error de UI
				// ni se marca el estado como "error" (evita la alerta roja espuria).
				const benign = /cancellation failed|no active response/i.test(message);
				this.tel("event_error", { message, benign });
				console.info(`[ws] error${benign ? " (benigno: cancel espurio)" : ""}: ${message}`);
				if (benign) {
					// Corrección de estado: el gateway no tiene respuesta que cancelar.
					this._responding = false;
					break;
				}
				this.callbacks.onError?.(message);
				this.callbacks.onStatus?.("error");
				break;
			}
			case "custom":
				// Eventos de provider sin mapeo normalizado: se ignoran.
				break;
		}
	}

	private async handleToolCall(call: { callId: string; name: string; arguments: string }): Promise<void> {
		this.pendingToolOutputs.add(call.callId);
		let output: unknown;
		try {
			output = this.callbacks.onToolCall
				? await this.callbacks.onToolCall(call)
				: { ok: false, error: "sin handler de tools" };
		} catch (err) {
			output = { ok: false, error: String(err) };
		}
		// xAI/OpenAI realtime exige `output` como STRING y SIN `name` (un object
		// en `output` → "Invalid event received" del gateway).
		const serialized = typeof output === "string" ? output : JSON.stringify(output ?? null);
		this.send({
			type: "conversation-item-create",
			item: { type: "function-call-output", callId: call.callId, output: serialized },
		});
		this.pendingToolOutputs.delete(call.callId);
		this.maybeRequestResponse();
	}

	/** Pide la respuesta de continuación SOLO cuando todas las tools cerraron. */
	private maybeRequestResponse(): void {
		if (!this.toolCallsClosed) return;
		if (this.pendingToolOutputs.size > 0) return;
		this.toolCallsClosed = false;
		this.send({ type: "response-create" });
	}

	private playAudio(base64Audio: string): void {
		try {
			const ctx = this.ensurePlayback();
			void ctx.resume();
			let samples = experimental_decodeRealtimeAudio(base64Audio);
			if (ctx.sampleRate !== TARGET_RATE) {
				samples = experimental_resampleAudio(samples, TARGET_RATE, ctx.sampleRate);
			}
			if (samples.length === 0) return;
			const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
			buffer.getChannelData(0).set(samples);
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.connect(ctx.destination);
			const now = ctx.currentTime;
			if (this.nextPlaybackTime < now + 0.05) this.nextPlaybackTime = now + 0.05;
			source.start(this.nextPlaybackTime);
			this.nextPlaybackTime += buffer.duration;
			this.activeSources += 1;
			this._playing = true;
			this.lastAssistantSpeakAt = Date.now();
			this.tel("play_start", { bytes: base64Audio.length });
			this.callbacks.onPlayingChange?.(true);
			source.onended = () => {
				this.activeSources = Math.max(0, this.activeSources - 1);
				if (this.activeSources === 0) {
					this._playing = false;
					this.lastPlaybackEndAt = Date.now();
					this.tel("play_end");
					this.callbacks.onPlayingChange?.(false);
					// Fin del audio de la NARRACIÓN → la UI APAGA el resaltado.
					if (this.narrateInFlight) {
						this.narrateInFlight = false;
						this.dispatchNarrate?.("end");
					}
					// Prevención: reciclar la sesión para que la PRÓXIMA pregunta
					// corra en una sesión nueva (STT fresco). Sin acción del usuario.
					this.maybeRecycleIdle();
				}
			};
		} catch (err) {
			this.callbacks.onError?.(`playback: ${String(err)}`);
		}
	}

	private ensurePlayback(): AudioContext {
		if (!this.playbackCtx) {
			this.playbackCtx = new AudioContext({ sampleRate: TARGET_RATE });
			this.nextPlaybackTime = 0;
		}
		return this.playbackCtx;
	}

	/** Cierra la cola de playback y resetea el indicador (usado al desconectar). */
	private stopPlayback(): void {
		try {
			this.activeSources = 0;
			void this.playbackCtx?.close();
		} catch {
			/* noop */
		}
		this.playbackCtx = null;
		this.nextPlaybackTime = 0;
		this._playing = false;
		this.lastPlaybackEndAt = Date.now();
		this.tel("play_stop");
		this.callbacks.onPlayingChange?.(false);
		// Narración cortada (barge-in / cut) → apagar el resaltado.
		if (this.narrateInFlight) {
			this.narrateInFlight = false;
			this.dispatchNarrate?.("end");
		}
	}

	/**
	 * Detiene el audio en reproducción y descarta el audio encolado (barge-in /
	 * la respuesta ya está lista). El contexto se recrea en el siguiente `audio-delta`.
	 */
	cutPlayback(): void {
		console.info(`[play] ${new Date().toISOString().slice(11, 19)} · CUT playback`);
		this.tel("play_cut");
		this.stopPlayback();
	}

	/**
	 * Emite el evento global de narración para la UI (MessageAnimated lo escucha):
	 *  - `narrate:start` → PRENDE el resaltado de la entidad (la voz la dice).
	 *  - `narrate:end`   → lo APAGA (el audio de la narración terminó o se cortó).
	 * Es un CustomEvent en `window`; blindado (cosmético, nunca romper el runtime).
	 */
	private dispatchNarrate(phase: "start" | "end"): void {
		try {
			if (typeof window === "undefined") return;
			window.dispatchEvent(new CustomEvent(`narrate:${phase}`));
		} catch {
			/* noop */
		}
	}
}
