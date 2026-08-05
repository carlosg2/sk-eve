---
description: >
  Use when the user asks por cumplimiento de producción (programado vs.
  producido), forecast vs. venta real, o KPIs de eficiencia por centro de
  trabajo, familia o artículo. Corresponde a la ruta "Indicadores" del portal
  MRP legacy (sigma-icf).
---

# Skill: MRP — Indicadores (cumplimiento plan vs. real)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md)
> y [mrp-vaca-ganadera.md](/company-twin/companies/icf/mrp/mrp-vaca-ganadera.md).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/indicadores`)

Tres comparaciones plan-vs-real, cada una con su propio SP:

1. **`CFForecastvsVtas`** — compara el forecast de venta (`Sn` de
   `ResumenPlaneacionCF`/`VacaPresupuestoVtaConD`) contra venta real
   facturada. Regresa también `DOH` (Days On Hand) = venta / inventario.
2. **`spCFArticuloCumplimiento`** — cumplimiento por artículo: compara
   `Producir`/`Kg` programado (`ResumenPlaneacionCF`) contra lo realmente
   producido (`Prod`/`ProdD` filtrado por fecha de la semana), como
   porcentaje.
3. **`spCFCentraTrabajoCumplimiento`** — mismo cálculo pero agregado por
   `CentroTrabajo` en vez de por artículo.

Filtros de la UI (`spCFFamiliaLista`/`spCFCentroLista`): el usuario puede
acotar por familia o centro específico.

## Patrón 1 — Cumplimiento por artículo (programado vs. producido real)

```
# 1) Programado (scratch por usuario, del periodo)
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'CGARZA' and Articulo eq '<A>'",
  select: "Articulo,Producir,Kg")

# 2) Real producido (transaccional, filtrar por rango de fecha de la semana/periodo)
aggregate_records(ProdD, filter: "Articulo eq '<A>' and Fecha ge <inicio> and Fecha le <fin>",
  function: "sum", field: "Cantidad")
```

Cumplimiento % = `SUM(Cantidad producida real) / Producir programado * 100`.
Usar `CalendarioFC`/`DimTiempoSemana` para traducir semana → rango de fechas
antes de filtrar `ProdD`.

## Patrón 2 — Forecast vs. venta real (DOH)

```
read_records(VacaPresupuestoVtaConD, filter: "...",
  select: "Articulo,S1,S2,...,S12")   # forecast
read_records(VentaTCalc, filter: "Articulo eq '<A>' and Fecha ge <inicio> and Fecha le <fin>",
  select: "Articulo,Cantidad,Importe")   # venta real
```

DOH = Venta / Inventario (usar `ArtDisponible`/`ArtDisponibleVaca` erp-kernel
para el inventario actual).

## Limitaciones

- No hay un solo tool que ya calcule el % de cumplimiento — hay que combinar
  el plan (`ResumenPlaneacionCF`) con lo real (`Prod`/`ProdD` o `VentaTCalc`)
  a mano; no probado en vivo todavía.
- Confirmar con el usuario si "cumplimiento" se refiere a **piezas/Kg
  producidos** (Patrón 1) o a **venta vs. forecast** (Patrón 2) — son
  comparaciones distintas que esta ruta agrupa bajo el mismo menú.
