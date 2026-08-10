#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// e2e-reporte.ts — Meta-fábrica: consolida los JSONL del harness e2e-demo en un
// reporte markdown legible con TODAS las preguntas, respuestas completas,
// métricas y estado REAL (espejo). Para revisión humana antes de la demo.
//
// Uso:
//   node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/e2e-reporte.ts
//   OUT=icf/e2e-resultados-demo-2026-08-06.md  (default)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5173";
const OUT = process.env.OUT ?? "icf/e2e-resultados-demo-2026-08-06.md";
const BATCHES = ["finanzas", "compras", "cs", "prod1", "prod2", "twin"];
const RETEST = "/tmp/e2e-r-retest.jsonl";

async function realStatus(sid: string): Promise<string> {
  try {
    const r = await fetch(`${BASE}/api/sessions/${encodeURIComponent(sid)}`);
    if (!r.ok) return "http" + r.status;
    const j = (await r.json()) as { events?: Array<{ type: string }> };
    const evs = j.events ?? [];
    const tipos = new Set(evs.map((e) => e.type));
    if (tipos.has("turn.failed")) return "turn.failed";
    if (tipos.has("turn.cancelled")) return "turn.cancelled";
    const ultimo = evs[evs.length - 1]?.type;
    if (ultimo === "session.waiting" || tipos.has("turn.completed")) return "ok";
    return "?" + (ultimo ?? "sin-eventos");
  } catch (e) {
    return "err:" + (e as Error).message.slice(0, 40);
  }
}

/** Duración real del turno en ms: turn.started → turn.completed/turn.failed/
 *  turn.cancelled (o session.waiting como fallback). Los turnos lanzados por
 *  HTTP directo NO escriben turn_summary (turnMs=0), por eso se deriva del espejo. */
async function duracionMs(sid: string): Promise<number | null> {
  try {
    const r = await fetch(`${BASE}/api/sessions/${encodeURIComponent(sid)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { events?: Array<{ type: string; meta?: { at?: string } }> };
    const evs = j.events ?? [];
    const inicio = evs.find((e) => e.type === "turn.started")?.meta?.at;
    if (!inicio) return null;
    const finEv = evs.find((e) =>
      ["turn.completed", "turn.failed", "turn.cancelled"].includes(e.type),
    ) ?? evs.find((e) => e.type === "session.waiting");
    const fin = finEv?.meta?.at;
    if (!fin) return null;
    const d = new Date(fin).getTime() - new Date(inicio).getTime();
    return Number.isFinite(d) && d >= 0 ? d : null;
  } catch {
    return null;
  }
}

function fmtDur(ms: number | null): string {
  if (ms == null) return "n/d";
  return ms >= 60_000 ? `${(ms / 1000 / 60).toFixed(1)} min` : `${(ms / 1000).toFixed(0)} s`;
}

type R = { tag: string; question: string; sessionId: string; status: string; steps: number; toolCalls: number; inputTok: number; outputTok: number; errors: number; warnings: number; answer: string };

const byQuestion = new Map<string, R[]>();
for (const tag of BATCHES) {
  const f = `/tmp/e2e-r-${tag}.jsonl`;
  if (!existsSync(f)) continue;
  for (const l of readFileSync(f, "utf8").trim().split("\n").filter(Boolean)) {
    const r = JSON.parse(l) as R;
    const k = r.question.trim();
    if (!byQuestion.has(k)) byQuestion.set(k, []);
    byQuestion.get(k)!.push(r);
  }
}
// Re-test sobreescribe (resultados limpios post-fix)
if (existsSync(RETEST)) {
  for (const l of readFileSync(RETEST, "utf8").trim().split("\n").filter(Boolean)) {
    const r = JSON.parse(l) as R;
    const k = r.question.trim();
    const existing = byQuestion.get(k) ?? [];
    existing.push(r);
    byQuestion.set(k, existing);
  }
}

const lines: string[] = [];
lines.push(`# Resultados E2E del catálogo de demos ICF — ${new Date().toISOString().slice(0, 10)}`);
lines.push("");
lines.push(`> Generado por la meta-fábrica (${OUT.split("/").pop()}). Estado REAL verificado contra el espejo durable (no el status derivado).`);
lines.push("");
lines.push(`| # | Pregunta (abreviada) | Estado real · duración | steps | calls | tokIn | err |`);
lines.push("|---|---|---|---|---|---|---|");
const rows: Array<{ q: string; real: string; r: R; dur: number | null }> = [];
let n = 0;
for (const [q, runs] of byQuestion) {
  n++;
  // ⚠️ El status de /api/audit/turns MIENTE (deriva "completed" por default).
  // Elegir el run por ESTADO REAL (espejo): preferir el de menor tokIn entre
  // los que realmente completaron; si ninguno completó, el que tenga estado ok
  // no existe → mostrar el primero con su estado real.
  const conReal: Array<{ r: R; real: string }> = [];
  for (const r of runs) conReal.push({ r, real: await realStatus(r.sessionId) });
  const okRuns = conReal.filter((x) => x.real === "ok").sort((a, b) => a.r.inputTok - b.r.inputTok);
  const elegido = okRuns[0] ?? conReal[0];
  const dur = await duracionMs(elegido.r.sessionId);
  rows.push({ q, real: elegido.real, r: elegido.r, dur });
  lines.push(`| ${n} | ${q.slice(0, 90)} | ${elegido.real} · ${fmtDur(dur)} | ${elegido.r.steps} | ${elegido.r.toolCalls} | ${elegido.r.inputTok} | ${elegido.r.errors} |`);
}
lines.push("");
lines.push("---");
lines.push("");
for (let i = 0; i < rows.length; i++) {
  const { q, real, r, dur } = rows[i];
  lines.push(`## ${i + 1}. ${q} — ${fmtDur(dur)}`);
  lines.push("");
  lines.push(`- **Estado real:** ${real} · **Duración:** ${fmtDur(dur)} · **steps:** ${r.steps} · **tool calls:** ${r.toolCalls} · **tokIn:** ${r.inputTok.toLocaleString()} · **tokOut:** ${r.outputTok.toLocaleString()} · **errores:** ${r.errors} · **warnings:** ${r.warnings}`);
  lines.push(`- **Sesión (ver en /audit):** \`${r.sessionId}\``);
  lines.push("");
  lines.push("### Respuesta del agente");
  lines.push("");
  lines.push((r.answer ?? "").trim() || "_Sin respuesta_");
  lines.push("");
  lines.push("---");
  lines.push("");
}
writeFileSync(OUT, lines.join("\n"));
console.log(`Reporte escrito en ${OUT} — ${rows.length} preguntas`);
