---
type: Intelisis Module Reference
title: MRP — Forecast y arribos a 12 semanas
description: Pronóstico de venta y arribos proyectados a 12 semanas, calendario y catálogo de familias del módulo Forecast/Planeación (FC).
layer: company
tenant: icf
tags: [mrp, forecast, fc, arribos, calendario]
timestamp: 2026-07-31T00:00:00Z
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

## `DimTiempoSemana`
Dimensión de tiempo por semana natural: `Anio` (expuesto así por restricción de
nombres GraphQL — el campo real es `AÑO`), `MES`, `SEMANA`, con
`FECHAINICIO`/`FECHAFIN` y bandera de periodo cerrado. Tabla de referencia, solo
lectura. Llave lógica: `AÑO+SEMANA`.

## `DimTiempoSemanaIso`
Dimensión de tiempo por semana **ISO**: `EJERCICIO+SEMANA_ISO` con fechas de
inicio/fin (`FI`/`FF`). Tabla de referencia, solo lectura. Llave lógica:
`EJERCICIO+SEMANA_ISO`.

## `ArtFamFC`
Catálogo de familias de artículos usado por el módulo FC, llave `Familia`.

# Notas de uso

- "12 semanas" es una ventana móvil de forecast, no un año fiscal — el punto de
  partida de `S1` depende de cuándo se capturó (ver `CalendarioFC`/`Usuario`).
- Para preguntas de "¿qué se espera vender/recibir en las próximas N semanas?",
  usar `ForecastArtFam12`/`ForecastBBC12` (venta) o `Arribos12`/`FCArribos`
  (recepciones) — no confundir forecast de venta con arribo de compra.
- `DimTiempoSemana`/`DimTiempoSemanaIso` son catálogos de referencia, útiles para
  convertir semana calendario ↔ semana ISO al cruzar con otras entidades del ERP
  que usan `Ejercicio`/`Periodo` en vez de semana.
