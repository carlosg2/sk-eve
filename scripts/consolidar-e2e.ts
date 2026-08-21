#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// consolidar-e2e.ts — Consolida los JSONL del harness e2e-demo.ts en un
// documento de resultados con el mismo formato de
// docs/icf/e2e-resultados-demo-2026-08-06.md:
//   - tabla resumen (#, pregunta, estado·duración, steps, calls, tokIn, err)
//   - sección por pregunta con métricas + sesión + Respuesta del agente
//     (leída del espejo durable `message.completed`, NO del campo answer
//     del harness que captura texto intermedio).
//
// Uso:
//   node --experimental-strip-types --import ./scripts/ts-hook.mjs \
//     scripts/consolidar-e2e.ts --title "Título" --files a.jsonl,b.jsonl,c.jsonl \
//     --out docs/icf/e2e-resultados-mrp-2026-08-19.md [--intro "párrafo"]
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { listEvents } from "../agent/lib/session-store.ts";

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const title = arg("--title") ?? "Resultados E2E";
const files = (arg("--files") ?? "").split(",").filter(Boolean);
const out = arg("--out") ?? "docs/icf/e2e-resultados-e2e.md";
const intro = arg("--intro") ?? "";
const hoy = arg("--date") ?? "2026-08-19";

function fmtDuracion(ms: number): string {
  if (!ms || ms <= 0) return "n/d";
  const s = ms / 1000;
  if (s < 60) return `${Math.round(s)} s`;
  const m = s / 60;
  return m >= 10 ? `${m.toFixed(1)} min` : `${Math.round(m)} min`;
}

interface Row {
  n: number;
  q: string;
  status: string;
  steps: number;
  calls: number;
  tokIn: number;
  tokOut: number;
  err: number;      // total de errores (tools + skills + turno)
  errTool: number;  // action.result con error real de tool ERP/MCP
  errSkill: number; // load_skill fallido (skill no existe)
  errTurn: number;  // turn.failed (turno entero fallido)
  warn: number;
  turnMs: number;
  sessionId: string;
  answer: string;
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  let n = 0;
  for (const f of files) {
    if (!existsSync(f)) {
      console.error(`No existe: ${f}`);
      process.exit(2);
    }
    const lines = readFileSync(f, "utf8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const r = JSON.parse(line);
      n += 1;
      let answer = "";
      let realSteps = Number(r.steps ?? 0);
      let realCalls = Number(r.toolCalls ?? 0);
      let realErr = Number(r.errors ?? 0);
      let realMs = Number(r.turnMs ?? 0);
      let errTool = 0, errSkill = 0, errTurn = 0;
      if (r.sessionId) {
        try {
          const evs = await listEvents(r.sessionId);
          const comp = evs.filter((e) => e.type === "message.completed");
          if (comp.length) answer = String(comp[comp.length - 1].data?.message ?? "");
          realSteps = evs.filter((e) => e.type === "step.completed").length || realSteps;
          realCalls = evs.filter((e) => e.type === "action.result").length || realCalls;
          // Errores REALES desglosados en 3 categorías:
          //  - errTool:  action.result con error real del DAB (EntityNotFound,
          //              BadRequest, ExecutionError...) o isError
          //  - errSkill: load_skill fallido ("No skill named ...")
          //  - errTurn:  turn.failed (turno entero fallido)
          for (const e of evs) {
            if (e.type !== "action.result") continue;
            const d = e.data as Record<string, unknown> | undefined;
            const res = (d?.result ?? d) as Record<string, unknown> | undefined;
            if (!res) continue;
            const toolName = String(res.toolName ?? "");
            const out = res.output as unknown;
            const isErr =
              res.isError === true ||
              (!!out && typeof out === "object" && "error" in (out as Record<string, unknown>)) ||
              (typeof out === "string" &&
                !out.startsWith("# Skill:") &&
                /EntityNotFound|Invalid field|BadRequest|ExecutionError/.test(out));
            if (!isErr) continue;
            if (toolName.includes("load_skill")) errSkill += 1;
            else errTool += 1;
          }
          errTurn = evs.filter((e) => e.type === "turn.failed").length;
          realErr = errTool + errSkill + errTurn;
          // Duración real desde el espejo cuando el harness no la capturó:
          // primera turn.started -> última message.completed/turn.completed/turn.failed
          if (!realMs) {
            const t = (e: (typeof evs)[number]) => Date.parse(e.meta?.at ?? "");
            const starts = evs.filter((e) => e.type === "turn.started").map(t).filter(Number.isFinite);
            const ends = evs
              .filter((e) => ["message.completed", "turn.completed", "turn.failed"].includes(e.type))
              .map(t)
              .filter(Number.isFinite);
            if (starts.length && ends.length) {
              realMs = Math.max(0, Math.max(...ends) - Math.min(...starts));
            }
          }
        } catch {
          /* espejo no disponible: quedan las métricas del harness */
        }
      }
      rows.push({
        n,
        q: r.question ?? "?",
        status: String(r.status ?? ""),
        steps: realSteps,
        calls: realCalls,
        tokIn: Number(r.inputTok ?? 0),
        tokOut: Number(r.outputTok ?? 0),
        err: realErr,
        errTool,
        errSkill,
        errTurn,
        warn: Number(r.warnings ?? 0),
        turnMs: realMs,
        sessionId: r.sessionId ?? "",
        answer,
      });
    }
  }

  // ── Markdown ──
  const L: string[] = [];
  L.push(`# ${title}`);
  L.push("");
  L.push(`> Generado por la meta-fábrica. Estado REAL verificado contra el espejo durable (no el status derivado). Fecha: ${hoy}.`);
  L.push("");
  if (intro) {
    L.push(intro.trim());
    L.push("");
  }
  L.push("<a id=\"tabla\"></a>");
  L.push("| # | Pregunta (abreviada) | Estado real · duración | steps | calls | tokIn | errT | errS | errF |");
  L.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const q = r.q.length > 60 ? r.q.slice(0, 57) + "…" : r.q;
    const qCell = r.sessionId ? `${q}<br>\`${r.sessionId}\`` : q;
    L.push(`| <a id=\"fila-${r.n}\"></a>[${r.n}](#pregunta-${r.n}) | ${qCell} | ${r.status} · ${fmtDuracion(r.turnMs)} | ${r.steps} | ${r.calls} | ${r.tokIn} | ${r.errTool} | ${r.errSkill} | ${r.errTurn} |`);
  }
  L.push("");
  L.push("---");
  L.push("");
  for (const r of rows) {
    L.push(`<a id="pregunta-${r.n}"></a>`);
    L.push(`## ${r.n}. ${r.q} — ${fmtDuracion(r.turnMs)}`);
    L.push("");
    L.push("### Respuesta del agente");
    L.push("");
    L.push(r.answer.trim() ? r.answer.trim() : "*(sin respuesta final capturada)*");
    L.push("");
    L.push("---");
    L.push("");
    L.push("| [⬆ top](#fila-" + r.n + ") | " + (r.sessionId ? `\`${r.sessionId}\`` : "—") + " | **Estado real:** " + r.status + " · **Duración:** " + fmtDuracion(r.turnMs) + " · **steps:** " + r.steps + " · **tool calls:** " + r.calls + " · **tokIn:** " + r.tokIn.toLocaleString("es-MX") + " · **tokOut:** " + r.tokOut.toLocaleString("es-MX") + " · **errores:** " + r.err + " (tools: " + r.errTool + " · skills: " + r.errSkill + " · turno: " + r.errTurn + ") · **warnings:** " + r.warn + " |");
    L.push("|---|---|---|");
    L.push("");
    L.push("---");
    L.push("");
  }
  writeFileSync(out, L.join("\n"));
  console.log(`Consolidados ${rows.length} turnos -> ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
