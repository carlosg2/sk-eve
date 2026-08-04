---
type: Intelisis Module Reference
title: MRP — Plan y programa de producción
description: Plan de producción semanal por centro de trabajo, programas procesados/semillas, y órdenes de producción (Prod/ProdD) del módulo Forecast/Planeación (FC).
layer: company
tenant: icf
tags: [mrp, forecast, fc, produccion, plan-semanal]
timestamp: 2026-07-31T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Entidades que traducen la explosión de materiales (ver [núcleo MRP](mrp-explosion.md))
en un **plan de producción concreto por semana y centro de trabajo**. Es la capa
más cercana a "qué se va a producir" (a diferencia de "qué falta comprar", que
cubre [gap-abasto](/agent/skills/gap-abasto/SKILL.md)).

# Entidades

## `ForecastPlanProduccion`
**Vista consolidada** (solo lectura, calculada) del plan de producción semanal:
`Ejercicio`/`Periodo`/`CentroTrabajo`/`Semana`/`Situacion`/`Renglon`/`Articulo`,
con desglose diario `Lun..Dom` y totales (`PorProducir`, `Kilos`). **Punto de
entrada recomendado** para preguntas de "qué se va a producir esta semana".

## `ForecastPlanSemanal`
Encabezado del plan de producción semanal por centro de trabajo
(`Ejercicio`/`Periodo`/`Semana`/`CentroTrabajo`/`Usuario`), con situación de
autorización. Llave lógica: `ID`.

## `ForecastPlanSemanalD`
Detalle del plan de producción semanal (renglón por `Estacion`+`Articulo`, con
cantidades `Lun..Dom` y `Total`). Relacionado con `ForecastPlanSemanal` por `ID`.
Llave lógica: `ID+Renglon`.

## `ProgramaProdProcesadosA`
Programa de producción procesado por usuario/centro de trabajo/familia/artículo,
con métricas de venta, ocupación y capacidad. Sin llave primaria física; usar
`Usuario+CentroTrabajo+Familia+Articulo` como llave lógica.

## `ProgramaProdSemillasA`
Programa de producción de semillas por usuario/centro de trabajo, con métricas
de venta, ocupación y capacidad. Sin llave primaria física; usar
`Usuario+CentroTrabajo` como llave lógica.

## `ProgramaProdSituacionLog`
Bitácora de cambios de situación de un programa de producción por
módulo/ID de módulo (`SituacionUsuario`, `SituacionFecha`,
`SituacionComentarios`). Solo lectura/creación. Llave lógica: `ID+Modulo+ModuloID`.

## `Prod`
Encabezado de órdenes/movimientos de **producción** (equivalente productivo a
`Compra`/`Venta`): fechas, situación, almacén, prioridad, referencias de
origen/destino. Llave: `ID`. **No es exclusivo del módulo FC** — es la entidad
transaccional de producción del ERP; el módulo FC la alimenta/consume.

## `ProdD`
Detalle de órdenes/movimientos de producción (renglones): artículo, cantidades,
costos, estación, tiempos y mermas. Relacionado con `Prod` por `ID`. Llave:
`ID+Renglon+RenglonSub`.

## `ResumenPlaneacionCF`
Tabla de trabajo (scratch) por usuario con el resumen de planeación semanal por
artículo/cliente/centro de trabajo. Columnas `Sn` = venta/situación de la semana
n y `Pn` = cantidad a producir de la semana n (`n=1..54`), más totales de
inventario y stock. Llave lógica: `ID+Usuario`.

## `ResumenPlaneacionCFHist`
Histórico/bitácora de `ResumenPlaneacionCF` (mismas columnas `Sn`/`Pn`
semanales) conservado por renglón. Solo lectura/creación. Llave lógica:
`ID+Renglon`.

# Notas de uso

- Para "¿qué se va a producir esta semana/este periodo?" empezar por
  `ForecastPlanProduccion` (ya viene consolidada) antes que reconstruir desde
  `ForecastPlanSemanal`+`ForecastPlanSemanalD` a mano.
- `Prod`/`ProdD` son la entidad transaccional real de producción (como
  `Compra`/`Venta`) — si la pregunta es "¿qué órdenes de producción están
  abiertas/pendientes?" (no plan/forecast, sino ejecución real), usar estas dos,
  no las tablas `*FC`.
- `ResumenPlaneacionCF`/`ProgramaProdProcesadosA`/`ProgramaProdSemillasA` son
  scratch por usuario — igual que `BalanceFC`, no comparar corridas históricas
  con ellas; usar `ResumenPlaneacionCFHist` para eso.
