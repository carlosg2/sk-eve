import { json } from "@sveltejs/kit";
import { listEvents } from "../../../../../agent/lib/session-store.js";

// Razonamiento reconstruido de una sesión (radiografía). El stream emite
// `reasoning.appended` con `reasoningDelta` (incremento) y `reasoningSoFar`
// (acumulado); `reasoning.completed` trae el bloque final. Se reconstruye el
// razonamiento de cada turno concatenando los deltas en orden (verificado:
// coincide 1:1 con el completed). Segmentable por turno y por step.
//
// GET /api/audit/reasoning?sessionId=<id>
//   → { sessionId, turns: [{ turnId, chars, steps, reasoning, completed }] }

function dataOf(e: { data?: unknown }): Record<string, unknown> {
  return (e?.data ?? {}) as Record<string, unknown>;
}

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return json({ error: "falta sessionId" }, { status: 400 });
  try {
    const events = await listEvents(sessionId);
    const appended = events.filter((e) => e.type === "reasoning.appended");
    const completed = events.filter((e) => e.type === "reasoning.completed");

    // Agrupar por turno conservando el orden del stream (meta.id ULID = orden).
    const byTurn = new Map<string, Array<{ delta: string; step: number }>>();
    for (const e of appended) {
      const d = dataOf(e);
      const turnId = String(d.turnId ?? "?");
      if (!byTurn.has(turnId)) byTurn.set(turnId, []);
      byTurn.get(turnId)!.push({ delta: String(d.reasoningDelta ?? ""), step: Number(d.stepIndex ?? 0) });
    }
    const completedByTurn = new Map<string, string>();
    for (const e of completed) {
      const d = dataOf(e);
      completedByTurn.set(String(d.turnId ?? "?"), String(d.reasoning ?? d.reasoningSoFar ?? ""));
    }

    const turns = [...byTurn.entries()].map(([turnId, chunks]) => {
      const steps = [...new Set(chunks.map((c) => c.step))].sort((a, b) => a - b);
      return {
        turnId,
        chunks: chunks.length,
        steps,
        chars: chunks.reduce((acc, c) => acc + c.delta.length, 0),
        reasoning: chunks.map((c) => c.delta).join(""),
        completed: completedByTurn.get(turnId) ?? null,
      };
    });

    return json({ sessionId, turns, count: turns.length });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}
