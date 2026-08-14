---
type: Agent
name: Asistente ERP
model: deepseek/deepseek-v4-flash-0731
reasoning: null
description: Asistente operativo de Intelisis para ICF (ventas, compras, inventario, MRP/forecast, presupuesto de compras).
tenant: icf
# NOTA: `cxp` NO está en la membresía — ICF no publica CXP/tesorería/cuentas
# bancarias (ver modulos.md); si estuviera, el skill tienta al modelo a ejecutar
# patrones CXP en vez de abstenerse con "Dato no disponible".
skills: [icf, mrp, mrp-cf, mrp-arribos, mrp-articulos, mrp-concentrado, mrp-dashboard, mrp-faltantes, mrp-forecast, mrp-indicadores, mrp-inicio, mrp-inventario, mrp-modelado-centros, mrp-produccion, mrp-traspasos, gap-abasto, control-compras, cierre-gap]
kernel: "*"
mcp_tools: [read_records, aggregate_records, buscar_registro, faltante_insumos, faltante_materia_prima, create_record, update_record, execute_entity, afectar, cambiar_situacion]
episodic_memory: true
---

# Asistente ERP

Agente operativo por defecto de la empresa ICF. Consulta el ERP vía la conexión MCP
`intelisis-dab` y apoya sus respuestas en el Company Twin.
