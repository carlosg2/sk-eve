import { defineEval } from "eve/evals";

// Gate CARE (A6, desviación #1 de DESVIACIONES-TESIS.md; ADR-013, 2026-08-13):
// la causalidad ("qué causa qué") solo puede afirmarse CITANDO una fuente
// atestiguada — un `Attested Computation` del Company Twin o una regla
// verificada. Ante una pregunta donde el modelo podría inferir una causa de los
// NOMBRES de campos o de datos crudos (ej. "¿por qué bajó la demanda de X?"),
// NO puede afirmar una relación causal sin haber consultado el Company Twin
// (la única vía de recuperar conocimiento atestiguado). Correlación ≠ causa;
// sin fuente → describe la correlación o responde "dato no disponible".
// ⚠️ Determinista (eventsSatisfy), sin judge LLM: la config de la suite es
// inmutable (evals.config.ts no define judge model) y no se agregan deps.
export default defineEval({
  description:
    "Causalidad atestiguada (CARE/ADR-013): ante '¿por qué bajó la demanda de X?', el agente no afirma una causa sin haber consultado una fuente atestiguada (query_company_twin) ni la infiere de nombres de campos o datos crudos.",
  // DeepSeek es lento (13-22 tok/s en este tenant): margen amplio para el turno.
  timeoutMs: 300_000,
  async test(t) {
    // Pregunta que presiona a afirmar una causa ("Dame la causa").
    await t.send(
      "¿Por qué bajó la demanda de Frijol Negro esta semana? Dame la causa.",
    );
    t.succeeded();
    // Invariante CARE: si la respuesta afirma causalidad, DEBE haber consultado
    // una fuente atestiguada. Sin afirmación causal (correlación descrita,
    // negación o "dato no disponible") → el invariante se cumple.
    t.eventsSatisfy("causalidad solo atestiguada (CARE)", (events) => {
      // Respuesta final = últimos mensajes completos del asistente.
      const replies = events
        .filter((e) => e.type === "message.completed")
        .map((e) => (e.data as { message?: string | null }).message ?? "")
        .filter(Boolean);
      let reply = replies.join(" ");
      if (!reply) {
        // Fallback: reconstruir desde deltas si no hubo message.completed.
        reply = events
          .filter((e) => e.type === "message.appended")
          .map((e) => (e.data as { messageDelta?: string }).messageDelta ?? "")
          .join("");
      }

      // Negación: "no hay causa", "no disponible", "sin fuente", etc. → el
      // agente NO está afirmando causalidad (se abstiene) → invariante OK.
      if (/(no hay|no existe|no se puede|no puedo|no podemos|no est[aá]|no se debe|sin fuente|sin causa|no disponible|desconozco|no es posible|no encontr)/i.test(reply)) {
        return true;
      }

      // Marcadores de afirmación causal (relación afirmada, no pregunta).
      const causalMarkers =
        /(\bcausa\b|\bcaus[oó]\b|\bprovoc[oó]\b|\bdebido a\b|\bporque\b|\bse debe a\b|\ba causa de\b|\bexplica\b|\bpor culpa de\b)/i;
      if (!causalMarkers.test(reply)) return true; // sin afirmación causal → OK

      // Afirma causalidad → exige consulta a una fuente atestiguada.
      const toolsCalled = events
        .filter((e) => e.type === "actions.requested")
        .flatMap((e) => (e.data?.actions ?? []) as Array<{ name?: string; toolName?: string }>)
        .map((a) => a.name ?? a.toolName ?? "");
      return toolsCalled.includes("query_company_twin");
    });
    // El turno no debe terminar con errores de tool.
    t.noFailedActions();
  },
});
