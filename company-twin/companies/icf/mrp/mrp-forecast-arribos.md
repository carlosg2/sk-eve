---
type: Intelisis Module Reference
title: MRP — Forecast y arribos a 12 semanas
description: Pronóstico de venta y arribos proyectados a 12 semanas, calendario y catálogo de familias del módulo Forecast/Planeación (FC).
layer: company
tenant: icf
tags: [mrp, forecast, fc, arribos, calendario]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Entidades del **pronóstico de venta (forecast)** y **arribos proyectados** a 12
semanas — la entrada de demanda que alimenta la explosión de materiales (ver
[núcleo MRP](mrp-explosion.md)). Todas siguen el patrón de columnas `S1..S12`
(semana 1 a 12) y se capturan **por usuario**.

# Entidades

## `Arribos12`
Arribos (recepciones) proyectados a 12 semanas por artículo, capturados por
usuario. Columnas `S1..S12` = cantidad proyectada de arribo en la semana
correspondiente.

## `Arribos12S`
Arribos proyectados a 12 semanas agrupados por familia/artículo, con desglose
semana (`Sn`) y ajuste (`An`), capturados por usuario.

## `ArribosSub12S`
Detalle/subrenglón de arribos proyectados a 12 semanas (relacionado con
`Arribos12S`).

## `FCArribos`
Arribos (recepciones) capturados por usuario para el módulo FC. Llave lógica:
`ID+Usuario`.

## `ForecastArtFam12`
Forecast (pronóstico) a 12 semanas agrupado por familia de artículo, capturado
por usuario. Llave lógica: `ID+Usuario`.

## `ForecastBBC12`
Forecast (pronóstico) a 12 semanas específico de la línea/negocio **BBC**,
capturado por usuario. Llave lógica: `ID+Usuario`.

## `ForecastHist`
Bitácora histórica de ejecuciones/movimientos del módulo Forecast
(`FechaEmision`, `UltimoCambio`, `Ejercicio`, `Periodo`, `Usuario`, `MovID`).
Solo lectura/creación. Llave lógica: `ID`.

## `ForecastAyuda`
Tabla de ayuda/apoyo auxiliar usada por los procesos de cálculo del módulo
Forecast. Llave lógica: `ID`.

## `CalendarioFC`
Calendario de semanas (`Ano`/`Semana` con rango `FechaD`-`FechaA`) configurado
por usuario para el módulo FC. Llave lógica: `Usuario+Ano+Semana`. **Usar esta
tabla para traducir "semana N" a fechas reales** antes de filtrar otras
entidades por rango de fecha.
⚠️ Casing documentado camelCase (`Ano`/`Semana`/`FechaD`/`FechaA`). NO usar
UPPERCASE aquí (a diferencia de `ForecastPlanProduccion`, que sí es UPPERCASE —
ver mrp-plan-produccion.md). Si un filter/select falla con BadRequest, verifica
el casing real con `read_records(CalendarioFC, first:1)` antes de reportar.

## `DIM_TIEMPO_SEMANA`
✅ **SÍ existe en el MCP de ICF** (antes se documentaba como
EntityNotFound — era info stale). Es la dimensión de tiempo por semana natural:
`Anio` (mapeo del DAB de `AÑO`), `MES`, `SEMANA`, `FECHAINICIO`, `FECHAFIN`, más `NMES`/
`NSEMANA`/`PERIODOCERRADO`. Cobertura **2008–2026** (el ejercicio actual está al día).
Solo lectura. Llave lógica: `Anio+SEMANA`. **Usar esta tabla para traducir semana ↔ fechas**
(alternativa a `CalendarioFC`, que es por usuario). Casing: `Anio`/`MES`/`SEMANA`
(`Anio` con mayúsculas solo en la inicial — verificado con `select` real).

## `DIM_TIEMPO_SEMANA_ISO`
Dimensión de tiempo por semana **ISO**: `EJERCICIO+SEMANA_ISO` con fechas de
inicio/fin (`FI`/`FF`). Tabla de referencia, solo lectura. Llave lógica:
`EJERCICIO+SEMANA_ISO`.

## `ArtFamFC`
Catálogo de familias de artículos usado por el módulo FC, llave `Familia`.
Columnas: `Familia, TiempoEntrega,
StockMinimo, StockMaximo` — **las 4 existen en Intelisis5000** (a diferencia de
MRPCF5000 donde solo estaba `Familia`). Usar `TiempoEntrega`/`StockMinimo`/
`StockMaximo` para cobertura de embarques y reorden (patrón skill-arribos A3/A4).
`Familia` viene con espacios al final (char) — aplicar trim al presentar.

## `UV_QV_FILLRATE`
✅ **Venta real embarcada** (el dato "real" del módulo FC) — vista calculada
sobre `Venta`/`VentaD`, (antes EntityNotFound; el
developer comentó una rama legacy que referenciaba una BD `CAMPOFRESCO`
inexistente). Alimenta: inventario semanal, cadena neta de materiales y
forecast vs ventas (skills de Daniel F2/M1/I1).

⚠️⚠️ **Campos UPPERCASE y `FECHA_REMISION` es varchar dd/mm/yyyy**: el filtro
OData `FECHA_REMISION ge ...` es **LEXICOGRÁFICO y NO cronológico** (evidencia: `ge '01/01/2026'` devolvió filas de 2022/2020). **NUNCA filtrar por
`FECHA_REMISION`.** Filtrar por `MES_FISCAL` (int 1-12) y/o `SEMANA_FACTURA`
(int) — validado OK. Para venta real neta: `sum(CANTIDAD_EMBARCADA) −
sum(RECHAZO)` (2 aggregates).

Columnas clave: `ID, MOV, ESTATUS, FACTURA, NO_ARTICULO, DESCRIPCION_ART,
CANTIDAD_EMBARCADA, RECHAZO, CANT_ENTREGADA, PENDIENTE, FECHA_REMISION
(varchar), MES_FISCAL, SEMANA_FACTURA, ALMACEN, CLIENTE, NOMBRE_CLIENTE`.
Solo lectura. Llave aproximada (no única): `NO_ARTICULO+FECHA_REMISION` —
siempre consultar con filtros.

# Notas de uso

- "12 semanas" es una ventana móvil de forecast, no un año fiscal — el punto de
  partida de `S1` depende de cuándo se capturó (ver `CalendarioFC`/`Usuario`).
- Para preguntas de "¿qué se espera vender/recibir en las próximas N semanas?",
  usar `ForecastArtFam12`/`ForecastBBC12` (venta) o `Arribos12`/`FCArribos`
  (recepciones) — no confundir forecast de venta con arribo de compra.
- `DIM_TIEMPO_SEMANA`/`DIM_TIEMPO_SEMANA_ISO` son catálogos de referencia, útiles para
  convertir semana calendario ↔ semana ISO al cruzar con otras entidades del ERP
  que usan `Ejercicio`/`Periodo` en vez de semana.
