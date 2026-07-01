---
type: Intelisis Stored Procedure
title: CambiarSituacion — Cambio de sub-estado
description: SP que cambia la situación (sub-estado) dentro del Estatus actual de un movimiento.
resource: dbo.spCambiarSituacion
layer: erp-kernel
tenant: null
tags: [situacion, subestado, escritura]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [execute_entity]
---

# Resumen

Stored procedure que cambia la **situación** (sub-estado) de un movimiento **dentro** de
su `Estatus` actual. Ejemplo típico: Normal → Autorizado dentro de `PENDIENTE`. No cambia
el Estatus (para eso está [Afectar](/erp-kernel/afectar.md)).

# Parámetros

| Parámetro | Notas |
|---|---|
| `Modulo` | GAS, COMS, CXP, DIN, VTAS, INV, CONT |
| `ID` | ID del movimiento |
| `Situacion` | Nueva situación: Normal, Autorizado, etc. |
| `SituacionFecha` | Fecha del cambio (datetime) |
| `Usuario` | Usuario que ejecuta |

# Retorno

- `Ok`, `OkRef`.

# Relación con Estatus

`Situacion` es ortogonal a `Estatus`: un documento `PENDIENTE` puede estar en situación
Normal o Autorizado. Ver el campo `Situacion` en [CXP](/erp-kernel/cxp.md).
