import { defineDynamic } from "eve/instructions";

// ⚠️ REDISEÑO (2026-08-19): el buffer `state/learnings.md` YA NO se inyecta
// al prompt. Es un canal runtime→fábrica (el hook anexa, la fábrica promueve),
// NO una fuente de conocimiento para el agente. Inyectarlo crudo:
//   1. Contamina: el hook escribe jerga de proceso (wrun_, timestamps,
//      "verificar en dab-config") que el agente lee como reglas.
//   2. Duplica: lo promovido ya vive en el hogar canónico (twin/kernel/skill),
//      higienizado por `cleanTwin*` y consultable vía `query_company_twin` +
//      `context-planner`. El buffer creaba un segundo hogar no declarado
//      (viola la constitución §0: cada hecho en UN solo lugar).
// El aprendizaje al runtime llega por la promoción al hogar canónico, no por
// el buffer. El hook sigue escribiendo (captura); la fábrica promueve y vacía.
export default defineDynamic({
  events: {
    "session.started": async () => {
      return null;
    },
  },
});
