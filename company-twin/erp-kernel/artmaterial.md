---
type: Intelisis Entity
title: ArtMaterial — Lista de materiales (BOM)
description: BOM del ERP Intelisis: qué materiales/insumos requiere un artículo para producirse.
resource: dbo.ArtMaterial
layer: erp-kernel
tenant: null
tags: [bom, lista-materiales, materiales, produccion, insumos]
timestamp: 2026-08-05T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Lista de materiales (BOM): por cada artículo producible, sus materiales/insumos
y cantidades. Se usa para responder "¿qué insumos se necesitan para producir X?"
y cruzar contra existencias (`ArtDisponibleDesc`) para detectar faltantes.

# Uso (shape verificado en ICF, 2026-08-05)

- La entidad se consulta SIEMPRE filtrando por el **producto**: 
  `read_records(ArtMaterial, filter: "Articulo eq '<ARTICULO>'", first: 50)`.
- El resultado viene en `result.value[]` (como `buscar_registro`), no en
  `result.items` — con `first` bajo sin filtro puede devolver 0 filas.
- Un producto **sin BOM** (ej. venta directa de producto terminado) devuelve 0
  filas: significa que no requiere insumos de producción.
- Las columnas exactas no se documentan aquí todavía: la verdad de runtime es
  `read_records(ArtMaterial, filter: "Articulo eq '<producto>'", first: 1)` sin
  `select` (descubrimiento) — no inventar campos.

# Patrones de consulta

```
# BOM de un producto (filas = materiales)
read_records(ArtMaterial, filter: "Articulo eq '<X>'", first: 50)

# BOM de varios productos (encadenar or si < 8, si no por separado)
read_records(ArtMaterial, filter: "Articulo eq '<X1>' or Articulo eq '<X2>'", first: 100)
```

Después de obtener los materiales, agregar existencias con
`aggregate_records(ArtDisponible, sum, Disponible, filter: "Articulo eq '<M1>'
or Articulo eq '<M2>'", groupby: ["Articulo"])` o leer `ArtDisponibleDesc` con
select acotado.
