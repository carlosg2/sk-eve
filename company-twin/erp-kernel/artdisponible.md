---
type: Intelisis Entity
title: ArtDisponible / ArtDisponibleDesc — Disponibilidad de artículos
description: Vistas de disponibilidad de inventario por almacén. ArtDisponibleDesc incluye descripción del artículo.
resource: dbo.ArtDisponible / dbo.ArtDisponibleDesc
layer: erp-kernel
tenant: null
tags: [inventario, disponibilidad, art, almacen]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Dos vistas de disponibilidad. **Usar `ArtDisponibleDesc`** para la mayoría de consultas
porque ya incluye descripción y unidad del artículo sin necesidad de join con Art.

## ArtDisponible
- Vista mínima. 6 campos. Sin descripción.
- Útil solo para agregaciones numéricas puras.

## ArtDisponibleDesc
- Vista enriquecida. 17 campos. Incluye `Descripcion1`, `Descripcion2`, `Unidad`, `Tipo`.
- **Preferida** para consultas de usuario.

# Schema — ArtDisponibleDesc

| Campo | Tipo | Notas |
|---|---|---|
| `Empresa` | varchar | Código de empresa |
| `Articulo` | varchar | FK → Art.Articulo |
| `Almacen` | varchar | FK → Alm.Almacen |
| `Disponible` | decimal | Stock disponible (puede ser negativo) |
| `Apartado` | decimal | Cantidad apartada/reservada |
| `DispMenosApartado` | decimal | Disponible neto (Disponible - Apartado) |
| `Descripcion1` | varchar | Nombre del artículo |
| `Descripcion2` | varchar | Nombre alternativo |
| `Unidad` | varchar | Unidad de medida |
| `Tipo` | varchar | Tipo de artículo |

# Schema — ArtDisponible

| Campo | Tipo | Notas |
|---|---|---|
| `Empresa` | varchar | Código de empresa |
| `Articulo` | varchar | FK → Art |
| `Almacen` | varchar | FK → Alm |
| `Disponible` | decimal | Stock disponible |
| `Apartado` | decimal | Cantidad apartada |
| `DispMenosApartado` | decimal | Disponible neto |

# Patrones de consulta

```
# Disponibilidad de todos los artículos en almacén GRAL
read_records(ArtDisponibleDesc, filter="Almacen eq 'GRAL'", select="Articulo,Descripcion1,Disponible,Apartado,DispMenosApartado,Unidad")

# Disponibilidad de un artículo específico
read_records(ArtDisponibleDesc, filter="Articulo eq '000002'", select="Articulo,Descripcion1,Disponible,Almacen")

# Artículos con disponible > 0
read_records(ArtDisponibleDesc, filter="Disponible gt 0 and Almacen eq 'GRAL'", select="Articulo,Descripcion1,Disponible,Unidad", orderby=["Disponible desc"])

# Total disponible por artículo (todos los almacenes)
aggregate_records(ArtDisponible, sum, Disponible, groupby=["Articulo"], orderby="desc")
```

> ⚠️ **Sin `contains`**: para buscar por texto parcial en Descripcion1, traer un rango
> con `first: 100` y filtrar client-side, o buscar por clave exacta de Articulo o Familia.
