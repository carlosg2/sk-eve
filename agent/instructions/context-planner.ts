import { defineDynamic, defineInstructions } from "eve/instructions";
import { buildRoutingMarkdown } from "../lib/context-planner.js";

// "Lóbulo frontal" (fase A): al iniciar sesión, precarga el MAPA DE RUTEO del
// Company Twin (qué conceptos existen en el kernel + twin del tenant, con su
// propósito) para que el modelo sepa QUÉ hay disponible y lea el concepto
// correcto en 1-2 llamadas dirigidas, en vez de buscar a ciegas con
// `query_company_twin` (3-8 llamadas de discovery por turno).
//
// ⚠️ Limitación verificada de Eve 0.29.2: la fase B (planificar por mensaje y
// precargar el schema del concepto específico) NO se puede inyectar por overlay,
// porque las instrucciones dinámicas de `turn.started` no tienen acceso al
// mensaje del usuario: `ctx.messages` llega vacío, el evento solo trae turnId, y
// el hook de `message.received` corre DESPUÉS del dispatch de `turn.started`
// (carrera verificada en vivo con logs). El planificador por mensaje queda listo
// en `agent/lib/context-planner.ts` (planContextSync/planMarkdown) para una fase
// B que requiera parche de Eve o acceso al input del turno.

export default defineDynamic({
  events: {
    "session.started": async () => {
      try {
        const markdown = buildRoutingMarkdown();
        return markdown ? defineInstructions({ markdown }) : null;
      } catch {
        return null; // blindado: un error en el planificador nunca rompe el turno
      }
    },
  },
});
