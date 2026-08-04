---
type: Intelisis Entity
title: VentaD — Detalle de ventas
description: Líneas de artículos de documentos del módulo VTAS.
resource: dbo.VentaD
layer: erp-kernel
tenant: null
tags: [venta, vtas, detalle, articulos]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Detalle de líneas de artículos de [Venta](/erp-kernel/venta.md). Un registro por renglón.

- **PK:** `ID` + `Renglon` (compuesta)
- **FK:** `ID` → [Venta](/erp-kernel/venta.md); `Articulo` → [Art](/erp-kernel/art.md)

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | FK → Venta.ID |
| `Renglon` | decimal | Número de renglón |
| `Articulo` | varchar | FK → Art.Articulo |
| `Cantidad` | decimal | Cantidad vendida |
| `Precio` | decimal | Precio unitario |
| `Almacen` | varchar | Almacén de salida |
| `Unidad` | varchar | Unidad de medida |
| `DescripcionExtra` | varchar | Descripción extra (generalmente null) |
| `CantidadPendiente` | decimal | Cantidad por surtir |

> ⚠️ **No existe `Importe` ni `Descripcion` en VentaD.**
> - `ImporteDetalle` = `Cantidad * Precio` (calculado)
> - Para la descripción del artículo, hacer join manual con `Art.Descripcion1`

> ⚠️ **`CantidadPendiente` es `null` (no `0`) en renglones de documentos ya
> `CONCLUIDO`/`CANCELADO`.** Solo viene poblado (numérico, puede ser `0` o mayor) mientras
> el documento sigue `PENDIENTE`. Para calcular **demanda real** (pedidos de venta
> pendientes, señal `PV` del MRP manual), usar siempre `CantidadPendiente` — **nunca
> `Cantidad`** (esa es la cantidad originalmente solicitada, no lo que falta por surtir).
> Filtrar `CantidadPendiente gt 0` es un proxy eficiente de "renglón con demanda abierta"
> sin necesitar el join a `Venta`; para el caso estricto (excluir `CANCELADO` con residual
> no depurado), confirmar `Venta.Estatus eq 'PENDIENTE'` vía el patrón de 2 pasos de
> [Venta](/erp-kernel/venta.md).

# Patrones de consulta

```
# Detalle de una venta
read_records(VentaD, filter="ID eq 5678", select="ID,Renglon,Articulo,Cantidad,Precio,Almacen,Unidad")

# Detalle de múltiples ventas
read_records(VentaD, filter="ID eq 5678 or ID eq 5679", select="ID,Renglon,Articulo,Cantidad,Precio")

# Para obtener descripción: join manual
PASO 1: read_records(VentaD, filter="ID eq 5678", select="Articulo,Cantidad,Precio")
PASO 2: read_records(Art, filter="Articulo eq 'ART001' or Articulo eq 'ART002'", select="Articulo,Descripcion1")
→ unir por Articulo en cliente
```
