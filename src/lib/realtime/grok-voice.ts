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
// Config server-VAD que el cliente refuerza vía `session-update` en modo AEC
// (fuente única en `voice-session-config.ts`, compartida con chat-token).
import { SERVER_VAD_CONFIG } from "./voice-session-config";

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

// ── Buffer de voz durante playback (P5 / Fase B4, EXPERIMENTAL) ─────────────
// Feature flag: capturar lo que el usuario dice MIENTRAS suena el asistente y
// commitearlo DIFERIDO al terminar el playback (sin AEC, esa voz hoy se pierde
// en silencio — `mic_drop`).
//
// ⚠️ TRADE-OFF CRÍTICO (léelo antes de activar): sin AEC no hay forma perfecta
// de separar la voz del usuario del eco del asistente que el mic capta por el
// altavoz. El intento histórico de "dejar appendeando durante playback"
// reintrodujo el LOOP de eco (el audio del asistente se transcribía como
// pregunta → re-submit → repetición). Por eso esta feature:
//   - va DETRÁS de este flag, OFF por defecto (comportamiento byte-identical);
//   - NUNCA vuelve a la ruta normal (append continuo) durante el playback —
//     captura en un buffer APARTE y commitea solo al terminar;
//   - discrimina voz del usuario vs eco con heurística de RMS (piso de eco
//     adaptativo + margen + ventana de sostenimiento);
//   - el commit diferido pasa por los mismos gates/dedupe que el flujo normal.
//
// CÓMO ACTIVARLA: poner `const VOICE_BUFFER_DURING_PLAYBACK = true;` y validar
// en vivo con la telemetría `overlay_capture` / `overlay_discard` /
// `overlay_commit` (ver reporte de la Fase B4). Conservadora: ante la duda NO
// se bufferiza (mejor perder la voz que reintroducir el loop de eco).
const VOICE_BUFFER_DURING_PLAYBACK = false;
/** Duración máxima acumulada de captura durante un playback (~10s). */
const PLAYBACK_OVERLAY_MAX_MS = 10000;
/** Mínimo de "voz probable" acumulada para commitear el overlay al terminar. */
const PLAYBACK_OVERLAY_MIN_VOICE_MS = 600;
/** La muestra del mic es "voz probable" si `micRms > echoFloorRms * GAIN + MARGIN`. */
const PLAYBACK_OVERLAY_GAIN_FACTOR = 1.4;
const PLAYBACK_OVERLAY_RMS_MARGIN = 0.01;
/** Batches CONSECUTIVOS de voz antes de bufferizar (ventana de sostenimiento;
 *  ≈342ms @171ms/batch) — un pico suelto del eco NO se bufferiza. */
const PLAYBACK_OVERLAY_SUSTAIN_BATCHES = 2;
/** Bootstrap del piso de eco: los primeros ms de cada playback NO bufferizan,
 *  solo aprenden el piso (`echoFloorRms = max` del RMS del mic). */
const PLAYBACK_OVERLAY_WARMUP_MS = 400;
/** EMA del piso de eco hacia el RMS no-voz observado (solo con señal ≥50% del
 *  piso: el silencio no lo degrada — ver `capturePlaybackOverlay`). */
const PLAYBACK_OVERLAY_FLOOR_ALPHA = 0.15;
/** Throttle de la telemetría del overlay (los batches llegan cada ~171ms). */
const PLAYBACK_OVERLAY_TEL_MS = 1000;

// ── Idle watchdog (Fase B3) ──────────────────────────────────────────────
// El mic puede quedar "Escuchando…" indefinido si el usuario se va. Escalones
// de inactividad (referencia: ejemplo Android de xAI, IDLE_TIERS 5s/10s/15s):
//   - Tier 1 (VOICE_IDLE_TIER1_MS): aviso amable — el usuario sigue "ahí" pero
//     en silencio. Se emite UNA vez por ventana de inactividad.
//   - Tier 2 (VOICE_IDLE_TIER2_MS): desconexión amable — el cliente NOTIFICA a
//     la UI (onIdle) y DETIENE el watchdog; NUNCA desconecta solo.
// Ambas son feature flags nombradas (ajustables/desactivables).
const VOICE_IDLE_TIER1_MS = 25000;
const VOICE_IDLE_TIER2_MS = 90000;
/** Intervalo de comprobación del watchdog (1s; compara Date.now() vs lastActivityAt). */
const VOICE_IDLE_POLL_MS = 1000;

// ── Modo AEC vs no-AEC (Fase B1) ────────────────────────────────────────────
// El AEC real se detecta en runtime (`track.getSettings().echoCancellation`);
// las constraints de getUserMedia son best-effort y el navegador/SO decide la
// verdad aplicada. Default conservador = no-AEC (esta máquina hoy es no-AEC).
//   - Modo AEC: server VAD (`SERVER_VAD_CONFIG`) + barge-in real por
//     `speech-started`; el mic SIEMPRE appendea (el AEC cancela al asistente).
//   - Modo no-AEC (fallback): gates actuales (append suprimido durante
//     playback + cooldown + VAD cliente por RMS + piso de eco).
export type AecMode = "aec" | "no-aec";

export type AecInfo = {
	/** true SOLO si el navegador declara AEC aplicado en el track del mic. */
	aecEnabled: boolean;
	/** Procesamiento completo pedido aplicado (AEC + NS + AGC). */
	fullProcessing: boolean;
	/** Settings reales del track (la verdad aplicada). */
	settings: MediaTrackSettings | null;
	/** Capacidades soportadas del dispositivo (null si no soportadas). */
	capabilities: MediaTrackCapabilities | null;
	/** Soporte de la API getCapabilities en este navegador (Safari no). */
	capabilitiesSupported: boolean;
};

/** Red de seguridad del modo AEC (feature flag): si el server VAD no emite
 *  `speech-stopped`/commit tras este tiempo de habla, el VAD cliente dispara el
 *  commit manual (el STT del gateway puede fallar aunque el AEC esté activo). */
const SERVER_VAD_COMMIT_FALLBACK_MS = 8000;

// ── Override conductual del AEC (Fase B2) ──────────────────────────────────
// `getSettings().echoCancellation === true` NO garantiza AEC efectivo (riesgo
// #1 documentado por B1; caso real de esta máquina: constraints pedidas pero el
// mic capta al asistente con la misma energía → el server VAD oye el ECO como
// habla del usuario y dispara barge-in en loop). Defensa: mientras suena el
// asistente (`_playing`) en modo AEC, se mide el RMS del input; si se mantiene
// ALTO de forma SOSTENIDA (≥ `AEC_ECHO_CONFIRM_MS` acumulados sin caer), es el
// eco del altavoz → se DEGRADA a no-AEC en caliente (se reactiva el gate del
// append y el barge-in vuelve a ser por UI/transcripción).
/** Umbral RMS del input durante playback que se considera eco sospechoso. */
const AEC_ECHO_RMS_OVERRIDE = 0.03;
/** Ventana de confirmación: ms ACUMULADOS de RMS ≥ umbral durante playback para
 *  declarar el eco confirmado y degradar. ≈1.8s continuos: la voz real del
 *  usuario "respira" (cae del umbral); el eco del asistente es más continuo.
 *  LIMITACIÓN: un barge-in legítimo y MUY sostenido (~2s) también cruza la
 *  ventana → degrada igual (seguro: solo suprime el mic durante playback, la
 *  pregunta nunca se pierde, se transcribe al terminar el asistente). */
const AEC_ECHO_CONFIRM_MS = 1800;
/** Throttle de la telemetría `echo_reject_vad` (patrón de eco, no inundar). */
const AEC_ECHO_REJECT_TEL_MS = 1500;

/**
 * Detecta el AEC REAL aplicado al track del mic (la verdad de runtime). Las
 * constraints de getUserMedia son best-effort: `getSettings()` dice qué
 * procesamiento se aplicó DE VERDAD; `getCapabilities` solo existe en
 * Chrome/Edge/Firefox (Safari → guard `typeof === 'function'`). Blindado:
 * nunca lanza (un throw en un callback de audio crashea el turno).
 */
function detectAec(stream: MediaStream): AecInfo {
	let settings: MediaTrackSettings | null = null;
	let capabilities: MediaTrackCapabilities | null = null;
	let capabilitiesSupported = false;
	try {
		const track = stream.getAudioTracks()[0];
		settings = track?.getSettings?.() ?? null;
	} catch {
		settings = null;
	}
	try {
		const track = stream.getAudioTracks()[0];
		if (typeof track?.getCapabilities === "function") {
			capabilities = track.getCapabilities();
			capabilitiesSupported = true;
		}
	} catch {
		capabilities = null;
	}
	const s = settings ?? {};
	const aecEnabled = s.echoCancellation === true;
	const fullProcessing =
		aecEnabled && s.noiseSuppression === true && s.autoGainControl === true;
	return { aecEnabled, fullProcessing, settings, capabilities, capabilitiesSupported };
}

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
	/**
	 * El modo AEC/no-AEC del cliente cambió (detectado en `startMic` tras
	 * `getUserMedia` → `track.getSettings()`). La UI puede usarlo para avisar
	 * "modo sin cancelación de eco" (Fase B2). Blindado: nunca lanza.
	 */
	onModeChange?: (mode: AecMode, aec: AecInfo) => void;
	/**
	 * Inactividad del mic (Fase B3, idle watchdog): el mic lleva mucho tiempo
	 * escuchando en silencio. `tier` 1 = aviso ("¿Sigues ahí?"), 2 = desconexión
	 * amable (90s). El cliente NUNCA desconecta solo: delega a la UI. Blindado.
	 */
	onIdle?: (tier: 1 | 2) => void;
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

	// ── Idle watchdog (Fase B3) ──
	private idleTimer: ReturnType<typeof setTimeout> | null = null;
	private lastActivityAt = 0;
	private tier1Notified = false;

	// ── Modo AEC vs no-AEC (Fase B1) ──
	// Detección real del AEC del track del mic (recomputada en CADA startMic —
	// el recycle/reconnect re-arranca el mic y el dispositivo puede cambiar).
	private aec: AecInfo | null = null;
	/** Modo de operación actual. Determina: gate del append, VAD cliente,
	 *  barge-in por speech-started, reciclaje proactivo. Default conservador
	 *  = no-AEC hasta que la detección confirme lo contrario. */
	private aecMode: AecMode = "no-aec";
	/** Red de seguridad del modo AEC: si el server VAD no commitea tras
	 *  `SERVER_VAD_COMMIT_FALLBACK_MS` de habla, el VAD cliente commitea. */
	private aecVadFallback: ReturnType<typeof setTimeout> | null = null;
	// ── Override conductual del AEC (Fase B2) ──
	/** Ms ACUMULADOS de RMS ≥ umbral durante playback en modo AEC (eco sospechoso).
	 *  Se resetea si el RMS cae del umbral o si se detiene el playback. */
	private aecEchoAccumMs = 0;
	/** true mientras la ventana de eco está ABIERTA (RMS alto y playback activo):
	 *  evita re-marcar la referencia temporal en cada batch (el acumulador crece
	 *  restando `now - lastAt`, no re-anclando en `now`). */
	private aecEchoWindowOpen = false;
	/** Timestamp del último batch de RMS alto (para acumular tiempo entre batches). */
	private aecEchoLastAt = 0;
	/** Throttle de la telemetría `echo_reject_vad` (patrón de eco). */
	private lastEchoRejectTelAt = 0;
	/** true tras degradar a no-AEC por eco confirmado — UNA vez por ciclo de
	 *  `startMic` (se resetea al re-abrir el mic). */
	private aecDowngraded = false;

	// ── Buffer de voz durante playback (P5 / Fase B4, EXPERIMENTAL) ──
	/** Piso de eco del mic durante playback (EMA adaptativo, ver
	 *  `capturePlaybackOverlay`): el RMS medio del eco del asistente captado por
	 *  el mic cuando NO hay voz del usuario encima. Se usa para discriminar. */
	private echoFloorRms = 0;
	/** Buffer APARTE del overlay: muestras Float32 (a TARGET_RATE) marcadas como
	 *  "voz probable" durante `_playing`. NUNCA toca `utteranceChunks`. */
	private playbackOverlayChunks: Float32Array[] = [];
	/** Ms ACUMULADOS de "voz probable" bufferizada (gate del commit diferido). */
	private overlayVoiceMs = 0;
	/** Ms ACUMULADOS de captura total del run (gate de PLAYBACK_OVERLAY_MAX_MS). */
	private overlayTotalMs = 0;
	/** Pico RMS de la voz bufferizada (telemetría + peakRms del commit). */
	private overlayPeakRms = 0;
	/** Batches consecutivos de voz probable (ventana de sostenimiento). */
	private overlaySustainBatches = 0;
	/** Ancla temporal del run de playback actual (bootstrap del piso de eco). */
	private overlayRunStartAt = 0;
	/** true mientras un commit diferido del overlay está en vuelo (anti-duplicados). */
	private overlayCommitInFlight = false;
	/** Timer del commit diferido (se arma al terminar el playback, cooldown). */
	private overlayCommitTimer: ReturnType<typeof setTimeout> | null = null;
	/** Throttle de la telemetría del overlay. */
	private lastOverlayTelAt = 0;

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

	/** true SOLO si el navegador declara AEC aplicado en el track del mic. */
	get aecEnabled(): boolean {
		return this.aec?.aecEnabled ?? false;
	}

	/** true si el modo activo es AEC (server VAD + barge-in real). */
	get isAecMode(): boolean {
		return this.aecMode === "aec";
	}

	/** Detección completa del AEC del último startMic (para la UI/diagnóstico). */
	get aecInfo(): AecInfo | null {
		return this.aec;
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
		this.stopIdleWatchdog();
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

	// ── Idle watchdog (Fase B3) ──────────────────────────────────────────

	/**
	 * Marca actividad del usuario y REARMA el contador de inactividad. Se llama
	 * en TODA actividad que cuenta como "el usuario sigue ahí": habla detectada
	 * (vadTick RMS ≥ umbral), transcripción recibida, audio del asistente sonando
	 * (play_start), response-done, speak() y al arrancar el mic.
	 */
	noteActivity(): void {
		try {
			this.lastActivityAt = Date.now();
			this.tier1Notified = false;
			this.armIdleWatchdog();
		} catch {
			/* noop */
		}
	}

	/** El watchdog SOLO corre con sesión conectada Y mic activo. */
	private idleWatchdogActive(): boolean {
		try {
			return this.connected && (this.captureCtx !== null || this.stream !== null);
		} catch {
			return false;
		}
	}

	private armIdleWatchdog(): void {
		try {
			if (this.idleTimer) {
				clearTimeout(this.idleTimer);
				this.idleTimer = null;
			}
			if (!this.idleWatchdogActive()) return;
			this.idleTimer = setTimeout(() => this.idleTick(), VOICE_IDLE_POLL_MS);
		} catch {
			/* noop */
		}
	}

	/**
	 * Tick del watchdog (1s): compara `Date.now() - lastActivityAt` contra los
	 * escalones. Mientras el asistente habla (`_playing`), hay respuesta en vuelo
	 * (`_responding`) o utterances encoladas (`speaking`/`speakQueue`), se POSPONE
	 * (el timer se rearma al terminar — no cuenta como inactividad del usuario).
	 * Tier 1: onIdle(1) una sola vez por ventana (tier1Notified). Tier 2:
	 * onIdle(2) + telemetría + DETENER el watchdog (no repetir). Blindado.
	 */
	private idleTick(): void {
		try {
			this.idleTimer = null;
			if (!this.idleWatchdogActive()) return;
			if (this._playing || this._responding || this.speaking || this.speakQueue.length > 0) {
				this.armIdleWatchdog();
				return;
			}
			const idle = Date.now() - this.lastActivityAt;
			if (idle >= VOICE_IDLE_TIER2_MS) {
				this.tel("idle_tier2", { idleMs: idle });
				this.callbacks.onIdle?.(2);
				// DETENER: la UI decide desconectar (stopMic cancela el watchdog).
				return;
			}
			if (idle >= VOICE_IDLE_TIER1_MS && !this.tier1Notified) {
				this.tier1Notified = true;
				this.tel("idle_tier1", { idleMs: idle });
				this.callbacks.onIdle?.(1);
			}
			this.armIdleWatchdog();
		} catch {
			/* noop */
		}
	}

	/** Cancela el watchdog (stopMic/disconnect — mismo patrón que recycleTimer). */
	private stopIdleWatchdog(): void {
		try {
			if (this.idleTimer) {
				clearTimeout(this.idleTimer);
				this.idleTimer = null;
			}
		} catch {
			/* noop */
		}
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
		// Idle watchdog (Fase B3): pedir TTS cuenta como actividad (el usuario
		// sigue ahí — p.ej. el aviso del tier 1 rearma el contador).
		this.noteActivity();
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
			// ── NUEVO (Fase B1): verificar el AEC REAL y decidir el modo ──
			// Las constraints son best-effort: getSettings() dice qué procesamiento
			// se aplicó DE VERDAD (puede ser false aunque se pidiera). NO se usa
			// `{ exact: true }` (rompería el mic sin AEC → degradar a no-AEC).
			// Se recomputa en CADA startMic (el recycle/reconnect re-abre el mic).
			const aec = detectAec(this.stream);
			const prevMode = this.aecMode;
			this.aec = aec;
			this.aecMode = aec.aecEnabled ? "aec" : "no-aec";
			// Ciclo NUEVO de startMic → el override conductual arranca limpio (puede
			// degradar UNA vez por ciclo si el eco confirmado reaparece).
			this.aecDowngraded = false;
			this.aecEchoAccumMs = 0;
			this.aecEchoWindowOpen = false;
			this.aecEchoLastAt = 0;
			// P5 / Fase B4: arranque de mic → overlay y piso de eco limpios
			// (el piso se re-aprende en el primer playback de la sesión).
			this.resetPlaybackOverlay();
			this.tel("aec_status", {
				mode: this.aecMode,
				aecEnabled: aec.aecEnabled,
				fullProcessing: aec.fullProcessing,
				requested: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
				applied: aec.settings,
				capabilities: aec.capabilities,
				capabilitiesSupported: aec.capabilitiesSupported,
			});
			if (this.aecMode !== prevMode) {
				console.info(`[voice] modo AEC = ${this.aecMode}`);
			}
			// La UI necesita conocer el modo SIEMPRE (no solo en cambios): el default
			// es no-AEC y en una máquina no-AEC el modo nunca cambia → sin esto el
			// aviso de la Fase B2 no aparecería. Idempotente para el consumidor
			// (cada startMic reporta el modo actual; el override conductual también
			// lo invoca al degradar).
			this.callbacks.onModeChange?.(this.aecMode, aec);
			// Modo AEC → reforzar la config de sesión (server-vad) por session-update.
			this.applyModeSessionConfig();
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
					// SIN AEC el mic capta el audio del asistente por el altavoz; si ese
					// audio entrara al buffer del servidor, el próximo commit lo
					// transcribiría como "pregunta del usuario" → REPITE LA RESPUESTA
					// (loop de eco). Se corta ANTES del batcher.
					// MODO AEC (server VAD): el gate se DESACTIVA — el mic SIEMPRE
					// appendea (el AEC cancela al asistente; el server decide el commit
					// y el barge-in lo corta vía speech-started).
					// MODO no-AEC (fallback): camino intacto (esta máquina hoy).
					if (this.aecMode !== "aec") {
						if (this._playing) {
							// P5 / Fase B4 (EXPERIMENTAL): en lugar de descartar la voz del
							// usuario durante el playback (`mic_drop`), capturarla en el
							// buffer de overlay (solo si el flag está ON). Con el flag OFF
							// el comportamiento es byte-identical al actual.
							if (VOICE_BUFFER_DURING_PLAYBACK) {
								this.capturePlaybackOverlay(input, ctx.sampleRate);
							} else {
								this.telMicDrop("playing", input);
							}
							return;
						}
						if (Date.now() - this.lastPlaybackEndAt < VOICE_PLAYBACK_COOLDOWN_MS) {
							this.telMicDrop("cooldown", input);
							return;
						}
					} else {
						// MODO AEC (Fase B2): el mic SIEMPRE appendea, pero se monitorea
						// el patrón de eco durante playback (override conductual — riesgo
						// #1 de B1: AEC declarado pero inefectivo). Si el eco se confirma,
						// este monitor DEGRADA a no-AEC en caliente y el gate de arriba
						// empieza a aplicarse en el siguiente batch.
						this.monitorAecEcho(input);
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
			// Idle watchdog (Fase B3): al arrancar el mic se arma el contador.
			this.noteActivity();
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
		// Override conductual del AEC (Fase B2): limpiar la ventana de eco al
		// detener el mic (el acumulador se re-arranca en el próximo startMic).
		this.aecEchoAccumMs = 0;
		this.aecEchoWindowOpen = false;
		this.aecEchoLastAt = 0;
		// P5 / Fase B4: al detener el mic se cancela el commit diferido del
		// overlay pendiente y se limpia el buffer (no commitear sobre una
		// sesión/mic cerrado).
		this.resetPlaybackOverlay();
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
		// Idle watchdog (Fase B3): sin mic no hay inactividad que vigilar.
		this.stopIdleWatchdog();
		// Red de seguridad del modo AEC: al detener el mic no debe quedar el
		// fallback de commit pendiente (no reintentar sobre una sesión cerrada).
		if (this.aecVadFallback) {
			clearTimeout(this.aecVadFallback);
			this.aecVadFallback = null;
		}
		this.tel("mic_stop");
		this.callbacks.onListeningChange?.(false);
	}

	/**
	 * Override conductual del AEC (Fase B2) — defensa del riesgo #1 de B1.
	 * `getSettings().echoCancellation === true` NO garantiza AEC efectivo: si en
	 * modo AEC el mic capta RMS alto mientras suena el asistente (`_playing`),
	 * puede ser (a) barge-in real del usuario o (b) el ECO del asistente que el
	 * AEC declarado no cancela. Se acumula el tiempo de RMS ≥ umbral DURANTE
	 * playback; si el patrón es SOSTENIDO (≥ `AEC_ECHO_CONFIRM_MS` acumulados sin
	 * caer del umbral) se considera eco confirmado → `downgradeToNoAec`.
	 * LIMITACIÓN documentada: un barge-in legítimo y continuo (~2s) también cruza
	 * la ventana y degrada igual — degradar es SEGURO (solo suprime el mic durante
	 * playback; la voz del usuario no se pierde, se transcribe al terminar el
	 * asistente) y es la estrategia conservadora del diseño §5.2.
	 * Blindado: nunca lanza (corre en el callback del worklet).
	 */
	private monitorAecEcho(samples: Float32Array): void {
		try {
			if (this.aecMode !== "aec") return;
			if (this.aecDowngraded) return;
			if (!this._playing) {
				// Sin playback no hay eco posible: la ventana se reinicia.
				this.aecEchoAccumMs = 0;
				this.aecEchoWindowOpen = false;
				return;
			}
			let sum = 0;
			for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
			const rms = Math.sqrt(sum / samples.length);
			const now = Date.now();
			if (rms < AEC_ECHO_RMS_OVERRIDE) {
				// RMS bajo: ni eco ni voz fuerte → reset (el eco sostenido del asistente
				// no cae del umbral; la voz real del usuario sí "respira").
				this.aecEchoAccumMs = 0;
				this.aecEchoWindowOpen = false;
				return;
			}
			// Abrir la ventana solo al primer batch alto tras un reset; el acumulador
			// suma los DELTAS entre batches (≈171ms c/u), no re-ancla en `now`.
			if (!this.aecEchoWindowOpen) {
				this.aecEchoWindowOpen = true;
				this.aecEchoLastAt = now;
			}
			this.aecEchoAccumMs += now - this.aecEchoLastAt;
			this.aecEchoLastAt = now;
			const sincePlaybackStartMs = now - this.lastAssistantSpeakAt;
			// Telemetría throttled del patrón (no inundar la radiografía).
			if (now - this.lastEchoRejectTelAt >= AEC_ECHO_REJECT_TEL_MS) {
				this.lastEchoRejectTelAt = now;
				this.tel("echo_reject_vad", {
					rms: Number(rms.toFixed(4)),
					sincePlaybackStartMs,
					accumMs: Math.round(this.aecEchoAccumMs),
				});
			}
			if (this.aecEchoAccumMs >= AEC_ECHO_CONFIRM_MS) {
				this.downgradeToNoAec("eco-sostenido-durante-playback", {
					rms: Number(rms.toFixed(4)),
					accumMs: Math.round(this.aecEchoAccumMs),
					sincePlaybackStartMs,
				});
			}
		} catch {
			/* noop */
		}
	}

	/**
	 * Degrada el modo AEC → no-AEC EN CALIENTE (override conductual, Fase B2):
	 * el AEC declarado resultó inefectivo (eco confirmado durante playback) y el
	 * server VAD lo escucharía como habla del usuario → barge-in en loop. Al
	 * degradar:
	 *   - `aecMode = "no-aec"` → el gate del append (suprimir mic durante
	 *     playback + cooldown) se reactiva en el siguiente batch del worklet.
	 *   - Se re-envía `session-update` con turnDetection disabled (el server VAD
	 *     deja de emitir speech-started → sin barge-in fantasma).
	 *   - Se desarma la red de seguridad del server VAD y se resetea el VAD
	 *     cliente (el commit vuelve a ser manual, camino no-AEC intacto).
	 *   - Telemetría `aec_downgrade` con la evidencia + `session_mode` nuevo.
	 * Solo UNA vez por ciclo de `startMic` (`aecDowngraded`). Blindado.
	 */
	private downgradeToNoAec(reason: string, evidence: Record<string, unknown>): void {
		try {
			if (this.aecDowngraded) return;
			if (this.aecMode !== "aec") return;
			this.aecDowngraded = true;
			this.aecMode = "no-aec";
			this.aecEchoAccumMs = 0;
			this.aecEchoWindowOpen = false;
			this.tel("aec_downgrade", { prev: "aec", reason, ...evidence });
			console.info(
				`[voice] AEC DEGRADADO a no-AEC (${reason}, accumMs=${String(evidence.accumMs ?? '?')}) — gate del append reactivado`,
			);
			// Apagar la red de seguridad del server VAD (ya no aplica en no-AEC) y
			// resetear el VAD cliente: el commit vuelve a ser manual (fin de frase).
			if (this.aecVadFallback) {
				clearTimeout(this.aecVadFallback);
				this.aecVadFallback = null;
			}
			this.vadSpeaking = false;
			this.utteranceChunks = [];
			this.utteranceBytes = 0;
			// Re-enviar la config de sesión: turnDetection pasa a disabled (el server
			// VAD dejaría de oír "habla" donde hay eco → sin barge-in fantasma).
			this.applyModeSessionConfig();
			// Notificar a la UI: el modo cambió (la UI actualiza el aviso).
			if (this.aec) this.callbacks.onModeChange?.(this.aecMode, this.aec);
		} catch {
			/* noop */
		}
	}

	// ── Buffer de voz durante playback (P5 / Fase B4, EXPERIMENTAL) ────────

	/**
	 * Captura de voz del usuario DURANTE el playback del asistente (P5).
	 * Sin AEC, `_playing` descarta el mic por completo (`mic_drop`) — la voz del
	 * usuario que habla mientras el asistente suena se pierde en silencio. Este
	 * método (solo con `VOICE_BUFFER_DURING_PLAYBACK = true`) captura en un
	 * buffer APARTE (`playbackOverlayChunks`) solo las muestras que la heurística
	 * de discriminación marca como "voz probable", y el commit se hace DIFERIDO
	 * al terminar el playback (`schedulePlaybackOverlayCommit`).
	 *
	 * DISCRIMINACIÓN voz-usuario vs eco-asistente (heurística, conservadora):
	 *   - `echoFloorRms` = piso de eco MEDIDO EN EL MIC: EMA del RMS de los
	 *     batches que NO son voz durante `_playing` (la alternativa de usar el
	 *     RMS del audio decodificado de `playAudio` NO sirve: el altavoz atenúa
	 *     el RMS en el mic por un factor de acoplamiento desconocido — el piso
	 *     real es el que mide el mic).
	 *   - Un batch es "voz probable" si `micRms > echoFloorRms * GAIN + MARGIN`
	 *     (1.4× + 0.01): el eco del altavoz fluctúa alrededor del piso; la voz
	 *     real del usuario sube ENCIMA del eco (evidencia del proyecto: ecos
	 *     0.022-0.032 vs voz real 0.125-0.143).
	 *   - "Sostenida (ventana)": se requieren `PLAYBACK_OVERLAY_SUSTAIN_BATCHES`
	 *     batches CONSECUTIVOS de voz (≈342ms) antes de bufferizar — un pico
	 *     suelto (transitorio del eco al subir el volumen del asistente) NO se
	 *     bufferiza. Ante la duda NO se bufferiza (mejor perder que reintroducir
	 *     el loop de eco).
	 *   - Bootstrap: los primeros `PLAYBACK_OVERLAY_WARMUP_MS` de cada run de
	 *     playback NO bufferizan — solo aprenden el piso (`echoFloorRms = max`
	 *     del RMS del mic). Y si el piso sigue en 0 (el audio del asistente aún
	 *     no llegó al mic), se sigue en modo aprendizaje: SIN piso observado NO
	 *     se bufferiza nada (el eco no puede clasificarse como voz aunque llegue
	 *     tarde). El piso tampoco decae en silencio: solo se adapta cuando el
	 *     batch no-voz tiene señal significativa (≥50% del piso), así una pausa
	 *     del asistente dentro del run no deja el umbral por debajo del eco
	 *     cuando retoma.
	 * Blindado: nunca lanza (corre en el callback del worklet).
	 */
	private capturePlaybackOverlay(rawInput: Float32Array, ctxSampleRate: number): void {
		try {
			if (this.aecMode === "aec") return; // en AEC el mic ya appendea (barge-in existe)
			const samples =
				ctxSampleRate === TARGET_RATE
					? rawInput
					: experimental_resampleAudio(rawInput, ctxSampleRate, TARGET_RATE);
			const batchMs = (samples.length / TARGET_RATE) * 1000;
			// Límite de duración del buffer (no acumular infinito en playbacks largos).
			this.overlayTotalMs += batchMs;
			if (this.overlayTotalMs > PLAYBACK_OVERLAY_MAX_MS) {
				this.telOverlayThrottled("overlay_limit", {
					totalMs: Math.round(this.overlayTotalMs),
					voiceMs: Math.round(this.overlayVoiceMs),
				});
				return;
			}
			let sum = 0;
			for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
			const rms = Math.sqrt(sum / samples.length);
			const now = Date.now();
			// Bootstrap del piso: durante el warmup, o mientras el piso no se ha
			// observado (echoFloorRms <= 0), NO se bufferiza — solo se aprende el
			// nivel del eco (`max`). Garantiza que el primer audio del asistente
			// (eco) nunca se clasifique como voz, sin importar cuándo llegue al mic.
			if (
				(this.overlayRunStartAt > 0 && now - this.overlayRunStartAt < PLAYBACK_OVERLAY_WARMUP_MS) ||
				this.echoFloorRms <= 0
			) {
				if (rms > this.echoFloorRms) this.echoFloorRms = rms;
				return;
			}
			const threshold =
				this.echoFloorRms * PLAYBACK_OVERLAY_GAIN_FACTOR + PLAYBACK_OVERLAY_RMS_MARGIN;
			if (rms >= threshold) {
				this.overlaySustainBatches += 1;
				if (this.overlaySustainBatches >= PLAYBACK_OVERLAY_SUSTAIN_BATCHES) {
					this.playbackOverlayChunks.push(samples);
					this.overlayVoiceMs += batchMs;
					if (rms > this.overlayPeakRms) this.overlayPeakRms = rms;
					// La voz del usuario durante playback ES actividad (idle watchdog B3).
					this.noteActivity();
					this.telOverlayThrottled("overlay_capture", {
						rms: Number(rms.toFixed(4)),
						echoFloorRms: Number(this.echoFloorRms.toFixed(4)),
						voiceMs: Math.round(this.overlayVoiceMs),
					});
				}
			} else {
				// No es voz. El piso solo se adapta con señal significativa (rms ≥
				// 50% del piso: eco a volumen parecido); el silencio profundo NO lo
				// degrada — una pausa del asistente dentro del run no deja el umbral
				// por debajo del eco cuando retoma (evita clasificar el retome como
				// voz). Si el asistente sube de volumen, el piso lo sigue (EMA).
				this.overlaySustainBatches = 0;
				if (rms >= this.echoFloorRms * 0.5) {
					this.echoFloorRms =
						this.echoFloorRms * (1 - PLAYBACK_OVERLAY_FLOOR_ALPHA) +
						rms * PLAYBACK_OVERLAY_FLOOR_ALPHA;
				}
				this.telOverlayThrottled("overlay_discard", {
					rms: Number(rms.toFixed(4)),
					echoFloorRms: Number(this.echoFloorRms.toFixed(4)),
					reason: "low-rms",
				});
			}
		} catch {
			/* noop */
		}
	}

	/** Telemetría throttled del overlay (1 por `PLAYBACK_OVERLAY_TEL_MS` — los
	 *  batches llegan cada ~171ms y no se debe inundar la radiografía). Blindado. */
	private telOverlayThrottled(type: string, data: Record<string, unknown>): void {
		try {
			const now = Date.now();
			if (now - this.lastOverlayTelAt < PLAYBACK_OVERLAY_TEL_MS) return;
			this.lastOverlayTelAt = now;
			this.tel(type, data);
		} catch {
			/* noop */
		}
	}

	/** Reinicia el estado del run de playback ACTUAL (buffer de voz, métricas,
	 *  ancla de warmup). NO toca el timer de commit, `overlayCommitInFlight` ni
	 *  `echoFloorRms` (el piso persiste dentro de la sesión de mic). */
	private resetPlaybackOverlayRun(): void {
		this.playbackOverlayChunks = [];
		this.overlayVoiceMs = 0;
		this.overlayTotalMs = 0;
		this.overlayPeakRms = 0;
		this.overlaySustainBatches = 0;
		this.overlayRunStartAt = Date.now();
	}

	/** Reset COMPLETO del overlay (startMic/stopMic/stopPlayback/disconnect):
	 *  cancela el timer de commit, limpia el buffer y el piso de eco. */
	private resetPlaybackOverlay(): void {
		if (this.overlayCommitTimer) {
			clearTimeout(this.overlayCommitTimer);
			this.overlayCommitTimer = null;
		}
		this.overlayCommitInFlight = false;
		this.echoFloorRms = 0;
		this.resetPlaybackOverlayRun();
	}

	/** ¿Queda trabajo de overlay pendiente? (commit diferido en vuelo o buffer con
	 *  voz suficiente sin commitear). `maybeRecycleIdle` lo usa para NO reciclar
	 *  la sesión (disconnect) antes de que el commit diferido se envíe. */
	private hasPendingOverlay(): boolean {
		if (!VOICE_BUFFER_DURING_PLAYBACK) return false;
		if (this.overlayCommitInFlight) return true;
		if (this.overlayVoiceMs >= PLAYBACK_OVERLAY_MIN_VOICE_MS) return true;
		return false;
	}

	/**
	 * Commit DIFERIDO del overlay (P5): se llama al terminar el playback
	 * (`playAudio` onended con `activeSources === 0`). Espera
	 * `VOICE_PLAYBACK_COOLDOWN_MS` (que el audio del asistente deje de resonar
	 * en el altavoz) y solo entonces, si el buffer acumuló ≥
	 * `PLAYBACK_OVERLAY_MIN_VOICE_MS` de "voz probable", re-appendea el audio
	 * bufferizado por la ruta NORMAL (`input-audio-append` + `input-audio-commit`)
	 * → la transcripción llega como pregunta normal (con su dedupe de la UI).
	 * Gates: `overlayCommitInFlight` (nunca dos commits de overlay en vuelo),
	 * sesión conectada, modo no-AEC, voz suficiente. Blindado.
	 */
	private schedulePlaybackOverlayCommit(): void {
		try {
			if (!VOICE_BUFFER_DURING_PLAYBACK) return;
			if (this.aecMode === "aec") return;
			if (!this.connected) return;
			if (this.overlayCommitInFlight) {
				// Un commit anterior sigue en vuelo: descartar este run (evitar
				// duplicados) — mejor perder que re-subir audio ya commiteado.
				if (this.overlayVoiceMs > 0) {
					this.tel("overlay_discard", {
						reason: "in-flight",
						voiceMs: Math.round(this.overlayVoiceMs),
					});
				}
				this.resetPlaybackOverlayRun();
				return;
			}
			if (this.overlayVoiceMs < PLAYBACK_OVERLAY_MIN_VOICE_MS) {
				// Voz insuficiente → descartar en silencio (registrado en telemetría).
				if (this.overlayVoiceMs > 0 || this.playbackOverlayChunks.length > 0) {
					this.tel("overlay_discard", {
						reason: "min-voice",
						voiceMs: Math.round(this.overlayVoiceMs),
						peakRms: Number(this.overlayPeakRms.toFixed(4)),
					});
				}
				this.resetPlaybackOverlayRun();
				return;
			}
			// Esperar el cooldown del playback (el residuo del asistente en el
			// altavoz aún resuena → no se debe commitear encima).
			this.overlayCommitTimer = setTimeout(() => {
				this.overlayCommitTimer = null;
				this.commitPlaybackOverlay();
			}, VOICE_PLAYBACK_COOLDOWN_MS);
		} catch {
			/* noop */
		}
	}

	/**
	 * Envía el buffer de overlay al servidor (re-append + commit manual) y arma
	 * el watchdog de recuperación (`startCommitWatchdog`) — el mismo mecanismo
	 * del flujo normal: re-commit/re-append si el STT no responde. La
	 * transcripción resultante (`input-transcription-completed`) llega como una
	 * pregunta normal y la UI la trata con su dedupe anti-eco habitual. Blindado.
	 */
	private commitPlaybackOverlay(): void {
		try {
			if (!VOICE_BUFFER_DURING_PLAYBACK) return;
			if (this.aecMode === "aec") return;
			if (!this.connected) return;
			if (this.overlayCommitInFlight) return;
			if (this.overlayVoiceMs < PLAYBACK_OVERLAY_MIN_VOICE_MS) return;
			const chunks = this.playbackOverlayChunks;
			const voiceMs = Math.round(this.overlayVoiceMs);
			const peakRms = Number(this.overlayPeakRms.toFixed(4));
			const floorRms = Number(this.echoFloorRms.toFixed(4));
			// Limpiar ANTES de enviar (el buffer no debe reutilizarse).
			this.resetPlaybackOverlayRun();
			this.overlayCommitInFlight = true;
			// Encode en batches del protocolo (4096 = ~171ms), como el flujo normal.
			const encoded: string[] = [];
			for (const chunk of chunks) {
				let offset = 0;
				while (offset < chunk.length) {
					const part = chunk.slice(offset, offset + CAPTURE_BATCH_SAMPLES);
					const audio = experimental_encodeRealtimeAudio(part);
					if (audio) {
						this.send({ type: "input-audio-append", audio });
						encoded.push(audio);
					}
					offset += CAPTURE_BATCH_SAMPLES;
				}
			}
			this.send({ type: "input-audio-commit" });
			this.lastCommitAt = Date.now();
			this.lastCommitPeakRms = peakRms;
			this.tel("overlay_commit", {
				voiceMs,
				peakRms,
				echoFloorRms: floorRms,
				chunks: chunks.length,
				appendBatches: encoded.length,
			});
			console.info(
				`[overlay] commit diferido: ${voiceMs}ms voz (peak ${peakRms}, floor ${floorRms}) → ${encoded.length} batches`,
			);
			// Misma recuperación que el flujo normal (re-commit/re-append/give-up).
			this.startCommitWatchdog(encoded, 1);
		} catch {
			/* noop */
		}
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
	 *
	 * MODO AEC (server VAD): el VAD cliente NO commitea — el server lo hace
	 * (speech-stopped → commit). El VAD cliente queda SOLO como red de seguridad:
	 * si el server no emite commit tras `SERVER_VAD_COMMIT_FALLBACK_MS` de habla,
	 * se dispara el commit manual (fallback ante STT/server-VAD caído).
	 *
	 * - Energía alta: inicio de habla.
	 * - Silencio ≥ VOICE_SILENCE_MS tras haber hablado: fin de frase → commit (no-AEC).
	 */
	private vadTick(samples: Float32Array): void {
		try {
			const now = Date.now();
			const aecMode = this.aecMode === "aec";
			// Camino no-AEC (fallback): el mic capta el audio del asistente: ignorar
			// mientras suena y en la ventana de cooldown posterior (residuo del altavoz).
			// En modo AEC el mic siempre appendea (el AEC cancela al asistente).
			if (!aecMode) {
				if (this._playing) return;
				if (now - this.lastPlaybackEndAt < VOICE_PLAYBACK_COOLDOWN_MS) return;
			}
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
					this.tel("vad_speech", { rms: Number(rms.toFixed(4)), mode: this.aecMode });
					// Modo AEC: armar la red de seguridad del commit (el server VAD
					// debería emitir speech-stopped → commit; si no llega, fallback).
					if (aecMode) this.armServerVadFallback();
				} else if (rms > this.vadPeakRms) {
					this.vadPeakRms = rms;
				}
				this.vadLastVoiceAt = now;
				// Idle watchdog (Fase B3): el usuario está hablando → actividad.
				this.noteActivity();
				return;
			}
			if (!this.vadSpeaking) return;
			// Modo AEC: el server VAD decide el commit; aquí solo el fallback (timer).
			// El silencio NO resetea el fallback — el server aún puede commitear.
			if (aecMode) return;
			if (now - this.vadLastVoiceAt >= VOICE_SILENCE_MS) {
				this.vadSpeaking = false;
				this.finalizeUtterance();
			}
		} catch {
			/* noop */
		}
	}

	/**
	 * Red de seguridad del MODO AEC (feature flag `SERVER_VAD_COMMIT_FALLBACK_MS`):
	 * si el server VAD no emite su commit (`speech-stopped` → input-transcription)
	 * tras el umbral de habla continua, el VAD cliente commitea manualmente el
	 * audio ya enviado (misma ruta que el modo no-AEC). Se desarma en
	 * `input-transcription-completed` o al detener el mic. Blindado.
	 */
	private armServerVadFallback(): void {
		try {
			if (this.aecVadFallback) clearTimeout(this.aecVadFallback);
			this.aecVadFallback = setTimeout(() => {
				this.aecVadFallback = null;
				if (this.aecMode !== "aec") return;
				if (!this.vadSpeaking) return;
				this.tel("vad_server_fallback", {
					speechDurationMs: this.vadSpeechStartAt ? Date.now() - this.vadSpeechStartAt : 0,
					peakRms: Number(this.vadPeakRms.toFixed(4)),
				});
				console.info(
					`[vad] AEC fallback: sin commit del server tras ${SERVER_VAD_COMMIT_FALLBACK_MS}ms → commit manual`,
				);
				this.vadSpeaking = false;
				this.finalizeUtterance();
			}, SERVER_VAD_COMMIT_FALLBACK_MS);
		} catch {
			/* noop */
		}
	}

	/** Commit manual del audio capturado: dispara la transcripción del servidor.
	 *  El mic NO se detiene: queda activo durante el turno para permitir el
	 *  barge-in continuo (el usuario puede añadir contexto "al vuelo").
	 *  En modo AEC es la ruta del FALLBACK (armServerVadFallback): el commit
	 *  normal lo decide el server VAD; aquí solo se llega si el server no
	 *  commiteó tras `SERVER_VAD_COMMIT_FALLBACK_MS`. En modo no-AEC es la
	 *  ruta principal (fin de frase del VAD cliente). */
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
	 * Watchdog del commit + RECUPERACIÓN — MODO no-AEC (fallback):
	 * en modo AEC el commit lo hace el server VAD, así que este watchdog NO
	 * aplica en el camino principal; solo se alcanza vía el fallback de
	 * `finalizeUtterance` (armServerVadFallback) si el server VAD falló.
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
			// P5 / Fase B4: el commit del overlay se rindió → liberar el flag
			// anti-duplicados (un reconnect resetea el buffer igualmente).
			this.overlayCommitInFlight = false;
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
		// MODO AEC: el reciclaje proactivo NO aplica — el server VAD + STT
		// deberían funcionar en la misma sesión; el recycle era un parche del
		// modo no-AEC (STT que moría tras la 1ª transcripción). Camino no-AEC
		// (fallback) intacto debajo.
		if (this.aecMode === "aec") return;
		if (!this.autoCancelAfterTranscript) return; // solo la capa delgada de /chat
		if (this.recycledSinceTranscript) return;
		if (this._responding || this.speaking || this.speakQueue.length > 0) return;
		if (this.recycleTimer) clearTimeout(this.recycleTimer);
		const recycle = () => {
			this.recycleTimer = null;
			// P5 / Fase B4: si el commit diferido del overlay sigue pendiente
			// (en vuelo o con voz sin commitear), esperar a que termine — un
			// recycle hace disconnect() → se perdería la voz capturada durante
			// el playback. Se re-programa hasta que el overlay resuelva.
			if (this.hasPendingOverlay()) {
				this.recycleTimer = setTimeout(recycle, 1000);
				return;
			}
			if (this.recycledSinceTranscript) return;
			if (this._responding || this.speaking || this.speakQueue.length > 0) return;
			this.recycledSinceTranscript = true;
			void this.reconnectVoiceSession("recycle");
		};
		this.recycleTimer = setTimeout(recycle, 1000);
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
		// MODO AEC: el reciclaje PROACTIVO ("recycle") no aplica (server VAD +
		// STT estables en la misma sesión — el recycle era un parche no-AEC).
		// La recuperación por fallo ("give_up") sí corre en ambos modos.
		if (reason === "recycle" && this.aecMode === "aec") return;
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

	/**
	 * Envía el `session-update` con la config de sesión. El `turnDetection`
	 * SIEMPRE refleja el modo activo (Fase B1):
	 *   - modo AEC → server-vad (`SERVER_VAD_CONFIG`): el server decide el commit
	 *     y emite speech-started para el barge-in.
	 *   - modo no-AEC → disabled: el commit manual lo hace el VAD cliente.
	 * Así el `session_resync` existente (re-envío tras auto-cancel) refuerza el
	 * modo correcto sin código extra.
	 */
	private sendSessionUpdate(): void {
		if (!this.sessionConfig) return;
		const config: RealtimeSessionConfig = {
			...(this.sessionConfig as RealtimeSessionConfig),
			turnDetection:
				this.aecMode === "aec" ? { ...SERVER_VAD_CONFIG } : { type: "disabled" },
		};
		this.send({ type: "session-update", config });
	}

	/**
	 * Refuerza la config de sesión según el modo detectado (Fase B1). Se llama
	 * tras `startMic` (cuando ya se conoce el AEC real) para aplicar el
	 * server-vad en modo AEC (el endpoint arranca con `disabled` como default).
	 * Telemetría `session_mode` con el modo aplicado. Blindado.
	 */
	private applyModeSessionConfig(): void {
		try {
			if (!this.sessionConfig) return;
			this.tel("session_mode", {
				mode: this.aecMode,
				turnDetection: this.aecMode === "aec" ? "server-vad" : "disabled",
			});
			console.info(`[voice] session-update modo=${this.aecMode} (${this.aecMode === "aec" ? "server-vad" : "disabled"})`);
			this.sendSessionUpdate();
		} catch (err) {
			console.warn(`[voice] applyModeSessionConfig: ${String(err)}`);
		}
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
				// ── Barge-in real (SOLO modo AEC) ──
				// El server VAD detectó habla del usuario → corta el audio del
				// asistente y descarta utterances pendientes. En modo no-AEC es
				// informativo (el gate del append ya suprime el mic; el barge-in
				// lo maneja `input-transcription-completed`).
				if (this.aecMode === "aec") {
					const playingBeforeCut = this._playing;
					console.info(`[voice] BARGE-IN speech-started (playing=${playingBeforeCut})`);
					this.tel("barge_in", { playing: playingBeforeCut });
					this.cutPlayback();
					this.clearSpokenQueue();
				}
				break;
			case "speech-stopped":
				// Informativo: el server terminó el turno del usuario (el commit
				// lo confirma `input-transcription-completed`).
				this.tel("vad_server_stop", { mode: this.aecMode });
				break;
			case "input-transcription-completed":
				// Idle watchdog (Fase B3): transcripción del usuario → actividad.
				this.noteActivity();
				if (this.commitWatchdog) {
					clearTimeout(this.commitWatchdog);
					this.commitWatchdog = null;
				}
				// P5 / Fase B4: la transcripción llegó → el commit diferido del
				// overlay terminó (el watchdog ya se limpió arriba). Permite
				// futuros commits de overlay sin chocar con el anti-duplicados.
				this.overlayCommitInFlight = false;
				// Modo AEC: el server commiteó → apagar la red de seguridad del
				// commit manual y reiniciar el VAD cliente (la próxima frase arma
				// su propio fallback). Camino no-AEC intacto.
				if (this.aecMode === "aec") {
					if (this.aecVadFallback) {
						clearTimeout(this.aecVadFallback);
						this.aecVadFallback = null;
					}
					this.vadSpeaking = false;
					this.utteranceChunks = [];
					this.utteranceBytes = 0;
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
				// Idle watchdog (Fase B3): la respuesta del asistente cerró → actividad.
				this.noteActivity();
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
			const wasIdle = this.activeSources === 0;
			this.activeSources += 1;
			this._playing = true;
			if (wasIdle) {
				// P5 / Fase B4: un playback NUEVO arranca el buffer de overlay limpio
				// (la voz capturada en un run anterior ya se commitó/descartó).
				this.resetPlaybackOverlayRun();
			}
			this.lastAssistantSpeakAt = Date.now();
			// Idle watchdog (Fase B3): el audio del asistente suena → actividad.
			this.noteActivity();
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
					// P5 / Fase B4: al terminar el playback se arma el commit DIFERIDO
					// de la voz del usuario capturada durante el playback (si el flag
					// está ON y hubo voz probable suficiente). Va ANTES del recycle
					// (un recycle haría disconnect → se perdería el buffer).
					this.schedulePlaybackOverlayCommit();
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
		// P5 / Fase B4: un corte de playback (barge-in / cut / desconexión)
		// descarta el buffer de overlay y cancela el commit diferido pendiente.
		this.resetPlaybackOverlay();
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
