---
type: Intelisis Module Reference
title: MRP — Plan y programa de producción
description: Plan de producción semanal por centro de trabajo, programas procesados/semillas, y órdenes de producción (Prod/ProdD) del módulo Forecast/Planeación (FC).
layer: company
tenant: icf
tags: [mrp, forecast, fc, produccion, plan-semanal]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Entidades que traducen la explosión de materiales (ver [núcleo MRP](mrp-explosion.md))
en un **plan de producción concreto por semana y centro de trabajo**. Es la capa
más cercana a "qué se va a producir" (a diferencia de "qué falta comprar", que
cubre `gap-abasto` (skill).

# Entidades

## `ForecastPlanProduccion`
**Vista consolidada** (solo lectura, calculada) del plan de producción semanal.
⚠️ **Los campos de ESTA vista están en UPPERCASE en el DAB** (evidencia: `Semana eq 31` → BadRequest "Could not find a property named
'Semana'"; `SEMANA eq 31` → OK). No generalizar a otras entidades FC — cada
vista tiene su propio casing (ej. `CalendarioFC` documenta `Ano`/`Semana`
camelCase). Campos reales:
`EJERCICIO`/`PERIODO`/`CENTROTRABAJO`/`SEMANA`/`SITUACION`/`RENGLON`/`ARTICULO`/
`DESCRIPCION`/`FAMILIA`/`PORPRODUCIR`/`KILOS`, con desglose diario `LUN..DOM`.
**Punto de entrada recomendado** para preguntas de "qué se va a producir esta
semana".

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

## `MovSituacionFCL`
✅ Catálogo de **movimientos por módulo** para el workflow de situaciones
. Columnas: `Modulo, Mov, ID` (PK real de 3 columnas).
Solo 2 filas en producción: `FC/Articulo` y `FC/Plan Semanal`. Útil para saber
qué movimientos del módulo FC participan en el workflow de situaciones
(avanzar/regresar con permisos vía `MovSituacionFC`/`MovSituacionUsuarioFC`).

## `AuxiliarU`
✅ **Ledger contable de movimientos de inventario** .
Base del **saldo de inventario** del inventario semanal (skill-forecast F2 de
Daniel): el saldo de un artículo en un almacén es
`sum(CargoU) − sum(AbonoU)` sobre `Rama='INV'`, `Empresa='INCF'` y
`Cuenta=<artículo>`. El almacén va en `Grupo` (equivale a `Alm.Almacen`).
Ejemplo: A0716 → CargoU 157,545 − AbonoU 127,663 = 29,882.

⚠️ **Volumen enorme**: ~1.5M filas solo en `Rama='INV'`+`Empresa='INCF'` —
**SIEMPRE acotar con `Cuenta`** (y si aplica, `Fecha`) en el filtro; nunca
agregar la tabla completa. Key-fields: `ID` (PK identity verificada en
producción). Solo lectura.

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

⚠️ **Usuario fijo del módulo FC **: las consultas de los snapshots
usar SIEMPRE **`MASERP`** (mismo criterio que el motor de referencia).

✅ **Corrida de MASERP en línea **:
la carga inicial de `MASERP · 2026 · Periodo 8` ya se ejecutó y el MCP
remoto tiene el plan poblado. `ResumenPlaneacionCF` con `Usuario eq 'MASERP'`
= **90 filas** y totales exactos a la referencia del motor:
S32=3,978,128 · P32=2,867,048 · S33=2,440,112 · P33=2,120,442 · S34=1,973,193 ·
P34=1,872,112 · S35=2,142,893 · P35=2,104,518. Ventana visible del periodo 8:
**S32–S35** (S36 sin datos en el snapshot → reportar "sin datos", no cero).
Si un periodo futuro no tiene plan (semanas en `null`), declarar la limitación
("pendiente de re-corrida"), NO inventar. La fuente del agente siempre es el MCP.

⚠️ **Cómo se genera la corrida **: el snapshot NO es
un dato permanente — lo regenera la **carga inicial** del proceso (SPs
`spFCForcastCFNuk(@Usuario,@Ejercicio,@Periodo,@EnSilencio)`, precedidos por
`spFCAsignarBasesDefaul`/`spArtCentroDefaul`/`spArtCentroBalanceo`, seguidos de
`spWebForecast12`/`spWebForecastFam12S`/`spWebForecastBBC12`/
`spWebForecastArribos12`/`spWebInicio`). Por eso cada usuario tiene SU corrida.
✅ **El SP `spFCForcastCFNuk` está publicado en el MCP ICF**
como tool **`fcforcast_cfnuk`** (parámetros `Usuario, Ejercicio, Periodo,
EnSilencio`; el booleano va como `true`/`false` — DAB rechaza `"1"`). El agente
NO lo llama en el flujo normal (regenera el plan); si un usuario no tiene plan,
reportar que la corrida no existe para ese usuario.

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
