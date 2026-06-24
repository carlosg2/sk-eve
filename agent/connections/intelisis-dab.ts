import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "http://localhost:5050/mcp",
  description:
    "API universal del ERP Intelisis — módulos ART, COMS, CXP, DIN, GAS, GAS-OPS, VTAS-REP. " +
    "Expone entidades del ERP (maestros, transacciones, reportes) con operaciones de lectura, " +
    "escritura, actualización, eliminación y agregación.",
  tools: {
    allow: [
      "describe_entities",
      "read_records",
      "aggregate_records",
      "create_record",
      "update_record",
      "delete_record",
      "execute_entity",
    ],
  },
});
