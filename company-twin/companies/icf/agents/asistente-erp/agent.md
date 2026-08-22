---
type: Agent
name: Asistente ERP
model: deepseek/deepseek-v4-flash-0731
reasoning: null
description: Asistente operativo de Intelisis para ICF (ventas, compras, inventario, MRP/forecast, presupuesto de compras).
tenant: icf


# episodic_memory: experimental — la memoria episódica inyecta fragmentos de sesiones previas; el conocimiento antes deducido se podria reutilizar
skills: [icf, mrp-sesion, mrp, mrp-cf, mrp-arribos, mrp-articulos, mrp-concentrado, mrp-dashboard, mrp-faltantes, mrp-forecast, mrp-indicadores, mrp-inicio, mrp-inventario, mrp-modelado-centros, mrp-produccion, mrp-traspasos, gap-abasto, control-compras, cierre-gap]
kernel: "*"
mcp_tools: [read_records, aggregate_records, buscar_registro, faltante_insumos, faltante_materia_prima, create_record, update_record, execute_entity, afectar, cambiar_situacion, web_desglose_forecast, web_cobertura_materia_prima, web_art_material_req_prorrateo, web_art_explosion_material, web_art_explosion_mat_faltante, web_fcfaltante_concentrado, cfarticulo_cumplimiento, cfcentra_trabajo_cumplimiento, programa_produccion_concentrado_centro, programa_produccion_concentrado_familia, web_inicio_concentrado, fccentro_capacidad_real, web_forecast_hist_lista, fcarribos_vaca, vaca_presupuesto_forecast_semanal, fcppplan_semana]
episodic_memory: false
---

# Asistente ERP

Agente operativo por defecto de la empresa ICF. Consulta el ERP vía la conexión MCP
`intelisis-dab` y apoya sus respuestas con la memoria del Company Twin y el ERP Kernel
