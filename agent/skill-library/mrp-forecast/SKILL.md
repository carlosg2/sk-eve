---
tenant: icf
description: >
  Use when the user asks por el desglose semanal de forecast/plan de
  producción (S1-S54, P1-P54) por artículo, cliente, centro de trabajo,
  concepto o programa. Corresponde a la ruta "Desglose de Forecast" del
  portal MRP legacy (sigma-icf).
---

# Skill: MRP — Desglose de Forecast (grid maestro de planeación)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md)
> y [mrp-explosion.md](/company-twin/companies/icf/mrp/mrp-explosion.md).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/forecast`, SP `spWebDesgloseForecast`)

Es el **grid maestro** de la planeación: cada renglón de `ResumenPlaneacionCF`
representa un artículo/cliente/centro con una fila de venta pronosticada
(`S1..S54`, una por semana del año) y una fila espejo de plan de producción
(`P1..P54`), más columnas de contexto (`Concepto`, `Cliente`/`NombreCte`,
`Programa`, `CtTrabajo`/centro de trabajo, `Familia`, `Gramaje`) y totales de
inventario (`Stock`, `InvEmp`, `InvGra`, `TotalInv`). Este grid es la fuente
de la que se derivan tanto `mrp-produccion` (validación de insumos, vía
`ExplocionMatCF`) como `mrp-indicadores` (cumplimiento).

La ruta `produccion` (Validación de Insumos) en el portal **carga este mismo
SP** (`spWebDesgloseForecast`, solo con `Usuario`) junto con `SpProduccionCF`,
y cruza `Articulo` con `CtTrabajo` para saber en qué centro se produce cada
artículo del BOM — si el usuario pregunta "¿en qué centro se hace el
artículo X?", este es el patrón.

## Patrón 1 — Grid completo por artículo/centro

```
read_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'CGARZA'",
  select: "CtTrabajo,Articulo,Concepto,Cliente,Programa,Familia,Producir,Kg,Stock,InvEmp,InvGra,TotalInv")
```

Si se necesita el desglose semanal completo (`S1..S54`/`P1..P54`), agrégalo al
`select` solo para el rango de semanas que interesa (evita traer las 54 si el
usuario solo pregunta por "esta semana" o "el próximo mes" — usa
`CalendarioFC` para saber qué `Sn`/`Pn` corresponde a la semana actual).

## Patrón 2 — Centro de trabajo de un artículo específico

```
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'CGARZA' and Articulo eq 'A2502'",
  select: "Articulo,CtTrabajo")
```

## Escritura (el agente NO la ejecuta)

El portal permite **capturar/actualizar** el plan (`P1..P54`) vía
`spWebDesgloseForecastActualizar` (bulk update por OPENJSON). El agente
**solo lee** este grid — si el usuario pide modificar el plan, indícale que
debe hacerlo desde el portal MRP, no lo intentes vía `update_record`.

## Limitaciones

- `ResumenPlaneacionCF` es scratch por usuario — verificar `UtLogEjcProMrp` si
  regresa vacío.
- 54 columnas semanales por fila es costoso — siempre acota `select` a las
  semanas relevantes.
