// =====================================================================
// prospect-meta-tools.ts — Prospector de meta-tools (A2 de la síntesis
// accionable de la meta-fábrica).
//
// QUÉ HACE: mina la radiografía durable (`.data/sessions.sqlite3` — tablas
// `events` y `turn_summaries`) buscando SECUENCIAS RECURRENTES de 2-4
// tool-calls (mismo conjunto de toolNames en el mismo orden) que aparecen en
// >MIN_FREQ turnos DISTINTOS. Esas secuencias son candidatas a convertirse
// en:
//   - un skill del catálogo (`agent/skill-library/<x>/SKILL.md`), o
//   - un endpoint/tool DAB dedicado (precedente REAL: `faltante_insumos`,
//     que nació de la secuencia recurrente de reads/aggregates para calcular
//     faltantes de insumos).
//
// Por qué `events` y no solo `turn_summaries`: `turn_summaries.tools` suele
// venir vacío (`[]`) para sesiones lanzadas por HTTP directo (POST
// /eve/v1/session) porque el trace-store depende del POST /api/traces del
// chat. En cambio `events` (espejo completo del stream) SIEMPRE tiene
// `actions.requested` con el orden exacto de tool-calls por turno, y
// `step.completed.usage.inputTokens` para derivar el tokIn por turno (mismo
// criterio que /api/audit/turns). `turn_summaries` se usa como respaldo de
// inputTok (emparejado por orden de turnId, igual que el endpoint de audit).
//
// CÓMO CORRERLO (Node 24 + resolve-hook TS del repo):
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/prospect-meta-tools.ts
// Flags (env): MIN_FREQ=2 (turnos distintos mínimos) · TOP=25 (filas a
//   imprimir) · DB_PATH=<path> (override de la radiografía) ·
//   SHOW_TURNS=1 (lista los turnos de cada secuencia; default 0).
//
// ESTADO (2026-08-13): CORRIÓ contra la radiografía real de
//   `.data/sessions.sqlite3` (88 turn_summaries · 222 turnos con tool-calls
//   · 205 con ≥2 calls) y produjo el top de secuencias candidatas (ver
//   fila A2/A7 en docs/experimentos.tsv). Sin datos → imprime el estado y
//   sale 0 (herramienta de FÁBRICA: nunca falla ruidosamente, solo
//   documenta).
// =====================================================================
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────
const MIN_FREQ = Math.max(1, Number(process.env.MIN_FREQ ?? 2));
const MIN_LEN = 2;
const MAX_LEN = 4;
const TOP = Math.max(1, Number(process.env.TOP ?? 25));
const SHOW_TURNS = process.env.SHOW_TURNS === "1";

function resolveRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const DB_PATH = process.env.DB_PATH ?? join(resolveRoot(), ".data", "sessions.sqlite3");
const ERP_PREFIX = "intelisis-dab__";

type Turn = {
  sessionId: string;
  turnId: string;
  tools: string[];
  inputTok: number;
  at: string;
};

type SeqEntry = {
  names: string[];
  freq: number;
  turns: string[];
  toks: number[];
};

function avgTok(e: SeqEntry): number {
  if (!e.toks.length) return 0;
  return e.toks.reduce((a, b) => a + b, 0) / e.toks.length;
}

/** Clasificación heurística: a qué hogar apunta la secuencia. */
function clasificar(names: string[]): string {
  if (names.every((n) => n.startsWith(ERP_PREFIX))) return "endpoint DAB dedicado (precedente faltante_insumos)";
  if (names.includes("load_skill")) return "candidato a skill (ya hay load_skill en el medio)";
  if (names.includes("query_company_twin")) return "ruteo twin/instructions";
  return "candidato a skill";
}

function main(): void {
  if (!existsSync(DB_PATH)) {
    console.error(`[prospect-meta-tools] NO hay radiografía en ${DB_PATH}.`);
    console.error(`  Corre el agente (npm run dev) y haz algunos turnos primero; o apunta DB_PATH a otra base.`);
    process.exit(0);
  }

  let db: DatabaseSync;
  try {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
  } catch (e) {
    console.error(`[prospect-meta-tools] no pude abrir ${DB_PATH} (read-only): ${(e as Error).message}`);
    process.exit(0);
  }

  // 1) Secuencia de tool-calls por turno desde events.actions.requested.
  const toolsByTurn = new Map<string, Turn>();
  const turnOrder: string[] = []; // keys `${sessionId}::${turnId}` en orden de aparición
  try {
    const rows = db
      .prepare("SELECT sessionId, emittedAt, data FROM events WHERE type = 'actions.requested' ORDER BY id ASC")
      .all() as Array<{ sessionId: string; emittedAt: string; data: string | null }>;
    for (const row of rows) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(row.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      const turnId = String(data.turnId ?? "turn_?");
      const key = `${row.sessionId}::${turnId}`;
      let turn = toolsByTurn.get(key);
      if (!turn) {
        turn = { sessionId: row.sessionId, turnId, tools: [], inputTok: 0, at: row.emittedAt };
        toolsByTurn.set(key, turn);
        turnOrder.push(key);
      }
      const actions = Array.isArray(data.actions) ? (data.actions as Array<Record<string, unknown>>) : [];
      for (const a of actions) {
        const name = a && typeof a.toolName === "string" ? a.toolName : null;
        if (name) turn.tools.push(name);
      }
    }
  } catch (e) {
    console.error(`[prospect-meta-tools] no pude leer actions.requested: ${(e as Error).message}`);
    process.exit(0);
  }

  // 2) inputTok por turno desde step.completed.usage.inputTokens.
  try {
    const rows = db
      .prepare("SELECT sessionId, data FROM events WHERE type = 'step.completed' ORDER BY id ASC")
      .all() as Array<{ sessionId: string; data: string | null }>;
    for (const row of rows) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(row.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      const turnId = String(data.turnId ?? "turn_?");
      const usage = (data.usage ?? {}) as { inputTokens?: number };
      const tok = Number(usage.inputTokens ?? 0);
      if (!tok) continue;
      const turn = toolsByTurn.get(`${row.sessionId}::${turnId}`);
      if (turn) turn.inputTok += tok;
    }
  } catch {
    // sin step.completed no pasa nada: turn_summaries será el respaldo
  }

  // 3) Respaldo de inputTok desde turn_summaries (emparejado por orden de
  //    turnId por sesión — mismo criterio que /api/audit/turns).
  const summariesBySession = new Map<string, Array<{ inputTok: number }>>();
  try {
    const rows = db
      .prepare("SELECT sessionId, inputTok FROM turn_summaries ORDER BY id ASC")
      .all() as Array<{ sessionId: string; inputTok: number }>;
    for (const r of rows) {
      const arr = summariesBySession.get(r.sessionId) ?? [];
      arr.push({ inputTok: Number(r.inputTok) });
      summariesBySession.set(r.sessionId, arr);
    }
  } catch {
    // sin turn_summaries: el tokIn derivado de events basta
  }
  {
    const orderBySession = new Map<string, string[]>();
    for (const key of turnOrder) {
      const turn = toolsByTurn.get(key);
      if (!turn) continue;
      const arr = orderBySession.get(turn.sessionId) ?? [];
      arr.push(key);
      orderBySession.set(turn.sessionId, arr);
    }
    for (const [sessionId, keys] of orderBySession) {
      const sums = summariesBySession.get(sessionId) ?? [];
      keys.forEach((key, i) => {
        const turn = toolsByTurn.get(key);
        if (turn && turn.inputTok === 0 && sums[i]) turn.inputTok = sums[i].inputTok;
      });
    }
  }

  // 4) Enumerar todas las ventanas contiguas de 2-4 tools por turno.
  const seqs = new Map<string, SeqEntry>();
  for (const key of turnOrder) {
    const turn = toolsByTurn.get(key);
    if (!turn || turn.tools.length < MIN_LEN) continue;
    const seenInTurn = new Set<string>();
    for (let L = MIN_LEN; L <= MAX_LEN && L <= turn.tools.length; L++) {
      for (let i = 0; i + L <= turn.tools.length; i++) {
        const names = turn.tools.slice(i, i + L);
        const skey = names.join("\u0001");
        if (seenInTurn.has(skey)) continue; // 1 sola vez por turno
        seenInTurn.add(skey);
        let e = seqs.get(skey);
        if (!e) {
          e = { names, freq: 0, turns: [], toks: [] };
          seqs.set(skey, e);
        }
        e.freq += 1;
        e.turns.push(`${turn.sessionId.slice(-8)}:${turn.turnId}`);
        e.toks.push(turn.inputTok);
      }
    }
  }

  const turnosConTools = toolsByTurn.size;
  const turnosConSecuencia = [...toolsByTurn.values()].filter((t) => t.tools.length >= MIN_LEN).length;
  const candidatas = [...seqs.values()]
    .filter((e) => e.freq >= MIN_FREQ)
    .sort((a, b) => b.freq - a.freq || avgTok(b) - avgTok(a) || b.names.length - a.names.length)
    .slice(0, TOP);

  console.log("=== PROSPECTOR DE META-TOOLS (A2) — secuencias recurrentes de tool-calls ===");
  console.log(`Radiografía: ${DB_PATH}`);
  console.log(`Turnos con tool-calls: ${turnosConTools} · con ≥${MIN_LEN} calls: ${turnosConSecuencia}`);
  console.log(`Filtro: secuencias de ${MIN_LEN}-${MAX_LEN} tool-calls (mismo orden) en ≥${MIN_FREQ} turnos distintos · Top ${TOP}\n`);

  if (candidatas.length === 0) {
    console.log("Sin candidatas con los criterios actuales (baja MIN_FREQ o haz más turnos).");
    console.log("Secuencias únicas observadas (todas las frecuencias, top 15):");
    const todas = [...seqs.values()]
      .sort((a, b) => b.freq - a.freq || avgTok(b) - avgTok(a))
      .slice(0, 15);
    for (const e of todas) {
      console.log(`  [${e.freq}] ${e.names.join(" → ")}`);
    }
    process.exit(0);
  }

  console.log(
    `${"Freq".padEnd(6)}${"Long".padEnd(6)}${"avgTokIn".padEnd(10)}Secuencia (sugerencia)`,
  );
  console.log(`${"----".padEnd(6)}${"----".padEnd(6)}${"--------".padEnd(10)}${"-".repeat(72)}`);
  for (const e of candidatas) {
    console.log(
      `${String(e.freq).padEnd(6)}${String(e.names.length).padEnd(6)}${Math.round(avgTok(e)).toLocaleString("en-US").padEnd(10)}${e.names.join(" → ")}`,
    );
    console.log(`        ${"".padEnd(10)}↳ ${clasificar(e.names)}`);
    if (SHOW_TURNS) {
      console.log(`        ${"".padEnd(10)}  turnos: ${e.turns.join(", ")}`);
    }
  }

  console.log(
    `\nTotal: ${seqs.size} secuencias únicas observadas · ${candidatas.length} con ≥${MIN_FREQ} turnos.`,
  );
  console.log(
    `Siguiente paso (fábrica): revisar las candidatas 'endpoint DAB dedicado' contra el precedente faltante_insumos, y las 'candidato a skill' contra agent/skill-library/.`,
  );
}

main();
