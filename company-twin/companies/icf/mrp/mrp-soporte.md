---
type: Intelisis Module Reference
title: MRP — Soporte, portal y catálogos generales
description: Entidades de soporte del módulo Forecast/Planeación (FC) — configuración de empresa, inventario por serie/lote, mensajes, bitácoras de portal y dashboard de inicio.
layer: company
tenant: icf
tags: [mrp, forecast, fc, portal, soporte]
timestamp: 2026-07-31T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Entidades transversales/de soporte que no son parte del cálculo de MRP en sí,
pero que el módulo FC y su portal usan como catálogos, bitácoras o dashboard.

# Entidades

## `Empresa`
Configuración maestra de la empresa/compañía del ERP (parámetros generales,
fiscales y contables). Tabla muy amplia y sensible; **expuesta solo de lectura
por seguridad**. Llave: `Empresa`. No exclusiva de FC — es la tabla maestra del
ERP completo.

## `SerieLote`
**Ledger de existencias por serie/lote/tarima** de artículo en almacén
(`Sucursal`/`Empresa`/`Articulo`/`SubCuenta`/`SerieLote`/`Almacen`/`Tarima`), con
costos y fechas de caducidad. Tabla núcleo de inventario; **expuesta solo de
lectura por seguridad** para evitar descuadres de inventario. Llave compuesta de
7 columnas. Relevante para MRP cuando se necesita trazabilidad de lote/caducidad
de materia prima, no solo cantidad agregada.

## `MensajeLista`
Catálogo de mensajes (avisos/errores) usados por los procesos del ERP, con tipo
y bandera `IE`. Llave: `Mensaje`.

## `PortalForecastLog`
Bitácora de actividad del portal/proceso de Forecast por usuario (`Fecha`,
`Proceso`, `Actividad`, `Historial`). Solo lectura/creación. Llave: `ID`.

## `PushDispositivos`
Registro de dispositivos móviles (tokens push) por usuario y aplicación, con
fecha y estatus. Llave: `Usuario+Aplicacion`.

## `WebInicio`
Tablero (dashboard) de inicio del portal web por usuario/centro de trabajo con
métricas de venta, ocupación y capacidad. Sin llave primaria física; usar
`Usuario+CentroTrabajo` como llave lógica. **Nota de calidad de datos**: existen
~5 filas duplicadas por historial de datos — no asumir unicidad estricta al
agregar.

## `WebInicioHist`
Histórico/bitácora de `WebInicio` por centro de trabajo. Solo lectura/creación.
Sin llave primaria física; usar `ID+CentroTrabajo` como llave lógica (misma nota
de filas duplicadas que `WebInicio`).

# Notas de uso

- `Empresa` y `SerieLote` son solo lectura por diseño de seguridad — no intentar
  `create_record`/`update_record` sobre ellas.
- `WebInicio`/`WebInicioHist` tienen duplicados conocidos por calidad de datos
  histórica — si se usan para un reporte, deduplicar explícitamente o advertir
  la limitación en la respuesta.
