import { json } from "@sveltejs/kit";
import { createGateway } from "@ai-sdk/gateway";
// `$env/static/private` se carga desde los .env en tiempo de build/dev; el
// runtime SSR NO expone `.env.local` en `process.env` (la lib del gateway lee
// `process.env.AI_GATEWAY_API_KEY` y por eso hay que pasarla explícitamente).
import { AI_GATEWAY_API_KEY } from "$env/static/private";
import { SERVER_VAD_CONFIG, TURN_DETECTION_DEFAULT } from "$lib/realtime/voice-session-config";
import type { RequestHandler } from "./$types";

const REALTIME_MODEL = "xai/grok-voice-think-fast-2.0";

const gw = createGateway({ apiKey: AI_GATEWAY_API_KEY });

// ── Arquitectura: capa delgada de voz sobre el agente de /chat ──────────────
// Este endpoint NO expone tools: la sesión realtime aquí es SOLO un canal de
// voz (STT + TTS) que controla al agente de Eve que ya corre en /chat.
//   1. STT: el usuario habla → server-vad transcribe → el texto se escribe en
//      el chat y se envía al agente (tool calls visibles en pantalla).
//   2. TTS: cuando el agente termina su respuesta COMPLETA en pantalla, la capa
//      le pide al modelo leerla en voz alta, EXACTA (instrucción de lectura
//      verbatim, sin reformular).
// El modelo realtime NUNCA responde por su cuenta: la capa cancela la
// respuesta automática tras cada transcripción (autoCancelAfterTranscript en el
// cliente) y solo pide audio cuando hay texto que leer.
const VOICE_INSTRUCTIONS = [
	"Eres la capa de voz del chat del Asistente ERP. Tu ÚNICA función es voz:",
	"",
	"1) TRANSCRIBE lo que dice el usuario. No respondas nada por tu cuenta.",
	"2) Nunca hables por tu cuenta: solo transcribes. La UI te pedirá leer texto cuando haya que leerlo.",
	"",
	"Reglas estrictas:",
	"- Si no recibes la orden «Lee en voz alta:», permanece en silencio total (solo transcribes).",
	"- Nunca respondas preguntas, nunca des opiniones, nunca completes frases del texto a leer.",
	"- El texto a leer suele ser un resumen hablado (SPEECH) que el agente formuló: léelo con naturalidad, pausado y claro, pronunciando los números y datos tal cual aparecen.",
	"- Cuando leas, pronuncia los números y datos tal cual aparecen.",
	"",
].join("\n");

/**
 * Setup de la sesión realtime de voz del CHAT (capa delgada):
 *   1. Minta un client-secret (`vcst_`) de un solo uso.
 *   2. Configura la sesión SIN tools, con transcripción de entrada (STT) y
 *      salida de audio (TTS), VAD de servidor para detectar fin de frase.
 * La UI aplica todo en `session-update` tras abrir el WebSocket.
 */
export const POST: RequestHandler = async ({ url }) => {
	try {
		// `turnDetection` es configurable por query param para poder probar el modo
		// server-vad (AEC) en E2E sin depender de la detección de AEC del mic:
		//   ?turnDetection=server-vad → SERVER_VAD_CONFIG (patrón canónico)
		//   (ausente/cualquier otro)   → TURN_DETECTION_DEFAULT (disabled, seguro)
		const turnDetection =
			url.searchParams.get("turnDetection") === "server-vad"
				? SERVER_VAD_CONFIG
				: TURN_DETECTION_DEFAULT;
		const { token, url: wsUrl, expiresAt } = await gw.experimental_realtime.getToken({
			model: REALTIME_MODEL,
		});
		return json({
			token,
			url: wsUrl,
			expiresAt,
			sessionConfig: {
				instructions: VOICE_INSTRUCTIONS,
				outputModalities: ["audio"],
				inputAudioFormat: { type: "audio/pcm", rate: 24000 },
				outputAudioFormat: { type: "audio/pcm", rate: 24000 },
				// Default seguro (no-AEC). En modo AEC el cliente lo sobreescribe
				// con `SERVER_VAD_CONFIG` vía `session-update` tras detectar AEC
				// (y aquí puede forzarse por query param para pruebas).
				turnDetection,
				inputAudioTranscription: { model: "xai/grok-stt", language: "es" },
			},
		});
	} catch (err) {
		console.error("[realtime/chat-token] fallo:", err);
		return json(
			{ error: err instanceof Error ? err.message : "No se pudo obtener el token de voz" },
			{ status: 500 },
		);
	}
};
