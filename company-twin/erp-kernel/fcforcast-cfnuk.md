---
type: ERP Kernel — Stored Procedure
title: FCForcastCFNuk — Carga inicial del plan FC/MRP
description: SP spFCForcastCFNuk que regenera el plan de planeación a 54 semanas (ResumenPlaneacionCF) por usuario. Publicado en el MCP ICF como tool fcforcast_cfnuk (2026-08-19).
layer: kernel
tags: [mcp, stored-procedure, carga, forecast, fc, mrp]
mcp_tools: [fcforcast_cfnuk, execute_entity]
---

# FCForcastCFNuk — Carga inicial del plan FC/MRP

Regenera el plan de planeación a 54 semanas (`ResumenPlaneacionCF`) para un
usuario. Es el SP principal de la **carga inicial** del módulo Forecast/FC
(corrida `MASERP · Ejercicio · Periodo · S<n>..S<n+4>`).

## Exposición en el MCP

- **Entidad DAB**: `FCForcastCFNuk` → `dbo.spFCForcastCFNuk` (permiso `execute`,
  REST/GraphQL off, descripción pública).
- **Tool MCP**: `fcforcast_cfnuk` (DAB nombra el custom tool con la entidad en
  minúsculas; también existe el genérico `execute_entity`).
- Publicado: **2026-08-19** (respuesta del DBA; verificado en vivo — 11 tools
  en el MCP de ICF).

## Parámetros

| Parámetro | Tipo | Notas |
|---|---|---|
| `Usuario` | string | Ej. `MASERP` |
| `Ejercicio` | int | Ej. `2026` |
| `Periodo` | int | Ej. `8` |
| `EnSilencio` | **boolean** | ⚠️ enviar `true`/`false`, NO `"1"` (DAB rechaza string: `cannot be resolved ... with type "Boolean"`) |

## Respuesta

- Éxito: `"Stored procedure executed successfully"` (idempotente — re-ejecutar
  no duplica; el plan queda idéntico, verificado: 90 filas, S32=3,978,128).
- El resultado se lee después con `read_records`/`aggregate_records` sobre
  `ResumenPlaneacionCF` con `Usuario eq '<U>'`.

## Cadena de la carga inicial (publicada completa 2026-08-19)

✅ **Toda la cadena P0 quedó publicada en el MCP ICF** (config 100 entidades,
37 tools) con el patrón estándar (execute, REST/GraphQL off):

`fcasignar_bases_defaul(Usuario)` → `art_centro_defaul(Usuario, Ejercicio)` →
`art_centro_balanceo(Usuario, json)` → `fcforcast_cfnuk(Usuario, Ejercicio,
Periodo, EnSilencio)` → `web_forecast12(Usuario, @FechaEmision)` /
`web_forecast_fam12_s` / `web_forecast_bbc12` / `web_forecast_arribos12(Usuario)`
/ `web_forecast_arribos_materia_prima12` / `web_forecast_arribos_insumo12` →
`generar_web_inicio(Usuario, Ejercicio, Periodo, Familia, Historico, EnSilencio)`.

> ⚠️ **No exponer al agente**: los SPs de carga son escrituras de regeneración
> (trabajo del backend). No están en la allow-list de `agent.md`; el agente
> lee el resultado con `read_records`/`aggregate_records`. Pendiente Opción
> B-b: el SP envolvente `spWebFCCargaCorrida` (tool único `CargaCorridaFC`)
> aún no existe.

Notas:
- `@FechaEmision` se deriva de `ForecastHist` (2026/8 vacío → fallback
  `VacaPresupuestoVtaCon` CONCLUIDO, 2026-07-29).
- El presupuesto del periodo debe estar **CONCLUIDO** para que la corrida tenga
  insumo.
- Los SPs pueden emitir `Msg 242` (conversión de fecha) internos; quedan
  capturados y no afectan el resultado (EXIT 0, snapshots poblados).

## Uso

Solo el backend/DBA regenera la corrida (el agente lee el resultado con
`read_records`/`aggregate_records`). Si el agente detecta un usuario sin plan,
pedir al backend la re-corrida.
`spWebFCCargaCorrida` (corrida completa en un solo tool) aún no existe en la BD.
