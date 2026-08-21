---
type: Intelisis Entity
title: CalendarioFC — Calendario de semanas Forecast CF
description: Calendario de semanas del módulo Forecast CF por usuario: Ano/Semana con rango de fechas (FechaD–FechaA) y mes.
resource: dbo.CalendarioFC
layer: erp-kernel
tenant: null
tags: [planeacion, forecast, mrp, campo-fresco, calendario, semanas]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records]
---

# Resumen

Calendario de semanas del módulo Forecast CF: una fila por
`(Usuario, Ano, Semana)` con el rango de fechas (`FechaD`–`FechaA`) y el mes.
Es la fuente para resolver el periodo/ejercicio/semana vigente del módulo FC.
`Ano` lleva ñ en mayúsculas (columna `Ano`); `Semana` es el número de semana
del año y `NoSemana` el número secuencial. Es por usuario: filtrar por
`Usuario eq 'MASERP'`.

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `Usuario` | varchar | Usuario que configuró el calendario (filtrar `Usuario eq 'MASERP'`) |
| `NoSemana` | int | Número secuencial de la semana |
| `Ano` | int | Ejercicio/año (UPPERCASE con ñ → `Ano`) |
| `Semana` | int | Número de semana del año (ej. 27) |
| `FechaD` | date | Fecha de inicio de la semana (ISO) |
| `FechaA` | date | Fecha de fin de la semana (ISO) |
| `Mes` | varchar | Nombre del mes (ej. "Julio") |

# Patrones de consulta

```
# Semana vigente (la que contiene hoy): filtrar por usuario y año, ordenar por semana desc
read_records(CalendarioFC,
  filter: "Usuario eq 'MASERP' and Ano eq 2026",
  select: "NoSemana,Ano,Semana,FechaD,FechaA,Mes",
  orderby: ["Semana desc"], first: 1)

# Rango de fechas de una semana específica
read_records(CalendarioFC,
  filter: "Usuario eq 'MASERP' and Ano eq 2026 and Semana eq 27",
  select: "NoSemana,Semana,FechaD,FechaA,Mes", first: 1)

# Todas las semanas del ejercicio (para resolver el periodo vigente)
read_records(CalendarioFC,
  filter: "Usuario eq 'MASERP' and Ano eq 2026",
  select: "NoSemana,Semana,FechaD,FechaA", orderby: ["Semana desc"])
```
