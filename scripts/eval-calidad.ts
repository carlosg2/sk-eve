#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// eval-calidad.mjs — Evaluador de CALIDAD de respuestas de la meta-fábrica
//
// Qué mide (alineado con la tesis: "los evals deciden cuándo un skill sube de
// etapa"):
//   1. EXACTITUD — la respuesta contiene los INVARIANTES esperados (valores
//      reales verificados contra el MCP), no solo "no hubo error de tool".
//   2. CONGRUENCIA / REPRODUCIBILIDAD — la misma pregunta, corrida N veces en
//      PARALELO (vía API de sesión), responde con los MISMOS datos clave.
//   3. EFICIENCIA — tokens/steps/calls/duracion por corrida (de la radiografía).
//
// Cada corrida se persiste en la tabla `evaluaciones` (`.data/sessions.sqlite3`)
// → auditable y con tendencia para "graduar" (endpoint GET /api/audit/evaluaciones).
//
// Uso:
//   node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/eval-calidad.mjs
//
// Flags: N=3 (repeticiones por caso)  CASO=<id> (solo un caso)
// ─────────────────────────────────────────────────────────────────────────────

import { appendEvaluacion, listEvaluaciones } from "../agent/lib/session-store.ts";

const BASE = process.env.BASE ?? "http://localhost:5173";
const REPETICIONES = Number(process.env.N ?? 3);
const SOLO_CASO = process.env.CASO;

// ── Casos: invariantes = valores REALES verificados contra el MCP (verdad de
// runtime). `tipo: "contiene"` → la respuesta debe contener el valor
// (normalizado: sin comas/espacios). Si un invariante cambia con el snapshot,
// re-verifícalo con un probe MCP antes de la corrida.
const CASOS = [
  {
    id: "plan-s31-familias",
    skill: "mrp-concentrado",
    pregunta:
      "¿Cuál es el plan de producción de la semana 31 (piezas y kilos por familia)?",
    invariantes: [
      { label: "familia-frijol-negro", valor: "Frijol Negro" },
      { label: "familia-mitades-claras", valor: "Mitades claras" },
      { label: "familia-frijol-pinto", valor: "Frijol Pinto" },
      { label: "piezas-frijol-negro", valor: "697000" },
      { label: "kilos-frijol-negro", valor: "632500" },
    ],
  },
  {
    id: "faltante-concentrado",
    skill: "mrp-faltantes",
    pregunta:
      "¿Cuál es el faltante de concentrado por familia de materia prima?",
    // Invariantes verificados contra el MCP real (aggregate ExplocionMatCF,
    // SeProduce eq false, groupby FamiliaCF): las familias CON faltante real.
    invariantes: [
      { label: "familia-mitades-claras", valor: "Mitades claras" },
      { label: "familia-frijol-media-oreja", valor: "Frijol Media Oreja" },
    ],
  },
];

function normalizar(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\s,.'"|]/g, "");
}

function contiene(texto: string, valor: string): boolean {
  const t = normalizar(texto);
  const v = normalizar(valor);
  return v.length > 0 && t.includes(v);
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

async function esperarTurno(
  sessionId: string,
  timeoutMs = 240_000,
): Promise<{ turnId: string; answer: string; status: string; inputTok: number; turnMs: number; errors: number } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/audit/turns?sessionId=${encodeURIComponent(sessionId)}&limit=1`);
    if (res.ok) {
      const j = (await res.json()) as { turns?: Array<Record<string, unknown>> };
      const t = j.turns?.[0];
      // El endpoint normaliza a "completed" o "turn.completed" según la
      // fuente; aceptar cualquiera que incluya "completed".
      if (t && /completed/.test(String(t.status))) {
        return {
          turnId: String(t.turnId),
          answer: String(t.answer ?? ""),
          status: String(t.status),
          inputTok: Number(t.inputTok ?? 0),
          turnMs: Number(t.turnMs ?? 0),
          errors: Number(t.errors ?? 0),
        };
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}

function evaluarRespuesta(answer: string, invariantes: Array<{ label: string; valor: string }>) {
  return invariantes.map((inv) => ({
    label: inv.label,
    valor: inv.valor,
    hallado: contiene(answer, inv.valor),
  }));
}

// fingerprint de invariantes hallados (label=valor), para medir congruencia
function fingerprint(invs: Array<{ label: string; valor: string; hallado: boolean }>): string {
  return invs
    .map((i) => `${i.label}=${i.hallado ? i.valor : "NO"}`)
    .join("|");
}

async function main() {
  const casos = SOLO_CASO ? CASOS.filter((c) => c.id === SOLO_CASO) : CASOS;
  if (casos.length === 0) {
    console.error(`CASO desconocido: ${SOLO_CASO} (disponibles: ${CASOS.map((c) => c.id).join(", ")})`);
    process.exit(1);
  }

  for (const caso of casos) {
    console.log(`\n=== CASO "${caso.id}" (skill ${caso.skill}) · ${REPETICIONES} corridas EN PARALELO ===`);
    console.log(`Pregunta: ${caso.pregunta}`);

    // 1) Lanzar todas las repeticiones en paralelo (sin esperar entre sí),
    //    o reutilizar sesiones ya existentes si SKIP_LANZAR=1.
    const existentes = process.env.SKIP_LANZAR ? await obtenerSesionesDelCaso(caso.pregunta, REPETICIONES) : [];
    const aLanzar = Math.max(0, REPETICIONES - existentes.length);
    const nuevas = aLanzar > 0 ? await Promise.all(Array.from({ length: aLanzar }, () => lanzarSesion(caso.pregunta))) : [];
    const sessionIds = [...existentes, ...nuevas];
    console.log(
      `Sesiones: ${sessionIds.length} (${existentes.length} reutilizadas${aLanzar ? ` + ${aLanzar} nuevas` : ""}): ${sessionIds.map((s) => s.slice(-6)).join(", ")}`,
    );

    // 2) Esperar a que TODAS terminen (en paralelo).
    const corridas = await Promise.all(sessionIds.map((id) => esperarTurno(id)));

    // 3) Evaluar cada corrida.
    const resultados = [];
    for (let i = 0; i < sessionIds.length; i++) {
      const c = corridas[i];
      if (!c) {
        console.log(`  [${i + 1}] ${sessionIds[i].slice(-6)} → TIMEOUT/INCOMPLETO`);
        continue;
      }
      const invs = evaluarRespuesta(c.answer, caso.invariantes);
      const exactitud = invs.filter((x) => x.hallado).length / invs.length;
      resultados.push({ sessionId: sessionIds[i], turnId: c.turnId, ...c, invs, exactitud });
      console.log(
        `  [${i + 1}] ${sessionIds[i].slice(-6)} · ${c.status} · err=${c.errors} · tok=${c.inputTok} · ${Math.round(c.turnMs / 1000)}s · exactitud=${(exactitud * 100).toFixed(0)}%`,
      );
    }

    // 4) Congruencia: ¿todas las corridas del caso dan los mismos datos?
    if (resultados.length > 1) {
      const moda = new Map<string, number>();
      for (const r of resultados) {
        const fp = fingerprint(r.invs);
        moda.set(fp, (moda.get(fp) ?? 0) + 1);
      }
      let mejor = 0;
      for (const n of moda.values()) mejor = Math.max(mejor, n);
      const congruenciaGlobal = mejor / resultados.length;
      console.log(
        `  CONGRUENCIA: ${resultados.length} corridas · ${moda.size} variante(s) distinta(s) · ${(congruenciaGlobal * 100).toFixed(0)}% en la moda`,
      );
      for (const r of resultados) {
        const fp = fingerprint(r.invs);
        r.congruencia = moda.get(fp) === mejor ? 1 : 0;
      }
    } else {
      for (const r of resultados) r.congruencia = null;
    }

    // 5) Persistir (auditable) en SQLite.
    for (const r of resultados) {
      await appendEvaluacion({
        at: new Date().toISOString(),
        caso: caso.id,
        skill: caso.skill,
        pregunta: caso.pregunta,
        sessionId: r.sessionId,
        turnId: r.turnId,
        status: r.status,
        errors: r.errors,
        inputTok: r.inputTok,
        turnMs: r.turnMs,
        invariantes: r.invs,
        exactitud: r.exactitud,
        congruencia: r.congruencia,
        respuesta: r.answer.slice(0, 4000),
      });
    }
    console.log(`  Persistidas ${resultados.length} evaluaciones en SQLite (tabla evaluaciones).`);
  }

  // 6) Resumen global de tendencia (para "graduar").
  const historial = await listEvaluaciones({ limit: 200 });
  const porCaso = new Map<string, { n: number; ex: number; co: number }>();
  for (const e of historial) {
    const acc = porCaso.get(e.caso) ?? { n: 0, ex: 0, co: 0 };
    acc.n += 1;
    acc.ex += e.exactitud;
    if (e.congruencia !== null) acc.co += e.congruencia;
    porCaso.set(e.caso, acc);
  }
  console.log("\n=== TENDENCIA (para graduación) ===");
  for (const [caso, acc] of porCaso) {
    console.log(
      `${caso.padEnd(24)} n=${acc.n} · exactitud_media=${((acc.ex / acc.n) * 100).toFixed(0)}% · congruencia=${acc.co > 0 ? ((acc.co / acc.n) * 100).toFixed(0) + "%" : "n/a"}`,
    );
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
