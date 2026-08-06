import { json } from "@sveltejs/kit";
import { listEvaluaciones } from "../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Evaluaciones de CALIDAD de respuestas (fábrica, para graduación).
// Escritas por scripts/eval-calidad.ts, leídas aquí para auditar la
// tendencia: exactitud (invariantes vs la verdad del MCP), congruencia
// (misma pregunta × N → mismos valores extraídos) y eficiencia. Alimenta la
// decisión de "¿un skill está listo para subir de etapa?" (tesis: eval-first).
export const GET: RequestHandler = async ({ url }) => {
  const caso = url.searchParams.get("caso") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200);
  const evaluaciones = await listEvaluaciones({ caso, limit });
  // Agregado por caso para la tendencia (calidad + eficiencia + minería).
  const porCaso = new Map<
    string,
    {
      n: number;
      exactitud: number;
      congruencia: { n: number; suma: number };
      steps: number;
      calls: number;
      tokIn: number;
      tokOut: number;
      err: number;
      ms: number;
      hallazgos: number;
    }
  >();
  for (const e of evaluaciones) {
    const acc =
      porCaso.get(e.caso) ??
      { n: 0, exactitud: 0, congruencia: { n: 0, suma: 0 }, steps: 0, calls: 0, tokIn: 0, tokOut: 0, err: 0, ms: 0, hallazgos: 0 };
    acc.n += 1;
    acc.exactitud += e.exactitud;
    if (e.congruencia !== null) {
      acc.congruencia.n += 1;
      acc.congruencia.suma += e.congruencia;
    }
    acc.steps += e.steps ?? 0;
    acc.calls += e.toolCalls ?? 0;
    acc.tokIn += e.inputTok ?? 0;
    acc.tokOut += e.outputTok ?? 0;
    acc.err += e.errors ?? 0;
    acc.ms += e.turnMs ?? 0;
    acc.hallazgos += (e.hallazgos ?? []).length;
    porCaso.set(e.caso, acc);
  }
  const tendencia = [...porCaso.entries()].map(([caso, acc]) => ({
    caso,
    n: acc.n,
    exactitudMedia: acc.n ? Math.round((acc.exactitud / acc.n) * 100) : 0,
    congruenciaPct:
      acc.congruencia.n > 0 ? Math.round((acc.congruencia.suma / acc.congruencia.n) * 100) : null,
    // Eficiencia media por corrida.
    pasosProm: acc.n ? Math.round((acc.steps / acc.n) * 10) / 10 : 0,
    callsProm: acc.n ? Math.round((acc.calls / acc.n) * 10) / 10 : 0,
    tokInProm: acc.n ? Math.round(acc.tokIn / acc.n) : 0,
    tokOutProm: acc.n ? Math.round(acc.tokOut / acc.n) : 0,
    errProm: acc.n ? Math.round((acc.err / acc.n) * 100) / 100 : 0,
    duracionPromMs: acc.n ? Math.round(acc.ms / acc.n) : 0,
    // Minería: cuántos hallazgos de conocimiento acumula el caso.
    hallazgosTotal: acc.hallazgos,
  }));
  return json({ evaluaciones, tendencia });
};
