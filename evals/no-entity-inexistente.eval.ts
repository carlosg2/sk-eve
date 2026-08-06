import { defineEval } from "eve/evals";

// Gate de regresión (2026-08-04, API migrada 2026-08-06): el turno real de
// plan de producción gastó 608k tokens, 17 steps y 4 errores llamando
// entidades que NO existen en el MCP ICF (DimTiempoSemana, UtLogEjcProMrp →
// EntityNotFound). Este eval garantiza que el agente use las entidades REALES
// del tenant (ForecastPlanProduccion) y no llame describe_entities.
// ⚠️ NOTA (2026-08-06): ResumenPlaneacionCF SÍ existe en ICF (validado con
// read_records first:60); quedó fuera de la lista de inexistentes.
export default defineEval({
  description:
    "Plan de producción: usa entidades reales del MCP ICF (ForecastPlanProduccion), nunca las inexistentes (DimTiempoSemana/UtLogEjcProMrp) ni describe_entities.",
  // DeepSeek es lento (13-22 tok/s en este tenant): margen amplio para el turno.
  timeoutMs: 360_000,
  async test(t) {
    await t.send("¿Cuál es el plan de producción de la semana 31 (piezas y kilos por familia)?");
    t.succeeded();
    t.calledTool("intelisis-dab__read_records", { input: { entity: "ForecastPlanProduccion" } });
    t.calledTool("intelisis-dab__aggregate_records");
    t.notCalledTool("intelisis-dab__describe_entities");
    // Ninguna llamada debe referenciar entidades inexistentes del tenant ICF.
    t.eventsSatisfy("ninguna entidad inexistente", (events) => {
      const text = events
        .filter((e) => e.type === "actions.requested")
        .flatMap((e) => (e.data?.actions ?? []) as Array<{ input?: unknown; arguments?: unknown }>)
        .map((a) => JSON.stringify(a.input ?? a.arguments ?? {}))
        .join(" ");
      return !/DimTiempoSemana|UtLogEjcProMrp/.test(text);
    });
  },
});
