---
tenant: icf
description: >
  Use when the user pregunta si hay suficientes materiales/insumos para
  producir (validación de insumos), qué porcentaje de alcance/cobertura tiene
  un material para producción, o capacidad de producción por artículo/centro.
  Corresponde a la ruta "Validación de Insumos" (`/produccion`) del portal
  MRP legacy (sigma-icf).
---

# Skill: MRP — Validación de Insumos (produccion)

> **Este skill es SOLO procedural.** Schema: [mrp-explosion.md](/company-twin/companies/icf/mrp/mrp-explosion.md)
> (`ExplocionMatCF`) y [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md)
> (`ResumenPlaneacionCF`, `ForecastPlanSemanal`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/produccion`, SP `SpProduccionCF`)

`SpProduccionCF` es un **orquestador**: primero corre
`spWebArtMaterialReqProrrateo` (prorratea el requerimiento de material entre
artículos padre que comparten el mismo material) y `spWebExplocionCapacidad`
(cruza la explosión contra la capacidad real de los centros), y después
**regresa `ExplocionMatCF` completa** con todas las columnas de cobertura:

- `Total`/`Producir`/`Forecast` — demanda planeada.
- `InvH`/`InvRequerido`/`InvFinal` — inventario disponible, requerido y
  proyectado final tras el consumo.
- `Cubre` (bandera sí/no), `PorAlcance` (= `MIN(InvH / InvRequerido * 100,
  100)`), `AlcanceDias` — qué tanto alcanza el inventario actual para cubrir
  el requerimiento.
- `CapacidadProduccion` — capacidad real del centro que produce ese artículo.
- `Nivel` (1 = producto padre, 2 = material directo del BOM, 3 = sub-material)
  y `Bandera` (marca renglones "resumen"/no hoja del árbol de explosión).

La ruta también carga `spWebDesgloseForecast` (ver skill `mrp-forecast`) para
mostrar en qué `CtTrabajo` se produce cada artículo padre.

## Patrón 1 — Cobertura de materiales para producir (nivel 2 = material directo)

```
read_records(ExplocionMatCF,
  filter: "Usuario eq 'CGARZA' and Nivel eq 2",
  select: "Articulo,ArticuloHijo,DescripcionH,InvRequerido,InvH,InvFinal,Cubre,PorAlcance,AlcanceDias,CapacidadProduccion")
```

Usa `Nivel eq 1` si el usuario pregunta por el producto padre (agregado), o
`Nivel eq 3` para sub-materiales (segundo nivel de BOM).

## Patrón 2 — ¿Cuánto alcanza un material específico?

```
read_records(ExplocionMatCF, filter: "Usuario eq 'CGARZA' and ArticuloHijo eq '<Material>'",
  select: "Articulo,ArticuloHijo,PorAlcance,AlcanceDias,Cubre")
```

`Cubre` puede venir `null` (no solo `false`/`true` — verificado 2026-08-06):
considerar el material **no cubierto** si `Cubre` no es `true` O
`PorAlcance < 100` → riesgo de producción, no solo "faltante de compra" (eso
es el skill `gap-abasto`/`mrp-faltantes`).

## Patrón 3 — Detalle de lote/almacén asignado (FIFO) contra el plan autorizado

La asignación PEPS/FIFO de lotes (`SerieLote`) contra el plan autorizado
materializa en `UtMrpPrevioMateriaPrima`, que **NO existe en el MCP ICF** (es
staging del proyecto sigma-icf; EntityNotFound verificado 2026-08-06). Si el
usuario pregunta por lote específico asignado, declara la limitación y ofrece
`ArtDisponibleDesc` (existencias por artículo/almacén) — ver skill
`mrp-inventario`.

## Limitaciones

- `ExplocionMatCF` es scratch por usuario — si regresa vacío, la corrida de
  `CGARZA` no existe en ese snapshot; declarar "dato no disponible" (no hay
  bitácora `UtLogEjcProMrp` en el MCP de ICF). Proxy: `aggregate_records(
  ExplocionMatCF, function: "count", field: "*")` o `CalendarioFC`.
- `PorAlcance`/`AlcanceDias` son cálculos ya hechos por el proceso batch — no
  los recalcules a mano con otras fórmulas; si necesitas más columnas,
  descubre el schema real con `read_records(ExplocionMatCF, first: 1)` sin
  `select`.
