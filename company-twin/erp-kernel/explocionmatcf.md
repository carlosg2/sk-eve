---
type: Intelisis Entity
title: ExplocionMatCF — Explosión de materiales Forecast CF
description: Snapshot de explosión de materiales del módulo Forecast CF: una fila por (ArticuloPadre, ArticuloHijo) con requerimientos, inventario y cobertura.
resource: dbo.ExplocionMatCF
layer: erp-kernel
tenant: null
tags: [planeacion, forecast, mrp, campo-fresco, explosion, cobertura, insumos]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Snapshot de la explosión de materiales del módulo Forecast CF: resultado de los
SPs del portal (`web_art_explosion_material`, etc.) que descomponen el plan de
producción en requerimientos de materia prima/insumos. Una fila por pareja
`(ArticuloPadre, ArticuloHijo)`, donde `ArticuloPadre` es el producto del plan
y `ArticuloHijo` el material/insumo (`Nivel` 2 = material directo). Es la base
de los reportes de faltantes de insumos y de materia prima. Es un snapshot
por usuario, regenerado al correr el periodo.

# Schema

⚠️ **Snapshot por usuario**: `Usuario` fijo del módulo FC (`MASERP`).

⚠️ **Cobertura condicional**: `InvH`, `InvFinal`, `Cubre`, `PorAlcance`,
`AlcanceDias` y `CapacidadProduccion` pueden venir **NULL** cuando el snapshot
no tiene la cobertura computada (no se corrió la explosión). `InvRequerido`
siempre viene poblado. NULL en esas columnas = cobertura no computada (correr
el SP o usar fallback), NO que la columna se llame distinto.

### Cabecera

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | Llave del snapshot |
| `Usuario` | varchar | Usuario del módulo FC (fijo: `MASERP`) |
| `ArticuloPadre` | varchar | Producto del plan (artículo padre) |
| `DescripcionP` | varchar | Descripción del artículo padre |
| `ArticuloHijo` | varchar | Material/insumo (artículo hijo) |
| `DescripcionH` | varchar | Descripción del artículo hijo |
| `Articulo` | varchar | Artículo de contexto de la explosión |

### Plan

| Campo | Tipo | Notas |
|---|---|---|
| `Total` | decimal | Cantidad total a producir del padre |
| `Produciendo` | decimal | Cantidad en producción |
| `BobinaXConsumir` | decimal | Bobinas a consumir |
| `Venta` | decimal | Venta/demanda del periodo |
| `PorVenta` | decimal | Porcentaje de venta respecto al total |
| `InventarioP` | decimal | Inventario del padre |
| `DOH` | int | Días de inventario (days on hand) |
| `Objetivo` | decimal | Objetivo de inventario |
| `Planear` | decimal | Cantidad a planear |
| `rendimiento` | decimal | Rendimiento del material por unidad de padre (única columna en minúsculas) |
| `Forecast` | decimal | Forecast del periodo |
| `Producir` | decimal | Cantidad a producir |
| `StockPorcentaje` | decimal | Porcentaje de stock |
| `Stock` | decimal | Stock |
| `SeProduce` | bit | Indica si el artículo se produce |

### Cobertura

| Campo | Tipo | Notas |
|---|---|---|
| `InvH` | decimal | Inventario del hijo (puede venir NULL) |
| `InvRequerido` | decimal | Requerimiento del hijo (siempre poblado) |
| `InvFinal` | decimal | InvH − InvRequerido (puede venir NULL) |
| `Cubre` | varchar | `CUBRE` / `NO CUBRE` (puede venir NULL) |
| `PorAlcance` | decimal | InvH / InvRequerido (puede venir NULL) |
| `AlcanceDias` | decimal | PorAlcance × 26, días de alcance (puede venir NULL) |
| `Faltante` | decimal | Faltante del material |
| `CapacidadProduccion` | decimal | Capacidad de producción (puede venir NULL) |
| `Bandera` | int | Bandera de la explosión |

### Clasificación

| Campo | Tipo | Notas |
|---|---|---|
| `Nivel` | int | Nivel de explosión (2 = material directo) |
| `FamiliaCF` | varchar | Familia FC del artículo |
| `CentroTrabajo` | varchar | Centro de trabajo |
| `MaterialD` | varchar | Tipo de material (directo) |
| `SubProducto` | varchar | Subproducto |
| `SubArticulo` | varchar | Sub-articulo |
| `EnValidacion` | bit | En validación |

# Patrones de consulta

```
# Explosión de un producto del plan (materiales directos con cobertura)
read_records(ExplocionMatCF,
  filter: "Usuario eq 'MASERP' and ArticuloPadre eq '<PRODUCTO>' and Nivel eq 2",
  select: "ArticuloHijo,DescripcionH,Total,rendimiento,InvH,InvRequerido,InvFinal,Cubre,PorAlcance,AlcanceDias,Faltante",
  orderby: ["InvRequerido desc"])

# Select mínimo de cobertura para todos los materiales de un nivel
read_records(ExplocionMatCF,
  filter: "Usuario eq 'MASERP' and Nivel eq 2",
  select: "ArticuloPadre,ArticuloHijo,InvRequerido,InvH,Cubre,Faltante", first: 500)

# Requerimiento agregado por material (suma de InvRequerido por artículo hijo)
aggregate_records(ExplocionMatCF,
  sum: "InvRequerido", groupby: ["ArticuloHijo"],
  filter: "Usuario eq 'MASERP' and Nivel eq 2", orderby: "desc")

# Verificar si el snapshot tiene cobertura computada
read_records(ExplocionMatCF,
  filter: "Usuario eq 'MASERP'", select: "InvH,Cubre,InvRequerido", first: 1)
```
