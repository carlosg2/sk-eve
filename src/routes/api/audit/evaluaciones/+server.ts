import { json } from "@sveltejs/kit";
import { listEvaluaciones } from "../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Evaluaciones de CALIDAD de respuestas (fábrica, para graduación).
// Escritas por scripts/eval-calidad.mjs, leídas aquí para auditar la
// tendencia: exactitud (invariantes en la respuesta) y congruencia
// (misma pregunta × N → mismos datos). Alimenta la decisión de "¿un skill
// está listo para subir de etapa?" (tesis: eval-first).
export const GET: RequestHandler = async ({ url }) => {
  const caso = url.searchParams.get("caso") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 200);
  const evaluaciones = await listEvaluaciones({ caso, limit });
  // Agregado por caso para la tendencia.
  const porCaso = new Map<string, { n: number; exactitud: number; congruencia: { n: number; suma: number } }>();
  for (const e of evaluaciones) {
    const acc = porCaso.get(e.caso) ?? { n: 0, exactitud: 0, congruencia: { n: 0, suma: 0 } };
    acc.n += 1;
    acc.exactitud += e.exactitud;
    if (e.congruencia !== null) {
      acc.congruencia.n += 1;
      acc.congruencia.suma += e.congruencia;
    }
    porCaso.set(e.caso, acc);
  }
  const tendencia = [...porCaso.entries()].map(([caso, acc]) => ({
    caso,
    n: acc.n,
    exactitudMedia: acc.n ? Math.round((acc.exactitud / acc.n) * 100) : 0,
    congruenciaPct:
      acc.congruencia.n > 0 ? Math.round((acc.congruencia.suma / acc.congruencia.n) * 100) : null,
  }));
  return json({ evaluaciones, tendencia });
};
