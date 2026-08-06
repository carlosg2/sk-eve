---
type: Intelisis Entity
title: ArtFamFC — Familias del sistema Forecast CF
description: Catálogo de familias del sistema Forecast CF (MRPCF5000), la clasificación fina que usa el plan de producción.
resource: dbo.ArtFamFC
layer: erp-kernel
tenant: null
tags: [familias, forecast, mrp, campo-fresco, clasificacion]
timestamp: 2026-08-05T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Catálogo de **familias del sistema Forecast CF** (clasificación usada en
`ResumenPlaneacionCF`/`FamArtCF`). Es la clasificación FINA de producto
("Frijol Negro", "Frijol negro americano", "Frijol Pinto", "Mitades Negras"...),
distinta de `Art.Familia` (genérica, ej. "FRIJOL").

# Schema (verificado en vivo ICF, 2026-08-05)

- `Familia` — nombre de la familia FC (44 familias en ICF, ej. "Frijol Negro").
- `StockMinimo` — stock de seguridad mínimo de la familia.
- `StockMaximo` — stock máximo de la familia.
- `TiempoEntrega` — tiempo de entrega (días).

# Uso

```
# Listar familias del sistema FC
read_records(ArtFamFC, select: "Familia", first: 200)

# Con parámetros de stock por familia
read_records(ArtFamFC, select: "Familia,StockMinimo,StockMaximo,TiempoEntrega", first: 200)
```

Para saber qué artículos pertenecen a cada familia FC, cruzar con
`ResumenPlaneacionCF` (`FamiliaCF`/`VariedadCF` por artículo) — ver
[resumenplaneacioncf.md](resumenplaneacioncf.md). `FamArtCF` NO existe en el MCP
ICF (EntityNotFound, verificado 2026-08-05).
