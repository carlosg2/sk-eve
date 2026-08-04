---
type: Intelisis Module Reference
title: MRP — Presupuesto ganadero / VACA
description: Módulo de planeación ganadera (VACA) — disponibilidad, presupuesto de venta consolidado y vista calculada de renglones de venta.
layer: company
tenant: icf
tags: [mrp, forecast, fc, vaca, ganaderia, presupuesto]
timestamp: 2026-07-31T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Sub-módulo de planeación **ganadera/forecast (VACA)** — un forecast de venta
consolidado independiente del forecast general del módulo FC (ver
[forecast y arribos](mrp-forecast-arribos.md)), orientado a línea de negocio
ganadera.

# Entidades

## `ArtDisponibleVaca`
Vista de disponibilidad de artículo (`Empresa`/`Articulo`/`Almacen`) equivalente
a `ArtDisponible` (ver [erp-kernel](/erp-kernel/artdisponible.md)), pero usada
por el módulo VACA. Solo lectura (vista calculada).

## `VacaPresupuestoVtaCon`
Encabezado de presupuesto de venta consolidado (versión, ejercicio, semana MRP,
estatus), usado por la planeación ganadera/forecast. Llave: `ID`.

## `VacaPresupuestoVtaConD`
Detalle de presupuesto de venta consolidado por artículo/cliente/programa, con
columnas semanales `Sn` (venta) y `Pn` (producir), `n=1..54` aprox. Relacionado
con `VacaPresupuestoVtaCon` por `ID`. Llave lógica: `ID+Renglon`.

## `VentaTCalc`
Vista calculada de renglones de venta (transaccional, equivalente a
`Venta`+`VentaD` con campos derivados de costos, impuestos e importes). Solo
lectura (vista). Llave lógica: `ID+Renglon+RenglonSub`. **No exclusiva de
VACA** — es una vista transversal, pero se agrupa aquí por ser la fuente de
datos real que compara el presupuesto VACA contra venta efectiva.

# Notas de uso

- Preguntar primero si la consulta es sobre el forecast **general** (módulo FC,
  [forecast-arribos](mrp-forecast-arribos.md)) o el presupuesto **ganadero
  consolidado (VACA)** — son procesos y tablas distintos aunque ambos hablan de
  "presupuesto de venta".
- `VentaTCalc` es útil cuando se necesita comparar presupuesto (`Sn`/`Pn` de
  `VacaPresupuestoVtaConD`) contra venta real ya facturada/calculada, sin tener
  que reconstruir importes desde `Venta`+`VentaD` a mano.
