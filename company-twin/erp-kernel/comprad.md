---
type: Intelisis Entity
title: CompraD — Detalle de compras
description: Líneas de artículos de documentos del módulo COMS.
resource: dbo.CompraD
layer: erp-kernel
tenant: null
tags: [compra, coms, detalle, articulos]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Detalle de líneas de artículos de [Compra](/erp-kernel/compra.md). Un registro por renglón.

- **PK:** `ID` + `Renglon` (compuesta)
- **FK:** `ID` → [Compra](/erp-kernel/compra.md); `Articulo` → [Art](/erp-kernel/art.md)

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | FK → Compra.ID |
| `Renglon` | decimal | Número de renglón |
| `Articulo` | varchar | FK → Art.Articulo |
| `Cantidad` | decimal | Cantidad comprada |
| `Costo` | decimal | Costo unitario |
| `Almacen` | varchar | Almacén destino |
| `FechaRequerida` | datetime | Fecha de entrega requerida |
| `FechaEntrega` | datetime | Fecha de entrega real |
| `Unidad` | varchar | Unidad de medida |

> **ImporteDetalle:** no existe campo `Importe` en `CompraD`. Calcular como `Cantidad * Costo`.

# Patrones de consulta

```
# Detalle de una compra específica
read_records(CompraD, filter="ID eq 1234", select="ID,Renglon,Articulo,Cantidad,Costo,Almacen")

# Detalle de múltiples compras (OR chain, no IN)
read_records(CompraD, filter="ID eq 1234 or ID eq 1235 or ID eq 1236", select="ID,Renglon,Articulo,Cantidad,Costo")
```
