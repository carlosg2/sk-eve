---
tenant: icf
description: >
  Use when the user pregunta por el presupuesto ganadero/VACA semanal, o por
  la asignación de lotes/series de materia prima (PEPS/FIFO) contra el plan de
  producción ya autorizado. Corresponde a la ruta "Inventario Semanal" del
  portal MRP legacy (sigma-icf).
---

# Skill: MRP — Inventario Semanal (presupuesto VACA + lotes PEPS)

> **Este skill es SOLO procedural.** Schema: [mrp-vaca-ganadera.md](/company-twin/companies/icf/mrp/mrp-vaca-ganadera.md)
> y [mrp-explosion.md](/company-twin/companies/icf/mrp/mrp-explosion.md)
> (`UtMrpPrevioMateriaPrima`), [mrp-soporte.md](/company-twin/companies/icf/mrp/mrp-soporte.md) (`SerieLote`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/inventario`)

Esta ruta lista las semanas del periodo (`spFCPPSemanaLista`) y, para cada una,
trae el presupuesto ganadero/VACA de esa semana (`spVacaPresupuestoForecastSemanal`)
— el forecast consolidado de venta ganadera (línea VACA), distinto del
forecast general del módulo FC.

## Patrón 1 — Presupuesto VACA por semana

```
read_records(CalendarioFC, filter: "Usuario eq 'CGARZA'", select: "Ano,Semana,FechaD,FechaA")
read_records(VacaPresupuestoVtaCon, select: "ID,Ejercicio,SemanaMRP,Version,Estatus")
read_records(VacaPresupuestoVtaConD, filter: "ID eq <ID del encabezado>",
  select: "Renglon,Articulo,Cliente,Programa,S1,S2,...,S12,P1,P2,...,P12")
```

## Patrón 2 — Validación de lotes (PEPS/FIFO) contra el plan autorizado

El SP `PR_MRP_PREVIO_MATERIA_PRIMA` (invocado con `Ejercicio`/`Periodo`/
`CentroTrabajo`/`Semana`/`Item` opcional) hace una asignación **PEPS
(primeras entradas, primeras salidas)** de lotes/series de inventario
(`SerieLote`) contra los requerimientos de material del plan **YA
AUTORIZADO** (`ForecastPlanSemanal.Situacion = 'Autorizado'`), determinando de
qué lote específico saldría cada material. El resultado queda materializado en
la tabla `UtMrpPrevioMateriaPrima`.

> ⚠️ **`UtMrpPrevioMateriaPrima` NO existe en el MCP de ICF** (EntityNotFound
> verificado 2026-08-06). Este patrón es del proyecto sigma-icf (MSSQL
> MRPCF5000), NO está publicado aquí. Si el usuario pregunta por la asignación
> PEPS/FIFO de lotes contra el plan, responde la limitación (dato no
> disponible) y ofrece en su lugar existencias por artículo/almacén vía
> `ArtDisponibleDesc`.

```
read_records(UtMrpPrevioMateriaPrima,
  filter: "SEMANA eq <N> and ARTICULO eq '<A>'",
  select: "EMPRESA,SEMANA,ALMACEN,ARTICULO,MATERIAL,SERIELOTE,CANTIDAD,CANTIDADBTO,REQUERIDO")
```

Si se necesita el detalle de existencia real por lote (antes de la
asignación), usar `SerieLote` (erp-kernel, solo lectura).

## Limitaciones

- `UtMrpPrevioMateriaPrima` es una instantánea (staging) del proyecto
  sigma-icf — **no publicada en el MCP de ICF** (EntityNotFound verificado
  2026-08-06). El agente no puede leerla; ante preguntas de asignación de
  lotes responde la limitación y ofrece `ArtDisponibleDesc` (existencias) o
  `ExplocionMatCF` (requerimientos).
- No confundir el forecast **VACA/ganadero** (esta ruta) con el forecast
  **general del módulo FC** (`mrp-forecast`/`mrp-arribos`) — son procesos y
  tablas distintos aunque ambos hablan de "presupuesto"/"forecast".
