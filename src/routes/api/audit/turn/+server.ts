import { json } from "@sveltejs/kit";
import { listEvents, listTurnSummaries, listLlmInputs } from "../../../../../agent/lib/session-store.js";

// Vista HOLÍSTICA de un turno: todo lo necesario para diagnosticar qué pensó
// el modelo y dónde se equivocó, en una sola llamada. Se deriva del espejo
// durable (events) + turn_summaries + llm_inputs — no del navegador.
//
// GET /api/audit/turn?sessionId=<id>&turnId=turn_0
//   → {
//       sessionId, turnId, at, turnMs, status, steps, toolCalls,
//       inputTok, outputTok, cacheRead, cacheHit, errors, warnings,
//       question, answer, reasoning, planTag,
//       tools: [{ name, input, output, state }],
//       hitl: [{ prompt }],
//     }

type Ev = { type: string; data?: unknown; meta: { id: string; at: string } };

function d<T = Record<string, unknown>>(e: Ev): T {
  return (e.data ?? {}) as T;
}

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId");
  const turnId = url.searchParams.get("turnId");
  if (!sessionId || !turnId) return json({ error: "faltan sessionId/turnId" }, { status: 400 });
  try {
    const events = await listEvents(sessionId);
    const turnEvents = events.filter((e) => String(d(e as Ev).turnId ?? "") === turnId);
    if (!turnEvents.length) return json({ error: `sin eventos para ${turnId}` }, { status: 404 });

    const reasoning = turnEvents
      .filter((e) => e.type === "reasoning.appended")
      .map((e) => String(d(e as Ev).reasoningDelta ?? ""))
      .join("");

    const question =
      (turnEvents.find((e) => e.type === "message.received")?.data as { message?: string } | undefined)?.message ??
      null;
    const answer =
      (turnEvents.find((e) => e.type === "message.completed")?.data as { message?: string } | undefined)?.message ??
      null;

    // Tools del turno: actions.requested (input) + action.result (output/error).
    const tools: Array<{ name: string; input: unknown; output: unknown; state: string }> = [];
    const byCallId = new Map<string, { name: string; input: unknown }>();
    for (const e of turnEvents) {
      if (e.type === "actions.requested") {
        const acts = (d(e as Ev).actions ?? []) as Array<{ callId?: string; toolName?: string; name?: string; input?: unknown; arguments?: unknown }>;
        for (const a of acts) byCallId.set(String(a.callId ?? ""), { name: String(a.toolName ?? a.name ?? ""), input: a.input ?? a.arguments ?? null });
      } else if (e.type === "action.result") {
        const rd = d(e as Ev) as { result?: { callId?: string; isError?: boolean; output?: unknown } };
        const call = byCallId.get(String(rd?.result?.callId ?? "")) ?? { name: "", input: null };
        tools.push({
          ...call,
          output: rd?.result?.output ?? null,
          state: rd?.result?.isError ? "error" : "ok",
        });
      }
    }

    // Métricas desde step.completed (usage real por turno).
    let inputTok = 0;
    let outputTok = 0;
    let cacheRead = 0;
    let steps = 0;
    for (const e of turnEvents) {
      if (e.type !== "step.completed") continue;
      const u = (d(e as Ev) as { usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number } }).usage;
      inputTok += u?.inputTokens ?? 0;
      outputTok += u?.outputTokens ?? 0;
      cacheRead += u?.cacheReadTokens ?? 0;
      steps++;
    }
    const cacheHit = inputTok ? Math.round((cacheRead / inputTok) * 100) : 0;

    // Errores y HITL.
    const errors = tools.filter((t) => t.state === "error").length;
    const hitl = turnEvents
      .filter((e) => e.type === "input.requested")
      .flatMap((e) => ((d(e as Ev).requests ?? []) as Array<{ prompt?: string }>).map((r) => r.prompt ?? ""));

    // Resumen del turno (turn_summaries: índice 0-based del turnId → resumen N+1).
    let summary: { at?: string; turnMs?: number; status?: string; warnings?: number } = {};
    try {
      const all = await listTurnSummaries({ sessionId, limit: 500 });
      const idx = Number(turnId.replace(/\D/g, ""));
      const ordered = [...all].reverse(); // ASC
      const s = ordered[idx] ?? ordered[ordered.length - 1];
      if (s) summary = { at: s.at, turnMs: s.turnMs, status: s.status, warnings: s.warnings };
    } catch {
      // métricas opcionales
    }

    // PlanTag (best-effort: llm_inputs captura pre-middleware).
    let planTag: string | null = null;
    try {
      const inputs = await listLlmInputs({ sessionId, limit: 1000 });
      for (const inp of inputs) {
        const m = JSON.stringify([inp.instructions, inp.messages]).match(/\[plan:([0-9a-f]{8})\]/);
        if (m) {
          planTag = m[1];
          break;
        }
      }
    } catch {
      // opcional
    }

    return json({
      sessionId,
      turnId,
      at: summary.at ?? (turnEvents[0]?.meta.at ?? null),
      turnMs: summary.turnMs ?? null,
      status: summary.status ?? (errors ? "error" : "completed"),
      warnings: summary.warnings ?? 0,
      steps,
      toolCalls: tools.length,
      inputTok,
      outputTok,
      cacheRead,
      cacheHit,
      errors,
      question,
      answer,
      reasoning,
      planTag,
      tools,
      hitl,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}
