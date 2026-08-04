---
type: Intelisis Entity
title: EmpresaCfg2 — Configuración de planeación por empresa
description: Parámetros de planeación/MRP por empresa (tipo de periodo, horizonte de corrida por default).
resource: dbo.EmpresaCfg2
layer: erp-kernel
tenant: null
tags: [empresa, mrp, planeacion, configuracion]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Configuración de parámetros de planeación por [Empresa](empresa.md). Se usa para resolver
los defaults de `TipoPeriodo` y `Horizonte` cuando el usuario no los especifica en un
sugerido de compra o corrida de MRP.

- **PK:** `Empresa` (FK 1:1 a `Empresa.Empresa`)

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `Empresa` | varchar | PK, FK → [Empresa](empresa.md) |
| `PlanTipoPeriodo` | varchar | `DIA` \| `SEMANA` \| `MES`. Default de `TipoPeriodo` si el usuario no lo indica |
| `ProdPeriodosCorrida` | int | Horizonte de periodos por default (si vacío, usar `10`) |

# Cómo resolver defaults (recipe)

```
read_records(EmpresaCfg2, filter="Empresa eq '<EMPRESA>'", select="Empresa,PlanTipoPeriodo,ProdPeriodosCorrida")
```

- `TipoPeriodo` = valor pedido por el usuario, si no → `PlanTipoPeriodo` en mayúsculas, si no → `SEMANA`.
- `Horizonte` = valor pedido por el usuario, si no → `ProdPeriodosCorrida`, si no → `10`.

# Relaciones

* [Empresa](empresa.md) — catálogo padre.
