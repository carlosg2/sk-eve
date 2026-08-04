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

# Claves semánticas principales

## Módulo VTAS

| Clave | Significado |
|---|---|
| `VTAS.P` | Pendiente (sin facturar) |
| `VTAS.F` | En firme (facturado) |

## Módulo COMS

| Clave | Significado |
|---|---|
| `COMS.O` | Abierto/pendiente |
| `COMS.F` | En firme (recibido) |

> ⚠️ **NUNCA usar la Clave como valor de `Mov`**. Los nombres concretos de
> movimiento varían por tenant y se resuelven con `MovTipo` o su overlay company.

# Patrones de consulta

```
# Obtener Movs para una clave (cuando no se conocen de memoria)
read_records(MovTipo, filter="Modulo eq 'VTAS' and Clave eq 'VTAS.F'", select="Modulo,Mov,Clave")

# Ver todas las claves de un módulo
read_records(MovTipo, filter="Modulo eq 'COMS'", select="Mov,Clave", orderby=["Clave asc"])
```

> ⚠️ Para filtrar Venta/Compra por Clave, NO existe JOIN directo en DAB.
> Usar los Movs conocidos (tabla arriba) en `or` chains, o hacer lookup previo de MovTipo.
