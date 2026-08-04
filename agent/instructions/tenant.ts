import { defineDynamic, defineInstructions } from "eve/instructions";
import { runtimeConfig } from "../lib/runtime-config.js";

export default defineDynamic({
  events: {
    "session.started": async () =>
      defineInstructions({
        markdown: [
          "## Tenant activo",
          "",
          `Empresa: **${runtimeConfig.companyName}**`,
          `Tenant: \`${runtimeConfig.tenant}\``,
          `Código Empresa en Intelisis: \`${runtimeConfig.erpCompany}\``,
          "",
          "Obtén políticas, almacenes, movimientos y defaults específicos con `query_company_twin`.",
          "No reutilices valores observados en otros tenants.",
        ].join("\n"),
      }),
  },
});