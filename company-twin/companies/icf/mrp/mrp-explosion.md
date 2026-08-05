---
type: Intelisis Module Reference
title: MRP — Núcleo de cálculo (explosión de materiales / MRP)
description: Tablas núcleo del proceso MRP de Forecast/Planeación (FC) — ExplocionMatCF, balance, bitácoras de ejecución y parámetros min/max.
layer: company
tenant: icf
tags: [mrp, forecast, fc, explosion-materiales]
timestamp: 2026-07-31T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Tablas centrales del proceso de **explosión de materiales (MRP)** del módulo
Forecast/Planeación (FC). El proceso corre **por `Usuario`** (no hay un MRP único
global — cada usuario ERP que corre el proceso tiene su propia corrida/snapshot).
Para el tenant ICF, el valor estático usado es `Usuario: "CGARZA"` (ver
[operaciones-policy.md](../policies/operaciones-policy.md)).

Flujo: `ExplocionMatCF` (resultado crudo de la explosión) → se resume en
`BalanceFC`/`ResumenPlaneacionCF` (ver [plan de producción](mrp-plan-produccion.md))
→ se traduce a reportes accionables `FaltanteInsumos`/`FaltanteMateriaPrima` (tools
dedicados `faltante_insumos`/`faltante_materia_prima`, ver
[skill gap-abasto](/agent/skills/gap-abasto/SKILL.md)).

# Entidades

## `ExplocionMatCF`
Resultado de la explosión de materiales (requerimientos de materia prima/insumos)
calculada por usuario para el módulo FC. **Es la base** de `FaltanteInsumos` y
`FaltanteMateriaPrima`. Llave lógica: `ID+Usuario`.

## `BalanceFC`
Tabla de trabajo (scratch) por usuario con el balance/resultado intermedio del
proceso de planeación FC. Se recalcula por cada corrida de un usuario — **no es
histórico**, se sobrescribe. Módulo: Forecast/Planeación (FC).

## `BalanceFCHist`
Histórico de corridas de `BalanceFC` (auditoría), con renglón histórico (`RID`)
por usuario. Solo lectura/creación: es una bitácora, no debe modificarse ni
borrarse.

## `ProcesadosCF`
Resumen de capacidad/eficiencia procesada por centro (`CapacidadReal`,
`EficienciaTotal`, `CapacidadRealTotal`). Sin llave primaria física; usar `Centro`
como llave lógica. Al 2026-07-31 la tabla no tenía datos en ICF.

## `UtLogEjcProMrp`
Bitácora de ejecución del proceso de MRP de producción (`LOG_ID`, `LOG_FYH`
fecha/hora, `ORG` origen, `PRM` parámetros). Solo lectura/creación. Llave lógica:
`LOG_ID`. Útil para saber **cuándo y con qué parámetros se corrió el MRP** de un
usuario/periodo — consultar aquí antes de asumir que `ExplocionMatCF` está
actualizado para un `Ejercicio`/`Periodo` dado.

## `UtMaxMinCompra`
Parámetros de inventario mínimo/máximo (en Kg) por artículo y módulo, usados por
el proceso de compras/MRP. Sin llave primaria física; usar `ID` como llave lógica.
Corresponde a los campos `InvMin`/`InvMax` que ya regresan `faltante_insumos`/
`faltante_materia_prima` — normalmente no hace falta consultar esta tabla aparte.

## `UV_QV_PPTOCOMPRA`
Vista de **presupuesto de compra** (stock de seguridad de materia prima): stock
mínimo/máximo y máximo de compra por artículo/familia. **Añadida al MCP de ICF el
2026-08-04** (antes solo existía en la base `MRPCF5000` vía el sistema MSSQL de
Campo Fresco). Schema verificado en vivo con `read_records`:
`NIVELAGRUPAMIENTO` (ARTICULO/FAMILIA), `TIPO`, `FAMILIA`, `LINEA`, `ARTICULO`,
`DESCRIPCION`, `TIPOCATALOGO`, `INVMINIMOKG`, `INVMAXIMOKG`, `MAXCOMPRAKG`.
`INVMINIMOKG`/`INVMAXIMOKG` = stock de seguridad (Kg); `MAXCOMPRAKG` = máximo de
compra (Kg). Los campos de Kg pueden venir `null` para artículos sin parámetro.
Usar como fuente de stock de seguridad junto con `Art` (para el catálogo) — ver
skill [`mrp-cf`](/agent/skill-library/mrp-cf/SKILL.md).

## `UtMrpPrevioMateriaPrima`
Instantánea (staging) del MRP previo de materia prima por semana/almacén/
artículo/material/lote, con cantidad requerida. Generada por proceso batch, solo
lectura. Llave lógica: `EMPRESA+SEMANA+ALMACEN+ARTICULO+MATERIAL+SERIELOTE`.

## `MovSituacionFC`
Catálogo de situaciones/estatus de movimientos por módulo (`Modulo`/`Mov`/
`Situacion`), con orden y banderas de control de usuarios y visibilidad web.
Llave lógica: `ID`.

## `MovSituacionUsuarioFC`
Asignación de usuarios autorizados a controlar situaciones de movimientos del
módulo FC. Llave lógica: `ID+Usuario`.

# Notas de uso

- Ninguna de estas tablas tiene PK física declarada salvo `ExplocionMatCF`
  (`ID+Usuario`) — al hacer `read_records`, filtrar siempre por `Usuario` (y
  `Ejercicio`/`Periodo` si aplica) para no traer corridas de otros usuarios.
- `BalanceFC`/`ResumenPlaneacionCF` son **scratch, se sobrescriben** — no sirven
  para comparar corridas históricas; usar las versiones `*Hist` para eso.
- Antes de confiar en un resultado vacío de `ExplocionMatCF`/`faltante_*`,
  verificar en `UtLogEjcProMrp` que el MRP se corrió para ese `Usuario`/periodo.
