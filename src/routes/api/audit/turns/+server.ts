import { json } from "@sveltejs/kit";
import {
  listTurnSummaries,
  listEvents,
  listLlmInputs,
  type TurnSummaryRecord,
} from "../../../../../agent/lib/session-store.js";

// Radiografía por turno (self-improvement): lista los turnos de una sesión
// DERIVÁNDOLOS del espejo de eventos (turnIds de Eve), enriquecidos con el
// resumen durable (turn_summaries) cuando existe. Así TODA sesión espejada es
// explorable — aunque su turno corrió antes de existir las tablas de resumen
// (se derivan métricas de los step.completed/actions del propio espejo).
//
// GET /api/audit/turns?sessionId=...&limit=50
//   → [{ sessionId, turn, turnId, at, turnMs, steps, toolCalls, inputTok,
//       outputTok, cacheRead, cacheHit, errors, warnings, status,
//       question, answer, planTag, toolErrors }]

type TurnAudit = TurnSummaryRecord & {
  turnId: string;
  question: string | null;
  answer: string | null;
  planTag: string | null;
  toolErrors: string[];
};

type Ev = { type: string; data?: unknown; meta: { id: string; at: string } };

function d<T = Record<string, unknown>>(e: Ev): T {
  return (e.data ?? {}) as T;
}

function planTagFrom(inputs: Array<{ instructions: unknown; messages: unknown }>): string | null {
  for (const inp of inputs) {
    const m = JSON.stringify([inp.instructions, inp.messages]).match(/\[plan:([0-9a-f]{8})\]/);
    if (m) return m[1];
  }
  return null;
}

async function turnsForSession(
  sessionId: string,
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const events = (await listEvents(sessionId)) as Ev[];
  const summaries = await listTurnSummaries({ sessionId, limit: 500 });
  const inputs = await listLlmInputs({ sessionId, limit: 1000 });

  // turnIds en orden de aparición en el stream.
  const seen = new Set<string>();
  const turnIds: string[] = [];
  for (const e of events) {
    const tid = String(d(e as Ev).turnId ?? "");
    if (tid && !seen.has(tid)) {
      seen.add(tid);
      turnIds.push(tid);
    }
  }
  if (!turnIds.length) return [];

  const orderedSummaries = [...summaries].reverse(); // ASC por id (orden de cierre)
  const planTag = planTagFrom(inputs);
  const out: Array<Record<string, unknown>> = [];

  for (const [i, tid] of turnIds.entries()) {
    const turnEvents = events.filter((e) => String(d(e as Ev).turnId ?? "") === tid);
    const s = orderedSummaries[i];

    const question =
      (turnEvents.find((e) => e.type === "message.received")?.data as { message?: string } | undefined)?.message ??
      null;
    const answer =
      (turnEvents.find((e) => e.type === "message.completed")?.data as { message?: string } | undefined)?.message ??
      null;

    // Métricas derivadas del espejo (siempre disponibles).
    let steps = 0;
    let inputTok = 0;
    let outputTok = 0;
    let cacheRead = 0;
    const toolErrors: string[] = [];
    let toolCalls = 0;
    for (const e of turnEvents) {
      if (e.type === "step.started") steps++;
      else if (e.type === "actions.requested") toolCalls += ((d(e as Ev).actions ?? []) as unknown[]).length;
      else if (e.type === "step.completed") {
        const u = (d(e as Ev) as { usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number } }).usage;
        inputTok += u?.inputTokens ?? 0;
        outputTok += u?.outputTokens ?? 0;
        cacheRead += u?.cacheReadTokens ?? 0;
      } else if (e.type === "action.result") {
        const rd = d(e as Ev) as { result?: { isError?: boolean; output?: unknown } };
        if (rd?.result?.isError) toolErrors.push(JSON.stringify(rd.result.output ?? "tool error"));
      }
    }
    const errors = toolErrors.length;
    const cacheHit = inputTok ? Math.round((cacheRead / inputTok) * 100) : 0;
    const firstAt = turnEvents[0]?.meta.at ?? null;

    out.push({
      sessionId,
      turn: i, // índice 0-based = coincide con turn_N
      turnId: tid,
      at: s?.at ?? firstAt,
      turnMs: s?.turnMs ?? null,
      steps,
      toolCalls,
      inputTok,
      outputTok,
      cacheRead,
      cacheHit,
      errors,
      warnings: s?.warnings ?? 0,
      status: s?.status ?? (errors ? "error" : "completed"),
      tools: s?.tools ?? [],
      question,
      answer,
      planTag,
      toolErrors,
    });
  }

  return out.slice(-Math.max(1, limit));
}

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));
  try {
    let turns: Array<Record<string, unknown>> = [];
    if (sessionId) {
      turns = await turnsForSession(sessionId, limit);
    } else {
      // Sin filtro: índice de sesiones con resúmenes (rápido), y derivar del
      // espejo solo para las sesiones top (evitar escaneo global caro).
      const summaries = await listTurnSummaries({ limit: 100 });
      const sids = [...new Set(summaries.map((s) => s.sessionId))];
      for (const sid of sids.slice(0, 20)) {
        turns.push(...(await turnsForSession(sid, 20)));
      }
    }
    return json({ turns, count: turns.length });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}

