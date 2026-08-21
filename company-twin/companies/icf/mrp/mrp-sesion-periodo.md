---
type: Intelisis Module Reference
title: MRP — Sesión y periodo vigente (contrato determinista)
description: Regla para resolver el ejercicio/periodo vigente del módulo Forecast/Planeación (FC) sin ambigüedad: usuario fijo, defaults de fecha actual, y cómo derivar el periodo desde el calendario. Evita explorar variantes de periodo.
layer: company
tenant: icf
tags: [mrp, forecast, fc, sesion, periodo, calendario]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records]
---

# Resumen

El módulo FC opera sobre una **SESIÓN** (usuario + ejercicio + periodo). La
regla para resolver el periodo vigente es **DETERMINISTA**: por omisión se usa
el **año y mes ACTUALES** de la fecha del sistema — no se exploran variantes de
periodo. El usuario fijo del proceso es `MASERP`. Las semanas del periodo se
derivan del calendario (`DIM_TIEMPO_SEMANA` / `CalendarioFC`).

# Sesión

- **Usuario**: el proceso de planeación FC lo corre `MASERP` (fijo, estatus
  ALTA, empresa INCF). Si el usuario no da otro, usar `MASERP` — nunca inventar.
- **Ejercicio (default)**: año ACTUAL de la fecha del sistema. Hoy
  (2026-08-21) → 2026.
- **Periodo (default)**: mes ACTUAL de la fecha del sistema. Hoy (2026-08-21)
  → 8 (Agosto).

⚠️ **REGLA DURA — NUNCA probar variantes**: si el usuario no menciona
ejercicio/periodo, usar el vigente derivado de la fecha actual (año/mes
actual). Prohibido "probar" periodos 7, 12, 2025/12 ni anteriores "por si
acaso" — eso multiplica los tool calls y tokens sin valor. Si el usuario pide
OTRO periodo, usar ESE y solo ese.

# Derivar el periodo desde la fecha actual

Cómo obtener el periodo vigente si no se conoce: la fecha actual del sistema
cae dentro de un rango del calendario. Patrón:

- `DIM_TIEMPO_SEMANA` (columnas `Anio, MES, SEMANA, FECHAINICIO, FECHAFIN`) —
  el periodo vigente = el `MES` cuyo rango contiene HOY (fecha actual). Filtro:
  `Anio eq <año_actual>` y rango de fechas que contenga hoy (fechas sin comillas
  en OData).
- Alternativa por usuario: `CalendarioFC` (columnas `Usuario, NoSemana, Ano,
  Semana, FechaD, FechaA, Mes`; filtrar `Usuario eq 'MASERP' and Ano eq <año>`).
- Ejemplo concreto (2026-08-21): hoy cae en la semana 34 (17–23 ago) del
  periodo 8 (Agosto) → Ejercicio 2026 · Periodo 8 · Semanas 32–35.

# Calendario del periodo

- Para listar las semanas de un periodo:
  `read_records(DIM_TIEMPO_SEMANA, filter: "Anio eq <EJERCICIO> and MES eq <PERIODO>", select: "SEMANA,FECHAINICIO,FECHAFIN", orderby: ["SEMANA asc"])`
  → `PrimerSemana = min(SEMANA)`, `NumeroSemanas = count`, `NombreMes` del MES.
- Alternativa por usuario: `CalendarioFC` con
  `filter: "Usuario eq '<USUARIO>' and Ano eq <EJERCICIO>"`.

# Referencias

- El contrato de sesión completo (validación de usuario, presupuesto
  CONCLUIDO, formato de salida) vive en el skill `mrp-sesion` del catálogo —
  este documento es la regla de RESOLUCIÓN del periodo, no el contrato de
  pantalla.
