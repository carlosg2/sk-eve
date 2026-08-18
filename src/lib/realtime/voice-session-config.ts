// ── Config de detección de turno de la sesión realtime de voz (Fase B1) ─────
// Compartida por:
//   - `src/routes/api/realtime/chat-token/+server.ts` (default seguro del endpoint)
//   - `src/lib/realtime/grok-voice.ts` (override vía session-update según el modo
//     AEC detectado en el mic) — fuente única, sin espejos que se desincronicen.
//
// Patrón canónico de realtime voice (ver research-n-dev/voice-canonical-patterns.md):
// el VAD lo decide el SERVIDOR (threshold / silence / prefix) y el cliente hace
// barge-in escuchando `speech-started` → corta el playback. El mic SIEMPRE
// appendea; el AEC del cliente cancela el audio del asistente.
//
// Formato NORMALIZADO del AI SDK (camelCase): el gateway mapea a la forma wire
// del provider (`silence_duration_ms` / `prefix_padding_ms`) server-side.

/** Config server-VAD (modo AEC): el server decide el fin de frase y commitea. */
export const SERVER_VAD_CONFIG = {
	type: "server-vad",
	threshold: 0.5,
	silenceDurationMs: 700,
	prefixPaddingMs: 300,
} as const;

/** Default SEGURO (modo no-AEC): sin VAD de servidor — el commit manual lo
 *  dispara el VAD cliente del `GrokVoiceClient` (push-to-talk natural). */
export const TURN_DETECTION_DEFAULT = { type: "disabled" } as const;
