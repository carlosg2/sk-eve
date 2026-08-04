---
type: Intelisis Entity
title: Prod / ProdD — Órdenes de producción
description: Encabezado (Prod) y renglones (ProdD) de órdenes de producción. Fuente del suministro por producción (OP).
resource: dbo.Prod / dbo.ProdD
layer: erp-kernel
tenant: null
tags: [prod, prodd, produccion, mrp]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

`Prod` (encabezado) + `ProdD` (renglones) son la fuente de la señal de suministro
`OP` (producción pendiente) en el cálculo manual de Sugerido de Compra. Publicadas
(solo lectura) en el MCP de marmoles el 2026-08-03.

- **PK `Prod`:** `ID` (int)
- **PK `ProdD`:** `ID` + `Renglon` + `RenglonSub` (compuesta)
- **FK:** `ProdD.ID` → `Prod.ID`; `ProdD.Articulo` → [Art](/erp-kernel/art.md)

> ⚠️ **Schema no verificado en vivo.** `describe_entities` no devuelve lista de campos
> para estas dos entidades (`fields: []`), y en el tenant `marmoles` **no hay registros
> actuales** (`read_records` con `first=1` sin filtro devuelve `value: []` para ambas).
> Esto es consistente con el giro de negocio (mármoles/cantera: compra y vende, no
> produce) — lo más probable es que `Art.SeProduce = 0` para prácticamente todo el
> catálogo de este tenant, y por lo tanto `OP` **siempre será `0`** en la práctica.
> No inventar nombres de campo: si en algún momento aparecen registros, confirmar el
> schema real con una consulta `read_records(Prod, first=1)` antes de construir un
> patrón de consulta concreto (se espera un patrón análogo a
> [`Compra`](/erp-kernel/compra.md)/[`CompraD`](/erp-kernel/comprad.md): `Articulo`,
> `Cantidad`, `Almacen`, `CantidadPendiente`, fechas).

# Impacto en el cálculo de Sugerido de Compra (modo ligero)

- Antes de calcular `OP` para un artículo, verificar `Art.SeProduce`. Si es `0`/falso,
  omitir la consulta a `Prod`/`ProdD` y usar `OP = 0` directamente (evita consultas
  innecesarias).
- Si `Art.SeProduce = 1`, intentar `read_records(ProdD, filter="Articulo eq '<ART>'", first=5)`
  para confirmar si hay datos reales antes de construir el cálculo completo; si regresa
  vacío, tratar `OP = 0` y no bloquear el resto del cálculo.
