// Telemetría durable de la capa de voz (capa delgada realtime).
//
// El diagnóstico de "dijo algo por voz y no se registró" ocurre en el CLIENTE
// (grok-voice.ts / ChatSession.svelte), ANTES de que el texto llegue a Eve —
// el espejo `events` de la radiografía NO tiene rastro de la pérdida. Este
// endpoint persiste los eventos de voz (vad, mic drops, commits, STT,
// playback, respuestas, decisiones del transcript) en la tabla `voice_events`
// de `.data/sessions.sqlite3`, para poder reconstruir qué pasó cuando una
// pregunta por voz no se registra.
//
// Body: { sessionId?: string, events: [{ at?, type, data? }] }
// El cliente manda los eventos EN LOTE (buffer + flush cada ~2s o 50 eventos).
import { json } from '@sveltejs/kit';
import {
	appendVoiceEvents,
	listVoiceEvents,
	type VoiceTelemetryEvent,
} from '../../../../../agent/lib/session-store.js';

// GET /api/voice/telemetry[?sessionId=…&limit=…] — lee la telemetría de voz
// (más recientes primero). Útil para diagnosticar sesiones de voz: por cada
// `vad_commit` debe haber un `stt`; un `commit_no_transcript` indica que el
// usuario dijo algo y el servidor nunca lo transcribió (la pérdida silenciosa).
export async function GET({ url }) {
	try {
		const sessionId = url.searchParams.get('sessionId') ?? undefined;
		const limit = Number(url.searchParams.get('limit') ?? 200) || 200;
		const events = listVoiceEvents({ sessionId, limit });
		return json({ events, count: events.length });
	} catch {
		return json({ events: [], count: 0 }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const body = (await request.json().catch(() => ({}))) as {
			sessionId?: string | null;
			events?: Array<{ at?: string; type?: string; data?: Record<string, unknown> | null }>;
		};
		const events: VoiceTelemetryEvent[] = (Array.isArray(body.events) ? body.events : []).filter(
			(e): e is VoiceTelemetryEvent => typeof e?.type === 'string' && e.type.length > 0,
		);
		const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : null;
		appendVoiceEvents(events, sessionId);
		return json({ ok: true, count: events.length });
	} catch {
		return json({ ok: false, count: 0 }, { status: 500 });
	}
}
