---
type: Intelisis Entity
title: Art — Artículos (catálogo maestro)
description: Catálogo maestro de artículos/productos del ERP.
resource: dbo.Art
layer: erp-kernel
tenant: null
tags: [art, articulos, maestro, inventario]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Catálogo maestro de productos. Referenciado por Compra, Venta, Inv, y las vistas de disponibilidad.

- **PK:** `Articulo` (varchar)
- **Tabla:** `dbo.Art` (380 campos)
- **Estatus:** `ALTA` (activo) | `BAJA`

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `Articulo` | varchar | PK |
| `Descripcion1` | varchar | Nombre principal del artículo |
| `Descripcion2` | varchar | Nombre alternativo |
| `NombreCorto` | varchar | Nombre corto |
| `Grupo` | varchar | Grupo de clasificación |
| `Categoria` | varchar | Categoría |
| `Linea` | varchar | Línea de producto |
| `Familia` | varchar | Familia de producto |
| `Unidad` | varchar | Unidad de medida base |
| `Estatus` | varchar | `ALTA` \| `BAJA` |

> ⚠️ `contains`/`LIKE` no soportado en filtros OData. Para buscar por nombre parcial,
> traer candidatos y filtrar client-side, o usar la clave exacta.

# Patrones de consulta

```
# Artículos activos
read_records(Art, filter="Estatus eq 'ALTA'", select="Articulo,Descripcion1,Grupo,Familia,Unidad", first=20)

# Por clave exacta
read_records(Art, filter="Articulo eq '000002'", select="Articulo,Descripcion1,Grupo,Categoria,Linea,Familia")

# Por familia (clave exacta)
read_records(Art, filter="Familia eq 'Frijol' and Estatus eq 'ALTA'", select="Articulo,Descripcion1,Familia")
```
