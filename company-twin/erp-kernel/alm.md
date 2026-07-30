---
type: Intelisis Entity
title: Alm — Almacenes
description: Catálogo maestro de almacenes.
resource: dbo.Alm
layer: erp-kernel
tenant: null
tags: [alm, almacenes, inventario, maestro]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Catálogo de almacenes. Referenciado por Compra, Venta, Inv, ArtDisponible.

- **PK:** `Almacen` (varchar)

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `Almacen` | varchar | PK. Código corto |
| `Nombre` | varchar | Nombre descriptivo |
| `Estatus` | varchar | `ALTA` \| `BAJA` |

# Almacenes ICF (verificados — BD real)

| Almacen | Nombre |
|---|---|
| `C. FRESCO` | PLANTA CAMPO FRESCO DE PRODUCTO TERMINADO |
| `C. FRESCO1` | PLANTA CAMPO FRESCO DE PRODUCTO TERMINADO |
| `C.FRESCO02` | PLANTA CAMPO FRESCO DE PRODUCTO TERMINADO 02 |
| `C.FRESCO03` | PLANTA CAMPO FRESCO DE PRODUCTO TERMINADO 03 |
| `C.FRESCO04` | PLANTA CAMPO FRESCO DE PRODUCTO TERMINADO 04 |
| `C.FRESCO05` | PLANTA CAMPO FRESCO AREA DE GUACAMOLE |
| `PROCESADOS` | — |
| `REFRITOSMP` | — |
| `JAMAICA` | — |
| `CRIBA1MP` | ALMACEN DE MATERIA PRIMA DE CRIBA1 |
| `ACELAYA` | ALMACEN CELAYA |
| `40TENA CF` | ALMACEN DE CUARENTENA CAMPO FRESCO |
| `AF2` | PLANTA CAMPO FRESCO |

> Lista completa: `read_records(Alm, select="Almacen,Nombre")`

# Patrones de consulta

```
# Todos los almacenes
read_records(Alm, select="Almacen,Nombre")

# Un almacén específico
read_records(Alm, filter="Almacen eq 'GRAL'", select="Almacen,Nombre")
```
