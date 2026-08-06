#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// eval-calidad.ts — Evaluador de CALIDAD de respuestas de la meta-fábrica (v2)
//
// POR QUÉ v2 (lección de la demo 100%/100% que era "demasiado bella"):
//   1. EXACTITUD v1 = "la respuesta CONTIENE el substring" → el modelo pasaba
//      con solo MENCIONAR las familias/números aunque reportara datos
//      INCORRECTOS. v2 EXTRAE el valor que el modelo reportó y lo compara
//      contra el valor REAL (tolerancia ±2%).
//   2. CONGRUENCIA v1 = "acuerdo con la MODA de booleans" → si todas las
//      corridas fallaban igual, daba 100% aunque TODAS estuvieran mal (nunca
//      comparaba con la verdad). v2 usa el fingerprint de los valores
//      EXTRAÍDOS: A=697000 vs B=700000 → fingerprints distintos → congruencia
//      baja, incluso si ambos "mencionaron" el dato.
//   3. VALORES ESPERADOS v1 = hardcodeados. v2 hace un PROBE al MCP REAL por
//      corrida y calcula la verdad del snapshot ACTUAL (auto-calibrante: si
//      re-planean la semana 31, el evaluador lo detecta solo).
//   4. v2 añade MÉTRICAS COMPLETAS (steps/calls/tokIn/tokOut/cache/err/
//      warnings/duración) y MINERÍA DE CONOCIMIENTO (por invariante fallido se
//      persiste un HALLAZGO: qué dato faltó o era incorrecto → insumo directo
//      para promote-learnings y para "graduar" skills según la tesis).
//
// Uso:
//   node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/eval-calidad.ts
// Flags: N=3 (repeticiones por caso)  CASO=<id> (solo un caso)
//        SKIP_LANZAR=1 (reutiliza sesiones ya hechas del mismo caso)
//        BASE=http://localhost:5173  MCP_URL=<url> (override del tenant activo)
// ─────────────────────────────────────────────────────────────────────────────

import { appendEvaluacion, listEvaluaciones } from "../agent/lib/session-store.ts";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";
import { mcpCallTool } from "../agent/lib/mcp-client.ts";

const BASE = process.env.BASE ?? "http://localhost:5173";
const REPETICIONES = Math.max(1, Number(process.env.N ?? 3));
const SOLO_CASO = process.env.CASO;
const cfg = loadRuntimeConfig();
const MCP_URL = process.env.MCP_URL ?? cfg.mcpUrl;

const TOLERANCIA = 0.02; // ±2% por redondeo de presentación del modelo
const RADIO = 200; // chars tras la etiqueta para extraer el número (cubre la fila)
const MAX_FAMILIAS = 5; // top-N familias a evaluar por caso (las de mayor magnitud)

// ── Tipos ───────────────────────────────────────────────────────────────────

type FamiliaValor = { etiqueta: string; piezas?: number; kilos?: number; faltante?: number };
type Metrica = { campo: "piezas" | "kilos" | "faltante"; sufijo: string; unidad: string };

type InvarianteDef = { clave: string; etiqueta: string; unidad: string };
type InvarianteEval = InvarianteDef & {
  esperado: number | null; // verdad del probe MCP
  hallado: number | null; // valor extraído de la respuesta
  acierto: boolean; // ¿coincide con la verdad (tolerancia)?
  cobertura: boolean; // ¿la familia/etiqueta fue mencionada?
};
type Hallazgo = {
  tipo: "dato-faltante" | "dato-incorrecto" | "formato" | "skill";
  invariante: string;
  esperado: string | number | null;
  hallado: string | number | null;
  detalle: string;
};
type Corrida = {
  sessionId: string;
  turnId: string;
  status: string;
  steps: number;
  toolCalls: number;
  inputTok: number;
  outputTok: number;
  cacheHit: number;
  errors: number;
  warnings: number;
  turnMs: number;
  answer: string;
  invs: InvarianteEval[];
  exactitud: number;
  congruencia: number | null;
  hallazgos: Hallazgo[];
};

// ── utilidades ──────────────────────────────────────────────────────────────

function slug(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function normalizar(s: string): string {
  return String(s ?? "").toLowerCase().replace(/[\s,.'"|]/g, "");
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function redondear(n: number, sig = 3): number {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** sig;
  return Math.round(n * f) / f;
}

/** Extrae todos los números de un texto (enteros y decimales, con . o ,).
 *  Regla de separadores: si hay coma Y punto, el separador decimal es el que
 *  está más cerca del final ("3,154,344.99" → 3154344.99; "1.234,56" → 1234.56).
 *  Con un solo separador: decimal si hay exactamente uno con ≤2 dígitos
 *  después ("1,5" → 1.5), miles en cualquier otro caso ("1,500" → 1500). */
function extraerNumeros(texto: string): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(/-?\d[\d.,]*/g)) {
    const t = m[0];
    const ultComa = t.lastIndexOf(",");
    const ultPunto = t.lastIndexOf(".");
    const tieneComa = ultComa >= 0;
    const tienePunto = ultPunto >= 0;
    let num: number;
    if (tieneComa && tienePunto) {
      num =
        ultComa > ultPunto
          ? Number(t.replace(/\./g, "").replace(/,/g, ".")) // decimal con coma
          : Number(t.replace(/,/g, "")); // decimal con punto
    } else if (tieneComa) {
      const parts = t.split(",");
      num =
        parts.length === 2 && parts[1].length <= 2
          ? Number(t.replace(",", "."))
          : Number(t.replace(/,/g, ""));
    } else if (tienePunto) {
      const parts = t.split(".");
      num =
        parts.length === 2 && parts[1].length <= 2
          ? Number(t)
          : Number(t.replace(/\./g, ""));
    } else {
      num = Number(t);
    }
    if (Number.isFinite(num)) out.push(num);
  }
  return out;
}

/** Índice de la etiqueta en la respuesta (tolera espacios/puntuación entre palabras). */
function buscarEtiqueta(respuesta: string, etiqueta: string): number {
  const pat = etiqueta.toLowerCase().trim().split(/\s+/).map(escapeRe).join("\\s*");
  const m = respuesta.toLowerCase().match(new RegExp(pat));
  return m ? (m.index ?? -1) : -1;
}

/** Números que el modelo reportó cerca de la etiqueta (la fila de la tabla). */
function extraerCercaDe(respuesta: string, etiqueta: string): number[] {
  const idx = buscarEtiqueta(respuesta, etiqueta);
  if (idx < 0) return [];
  const ventana = respuesta.slice(idx, idx + RADIO);
  return extraerNumeros(ventana);
}

function proximo(numeros: number[], esperado: number): number | null {
  let mejor: number | null = null;
  let mejorDist = Infinity;
  for (const n of numeros) {
    const d = Math.abs(n - esperado);
    if (d < mejorDist) {
      mejorDist = d;
      mejor = n;
    }
  }
  return mejor;
}

async function lanzarSesion(pregunta: string): Promise<string> {
  const res = await fetch(`${BASE}/eve/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: pregunta }),
  });
  if (!res.ok) throw new Error(`POST /eve/v1/session → ${res.status}`);
  const j = (await res.json()) as { sessionId?: string };
  if (!j.sessionId) throw new Error("POST /eve/v1/session sin sessionId");
  return j.sessionId;
}

// SKIP_LANZAR=1: reutiliza sesiones YA existentes del mismo caso (mismo
// título en el índice) en vez de lanzar turnos nuevos — útil para re-evaluar
// sin gastar LLM.
async function obtenerSesionesDelCaso(pregunta: string, n: number): Promise<string[]> {
  const res = await fetch(`${BASE}/api/sessions`);
  if (!res.ok) return [];
  const j = (await res.json()) as { sessions?: Array<{ id: string; title: string; active: boolean }> };
  const clave = normalizar(pregunta).slice(0, 40);
  return (j.sessions ?? [])
    .filter((s) => !s.active && normalizar(s.title ?? "").startsWith(clave))
    .slice(0, n)
    .map((s) => s.id);
}

/** ¿El turno CERRÓ de verdad? Señal del espejo de eventos: las sesiones
 *  lanzadas por HTTP directo (sin UI) NO escriben turn_summary (el trace-store
 *  depende del POST /api/traces del chat) → turnMs queda null SIEMPRE y no
 *  sirve como señal. En cambio, el espejo termina el turno con `session.waiting`
 *  como último evento (o con turn.completed/failed/cancelled). */
async function turnoCerrado(sessionId: string, timeoutMs = 15_000): Promise<boolean> {
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
  timeoutMs = 300_000,
): Promise<{
  turnId: string; answer: string; status: string; steps: number; toolCalls: number;
  inputTok: number; outputTok: number; cacheHit: number; errors: number;
  warnings: number; turnMs: number;
} | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/audit/turns?sessionId=${encodeURIComponent(sessionId)}&limit=1`);
    if (res.ok) {
      const j = (await res.json()) as { turns?: Array<Record<string, unknown>> };
      const t = j.turns?.[0];
      // ⚠️ El endpoint deriva status "completed" por DEFAULT incluso con el
      // turno EN CURSO. La señal fiable de cierre es el ESPEJO: exigir que el
      // turno cerró de verdad (session.waiting / turn.*.completed) ANTES de
      // dar el turno por terminado (evita persistir evaluaciones vacías).
      if (t && /completed/.test(String(t.status)) && (await turnoCerrado(sessionId))) {
        return {
          turnId: String(t.turnId),
          answer: String(t.answer ?? ""),
          status: String(t.status),
          steps: Number(t.steps ?? 0),
          toolCalls: Number(t.toolCalls ?? 0),
          inputTok: Number(t.inputTok ?? 0),
          outputTok: Number(t.outputTok ?? 0),
          cacheHit: Number(t.cacheHit ?? 0),
          errors: Number(t.errors ?? 0),
          warnings: Number(t.warnings ?? 0),
          turnMs: Number(t.turnMs ?? 0),
        };
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

/** Evalúa una corrida contra los invariantes (con verdad del probe). */
function evaluarCorrida(
  answer: string,
  invariantes: Array<InvarianteDef & { esperado: number }>,
): { invs: InvarianteEval[]; hallazgos: Hallazgo[] } {
  const invs: InvarianteEval[] = invariantes.map((inv) => {
    const idx = buscarEtiqueta(answer, inv.etiqueta);
    const cobertura = idx >= 0;
    let hallado: number | null = null;
    let acierto = false;
    if (cobertura) {
      hallado = proximo(extraerCercaDe(answer, inv.etiqueta), inv.esperado);
      acierto = hallado !== null && Math.abs(hallado - inv.esperado) / inv.esperado <= TOLERANCIA;
    }
    return { ...inv, hallado, acierto, cobertura };
  });

  const hallazgos: Hallazgo[] = [];
  for (const inv of invs) {
    if (inv.acierto) continue;
    if (!inv.cobertura) {
      hallazgos.push({
        tipo: "dato-faltante",
        invariante: inv.clave,
        esperado: inv.esperado,
        hallado: null,
        detalle: `La respuesta NO menciona "${inv.etiqueta}" (esperado ${fmtNum(inv.esperado)} ${inv.unidad}). ¿El skill instruye el formato?`,
      });
    } else {
      hallazgos.push({
        tipo: "dato-incorrecto",
        invariante: inv.clave,
        esperado: inv.esperado,
        hallado: inv.hallado,
        detalle: `La respuesta reporta ${fmtNum(inv.hallado)} ${inv.unidad} para "${inv.etiqueta}" pero la verdad del snapshot es ${fmtNum(inv.esperado)} (${Math.round((Math.abs((inv.hallado ?? 0) - inv.esperado) / inv.esperado) * 100)}% de desviación).`,
      });
    }
  }
  return { invs, hallazgos };
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
}

/** fingerprint de VALORES EXTRAÍDOS (no de booleans) para congruencia real. */
function fingerprint(invs: InvarianteEval[]): string {
  return invs.map((i) => `${i.clave}=${i.hallado == null ? "null" : redondear(i.hallado, 3)}`).join("|");
}

// ── Casos: invariantes dinámicos desde PROBE de verdad de runtime ───────────
// El probe consulta el MCP REAL y devuelve las familias top con sus valores.
// Los invariantes se construyen a partir de esas verdades → NADA hardcodeado.
const CASOS: Array<{
  id: string;
  skill: string;
  pregunta: string;
  metricas: Metrica[];
  probe: () => Promise<FamiliaValor[]>;
}> = [
  {
    id: "plan-s31-familias",
    skill: "mrp-concentrado",
    pregunta: "¿Cuál es el plan de producción de la semana 31 (piezas y kilos por familia)?",
    metricas: [
      { campo: "piezas", sufijo: "piezas", unidad: "pz" },
      { campo: "kilos", sufijo: "kilos", unidad: "kg" },
    ],
    // Verdad = patrón canónico del skill mrp-concentrado Patrón 2 (el que el
    // modelo usa para preguntas POR SEMANA): aggregate ForecastPlanProduccion
    // con el filtro COMPLETO `EJERCICIO eq 2026 and PERIODO eq 7 and SEMANA eq
    // 31` por FAMILIA (campos UPPERCASE). ⚠️ Si el probe omite EJERCICIO/PERIODO
    // suma a través de todos los periodos → verdad equivocada. Replicar EXACTO
    // la consulta que el skill instruye al modelo.
    // ⚠️ Shape real del MCP ICF: { result: { items: [] } } (no items directo).
    probe: async () => {
      const porFam = new Map<string, FamiliaValor>();
      for (const [field, campo] of [
        ["PORPRODUCIR", "piezas"],
        ["KILOS", "kilos"],
      ] as const) {
        const r = (await mcpCallTool(MCP_URL, "aggregate_records", {
          entity: "ForecastPlanProduccion",
          function: "sum",
          field,
          groupby: ["FAMILIA"],
          filter: "EJERCICIO eq 2026 and PERIODO eq 7 and SEMANA eq 31",
          first: 100,
        })) as { result?: { items?: Array<Record<string, unknown>> }; error?: unknown };
        if (r.error) throw new Error(`probe plan-s31 (${field}): ${JSON.stringify(r.error)}`);
        for (const it of r.result?.items ?? []) {
          const et = String(it.FAMILIA ?? "").trim();
          if (!et) continue;
          const f = porFam.get(et) ?? { etiqueta: et };
          f[campo] = Number(it[`sum_${field}`] ?? 0);
          porFam.set(et, f);
        }
      }
      return [...porFam.values()];
    },
  },
  {
    id: "faltante-concentrado",
    skill: "mrp-faltantes",
    pregunta: "¿Cuál es el faltante de concentrado por familia de materia prima?",
    metricas: [{ campo: "faltante", sufijo: "faltante", unidad: "kg" }],
    // Verdad = patrón canónico del skill mrp-faltantes: aggregate
    // ExplocionMatCF con `sum InvRequerido` (NO `Faltante`) y filtro
    // `Usuario eq 'CGARZA' and SeProduce eq false` — solo familias con
    // requerimiento > 0 (las que el skill debe reportar). ⚠️ Replicar EXACTO
    // la consulta del skill: si el probe usa otro campo/filtro, mide contra
    // una verdad equivocada y penaliza al modelo injustamente.
    // ⚠️ Shape real del MCP ICF: { result: { items: [] } } (no items directo).
    probe: async () => {
      const r = (await mcpCallTool(MCP_URL, "aggregate_records", {
        entity: "ExplocionMatCF",
        function: "sum",
        field: "InvRequerido",
        groupby: ["FamiliaCF"],
        filter: "Usuario eq 'CGARZA' and SeProduce eq false",
        first: 100,
      })) as { result?: { items?: Array<Record<string, unknown>> }; error?: unknown };
      if (r.error) throw new Error(`probe faltante: ${JSON.stringify(r.error)}`);
      const fams: FamiliaValor[] = [];
      for (const it of r.result?.items ?? []) {
        const et = String(it.FamiliaCF ?? "").trim();
        const requerido = Number(it.sum_InvRequerido ?? 0);
        if (et && requerido > 0) fams.push({ etiqueta: et, faltante: requerido });
      }
      return fams;
    },
  },
];

async function main() {
  const casos = SOLO_CASO ? CASOS.filter((c) => c.id === SOLO_CASO) : CASOS;
  if (casos.length === 0) {
    console.error(`CASO desconocido: ${SOLO_CASO} (disponibles: ${CASOS.map((c) => c.id).join(", ")})`);
    process.exit(1);
  }
  console.log(`MCP de verdad de runtime: ${MCP_URL}\n`);

  const mineriaGlobal = new Map<string, { tipo: string; fallos: number; ejemplo: Hallazgo | null }>();

  for (const caso of casos) {
    console.log(`\n=== CASO "${caso.id}" (skill ${caso.skill}) · ${REPETICIONES} corridas EN PARALELO ===`);
    console.log(`Pregunta: ${caso.pregunta}`);

    // 1) Probe MCP → verdad del snapshot ACTUAL → invariantes dinámicos.
    const familias = await caso.probe();
    const campoPrincipal = caso.metricas[0].campo;
    const top = [...familias].sort((a, b) => (b[campoPrincipal] ?? 0) - (a[campoPrincipal] ?? 0)).slice(0, MAX_FAMILIAS);
    if (top.length === 0) {
      console.error(`  ⚠️ El probe del caso ${caso.id} no devolvió familias — ¿cambió el snapshot? No se evalúa.`);
      continue;
    }
    const invariantes: Array<InvarianteDef & { esperado: number }> = [];
    for (const fam of top) {
      for (const met of caso.metricas) {
        const v = fam[met.campo];
        if (v == null || !Number.isFinite(v)) continue;
        invariantes.push({
          clave: `${slug(fam.etiqueta)}-${met.sufijo}`,
          etiqueta: fam.etiqueta,
          unidad: met.unidad,
          esperado: v,
        });
      }
    }
    console.log(
      `  Verdad del snapshot (probe MCP): ${top.map((f) => `${f.etiqueta}=${fmtNum(f[campoPrincipal])}`).join(" · ")}`,
    );
    console.log(`  Invariantes: ${invariantes.map((i) => `${i.clave}=${fmtNum(i.esperado)}`).join(", ")}`);

    // 2) Lanzar repeticiones en paralelo (o reutilizar sesiones).
    const existentes = process.env.SKIP_LANZAR ? await obtenerSesionesDelCaso(caso.pregunta, REPETICIONES) : [];
    const aLanzar = Math.max(0, REPETICIONES - existentes.length);
    const nuevas = aLanzar > 0 ? await Promise.all(Array.from({ length: aLanzar }, () => lanzarSesion(caso.pregunta))) : [];
    const sessionIds = [...existentes, ...nuevas];
    console.log(
      `  Sesiones: ${sessionIds.length} (${existentes.length} reutilizadas${aLanzar ? ` + ${aLanzar} nuevas` : ""}): ${sessionIds.map((s) => s.slice(-6)).join(", ")}`,
    );

    // 3) Esperar a que TODAS terminen (en paralelo).
    const corridas = await Promise.all(sessionIds.map((id) => esperarTurno(id)));

    // 4) Evaluar cada corrida contra la VERDAD.
    const resultados: Corrida[] = [];
    for (let i = 0; i < sessionIds.length; i++) {
      const c = corridas[i];
      if (!c) {
        console.log(`  [${i + 1}] ${sessionIds[i].slice(-6)} → TIMEOUT/INCOMPLETO`);
        continue;
      }
      const { invs, hallazgos } = evaluarCorrida(c.answer, invariantes);
      const exactitud = invs.filter((x) => x.acierto).length / invs.length;
      const cobertura = invs.filter((x) => x.cobertura).length / invs.length;
      if (c.errors > 0) {
        hallazgos.push({
          tipo: "skill",
          invariante: "(tool)",
          esperado: null,
          hallado: null,
          detalle: `${c.errors} error(es) de tool en el turno — el skill/documentación no evitó el fallo.`,
        });
      }
      resultados.push({
        sessionId: sessionIds[i], turnId: c.turnId, answer: c.answer, invs, exactitud, congruencia: null, hallazgos,
        status: c.status, steps: c.steps, toolCalls: c.toolCalls, inputTok: c.inputTok, outputTok: c.outputTok,
        cacheHit: c.cacheHit, errors: c.errors, warnings: c.warnings, turnMs: c.turnMs,
      });
      console.log(
        `  [${i + 1}] ${sessionIds[i].slice(-6)} · ${c.status} · ${c.steps} pasos · ${c.toolCalls} calls · ${fmtK(c.inputTok)} in/${fmtK(c.outputTok)} out · cache ${c.cacheHit}% · ${c.errors} err · ${(c.turnMs / 1000).toFixed(1)}s · exactitud=${(exactitud * 100).toFixed(0)}% (${invs.filter((x) => x.acierto).length}/${invs.length}) · cobertura=${(cobertura * 100).toFixed(0)}%`,
      );
      for (const h of hallazgos) console.log(`      ⚠ ${h.tipo}: ${h.detalle}`);
    }

    // 5) Congruencia REAL: fingerprint de valores extraídos (no de booleans).
    // ⚠️ Si todas las corridas dan fingerprints DISTINTOS (mejor=1), NO hay
    // acuerdo real → congruencia 0 (el edge case count===mejor con mejor=1
    // inflaba a 100%: "todas fallan distinto" NO es congruente).
    if (resultados.length > 1) {
      const moda = new Map<string, number>();
      for (const r of resultados) {
        const fp = fingerprint(r.invs);
        moda.set(fp, (moda.get(fp) ?? 0) + 1);
      }
      let mejor = 0;
      for (const n of moda.values()) mejor = Math.max(mejor, n);
      const congruenciaGlobal = mejor > 1 ? mejor / resultados.length : 0;
      console.log(
        `  CONGRUENCIA: ${resultados.length} corridas · ${moda.size} fingerprint(s) de valores distinto(s) · ${(congruenciaGlobal * 100).toFixed(0)}% en la moda${mejor > 1 ? "" : " (sin acuerdo real — ninguna corrida coincide con otra)"}`,
      );
      for (const r of resultados) {
        const cnt = moda.get(fingerprint(r.invs)) ?? 0;
        r.congruencia = mejor > 1 && cnt === mejor ? 1 : 0;
      }
    }

    // 6) Persistir (auditable) y acumular minería.
    for (const r of resultados) {
      for (const h of r.hallazgos) {
        const key = `${caso.id}::${h.invariante}`;
        const acc = mineriaGlobal.get(key) ?? { tipo: h.tipo, fallos: 0, ejemplo: null };
        acc.fallos += 1;
        if (!acc.ejemplo) acc.ejemplo = h;
        mineriaGlobal.set(key, acc);
      }
      await appendEvaluacion({
        at: new Date().toISOString(),
        caso: caso.id,
        skill: caso.skill,
        pregunta: caso.pregunta,
        sessionId: r.sessionId,
        turnId: r.turnId,
        status: r.status,
        errors: r.errors,
        steps: r.steps,
        toolCalls: r.toolCalls,
        inputTok: r.inputTok,
        outputTok: r.outputTok,
        cacheHit: r.cacheHit,
        warnings: r.warnings,
        turnMs: r.turnMs,
        invariantes: r.invs,
        exactitud: r.exactitud,
        congruencia: r.congruencia,
        hallazgos: r.hallazgos,
        respuesta: r.answer.slice(0, 4000),
      });
    }
    console.log(`  Persistidas ${resultados.length} evaluaciones en SQLite (tabla evaluaciones).`);
  }

  // 7) Minería: qué conocimiento falta (insumo directo para promote-learnings).
  if (mineriaGlobal.size) {
    console.log("\n=== MINERÍA DE CONOCIMIENTO (qué falta — para promote-learnings) ===");
    for (const [key, acc] of mineriaGlobal) {
      const detalle = acc.ejemplo?.detalle ?? "";
      console.log(`  [${acc.fallos} fallo(s)] ${key} (${acc.tipo})`);
      console.log(`      ${detalle}`);
    }
  }

  // 8) Resumen global de tendencia (para "graduar").
  const historial = await listEvaluaciones({ limit: 500 });
  const porCaso = new Map<string, {
    n: number; ex: number; co: number; steps: number; calls: number; tok: number; err: number; ms: number; hal: number;
  }>();
  for (const e of historial) {
    const acc = porCaso.get(e.caso) ?? { n: 0, ex: 0, co: 0, steps: 0, calls: 0, tok: 0, err: 0, ms: 0, hal: 0 };
    acc.n += 1;
    acc.ex += e.exactitud;
    if (e.congruencia !== null) acc.co += e.congruencia;
    acc.steps += e.steps ?? 0;
    acc.calls += e.toolCalls ?? 0;
    acc.tok += e.inputTok ?? 0;
    acc.err += e.errors ?? 0;
    acc.ms += e.turnMs ?? 0;
    acc.hal += (e.hallazgos ?? []).length;
    porCaso.set(e.caso, acc);
  }
  console.log("\n=== TENDENCIA (para graduación) ===");
  for (const [caso, acc] of porCaso) {
    console.log(
      `${caso.padEnd(22)} n=${acc.n} · exactitud=${((acc.ex / acc.n) * 100).toFixed(0)}% · congruencia=${acc.co > 0 ? ((acc.co / acc.n) * 100).toFixed(0) + "%" : "n/a"} · prom ${(acc.steps / acc.n).toFixed(1)} pasos / ${(acc.calls / acc.n).toFixed(1)} calls / ${fmtK(acc.tok / acc.n)} tok / ${(acc.err / acc.n).toFixed(2)} err / ${(acc.ms / acc.n / 1000).toFixed(0)}s · ${acc.hal} hallazgos`,
    );
  }
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
