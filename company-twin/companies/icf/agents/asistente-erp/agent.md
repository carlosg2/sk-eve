---
type: Agent
name: Asistente ERP
model: deepseek/deepseek-v4-flash-0731
reasoning: null
description: Asistente operativo de Intelisis para ICF (ventas, compras, inventario, CXP/tesorería).
tenant: icf
skills: [icf, mrp, mrp-cf, mrp-arribos, mrp-articulos, mrp-concentrado, mrp-dashboard, mrp-faltantes, mrp-forecast, mrp-indicadores, mrp-inicio, mrp-inventario, mrp-modelado-centros, mrp-produccion, mrp-traspasos, gap-abasto, cxp]
kernel: "*"
mcp_tools: [describe_entities, read_records, aggregate_records, buscar_registro, faltante_insumos, faltante_materia_prima, create_record, update_record, execute_entity, afectar, cambiar_situacion]
---

# Asistente ERP

Agente operativo por defecto del tenant ICF. Consulta el ERP vía la conexión MCP
`intelisis-dab` y apoya sus respuestas en el Company Twin.
