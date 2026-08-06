import { defineEval } from "eve/evals";

// Gate de eficiencia (2026-08-04): una pregunta simple de stock de seguridad
// debe resolverse con agregaciones (no paginación bruta), sin errores de tool
// y con un número acotado de llamadas (el turno real AJO llegó a 28 calls y
// 608k tokens por paginar/duplicar).
export default defineEval({
  description:
    "Stock de seguridad familia AJO: ≤10 tool calls, sin errores de tool, sin describe_entities y sin llamadas duplicadas con el mismo filtro.",
  async test(t) {
    await t.send("Revisa el stock de seguridad de la familia AJO: ¿tenemos materia prima suficiente?");
    t.completed();
    t.calledTool("intelisis-dab__aggregate_records");
    t.notCalledTool("intelisis-dab__describe_entities");
    t.maxToolCalls(10);
    t.noFailedActions();
    // No repetir la misma tool call con el mismo input (anti-duplicados).
    t.eventsSatisfy("sin tool calls duplicadas", (events) => {
      const calls = events
        .filter((e) => e.type === "actions.requested")
        .flatMap((e) => (e.data?.actions ?? []) as Array<{ name?: string; toolName?: string; input?: unknown; arguments?: unknown }>)
        .map((a) => `${a.name ?? a.toolName}:${JSON.stringify(a.input ?? a.arguments ?? {})}`);
      return new Set(calls).size === calls.length;
    });
  },
});
