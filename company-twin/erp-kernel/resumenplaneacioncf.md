---
type: Intelisis Entity
title: ResumenPlaneacionCF — Grid maestro de planeación Forecast CF
description: UNA fila por artículo con familia FC (FamiliaCF/VariedadCF) y los 54 pares semana/producir (S<n>/P<n>).
resource: dbo.ResumenPlaneacionCF
layer: erp-kernel
tenant: null
tags: [planeacion, forecast, mrp, campo-fresco, semanas, familias]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records]
---

# Resumen

**Grid maestro de la planeación Forecast CF (MRPCF5000)**: una fila por
artículo con su clasificación `FamiliaCF`/`VariedadCF` (la familia del sistema
FC, ver [artfamfc.md](artfamfc.md)) y el plan por semana en los pares
`S<n>` (semana) / `P<n>` (producir). También trae inventario, venta y stock.

# Schema 

⚠️ **NO tiene columna `Periodo`** (BadRequest si se usa en `select`/`filter`).
`Ejercicio` y `Concepto` SÍ existen. El periodo/ejercicio vigente se obtiene
del calendario (`CalendarioFC`/`DIM_TIEMPO_SEMANA`) o del concepto de sesión
del Company Twin, nunca de esta vista.

Campos de cabecera:
- `ID`, `Usuario` (fijo del módulo FC: `MASERP`), `Prioridad`, `CtTrabajo`
- `Ejercicio`, `Concepto`
- `Articulo`, `Descripcion`, `Cliente`, `NombreCte`, `Programa`
- **`FamiliaCF`** — familia del sistema FC ("Frijol Negro", "Mitades Negras"...)
- **`VariedadCF`** — variedad ("Americano" / "vacio")
- `Familia` — (null en la vista; usar `FamiliaCF`)

Plan semanal (54 semanas):
- `S1`..`S54` — semana / `P1`..`P54` — producir de esa semana

Resumen:
- `Venta`, `Stock`, `InvEmp`, `InvGra`, `TotalInv`, `Producir`, `Gramaje`, `Kg`
- `Stok15`, `Factorstock`

# Uso

```
# Artículos de una familia FC (selección local sobre la vista)
read_records(ResumenPlaneacionCF,
  select: "Articulo,Descripcion,VariedadCF,FamiliaCF", first: 300)

# Plan completo de un artículo (una fila con S1..S54/P1..P54)
read_records(ResumenPlaneacionCF,
  filter: "Articulo eq '<X>'", select: "Articulo,Descripcion,FamiliaCF,S1,P1,...,S54,P54", first: 1)

# Agregado por familia (patrón mrp-concentrado)
aggregate_records(ResumenPlaneacionCF, sum, Producir, groupby: ["FamiliaCF"])
```

⚠️ `FamArtCF` NO existe en el MCP ICF (EntityNotFound);
el mapeo artículo→familia FC vive en esta vista.
