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
skills: [icf, mrp-sesion, mrp, mrp-cf, mrp-arribos, mrp-articulos, mrp-concentrado, mrp-dashboard, mrp-faltantes, mrp-forecast, mrp-indicadores, mrp-inicio, mrp-inventario, mrp-modelado-centros, mrp-produccion, mrp-traspasos, gap-abasto, control-compras, cierre-gap]
kernel: "*"
mcp_tools: [read_records, aggregate_records, buscar_registro, faltante_insumos, faltante_materia_prima, create_record, update_record, execute_entity, afectar, cambiar_situacion, web_desglose_forecast, web_cobertura_materia_prima, web_art_material_req_prorrateo, web_art_explosion_material, web_art_explosion_mat_faltante, web_fcfaltante_concentrado, cfarticulo_cumplimiento, cfcentra_trabajo_cumplimiento, programa_produccion_concentrado_centro, programa_produccion_concentrado_familia, web_inicio_concentrado, fccentro_capacidad_real, web_forecast_hist_lista, fcarribos_vaca, vaca_presupuesto_forecast_semanal, fcppplan_semana]
# NOTA: los 16 SPs de reporte del portal MRP (web_*_forecast, cf*_cumplimiento, fccentro_capacidad_real, etc.)
# se publicaron como tools. Los SPs de CARGA (fcasignar_bases_defaul, art_centro_defaul, web_forecast12,
# generar_web_inicio, etc.) NO están en esta lista — la regeneración es trabajo del backend (no dar HITL).
episodic_memory: true
---

# Asistente ERP

Agente operativo por defecto de la empresa ICF. Consulta el ERP vía la conexión MCP
`intelisis-dab` y apoya sus respuestas en el Company Twin.
