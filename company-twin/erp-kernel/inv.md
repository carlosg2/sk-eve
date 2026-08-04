---
type: Intelisis Entity
title: Inv — Encabezado de movimientos de inventario
description: Encabezado de movimientos de inventario (traspasos, ajustes, recepciones).
resource: dbo.Inv
layer: erp-kernel
tenant: null
tags: [inv, inventario, traspasos, movtipo]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Encabezado de movimientos del módulo `INV` (traspasos entre almacenes, ajustes,
recepciones). Un registro por documento. **No tiene renglones de artículo en este
entity** — el detalle por `Articulo`/`Cantidad` vive en `InvD`, que **todavía NO está
publicado** en el MCP (2026-08-03). Sin `InvD`, `Inv` solo permite identificar que
*existe* un movimiento de traspaso/ajuste pendiente o concluido entre almacenes, pero
**no** la cantidad por artículo.

- **PK:** `ID` (int)
- **Estatus:** `SINAFECTAR` → `PENDIENTE` → `CONCLUIDO` | `CANCELADO` (mismo patrón que
  [`Venta`](/erp-kernel/venta.md)/[`Compra`](/erp-kernel/compra.md))
- **Semántica del `Mov`:** ver [`MovTipo`](/erp-kernel/movtipo.md) con `Modulo eq 'INV'`
  (ej. `Salida Traspaso`, `Entrada Traspaso`)

# Schema (campos operativos verificados en vivo, tenant marmoles)

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | PK |
| `Empresa` | varchar | **requerido** |
| `Mov` | varchar | Tipo de movimiento. Ver [MovTipo](/erp-kernel/movtipo.md) (`Modulo='INV'`) |
| `MovID` | varchar | Folio/número del documento |
| `FechaEmision` | datetime | Fecha del documento |
| `Estatus` | varchar | `SINAFECTAR` \| `PENDIENTE` \| `CONCLUIDO` \| `CANCELADO` |
| `Almacen` | varchar | Almacén origen |
| `AlmacenDestino` | varchar | Almacén destino (traspasos) |
| `AlmacenTransito` | varchar | Almacén de tránsito, si aplica (ej. `(TRANSITO)`) |
| `FechaRequerida` | datetime | Fecha en que se requiere el traspaso |
| `FechaEntrega` | datetime | Fecha real de entrega (nullable) |
| `FechaConclusion` | datetime | Fecha en que se concluyó el documento |
| `Directo` | bool | Si el traspaso es directo (sin tránsito) |
| `Ejercicio` / `Periodo` | int | Año/mes contable |
| `Sucursal` / `SucursalOrigen` / `SucursalDestino` | int | Sucursales involucradas |

> ⚠️ **No existe `Articulo` ni `Cantidad` en `Inv`.** Es solo encabezado. Para saber
> qué artículo y qué cantidad se traspasa, se necesita `InvD` (no publicado aún en el
> MCP de marmoles a la fecha de este documento).

# Impacto en el cálculo de Sugerido de Compra (modo ligero)

Mientras `InvD` no esté disponible, las señales `SOL` (solicitudes de inventario),
`OT`/`OI` (traspasos salida, demanda) y `ROT`/`ROI`/`RTI` (traspasos entrada, suministro)
**no pueden calcularse a nivel artículo** con `Inv` solo — tratarlas como `0` y declarar
la limitación en la respuesta si el usuario pregunta explícitamente por traspasos.
Si en el futuro se publica `InvD`, seguir el mismo patrón que
[`VentaD`](/erp-kernel/ventad.md)/[`CompraD`](/erp-kernel/comprad.md) (join por `ID`,
filtrar por `Articulo`).

# Patrones de consulta

```
# Traspasos pendientes de un almacén (sin detalle por artículo)
read_records(Inv, filter="Estatus eq 'PENDIENTE' and Almacen eq 'CDNL'", select="ID,Mov,MovID,FechaRequerida,AlmacenDestino,Estatus")

# Resolver Movs de traspaso (modulo INV)
read_records(MovTipo, filter="Modulo eq 'INV'", select="Mov,Clave,SubClave")
```
