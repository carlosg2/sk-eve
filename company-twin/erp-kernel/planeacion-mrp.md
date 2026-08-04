---
type: Intelisis Stored Procedure
title: PlaneacionMRP — Explosión oficial de MRP (spPlanArt)
description: Ejecuta el store oficial de planeación/MRP del ERP (spPlanArt). Fuente de verdad que prevalece sobre cualquier cálculo manual de sugerido de compra.
resource: dbo.spPlanArt
layer: erp-kernel
tenant: null
tags: [mrp, planeacion, sugerido-compra, spplanart]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [planeacion_mrp]
---

# Resumen

Corre la explosión/planeación de MRP oficial del ERP (demanda, suministro, EP, RN, ROP) para
los artículos filtrados, y actualiza las tablas de trabajo de planeación —incluyendo
[PlanArtOP](planartop.md)— con el resultado.

**Regla de consistencia (obligatoria):** si un cálculo manual de sugerido de compra (por
tablas base) difiere del resultado de este store, **prevalece siempre `spPlanArt`**. Úsalo
para validar o reconciliar un sugerido calculado manualmente, nunca lo reemplaces por
aproximación propia si el store está disponible.

- **Tool MCP:** `planeacion_mrp` (custom-tool, solo lectura/ejecución — no es `execute_entity`).
  Verificar el nombre exacto con `tools/list` la primera vez que se use contra un tenant nuevo;
  el DAB normaliza el nombre de la entidad `PlaneacionMRP` a snake_case.

# Parámetros

| Parámetro | Requerido | Notas |
|---|---|---|
| `Empresa` | **Sí** | Empresa sobre la cual se ejecuta la planeación. Confirmar siempre con el usuario (ver [Empresa](empresa.md)) antes de llamar. |
| `ArticuloEspecifico` | No | Artículo específico. Vacío/NULL = modo general. |
| `Hoy` | No | Fecha base del cálculo. Default: fecha actual. |
| `Debug` | No | Bandera de depuración (bit). Default `0`. |
| `Categoria` | No | Filtro por categoría. |
| `Grupo` | No | Filtro por grupo. |
| `Familia` | No | Filtro por familia. |
| `Fabricante` | No | Filtro por fabricante. |
| `Linea` | No | Filtro por línea. |
| `Temporada` | No | Filtro por temporada. |
| `ProveedorEspecifico` | No | Filtro por proveedor. |
| `Referencia` / `ReferenciaModulo` / `ReferenciaActividad` | No | Trazabilidad del proceso que invoca la planeación. |
| `OperacionServidor` / `OperacionBase` / `OperacionLigarServidor` | No | Control interno del ERP. |

# Cómo llamar (recipe)

```
planeacion_mrp(Empresa = "<EMP>", Familia = "<FAMILIA>")
```

Tras ejecutar, el resultado vigente se lee de [PlanArtOP](planartop.md) filtrando
`Estado eq 'LIBERADO' and Accion eq 'COMPRAR' and LiberacionID eq null`.

# Governance

`spPlanArt` **escribe** tablas de trabajo de planeación (aunque el efecto sea interno, no un
documento transaccional). Trátalo como una acción de escritura: úsalo para **validar/reconciliar**,
no lo dispares en cada pregunta de solo-lectura si el usuario solo pidió ver el sugerido
calculado manualmente sobre tablas base.

# Relaciones

* [PlanArtOP](planartop.md) — tabla de resultado que actualiza.
* [ArtAlm](artalm.md), [Art](art.md), [Empresa](empresa.md), [EmpresaCfg2](empresacfg2.md) — insumos del cálculo.
