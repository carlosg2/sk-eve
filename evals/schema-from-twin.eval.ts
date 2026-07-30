import { defineEval } from "eve/evals";

// Gate: una pregunta de schema debe resolverse consultando el Company Twin,
// NO llamando describe_entities (el schema vive en el Twin, fuente única).
export default defineEval({
  description: "El schema se obtiene del Company Twin, no de describe_entities.",
  async test(t) {
    await t.send("¿Qué campos tiene la entidad CtaDinero y cuál es su PK?");
    t.completed();
    t.calledTool("query_company_twin");
    t.notCalledTool("intelisis-dab__describe_entities");
  },
});
