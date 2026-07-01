import { defineMcpClientConnection } from "eve/connections";

// Escrituras al ERP que requieren aprobación humana (HITL). Las lecturas
// (read_records, aggregate_records, describe_entities) se ejecutan sin gate.
const WRITE_TOOL_RE = /(create|update|delete)_record|execute_entity/;

export default defineMcpClientConnection({
  url: "http://localhost:5050/mcp",
  description:
    "API universal del ERP Intelisis — módulos ART, COMS, CXP, DIN, GAS, GAS-OPS, VTAS-REP. " +
    "Expone entidades del ERP (maestros, transacciones, reportes) con operaciones de lectura, " +
    "escritura, actualización, eliminación y agregación.",
  // Governance (act gobernado): toda escritura pasa por un approval gate (HITL).
  // El toolName llega cualificado por la conexión (ej. "intelisis-dab__create_record").
  approval: (ctx) => WRITE_TOOL_RE.test(ctx.toolName),
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
