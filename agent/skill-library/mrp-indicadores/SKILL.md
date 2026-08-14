---
tenant: icf
description: >
  Use when the user asks por cumplimiento de producción (programado vs.
  producido), forecast vs. venta real, o KPIs de eficiencia por centro de
  trabajo, familia o artículo. Corresponde a la ruta "Indicadores" del portal
  MRP legacy (sigma-icf).
---

# Skill: MRP — Indicadores (cumplimiento plan vs. real)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](`mrp-plan-produccion`)
> y [mrp-vaca.md](`mrp-vaca`).

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
aggregate_records(ProdD, filter: "Articulo eq '<A>' and FechaEntrega ge <inicio>T00:00:00Z and FechaEntrega le <fin>T23:59:59Z",
  function: "sum", field: "Cantidad")
```

Cumplimiento % = `SUM(Cantidad producida real) / Producir programado * 100`.
Usar `CalendarioFC` (campos camelCase `Ano`/`Semana`/`FechaD`/`FechaA`) para
traducir semana → rango de fechas antes de filtrar `ProdD` (`DimTiempoSemana`
NO existe en el MCP ICF). Nota: `ProdD` no tiene campo `Fecha` — usar
`FechaEntrega`/`FechaRequerida` con formato ISO `...T00:00:00Z` (fecha sola o
sin `Z` da error). Con 0 filas, `sum` devuelve `null` — tratar como 0.

## Patrón 2 — Forecast vs. venta real (DOH)

```
read_records(VacaPresupuestoVtaConD, filter: "...",
  select: "Articulo,S1,S2,...,S12")   # forecast
read_records(VentaTCalc, filter: "Articulo eq '<A>' and FechaEmision ge <inicio>T00:00:00Z and FechaEmision le <fin>T23:59:59Z",
  select: "Articulo,Cantidad,Importe")   # venta real
```

DOH = Venta / Inventario (usar `ArtDisponibleDesc` para existencias con
descripción, o `ArtDisponible` solo para agregados numéricos puros;
`ArtDisponibleVaca` NO existe en el MCP ICF — verificado).

## Limitaciones

- No hay un solo tool que ya calcule el % de cumplimiento — hay que combinar
  el plan (`ResumenPlaneacionCF`) con lo real (`Prod`/`ProdD` o `VentaTCalc`)
  a mano (patrones verificados contra el MCP 2026-08-06; `Fecha` no existe en
  `ProdD`/`VentaTCalc`, usar `FechaEntrega`/`FechaEmision` con ISO `Z`).
- Confirmar con el usuario si "cumplimiento" se refiere a **piezas/Kg
  producidos** (Patrón 1) o a **venta vs. forecast** (Patrón 2) — son
  comparaciones distintas que esta ruta agrupa bajo el mismo menú.
