---
type: Intelisis Entity
title: PlanArtOP — Órdenes planeadas (resultado de MRP)
description: Órdenes planeadas por artículo generadas por la explosión de planeación (spPlanArt). Fuente del sugerido de compra oficial.
resource: dbo.PlanArtOP
layer: erp-kernel
tenant: null
tags: [mrp, planeacion, sugerido-compra, ordenes-planeadas]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records, update_record]
---

# Resumen

Resultado de la explosión de [PlaneacionMRP](planeacion-mrp.md) (`spPlanArt`) por artículo:
una fila por **Órden Planeada (OP)**, con la acción sugerida (`COMPRAR` / `PRODUCIR`) y su
estado de liberación hacia un documento real.

- **PK:** `Articulo` + `SubCuenta` + `Almacen` + `Empresa` + `ID` (compuesta)
- **Solo lectura + `update_record`** (marcar liberación). **Nunca** `create_record` ni
  `delete_record`: los renglones nacen y mueren con la corrida de `spPlanArt`, no desde la API.

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `Articulo` | varchar | FK → [Art](art.md) |
| `SubCuenta` | varchar | Parte de la llave |
| `Almacen` | varchar | FK → [Alm](alm.md) — almacén planeado de la OP |
| `Empresa` | varchar | FK → [Empresa](empresa.md) |
| `ID` | int | Parte de la llave, identifica la OP dentro del artículo |
| `Estado` | varchar | `LIBERADO` = disponible para convertir en documento real |
| `Accion` | varchar | `COMPRAR` \| `PRODUCIR` — sugerido de compra = filtrar `COMPRAR` |
| `Cantidad` | decimal | Cantidad sugerida (ROP) |
| `FechaLiberacion` | datetime | Fecha en que debe liberarse la orden |
| `FechaEntrega` | datetime | Fecha en que debe recibirse/entregarse |
| `LiberacionID` | int | `NULL` = aún no convertida a documento. No-NULL = ya liberada |
| `LiberacionModulo` | varchar | Módulo del documento generado (ej. `COMS` al liberar a Compra) |
| `LiberacionMov` | varchar | Tipo de movimiento del documento generado |
| `LiberacionMovID` | varchar | Folio del documento generado |

# Filtro estándar del sugerido de compra pendiente

```
read_records(PlanArtOP,
  filter="Empresa eq '<EMP>' and Estado eq 'LIBERADO' and Accion eq 'COMPRAR' and LiberacionID eq null and Cantidad gt 0",
  select="Articulo,SubCuenta,Almacen,ID,Cantidad,FechaLiberacion,FechaEntrega")
```

# Marcar un renglón como liberado (al generar Compra/CompraD manualmente)

Si se genera la Orden de Compra ([Compra](compra.md) + [CompraD](comprad.md)) **sin** ejecutar
`spPlanArtOPLiberar` (proceso interno del ERP), hay que marcar manualmente el origen:

```
update_record(PlanArtOP,
  keys={Articulo, SubCuenta, Almacen, Empresa, ID},
  fields={LiberacionModulo: "COMS", LiberacionID: <Compra.ID>, LiberacionMov: "<Mov usado en Compra>", LiberacionMovID: "<folio generado>"})
```

⚠️ Este `update_record` requiere aprobación humana (HITL) igual que cualquier escritura.

# Compra vs. distribución

`PlanArtOP` **NO tiene** un campo `AlmacenROP`. Ese campo vive en [`Art`](art.md)
(`Art.AlmacenROP` = almacén de orden por defecto del artículo). Para distinguir un renglón de
**compra** vs uno de **distribución** interna, compara:

```
Art.AlmacenROP = PlanArtOP.Almacen   -> compra (no es distribución)
Art.AlmacenROP != PlanArtOP.Almacen  -> distribución, excluir del sugerido de compra
```

Esto requiere una consulta/join contra `Art` por `Articulo` — **nunca** selecciones
`AlmacenROP` directamente sobre `PlanArtOP` (dará `BadRequest: Invalid field`).

# Relaciones

* [Art](art.md) — `AlmacenROP` (almacén de orden) para distinguir compra/distribución.
* [ArtAlm](artalm.md) — parámetros de lote/múltiplos aplicados al calcular `Cantidad`.
* [Compra](compra.md) / [CompraD](comprad.md) — documento destino al liberar.
* [PlaneacionMRP](planeacion-mrp.md) — proceso que genera/actualiza estas filas.
