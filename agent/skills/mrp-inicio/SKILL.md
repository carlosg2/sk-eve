---
description: >
  Use when the user pregunta por el programa mensual, situación/avance del
  plan semanal de producción por centro de trabajo, ocupación, tiempo extra o
  autorización del plan semanal. Corresponde a la ruta Programa Mensual
  (/inicio) del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Programa Mensual (inicio / ocupación por centro)

> **Este skill es SOLO procedural.** Schema: [mrp-soporte.md](/company-twin/companies/icf/mrp/mrp-soporte.md)
> (`WebInicio`) y [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md)
> (`ForecastPlanSemanal`/`ForecastPlanProduccion`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/inicio`, SP `spWebInicio`)

Dashboard por **centro de trabajo** con una fila `Total` agregada. Por cada
centro (excepto la fila `Total`) se calculan: `Venta`, `AProducir`,
`TiempoExtra`, `Ocupacion`, `PzasLibres` (= Ocupacion − AProducir, mínimo 0),
`DiasHAbiles`, `DiasTextra`, `CapacidadHrs` (real, vía
`spFCCentroCapacidadReal`), `HorasProgram` (= AProducir × CapacidadHrs /
Ocupacion), `PorOcupacion` (= HorasProgram / CapacidadHrs × 100), `Maq1` (=
AProducir − Ocupacion), `Inventario` (vía `fnInvForecastDesglosado`), y `DOH`
(= Venta / Inventario). La fila `Total` suma todas las columnas numéricas.

La misma ruta también carga, semana por semana (`spFCPPSemanaLista` da la
lista de semanas del periodo), el programa de producción consolidado por
centro (`spProgramaProdConcentadoCentro`) — usa `ForecastPlanProduccion`.

## Patrón 1 — Ocupación/capacidad por centro de trabajo

```
read_records(WebInicio, filter: "Usuario eq 'CGARZA'",
  select: "CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,CapacidadHrs,HorasProgram,PorOcupacion,Inventario")
```

La fila con `CentroTrabajo eq 'Total'` es el agregado global — no la excluyas
si el usuario pide "el resumen general", pero exclúyela
(`CentroTrabajo ne 'Total'`) si pide "desglose por centro".

## Patrón 2 — Programa de la semana por centro

```
read_records(ForecastPlanProduccion,
  filter: "Ejercicio eq 2026 and Periodo eq 7 and Semana eq <N> and CentroTrabajo eq '<Centro>'",
  select: "Renglon,Articulo,Descripcion,PorProducir,Kilos,Situacion")
```

## ⚠️ Autorizar el plan semanal tiene efectos reales en el ERP

El estatus del plan semanal (`ForecastPlanSemanal.Situacion`) avanza vía la
máquina de estados genérica del módulo FC (`Modulo='FC'`, `Mov='Plan Semanal'`
en `MovSituacionFC`). **Cuando la situación pasa a `AUTORIZADO`**, el proceso
real del portal (`spProgramaProdSituacionSemana`) **dispara la generación de
Órdenes de Surtido en el ERP** (`PR_MRP_GENERA_OS`) — es decir, aprobar el
plan aquí tiene consecuencias transaccionales reales fuera de este agente.

**El agente NUNCA debe intentar ejecutar esta transición.** Solo puede leer el
estatus actual:

```
read_records(ForecastPlanSemanal,
  filter: "Ejercicio eq 2026 and Periodo eq 7 and Semana eq <N> and CentroTrabajo eq '<Centro>'",
  select: "ID,Situacion,SituacionUsuario,SituacionFecha")
```

Si el usuario pide "autorizar"/"cambiar situación" del plan, indícale que debe
hacerlo desde el portal MRP directamente.

## Limitaciones

- `WebInicio` tiene ~5 filas duplicadas conocidas por calidad de datos
  histórica — deduplicar o advertirlo si se usa para un reporte (ver
  [mrp-soporte.md](/company-twin/companies/icf/mrp/mrp-soporte.md)).
- Fuerte solape de datos con la ruta `dashboard` — ver skill `mrp-dashboard`.
