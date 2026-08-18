import { listEvents } from "../../../../agent/lib/session-store.js";

/**
 * Bridge de voz → agente Eve (/chat).
 *
 * La sesión realtime de voz (Grok Voice) es un ORQUESTADOR DELGADO: no ejecuta
 * el ERP ni consulta el Company Twin directamente. Cuando el usuario pregunta,
 * la voz llama a la tool `ask_agent` y este módulo delega la pregunta al agente
 * real de /chat (mismo runtime: skills, Company Twin, tools MCP, memory) vía
 * HTTP interno, espera a que el turno cierre en background y devuelve la
 * respuesta COMPLETA del agente. La voz solo la re-interpreta hablada.
 *
 * Rutas HTTP de Eve (verificado en `node_modules/eve/dist/src/protocol/routes.js`):
 *   - Crear sesión:   POST /eve/v1/session            con { message } → { sessionId }
 *   - Continuar:      POST /eve/v1/session/:sessionId con { message }
 *   - Stream:         GET  /eve/v1/session/:sessionId/stream (no usado aquí)
 * La señal fiable de fin de turno es `turn.completed`/`turn.failed` en el
 * espejo SQLite (`listEvents`), NO el status derivado de /api/audit/turns.
 * La respuesta final está en el último `message.completed` → `data.message`.
 */

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 240_000; // DeepSeek es lento (baselines hasta ~100s)

/** Referencia de una sesión Eve: sessionId + token de continuación. */
interface EveSessionRef {
	sessionId: string;
	continuationToken?: string;
}

/** voiceSessionId (UUID por conexión de voz) → sesión Eve (continuidad). */
const voiceToEve = new Map<string, EveSessionRef>();

function extractMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  const m = d.message;
  if (typeof m === "string") return m.trim();
  if (m && typeof m === "object") {
    const obj = m as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content.trim();
    if (Array.isArray(obj.content)) {
      return obj.content
        .map((p) => (p && typeof p === "object" && typeof (p as Record<string, unknown>).text === "string" ? String((p as Record<string, unknown>).text) : ""))
        .join("");
    }
  }
  return "";
}

/**
 * Token de continuación AUTORITATIVO de una sesión Eve: el del último evento
 * `session.waiting` (verificado en vivo: el token del body del POST puede
 * quedar stale y el siguiente POST falla con HTTP 400). El `session.waiting`
 * se emite cuando la sesión queda esperando el siguiente mensaje del usuario.
 */
async function readWaitingToken(sessionId: string): Promise<string | undefined> {
  try {
    const events = await listEvents(sessionId);
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.type !== "session.waiting") continue;
      const d = ev.data as { continuationToken?: unknown } | undefined;
      if (d && typeof d.continuationToken === "string") return d.continuationToken;
    }
  } catch {
    /* transitorio */
  }
  return undefined;
}

/**
 * Delega una pregunta al agente Eve de /chat en background y espera su
 * respuesta completa.
 *
 * @param origin         origen del request (para self-calls, agnóstico de puerto)
 * @param voiceSessionId UUID de la conexión de voz (mantiene continuidad de conversación)
 * @param question       pregunta del usuario, verbatim
 */
export async function askEveAgent(
  origin: string,
  voiceSessionId: string,
  question: string,
): Promise<{ ok: boolean; answer?: string; sessionId?: string; error?: string }> {
	const existing = voiceToEve.get(voiceSessionId);

	// ⚠️ Al CONTINUAR una sesión, el espejo ya contiene eventos de turnos previos
	// (incluido su turn.completed y message.completed). Si el poll leyera todo el
	// historial, el turno viejo parecería "cerrado" y se devolvería la respuesta
	// STALE del turno anterior (bug observado: la 2ª pregunta de voz repetía la
	// respuesta de la 1ª). Fix: cursor = último event id conocido ANTES de enviar;
	// el poll solo considera eventos con meta.id > beforeId (ULID = ordenable).
	let beforeId = "";
	if (existing) {
		try {
			const prev = await listEvents(existing.sessionId);
			beforeId = prev.length > 0 ? prev[prev.length - 1].meta.id : "";
		} catch {
			/* sin cursor → tratar todo como nuevo */
		}
	}

	const url = existing
		? `${origin}/eve/v1/session/${encodeURIComponent(existing.sessionId)}`
		: `${origin}/eve/v1/session`;

	// La continuación requiere el continuationToken. ⚠️ El token AUTORITATIVO es
	// el del evento `session.waiting` (el del body del POST queda stale y el
	// siguiente POST falla con 400). Se usa el guardado y, si el POST da 400,
	// se re-lee el token del session.waiting y se reintenta una vez.
	const body: Record<string, unknown> = { message: question };
	if (existing?.continuationToken) body.continuationToken = existing.continuationToken;

	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		if (res.status === 400 && existing) {
			const fresh = await readWaitingToken(existing.sessionId);
			if (fresh) {
				body.continuationToken = fresh;
				res = await fetch(url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				});
			}
		}
	} catch (err) {
		// Si no se pudo contactar al agente, mejor reiniciar el mapeo (puede ser
		// un server recargado / sesión huérfana) y reportar.
		voiceToEve.delete(voiceSessionId);
		return { ok: false, error: `no se pudo contactar al agente: ${err instanceof Error ? err.message : String(err)}` };
	}
	if (!res.ok) {
		return { ok: false, error: `el agente respondió HTTP ${res.status}` };
	}

	let sessionId = "";
	let continuationToken: string | undefined;
	try {
		const parsed = (await res.json().catch(() => ({}))) as {
			sessionId?: unknown;
			continuationToken?: unknown;
		};
		sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId : "";
		continuationToken =
			typeof parsed.continuationToken === "string" ? parsed.continuationToken : undefined;
	} catch {
		/* body no parseable */
	}
	if (!sessionId) {
		return { ok: false, error: "el agente no devolvió sessionId" };
	}
	voiceToEve.set(voiceSessionId, { sessionId, continuationToken });

	// Solo eventos emitidos DESPUÉS del cursor (turno nuevo).
	const isNew = (ev: { meta: { id: string } }) => !beforeId || ev.meta.id > beforeId;

	// Espera (poll) a que el turno cierre y extrae la respuesta final.
	const deadline = Date.now() + POLL_TIMEOUT_MS;
	let answer = "";
	let closed = false;
	while (Date.now() < deadline) {
		let events: Awaited<ReturnType<typeof listEvents>> = [];
		try {
			events = await listEvents(sessionId);
		} catch {
			/* db bloqueada/transitorio → reintentar */
		}
		const fresh = events.filter(isNew);
		for (const ev of fresh) {
			if (ev.type !== "message.completed") continue;
			const msg = extractMessage(ev.data);
			if (msg) answer = msg; // el último message.completed del turno nuevo
		}
		closed =
			fresh.some((ev) => ev.type === "turn.completed") ||
			fresh.some((ev) => ev.type === "turn.failed") ||
			fresh.some((ev) => ev.type === "session.waiting");
		if (closed && answer) break;
		if (closed) {
			// turno cerrado pero sin mensaje: dar un par de reintentos más por si el
			// hook aún no persistió el message.completed.
			for (let i = 0; i < 3 && !answer; i++) {
				await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
				try {
					for (const ev of (await listEvents(sessionId)).filter(isNew)) {
						if (ev.type !== "message.completed") continue;
						const msg = extractMessage(ev.data);
						if (msg) answer = msg;
					}
				} catch {
					/* reintento */
				}
			}
			break;
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}

	// Actualiza la ref guardada con el token AUTORITATIVO del `session.waiting`
	// (el del body del POST queda obsoleto al cerrarse el turno). Así el
	// siguiente ask_agent continúa la conversación sin 400.
	const waitingToken = await readWaitingToken(sessionId).catch(() => undefined);
	voiceToEve.set(voiceSessionId, {
		sessionId,
		continuationToken: waitingToken ?? continuationToken,
	});

	if (!answer) {
		return { ok: false, error: "el agente no produjo respuesta a tiempo" };
	}
	return { ok: true, answer, sessionId };
}

/** Solo para tests/limpieza: olvida el mapeo de una conexión de voz. */
export function forgetVoiceSession(voiceSessionId: string): void {
  voiceToEve.delete(voiceSessionId);
}
