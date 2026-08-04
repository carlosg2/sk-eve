---
type: Intelisis Module Reference
title: MRP — Centros y estaciones de trabajo
description: Catálogos y configuración de centros de trabajo/producción y estaciones usados por el módulo Forecast/Planeación (FC).
layer: company
tenant: icf
tags: [mrp, forecast, fc, centros, estaciones]
timestamp: 2026-07-31T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Catálogos maestros y de configuración de **dónde se produce** (centros de
trabajo y estaciones dentro de ellos), usados como dimensión por casi todas las
entidades de [plan y programa de producción](mrp-plan-produccion.md).

# Entidades

## `Centro`
Catálogo maestro de centros de trabajo/producción. Llave: `Centro`. **No es
exclusivo del módulo FC** — es el catálogo base del ERP.

## `CentroFC`
Configuración de centro de trabajo específica del módulo FC. Llave: `Centro`.

## `CentroFCHist`
Histórico/bitácora de configuración de `CentroFC` por usuario. Solo
lectura/creación. Llave lógica: `ID+Usuario+Centro`.

## `CentroFCTemp`
Tabla temporal de trabajo de centros seleccionados por usuario durante una
corrida de planeación FC. Llave lógica: `Usuario+Centro`.

## `EstacionTFC`
Catálogo de estaciones de trabajo del módulo FC. Llave: `Estacion`.

## `EstacionTFCHist`
Histórico/bitácora de configuración de `EstacionTFC` por usuario y centro. Solo
lectura/creación. Llave lógica: `ID+Usuario+Estacion+Centro`.

## `EstacionTFCTemp`
Tabla temporal de trabajo de estaciones seleccionadas por usuario durante una
corrida de planeación FC. Llave lógica: `Usuario+Estacion`.

## `ArtCentroTemp`
Tabla temporal de trabajo que asocia artículo-centro-programa por usuario
durante la captura de planeación FC. Sin llave primaria física; usar la
combinación de todas sus columnas como llave lógica.

# Notas de uso

- Las tablas `*Temp` son de trabajo por usuario/sesión de captura — no confiar
  en su contenido fuera del contexto de una corrida activa de ese usuario.
- `Centro` (sin sufijo) es el catálogo maestro del ERP; `CentroFC` es el overlay
  de configuración específico de Forecast/Planeación — consultar ambos si hace
  falta el nombre/descripción completa de un centro además de sus parámetros FC.
