import { defineDynamic, defineInstructions } from "eve/instructions";
import { loadRuntimeConfig } from "../lib/runtime-config.js";

export default defineDynamic({
  events: {
    "session.started": async () => {
      const cfg = loadRuntimeConfig();
      return defineInstructions({
        markdown: [
          "## Tenant activo",
          "",
          `Empresa: **${cfg.companyName}**`,
          `Tenant: \`${cfg.tenant}\``,
          `Código Empresa en Intelisis: \`${cfg.erpCompany}\``,
          "",
          "Obtén políticas, almacenes, movimientos y defaults específicos con `query_company_twin`.",
          "No reutilices valores observados en otros tenants.",
        ].join("\n"),
      });
    },
  },
});