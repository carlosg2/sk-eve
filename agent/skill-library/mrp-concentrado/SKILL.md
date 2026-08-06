---
tenant: icf
description: >
  Use when the user asks por el consolidado semanal de piezas/kilos a producir
  agrupado por familia de artículo, o por el programa de producción de
  concentrado por centro de trabajo y semana. Corresponde a la ruta
  "Concentrado de Familias" del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Concentrado de Familias (consolidado por familia)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/concentrado`)

Vista consolidada de **cuánto se va a producir por familia** en el periodo
actual (no por artículo individual). El SP fuente `spWebInicioConcentrado`
agrupa `ResumenPlaneacionCF` por `FamiliaCF`, sumando `Producir` (piezas) y
`Kg` (kilogramos), y **solo muestra familias con algo por producir**
(`HAVING SUM(Producir) > 0`), más una fila de totales.

Además existe una variante por semana/centro (`spProgramaProduccionConcentrado`,
usada también por `dashboard`), que lee directamente la vista
`ForecastPlanProduccion` filtrada por `Ejercicio`/`Periodo`/`Semana`/
`CentroTrabajo`, agregando una columna calculada "Producido" (real, comparado
contra el plan) — ver skill `mrp-indicadores` para el patrón de cumplimiento.

## Patrón 1 — Consolidado por familia (piezas y kilos a producir)

```
aggregate_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'CGARZA' and Producir gt 0",
  groupby: "FamiliaCF",
  function: "sum", field: "Producir")

aggregate_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'CGARZA' and Producir gt 0",
  groupby: "FamiliaCF",
  function: "sum", field: "Kg")
```

Si `aggregate_records` no soporta múltiples `sum` en una sola llamada, ejecuta
las dos por separado (Producir y Kg) y combina por `FamiliaCF`.

## Patrón 2 — Programa de producción de la semana por centro (variante concentrado)

⚠️ **Los campos de `ForecastPlanProduccion` son UPPERCASE en el DAB** (verificado
2026-08-06: `Semana eq 31` → BadRequest; `SEMANA eq 31` → OK). Usa SIEMPRE
UPPERCASE en filter/select.

```
read_records(ForecastPlanProduccion,
  filter: "EJERCICIO eq 2026 and PERIODO eq 7 and SEMANA eq <N> and CENTROTRABAJO eq '<Centro>'",
  select: "RENGLON,ARTICULO,DESCRIPCION,PORPRODUCIR,KILOS,SITUACION")
```

Para comparar contra lo YA producido, ver `mrp-indicadores` (usa
`Prod`/`ProdD` como fuente de producción real).

## Limitaciones

- `ResumenPlaneacionCF` es scratch por usuario (se sobrescribe en cada corrida)
  — si regresa vacío, verificar `UtLogEjcProMrp` antes de reportar "no hay
  datos" (mismo criterio que el skill `mrp` general).
- La columna calculada "Producido" (comparación plan vs. real por semana) no
  existe como campo DAB — hay que calcularla aparte con `Prod`/`ProdD`
  filtrando por fecha de la semana (usar `DimTiempoSemana`/`CalendarioFC` para
  traducir semana → rango de fechas).
