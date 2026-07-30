---
type: Intelisis Entity
title: MovTipo — Tipos de movimiento
description: Catálogo de tipos de movimiento por módulo. Define la semántica de cada Mov.
resource: dbo.MovTipo
layer: erp-kernel
tenant: null
tags: [movtipo, coms, vtas, catalogo]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Catálogo que clasifica los tipos de documento (`Mov`) de cada módulo con una `Clave`
semántica. Esencial para filtrar ventas/compras por su categoría (pendiente/firme).

- **PK:** `Modulo` + `Mov` (compuesta)

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `Modulo` | varchar | Módulo: `VTAS`, `COMS`, `INV`, `AF`, etc. |
| `Mov` | varchar | Nombre del tipo de movimiento |
| `Clave` | varchar | Clasificación semántica |
| `SubClave` | varchar | Sub-clasificación |
| `Orden` | int | Orden de aparición |

# Claves semánticas principales (ICF — BD INCF, verificadas)

## Módulo VTAS

| Clave | Significado | Movimientos |
|---|---|---|
| `VTAS.P` | Pendiente (sin facturar) | Pedido, Orden Surtido, Orden Surtido R, Ingreso, Contratos, Pedido Posfechado, Reservacion |
| `VTAS.F` | En firme (facturado) | Factura, Factura Credito, Factura Activo, Factura Flexible, Factura Prorrateada, FacturaDIF, FacturaE, Nota Venta, Nota Venta R, Cancelacion NC |

## Módulo COMS

| Clave | Significado | Movimientos |
|---|---|---|
| `COMS.O` | Abierto/pendiente | Orden Compra, Orden Compra OP, Orden Compra AF, Orden Compra AFSocio, Orden Compra Socios, Orden Compra Emida, Aduana, Confirma Proveedor, Control Calidad, Factura Proveedor |
| `COMS.F` | En firme (recibido) | Entrada Compra, Entrada Mercancia, Entrada Maquila, Entrada Consignacion, Entrada Insumos, Entrada Herramienta, Entrada Consumibles, Entrada de Prestamo, Compra Activos, CompraActivos Socios |

> ⚠️ **NUNCA usar la Clave como valor de `Mov`**. `COMS.F` no es un `Mov`. Usar los nombres de Mov de la tabla.

# Patrones de consulta

```
# Obtener Movs para una clave (cuando no se conocen de memoria)
read_records(MovTipo, filter="Modulo eq 'VTAS' and Clave eq 'VTAS.F'", select="Modulo,Mov,Clave")

# Ver todas las claves de un módulo
read_records(MovTipo, filter="Modulo eq 'COMS'", select="Mov,Clave", orderby=["Clave asc"])
```

> ⚠️ Para filtrar Venta/Compra por Clave, NO existe JOIN directo en DAB.
> Usar los Movs conocidos (tabla arriba) en `or` chains, o hacer lookup previo de MovTipo.
