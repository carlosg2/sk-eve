import { json } from "@sveltejs/kit";
import {
  listTurnSummaries,
  listEvents,
  listLlmInputs,
  type TurnSummaryRecord,
} from "../../../../../agent/lib/session-store.js";

// Radiografía por turno (self-improvement): cruza los resúmenes durables
// (turn_summaries) con el espejo de eventos (pregunta → respuesta → tools →
// errores) y el tag del plan de contexto del lóbulo frontal. Es la fuente
// para EVALUAR después qué pasó, cómo y por qué en cada turno.
//
// GET /api/audit/turns?sessionId=...&limit=50
//   → [{ sessionId, turn, at, turnMs, steps, toolCalls, inputTok, outputTok,
//       cacheRead, cacheHit, errors, warnings, status, tools,
//       question, answer, planTag, toolErrors }]

type TurnAudit = TurnSummaryRecord & {
  question: string | null;
  answer: string | null;
  planTag: string | null;
  toolErrors: string[];
};

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));

  try {
    const summaries = await listTurnSummaries({ sessionId, limit });
    if (!summaries.length) return json({ turns: [] });

    // Cargar eventos e inputs del LLM por sesión (una sola vez por sesión).
    const sessionIds = [...new Set(summaries.map((s) => s.sessionId))];
    const eventsBySession = new Map<string, ReturnType<typeof listEvents> extends Promise<infer T> ? T : never>();
    const inputsBySession = new Map<string, ReturnType<typeof listLlmInputs> extends Promise<infer T> ? T : never>();
    for (const sid of sessionIds) {
      eventsBySession.set(sid, await listEvents(sid));
      inputsBySession.set(sid, await listLlmInputs({ sessionId: sid, limit: 1000 }));
    }

    const turns: TurnAudit[] = [];
    // Los `turn` de los resúmenes (frontend, 1-based) no coinciden con el
    // `turnId` de los eventos de Eve (turn_0, 0-based). Se alinea por ORDEN
    // cronológico: los resúmenes y los message.received/completed de la sesión
    // se guardan en orden de emisión, así que el i-ésimo resumen (ascendente)
    // corresponde al i-ésimo mensaje recibido y al i-ésimo completado.
    const orderedSummaries = [...summaries].reverse(); // listTurnSummaries → DESC
    for (const [i, s] of orderedSummaries.entries()) {
      const events = eventsBySession.get(s.sessionId) ?? [];
      const inputs = inputsBySession.get(s.sessionId) ?? [];

      // listEvents devuelve en orden ASC (ULID = cronológico).
      const receivedList = events.filter((e) => e.type === "message.received");
      const completedList = events.filter((e) => e.type === "message.completed");
      const received = receivedList.length ? receivedList[Math.min(i, receivedList.length - 1)] : undefined;
      const completed = completedList.length ? completedList[Math.min(i, completedList.length - 1)] : undefined;
      const question = (received?.data as { message?: string } | undefined)?.message ?? null;
      const answer = (completed?.data as { message?: string } | undefined)?.message ?? null;

      // Errores de tool del turno: action.result con isError o error embebido.
      const toolErrors: string[] = [];
      for (const e of events) {
        if (e.type !== "action.result") continue;
        const d = e.data as { result?: { isError?: boolean; output?: unknown } };
        if (d?.result?.isError) toolErrors.push(JSON.stringify(d.result.output ?? "tool error"));
      }

      // Tag del plan de contexto del lóbulo frontal (best-effort: el llm_input
      // captura ANTES del middleware, así que puede no estar presente).
      let planTag: string | null = null;
      for (const inp of inputs) {
        const haystack = JSON.stringify([inp.instructions, inp.messages]);
        const m = haystack.match(/\[plan:([0-9a-f]{8})\]/);
        if (m) {
          planTag = m[1];
          break;
        }
      }

      turns.push({ ...s, tools: s.tools as never, question, answer, planTag, toolErrors });
    }

    return json({ turns, count: turns.length });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}
