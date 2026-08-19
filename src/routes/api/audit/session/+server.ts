import { json } from "@sveltejs/kit";
import {
  listEvents,
  listVoiceEvents,
  listPromptInjections,
} from "../../../../../agent/lib/session-store.js";

// Línea de tiempo SECUENCIAL de una sesión COMPLETA — la vista para auditar
// TODO lo que sucedió en una sesión, en orden cronológico:
//   - voz (voice_events: mic/vad/STT/transcript/playback/respuestas/idle/AEC...)
//   - inyecciones de contexto (prompt_injections: lóbulo frontal + memoria)
//   - turnos (espejo events: pregunta/razonamiento/tool calls/respuesta/HITL)
// Fusionados por timestamp y devueltos como un solo `timeline`.
//
// GET /api/audit/session?sessionId=<id>

type Ev = { type: string; data?: unknown; meta: { id: string; at: string } };
function d<T = Record<string, unknown>>(e: Ev): T {
  return (e.data ?? {}) as T;
}

const MAX_OUTPUT_CHARS = 4000;

export type TurnInfo = {
  turnId: string;
  turnIndex: number;
  question: string | null;
  answer: string | null;
  at: string | null;
  turnMs: number | null;
  steps: number;
  toolCalls: number;
  inputTok: number;
  outputTok: number;
  cacheRead: number;
  cacheHit: number;
  errors: number;
  status: string;
  warnings: number;
};

function buildTurnInfo(turnId: string, turnIndex: number, events: Ev[]): TurnInfo {
  const question =
    (events.find((e) => e.type === "message.received")?.data as { message?: string } | undefined)?.message ??
    null;
  const answer =
    (events.find((e) => e.type === "message.completed")?.data as { message?: string } | undefined)?.message ??
    null;

  let inputTok = 0;
  let outputTok = 0;
  let cacheRead = 0;
  let steps = 0;
  for (const e of events) {
    if (e.type !== "step.completed") continue;
    const u = (d(e) as { usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number } }).usage;
    inputTok += u?.inputTokens ?? 0;
    outputTok += u?.outputTokens ?? 0;
    cacheRead += u?.cacheReadTokens ?? 0;
    steps++;
  }
  const cacheHit = inputTok ? Math.round((cacheRead / inputTok) * 100) : 0;

  let toolCalls = 0;
  let errors = 0;
  for (const e of events) {
    if (e.type === "actions.requested") {
      toolCalls += Array.isArray(d(e).actions) ? (d(e).actions as unknown[]).length : 0;
    } else if (e.type === "action.result") {
      const rd = d(e) as { result?: { isError?: boolean } };
      if (rd?.result?.isError) errors++;
    }
  }

  const at = events[0]?.meta.at ?? null;
  const lastAt = events[events.length - 1]?.meta.at ?? null;
  const turnMs = at && lastAt ? Date.parse(lastAt) - Date.parse(at) : null;
  const status = errors ? "error" : "completed";

  return {
    turnId,
    turnIndex,
    question,
    answer,
    at,
    turnMs,
    steps,
    toolCalls,
    inputTok,
    outputTok,
    cacheRead,
    cacheHit,
    errors,
    status,
    warnings: 0,
  };
}

// Timeline de UN turno (misma lógica que /api/audit/turn pero con `t` relativo
// al turno; el merge final recalcula `t` contra el inicio de la SESIÓN).
function buildTurnItems(turnId: string, turnIndex: number, events: Ev[]): Array<Record<string, unknown>> {
  const t0 = events.length ? Date.parse(events[0].meta.at) : Date.now();
  const items: Array<Record<string, unknown>> = [];
  const reasoningByStep = new Map<number, string>();
  const stepStartAt = new Map<number, number>();
  const callsAt = new Map<string, { name: string; input: unknown; at: number }>();
  for (const e of events) {
    const dd = d(e);
    const stepIndex = Number(dd.stepIndex ?? -1);
    const atMs = Date.parse(e.meta.at);
    const t = atMs - t0;
    if (e.type === "step.started") {
      stepStartAt.set(stepIndex, atMs);
      items.push({ source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "step", label: `Paso ${stepIndex + 1}` });
    } else if (e.type === "reasoning.completed") {
      const text = String((dd as { reasoning?: string }).reasoning ?? "");
      reasoningByStep.set(stepIndex, (reasoningByStep.get(stepIndex) ?? "") + (reasoningByStep.get(stepIndex) ? "\n" : "") + text);
    } else if (e.type === "actions.requested") {
      const acts = (dd.actions ?? []) as Array<{ callId?: string; toolName?: string; input?: unknown; arguments?: unknown }>;
      for (const a of acts) {
        const callId = String(a.callId ?? "");
        const name = String(a.toolName ?? "");
        const input = a.input ?? a.arguments ?? null;
        callsAt.set(callId, { name, input, at: atMs });
        items.push({ source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "tool-call", name, input });
      }
    } else if (e.type === "action.result") {
      const rd = dd as { result?: { callId?: string; isError?: boolean; output?: unknown } };
      const call = callsAt.get(String(rd?.result?.callId ?? ""));
      const out = rd?.result?.output ?? null;
      const outText = typeof out === "string" ? out : JSON.stringify(out ?? null);
      const outTrunc = outText.length > MAX_OUTPUT_CHARS ? outText.slice(0, MAX_OUTPUT_CHARS) + `\n… [truncado: ${outText.length} chars]` : outText;
      items.push({
        source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "tool-result",
        name: call?.name ?? "", input: call?.input ?? null, output: outTrunc,
        state: rd?.result?.isError ? "error" : "ok",
        meta: { durMs: call ? atMs - call.at : null },
      });
    } else if (e.type === "message.received") {
      items.push({ source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "message", label: "Pregunta del usuario", text: String(dd.message ?? "") });
    } else if (e.type === "message.completed") {
      items.push({ source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "message", label: "Respuesta", text: String(dd.message ?? "") });
    } else if (e.type === "input.requested") {
      const prompts = ((dd.requests ?? []) as Array<{ prompt?: string }>).map((r) => r.prompt ?? "");
      items.push({ source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "hitl", text: prompts.join("\n") });
    } else if (e.type === "step.completed") {
      const u = (dd as { usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number } }).usage;
      const start = stepStartAt.get(stepIndex);
      items.push({
        source: "turn", turnId, turnIndex, stepIndex, at: e.meta.at, t, kind: "step-done",
        meta: {
          inputTok: u?.inputTokens ?? 0,
          outputTok: u?.outputTokens ?? 0,
          cacheRead: u?.cacheReadTokens ?? 0,
          durMs: start ? atMs - start : null,
        },
      });
    }
  }
  // Insertar el razonamiento agrupado justo después del step que lo produjo.
  const out: Array<Record<string, unknown>> = [];
  for (const item of items) {
    out.push(item);
    if (item.kind === "step" && reasoningByStep.has(Number(item.stepIndex ?? -1))) {
      const text = reasoningByStep.get(Number(item.stepIndex ?? -1)) ?? "";
      out.push({ ...item, kind: "reasoning", text, meta: { chars: text.length } });
    }
  }
  return out;
}

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return json({ error: "falta sessionId" }, { status: 400 });
  try {
    const events = (await listEvents(sessionId)) as unknown as Ev[];
    const voiceEvents = await listVoiceEvents({ sessionId, limit: 5000 });
    const injections = await listPromptInjections({ sessionId, limit: 500 });

    // Turnos en orden de primera aparición (turnId de los eventos).
    const order: string[] = [];
    const seen = new Set<string>();
    for (const e of events) {
      const turnId = String(d(e).turnId ?? "");
      if (turnId && !seen.has(turnId)) {
        seen.add(turnId);
        order.push(turnId);
      }
    }

    const turns: TurnInfo[] = [];
    const items: Array<Record<string, unknown>> = [];
    order.forEach((turnId, turnIndex) => {
      const turnEvents = events.filter((e) => String(d(e).turnId ?? "") === turnId);
      const info = buildTurnInfo(turnId, turnIndex, turnEvents);
      turns.push(info);
      // Cabecera del turno (boundary visual) + items del turno.
      items.push({ source: "turn", turnId, turnIndex, at: info.at ?? "", t: 0, isTurnHeader: true, question: info.question, turn: info });
      items.push(...buildTurnItems(turnId, turnIndex, turnEvents));
    });

    // Voz: la BD los devuelve DESC → invertir a ASC para el merge.
    for (const v of [...voiceEvents].reverse()) {
      items.push({ source: "voice", at: v.at, t: 0, voiceType: v.type, voiceData: v.data });
    }
    // Inyecciones: misma inversión.
    for (const inj of [...injections].reverse()) {
      items.push({
        source: "injection", at: inj.at, t: 0,
        injKind: inj.kind, injTag: inj.tag, injChars: inj.chars, injHits: inj.hits,
        injMessage: inj.message, injSources: inj.sources, injBody: inj.body,
      });
    }

    // Merge cronológico estable (ISO sortable).
    items.sort((a, b) => String(a.at).localeCompare(String(b.at)));

    // `t` relativo al inicio de la sesión.
    const times = items.map((i) => Date.parse(String(i.at))).filter((n) => !Number.isNaN(n));
    const t0 = times.length ? Math.min(...times) : Date.now();
    for (const item of items) {
      const atMs = Date.parse(String(item.at));
      item.t = Number.isNaN(atMs) ? 0 : atMs - t0;
    }

    const firstAt = times.length ? new Date(Math.min(...times)).toISOString() : null;
    const lastAt = times.length ? new Date(Math.max(...times)).toISOString() : null;
    const durationMs = firstAt && lastAt ? Date.parse(lastAt) - Date.parse(firstAt) : null;

    return json({
      sessionId,
      turnCount: turns.length,
      voiceCount: voiceEvents.length,
      injectionCount: injections.length,
      firstAt,
      lastAt,
      durationMs,
      turns,
      timeline: items,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}
