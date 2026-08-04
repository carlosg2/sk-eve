import { defineMcpClientConnection } from "eve/connections";
import { runtimeConfig } from "../lib/runtime-config.js";

// Escrituras al ERP que requieren aprobación humana (HITL). Las lecturas
// (read_records, aggregate_records, describe_entities) se ejecutan sin gate.
// afectar y cambiar_situacion son tools dedicados tipados (custom-tool del DAB);
// se gatean igual porque cambian estado de movimientos en el ERP.
const WRITE_TOOL_RE = /(create|update|delete)_record|execute_entity|afectar|cambiar_situacion/;

export default defineMcpClientConnection({
  url: runtimeConfig.mcpUrl,
  description:
    `API del ERP Intelisis para ${runtimeConfig.companyName}. ` +
    "El schema, las relaciones y las reglas operativas viven en el Company Twin. " +
    "Usa buscar_registro para nombres parciales, read_records para filas y aggregate_records para métricas.",
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
      // Tool universal de búsqueda por texto parcial (LIKE) — read-only
      "buscar_registro",
      // Tools dedicados tipados para transiciones de estatus (HITL-gateados)
      "afectar",
      "cambiar_situacion",
      // Reportes de faltante (MRP ya explosionado), read-only — ver skill gap-abasto
      "faltante_insumos",
      "faltante_materia_prima",
      // SP spPlanArt (tenant marmoles), solo validación/reconciliación — ver skill sugerido-compra
      "planeacion_mrp",
    ],
  },
});
