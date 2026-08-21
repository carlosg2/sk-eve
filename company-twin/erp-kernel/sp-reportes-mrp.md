---
type: ERP Kernel — Stored Procedures de reporte
title: SPs de reporte del portal MRP (P1)
description: Los 16 SPs de reporte del portal MRP/FC publicados en el MCP ICF  como custom tools — reproducen el formato EXACTO de las pantallas (Desglose, Cobertura, Cumplimiento, Concentrado, Capacidad, Histórico, Plan semana).
layer: kernel
tags: [mcp, stored-procedure, reporte, forecast, fc, mrp, portal]
mcp_tools: [web_desglose_forecast, web_cobertura_materia_prima, web_art_material_req_prorrateo, web_art_explosion_material, web_art_explosion_mat_faltante, web_fcfaltante_concentrado, cfarticulo_cumplimiento, cfcentra_trabajo_cumplimiento, programa_produccion_concentrado_centro, programa_produccion_concentrado_familia, web_inicio_concentrado, fccentro_capacidad_real, web_forecast_hist_lista, fcarribos_vaca, vaca_presupuesto_forecast_semanal, fcppplan_semana]
---

# SPs de reporte del portal MRP (P1)

Los **16 SPs de reporte** del portal MRP/FC están publicados en el MCP ICF
(37 tools MCP: 7 DML + 30 custom). Verificados: todos responden `status: success`
con el formato del portal.

Son la **fuente canónica del formato EXACTO de pantalla** de Daniel. Los usa el
agente cuando se necesita el grid del portal tal cual; también sirven para
validar los cálculos propios. Tools en **snake_case** (DAB nombra el custom tool
con el nombre de la entidad en minúsculas + guiones bajos).

> ⚠️ Prefijo en el runtime: `intelisis-dab__<tool>` (ej.
> `intelisis-dab__web_desglose_forecast`).

## Contrato común

- **Permiso**: `execute` (solo lectura de negocio — no escriben la corrida).
- **REST/GraphQL**: off (solo MCP).
- **Parámetros**: `Usuario` (varchar(10)) casi siempre; los SPs de cumplimiento
  y concentrados reciben `Ejercicio` + `Periodo` int.
- **Respuesta**: `value.value[]` con columnas del portal.

## Tabla de SPs

| Tool MCP | SP | Parámetros | Pantalla (formato exacto) |
|---|---|---|---|
| `web_desglose_forecast` | `spWebDesgloseForecast` | `Usuario` | **Desglose de Forecast** — `ID, Usuario, Prioridad, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente, NombreCte, Programa, S<n>/P<n>…, TotalInv, Stok15` |
| `web_cobertura_materia_prima` | `spWebCoberturaMateriaPrima` | `Usuario` | **Cobertura MP 12S** — `ID, Familia, Descripcion (Inv Inicial), S1..S12, …` (renglones por renglón de cobertura) |
| `web_art_material_req_prorrateo` | `spWebArtMaterialReqProrrateo` | `Empresa char(5), Usuario, Ejercicio, Periodo` | **Requerimiento de materiales prorrateado** |
| `web_art_explosion_material` | `spWebArtExplosionMaterial` | `Usuario, Ejercicio, Periodo` | **Explosión de materiales** (padre→hijo) |
| `web_art_explosion_mat_faltante` | `spWebArtExplosionMatFaltante` | `Empresa char(5), Usuario, Nivel int` | **Explosión de faltantes** |
| `web_fcfaltante_concentrado` | `spWebFCFaltanteConcentrado` | `Usuario, Ejercicio, Periodo` | **Faltantes concentrado** (por familia) |
| `cfarticulo_cumplimiento` | `spCFArticuloCumplimiento` | `Usuario, Ejercicio, Periodo, +Centro?, +Familia?` | **Cumplimiento de artículos** — `Centro, Familia, Articulo, Descripcion, ProgramadoKg, ProducidoKg, …` |
| `cfcentra_trabajo_cumplimiento` | `spCFCentraTrabajoCumplimiento` | `Usuario, Ejercicio, Periodo` | **Cumplimiento de centros** |
| `programa_produccion_concentrado_centro` | `spProgramaProduccionConcentradoCentro` | `Usuario, Ejercicio, Periodo, Semana` (**Semana REQUERIDA**) | **Concentrado por centro** |
| `programa_produccion_concentrado_familia` | `spProgramaProduccionConcentradoFamilia` | `Usuario, Ejercicio, Periodo, +Semana?` | **Concentrado por familia** |
| `web_inicio_concentrado` | `spWebInicioConcentrado` | `Usuario, Ejercicio, Periodo` | **Programa mensual concentrado** |
| `fccentro_capacidad_real` | `spFCCentroCapacidadReal` | `Usuario, Centro, +CapacidadHras OUTPUT, +CapacidadPzas OUTPUT` | **Capacidad real por centro** — devuelve `CapacidadHras, CapacidadPzas` (OUTPUT soportado por el DAB: `SELECT @param AS [param]`) |
| `web_forecast_hist_lista` | `spWebForecastHistLista` | `Usuario, Ejercicio, Periodo` | **Histórico/versiones** (ForecastHist) |
| `fcarribos_vaca` | `spFCArribosVaca` | `Usuario, FechaD datetime, FechaA datetime` | **Arribos Vaca (pendientes)** — 3 bases (ICF/AVA/PDB) |
| `vaca_presupuesto_forecast_semanal` | `spVacaPresupuestoForecastSemanal` | `Usuario varchar(50)='MASERP', Ejercicio, Semana` | **Presupuesto Vaca semanal** |
| `fcppplan_semana` | `spFC_PP_PlanSemana` | `Usuario, Ejercicio, Periodo, ID` (**ID REQUERIDO**), `+Semana?, +CentroTrabajo?` | **Plan semanal** (ForecastPlanSemanal/D) |

## Firmas verificadas en vivo (2026-08-20)

Los siguientes SPs exigen parámetros que antes se documentaban como opcionales
(`+X?`) y **fallan con `ExecutionError: expects parameter '@X', which was not
supplied` si se omiten**:

| Tool | Parámetro REQUERIDO (no opcional) | Error si falta |
|---|---|---|
| `programa_produccion_concentrado_centro` | `Semana` | `spProgramaProduccionConcentradoCentro expects parameter '@Semana'` |
| `fcppplan_semana` | `ID` (y `Semana` también exigido si se usa con filtro) | `spFC_PP_PlanSemana expects parameter '@ID'` |

`web_art_explosion_material` acepta **solo** `Usuario, Ejercicio, Periodo`
(verificado con `describe_entities`: parámetros declarados = esos 3, todos required).
**NO acepta** `FechaEmision` ni `FechaD` ni `Semana` como parámetros extra
(`InvalidArguments: Invalid parameter: X`). ⚠️ Incluso con los 3 obligatorios el SP
puede fallar con `The conversion of a varchar data type to a datetime data type
resulted in an out-of-range value` — es un **error interno del SP/snapshot** (no del
llamador); en ese caso declarar la limitación y usar `read_records(ExplocionMatCF)`
como respaldo. `web_art_material_req_prorrateo` y `vaca_presupuesto_forecast_semanal`
tienen el mismo patrón de fecha interna.

`buscar_registro` requiere `@campo` (el campo sobre el que busca) además de
`entidad` y `termino` — si falta: `spbuscar_registro expects parameter '@campo'`.

## Verificación 

Los 16 SPs se probaron en vivo contra el MCP y responden `status: success` con
el formato del portal. **Los valores específicos de esas pruebas NO son datos
canónicos** — el agente SIEMPRE debe ejecutar el SP (o consultar las tablas)
para obtener los números del momento; nunca citar valores de verificación.

Casos probados: `fccentro_capacidad_real` (devuelve `CapacidadHras` +
`CapacidadPzas` por OUTPUT), `web_desglose_forecast`, `web_cobertura_materia_prima`
(cobertura por familia S1..S12), `cfarticulo_cumplimiento` (Centro null /
Familia "vacio" como el portal), `web_forecast_hist_lista` (vacío para 2026/8 —
consistente con el fallback de fecha).

## Relación con los skills

Los skills del catálogo (`mrp-forecast`, `mrp-indicadores`, `mrp-faltantes`,
`mrp-arribos`, `mrp-modelado-centros`, `mrp-inicio`) pueden invocar estos tools
para obtener el grid EXACTO del portal cuando el cálculo propio sea costoso o se
necesite validar el formato. Regla: el SP es la verdad del portal; si el agente
prefiere consultas propias, puede comparar contra el SP.

## Seguridad

- `spWebSigmaEjecucion` (@SQL varchar(max), SQL dinámico) **NO se publica** —
  riesgo de inyección.
- Los SPs de **carga** (cadena P0) NO se exponen al agente
  (escrituras de regeneración; ver `fcforcast-cfnuk.md`).
