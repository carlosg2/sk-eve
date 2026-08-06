---
type: Attested Computation
title: spPlanArt — Explosión MRP oficial (sugerido de compra)
description: Cómputo sancionado del ERP para la explosión/planeación MRP. Prevalece sobre cualquier cálculo manual de sugerido de compra.
resource: dbo.spPlanArt
layer: erp-kernel
tenant: null
tags: [mrp, planeacion, sugerido-compra, attested-computation, spplanart]
status: stable
runtime: mcp
parameters:
  - { name: Empresa, type: string, required: true }
  - { name: ArticuloEspecifico, type: string, required: false }
  - { name: Hoy, type: string, required: false }
  - { name: Debug, type: integer, required: false }
  - { name: Categoria, type: string, required: false }
  - { name: Grupo, type: string, required: false }
  - { name: Familia, type: string, required: false }
  - { name: Fabricante, type: string, required: false }
  - { name: Linea, type: string, required: false }
  - { name: Temporada, type: string, required: false }
  - { name: ProveedorEspecifico, type: string, required: false }
executor:
  resource: /erp-kernel/mcp-tools.md
  receipt: [tool, status, output]
attester:
  resource: scripts/check-knowledge.ts
generated: { by: copilot/sigma-meta-fabrica, at: 2026-08-05T00:00:00Z }
sources:
  - id: planeacion-mrp
    resource: /erp-kernel/planeacion-mrp.md
    title: PlaneacionMRP — Explosión oficial de MRP (spPlanArt)
    last_modified: 2026-08-03
---

# Resumen

Cómputo sancionado del ERP Intelisis para la explosión/planeación MRP (demanda, suministro,
EP, RN, ROP). Es la **fuente de verdad** del sugerido de compra: si un cálculo manual por
tablas base difiere, **prevalece siempre `spPlanArt`** (regla de
[PlaneacionMRP](/erp-kernel/planeacion-mrp.md)). El agente lo usa para validar o
reconciliar un sugerido; nunca lo reemplaza por una aproximación propia si el store está
disponible.

- **Tool MCP:** `planeacion_mrp` (custom-tool; verificar el nombre con `tools/list` la primera
  vez contra un tenant nuevo — el DAB normaliza `PlaneacionMRP` a snake_case).
- **Resultado vigente:** se lee de [PlanArtOP](/erp-kernel/planartop.md) filtrando
  `Estado eq 'LIBERADO' and Accion eq 'COMPRAR' and LiberacionID eq null`.

# Computation

```
planeacion_mrp(Empresa = "<EMP>", Familia = "<FAMILIA>")
```

El agente SOLO provee valores para los `parameters` declarados en el frontmatter; no
autoriza ni edita el cómputo. La binding con los valores y la comparación contra lo que
realmente corrió es trabajo del consumidor/attester (OKF §10.3).

# Governance

`spPlanArt` **escribe** tablas de trabajo de planeación (efecto interno, no documento
transaccional). Trátalo como acción de escritura: para **validar/reconciliar**, no en cada
pregunta de solo-lectura si el usuario solo pidió ver el sugerido calculado manualmente.

**Attestación:** por ahora el receipt es la respuesta del propio tool (`planeacion_mrp`:
`status`/`output`) validada contra el contrato de [mcp-tools](/erp-kernel/mcp-tools.md), y
`scripts/check-knowledge.ts` valida disponibilidad de entidades contra el MCP. Un attester
dedicado que re-derive la binding y compare el receipt expandido queda como trabajo futuro
(OKF §12, "considered and deferred").
