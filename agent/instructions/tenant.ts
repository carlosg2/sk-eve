import { defineDynamic, defineInstructions } from "eve/instructions";
import { loadRuntimeConfig } from "../lib/runtime-config.js";

export default defineDynamic({
  events: {
    "session.started": async () => {
      const cfg = loadRuntimeConfig();
      return defineInstructions({
        markdown: [
          "## Empresa activa",
          "",
          `Empresa: **${cfg.companyName}**`,
          `Código de Empresa en el ERP: \`${cfg.erpCompany}\``,
          "",
          "Trabajas con esta empresa. Obtén sus políticas, almacenes, movimientos y defaults con `query_company_twin`.",
          "Todo dato que observes corresponde a esta empresa.",
        ].join("\n"),
      });
    },
  },
});