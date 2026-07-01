---
type: Intelisis Stored Procedure
title: Afectar — Transiciones de estatus
description: SP universal que procesa transiciones de estatus de movimientos en todos los módulos.
resource: dbo.spAfectar
layer: erp-kernel
tenant: null
tags: [afectar, estatus, transiciones, gobierno, escritura]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [execute_entity]
---

# Resumen

Stored procedure **universal** que procesa transiciones de estatus de movimientos en
TODOS los módulos del ERP (GAS, COMS, CXP, DIN, VTAS, INV, CONT, PROD). Es la única forma
correcta de cambiar el estatus de un documento (no usar `update_record` sobre `Estatus`).

# Ciclo de vida que gobierna

```
SINAFECTAR --(AFECTAR)--> PENDIENTE --(AFECTAR)--> CONCLUIDO
                              |
                          (CANCELAR)--> CANCELADO
```

# Acciones

| Acción | Efecto |
|---|---|
| `AFECTAR` | Concluye / avanza el movimiento (ejecuta lógica de negocio: pólizas, MovID, movs derivados, CFDI) |
| `GENERAR` | Crea un movimiento derivado (requiere `GenerarMov`) |
| `CANCELAR` | Anula el movimiento |
| `AUTORIZAR` | Autoriza |
| `VERIFICAR` | Verifica |
| `DESAFECTAR` | Revierte una afectación |

# Parámetros

| Parámetro | Notas |
|---|---|
| `Modulo` | GAS, COMS, CXP, DIN, VTAS, INV, CONT, PROD |
| `ID` | ID del movimiento (PK de CXP, Dinero, etc.) |
| `Accion` | AFECTAR / GENERAR / CANCELAR / VERIFICAR / AUTORIZAR / DESAFECTAR |
| `Base` | Todo / Pendiente / Seleccion / Reservado / Ordenado |
| `GenerarMov` | Tipo de mov a generar (solo con GENERAR) |
| `Usuario` | Usuario que ejecuta |
| `Estacion` | ID de estación |

# Retorno

- `Ok`: NULL = éxito; código (ej. 60030) = error.
- `OkRef`: detalle del resultado.

# Governance

Escritura de alto impacto. Todo `AFECTAR`/`CANCELAR` debe pasar por approval gate según
la política del tenant (ver overlays en `companies/<tenant>/policies/`).
