---
tenant: icf
description: >
  Use when the user asks about arribos (recepciones) proyectados a 12 semanas,
  cobertura de materia prima o BBC a futuro, cuándo se debe generar un embarque
  sugerido, o arribos pendientes de ganado/VACA. Corresponde a la ruta
  "Programa de Arribos" del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Programa de Arribos (cobertura y arribos proyectados)

> **Este skill es SOLO procedural.** El schema vive en el Company Twin:
> [mrp-forecast-arribos.md](/company-twin/companies/icf/mrp/mrp-forecast-arribos.md)
> y [mrp-vaca-ganadera.md](/company-twin/companies/icf/mrp/mrp-vaca-ganadera.md).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`** (mismo criterio que `gap-abasto`/`mrp`).

## Origen (portal legacy sigma-icf, ruta `/arribos`)

Esta ruta del portal MRP calcula, por artículo/familia, cuántas piezas van a
**arribar** (recepción de compra o traspaso) en cada una de las próximas 12
semanas, y compara contra el forecast de consumo para decidir si hay que
generar un embarque/orden de compra. Los stored procedures fuente
(`spWebForecastArribosMateriaPrima12`, `spWebForecastArribosInsumo12`,
`spWebForecastArribosConcentrado12`, `spWebCoberturaMateriaPrima`,
`spWebCoberturaBBC`, `spFCArribosVacaPendientes`) explotan
`VacaPresupuestoVtaConD` (forecast de venta) contra el BOM (`ArtMaterial`)
semana por semana y comparan contra compras reales (`Compra`/`CompraD`). El
agente **no puede recalcular esto** — solo lee el resultado ya corrido
(tablas `Arribos12`/`Arribos12S`/`ArribosSub12S`/`FCArribos`).

## Patrón 1 — Arribos proyectados a 12 semanas por artículo

```
read_records(Arribos12,
  filter: "Usuario eq 'CGARZA'",
  select: "Articulo,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12")
```

⚠️ **No pagines en grande**: `read_records(Arribos12, first: 500)` sin filtro
re-envía ~36k chars por step (anti-patrón visto en E2E 2026-08-06). Limita
`first` a ≤100, acota con `filter` (artículo/familia) o usa `aggregate_records`
para totales. `Arribos12` tiene una fila por artículo/usuario.

Usar `Arribos12S` si se necesita el desglose por familia o el ajuste (`An`)
en vez del detalle por artículo (verificado 2026-08-06: `Arribos12S` tiene
`S1..S12`/`A1..A12`; `ArribosSub12S` SOLO mapea artículo→familia
(`ID,Usuario,Articulo,Familia`), sin semanas ni ajuste).

⚠️⚠️ **NUNCA hagas un aggregate por columna semanal** (12 llamadas
`aggregate_records(Arribos12S, sum, S1, groupby ["Familia"])` + `S2` + ...).
Anti-patrón visto en E2E 2026-08-06 (23 calls / ~316k tokens). Si necesitas el
desglose por familia, lee **UNA sola vez** `read_records(Arribos12S,
select: "Familia,S1,S2,...,S12", filter: "Usuario eq 'CGARZA'", first: 200)`
y suma/agrega client-side. Máximo 1-2 llamadas para el total.

## Patrón 2 — Cobertura por familia (regla de reorden real)

La lógica de negocio real (`spWebCoberturaMateriaPrima`/`spWebCoberturaBBC`)
arma, por `Familia`, una tabla rodante de 12 semanas con estas filas
conceptuales — **replícalo agregando, no lo inventes distinto**:

1. Inventario inicial (disponibilidad actual, `ArtDisponible` filtrado a
   materia prima — ver `fnWebArtFamDisponible` conceptualmente).
2. Forecast/consumo de la semana (`ForecastArtFam12.Sn`).
3. (+) Mercancía en tránsito = arribos ya confirmados (`Arribos12`/`FCArribos`
   o compras reales `Compra`/`CompraD` con `FechaEntrega` en la semana).
4. (=) Inventario final = inicial − consumo + arribos.
5. Semanas de cobertura = inventario final / consumo de esa semana.
6. Lead time (semanas) = `ArtFamFC.TiempoEntrega`.

**Regla de reorden**: si el inventario final de la semana N cae
`<= ArtFamFC.StockMinimo`, se sugiere un embarque de
`ArtFamFC.StockMaximo - InventarioFinal` para la semana `N + TiempoEntrega`.

```
read_records(ForecastArtFam12, filter: "Usuario eq 'CGARZA'",
  select: "Familia,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12")
read_records(ArtFamFC, select: "Familia,TiempoEntrega,StockMinimo,StockMaximo")
read_records(Arribos12, filter: "Usuario eq 'CGARZA'", select: "Articulo,S1,...,S12")
```

Combina los tres en el análisis; no hay un tool dedicado que ya calcule la
cobertura completa (a diferencia de `faltante_insumos`/`faltante_materia_prima`
en el skill `gap-abasto`).

## Patrón 3 — Traducir semana N a fecha real

```
read_records(CalendarioFC, filter: "Usuario eq 'CGARZA'",
  select: "Ano,Semana,NoSemana,FechaD,FechaA")
```

## Limitaciones

- No hay tool dedicado para "cobertura" — hay que combinar `ForecastArtFam12`
  + `ArtFamFC` + `Arribos12`/`FCArribos` a mano (ver Patrón 2). Patrones 1-3
  validados contra el MCP el 2026-08-06 (entidades y campos confirmados).
- **Arribos VACA/ganadero** (`spFCArribosVacaPendientes`, integración BBC) usa
  las mismas tablas base pero con filtros de línea de negocio VACA/PDB — el
  detalle exacto de esos filtros no se verificó línea por línea; si el usuario
  pregunta específicamente por "arribos VACA/ganado", cruza con
  [mrp-vaca-ganadera.md](/company-twin/companies/icf/mrp/mrp-vaca-ganadera.md)
  y declara la limitación si el resultado no cuadra.
- **Ambigüedad "arribos"**: si la pregunta no distingue entre arribo
  proyectado (este skill) y recepción de compra transaccional real
  (`Compra`/`CompraD`, erp-kernel), preferir este skill solo si se menciona
  "forecast", "proyectado", "12 semanas" o "cobertura" explícitamente (mismo
  criterio que el skill `mrp` general).
