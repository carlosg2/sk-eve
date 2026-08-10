#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// e2e-demo.ts — Harness E2E de la meta-fábrica para probar el catálogo de demos
// del agente ICF (presentación wow). Lanza UNA sesión fresca por pregunta contra
// el dev server local y registra métricas + respuesta desde la radiografía
// durable (misma señal que /chat, sin navegador).
//
// ⚠️ REGLA DE SEPARACIÓN: este harness es herramienta de la FÁBRICA (VS Code
// Copilot) — el conocimiento del agente (skills, twin, instructions) NUNCA lo
// referencia. Queda como referencia para re-validar el catálogo.
//
// Uso:
//   node --experimental-strip-types --import ./scripts/ts-hook.mjs \
//     scripts/e2e-demo.ts --question "¿Qué compramos en julio?" [--tag finanzas]
//   node ... scripts/e2e-demo.ts --file .data/e2e-q-finanzas.json --out .data/e2e-r-finanzas.jsonl
//   --timeout 420   (segundos por turno; default 420 — DeepSeek es lento)
//   --retry 1       (reintenta una vez si el turno no cerró / falló el POST)
//   BASE=http://localhost:5173
//
// NOTA: la señal de cierre FIABLE es el ESPEJO durable (turn.completed /
// turn.failed / session.waiting), NO el status derivado de /api/audit/turns
// (que puede decir "completed" en un turno que realmente falló).
//
// Salida: JSONL con {tag, question, sessionId, status, steps, toolCalls,
//         inputTok, outputTok, cacheHit, errors, warnings, turnMs, answer}.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, appendFileSync, readFileSync, existsSync } from "node:fs" ;
import { setSessionSource } from "../agent/lib/session-store.ts";

const BASE = process.env.BASE ?? "http://localhost:5173";
const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const pregunta = arg("--question");
const file = arg("--file");
const out = arg("--out") ?? ".data/e2e-demo-results.jsonl";
const timeoutMs = Number(arg("--timeout") ?? 420) * 1000;
const retries = Number(arg("--retry") ?? 0);
const tag = arg("--tag") ?? "demo";

async function lanzarSesion(q: string): Promise<string> {
  const res = await fetch(`${BASE}/eve/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: q }),
  });
  if (!res.ok) throw new Error(`POST /eve/v1/session -> ${res.status} ${await res.text().catch(() => "")}`);
  const j = (await res.json()) as { sessionId?: string };
  if (!j.sessionId) throw new Error("POST /eve/v1/session sin sessionId");
  return j.sessionId;
}

async function turnoCerrado(sessionId: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/api/sessions/${encodeURIComponent(sessionId)}`, { signal: controller.signal });
    if (!res.ok) return false;
    const j = (await res.json()) as { events?: Array<{ type: string }> };
    const evs = j.events ?? [];
    if (!evs.length) return false;
    const ultimo = evs[evs.length - 1]?.type;
    if (ultimo === "session.waiting") return true;
    const tipos = new Set(evs.map((e) => e.type));
    return tipos.has("turn.completed") || tipos.has("turn.failed") || tipos.has("turn.cancelled");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function esperarTurno(
  sessionId: string,
  timeoutMs: number,
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/audit/turns?sessionId=${encodeURIComponent(sessionId)}&limit=1`);
      if (res.ok) {
        const j = (await res.json()) as { turns?: Array<Record<string, unknown>> };
        const t = j.turns?.[0];
        if (t && /completed|failed|cancelled/i.test(String(t.status)) && (await turnoCerrado(sessionId, 15_000))) {
          return t;
        }
      }
    } catch {
      // reintentar
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  return null;
}

async function correr(q: string): Promise<Record<string, unknown>> {
  const sessionId = await lanzarSesion(q);
  // Marcar origen EVAL para que el sidebar de /chat pueda filtrar las sesiones
  // del harness y no mezclarlas con conversaciones humanas.
  await setSessionSource(sessionId, "eval").catch(() => {});
  const t = await esperarTurno(sessionId, timeoutMs);
  if (!t) {
    return { tag, question: q, sessionId, status: "TIMEOUT/NO_CLOSED", steps: null, toolCalls: null, inputTok: null, outputTok: null, cacheHit: null, errors: null, warnings: null, turnMs: null, answer: "" };
  }
  return {
    tag,
    question: q,
    sessionId,
    status: String(t.status ?? ""),
    steps: Number(t.steps ?? 0),
    toolCalls: Number(t.toolCalls ?? 0),
    inputTok: Number(t.inputTok ?? 0),
    outputTok: Number(t.outputTok ?? 0),
    cacheHit: Number(t.cacheHit ?? 0),
    errors: Number(t.errors ?? 0),
    warnings: Number(t.warnings ?? 0),
    turnMs: Number(t.turnMs ?? 0),
    answer: String(t.answer ?? ""),
  };
}

const preguntas: string[] = [];
if (file) {
  if (!existsSync(file)) {
    console.error(`No existe el archivo de preguntas: ${file}`);
    process.exit(2);
  }
  const data = JSON.parse(readFileSync(file, "utf8"));
  preguntas.push(...(Array.isArray(data) ? data : data.questions ?? []));
} else if (pregunta) {
  preguntas.push(pregunta);
} else {
  console.error("Pasa --question o --file");
  process.exit(1);
}

if (!existsSync(".data")) {
  try { writeFileSync(".data/.e2e-marker", ""); } catch { /* noop */ }
}

for (const q of preguntas) {
  let r: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      r = await correr(q);
      if (String(r.status).includes("completed")) break;
      if (attempt < retries) {
        console.error(`[retry ${attempt + 1}] ${q.slice(0, 50)} status=${r.status}`);
        await new Promise((x) => setTimeout(x, 8000));
      }
    } catch (e) {
      r = { tag, question: q, sessionId: null, status: "ERROR:" + (e as Error).message, steps: null, toolCalls: null, inputTok: null, outputTok: null, cacheHit: null, errors: null, warnings: null, turnMs: null, answer: "" };
      if (attempt < retries) {
        console.error(`[retry ${attempt + 1}] ${(e as Error).message}`);
        await new Promise((x) => setTimeout(x, 8000));
        continue;
      }
      break;
    }
  }
  appendFileSync(out, JSON.stringify(r) + "\n");
  console.log(
    `[${String(r.status).slice(0, 14).padEnd(14)}] steps=${String(r.steps).padStart(3)} ` +
      `calls=${String(r.toolCalls).padStart(3)} tok=${String(r.inputTok).padStart(7)} ` +
      `err=${String(r.errors).padStart(2)} ms=${String(r.turnMs).padStart(6)} | ${q.slice(0, 70)}`,
  );
}
console.log(`\nResultados en ${out}`);
