---
type: Intelisis Stored Procedure
title: Afectar — Transiciones de estatus
description: SP universal que procesa transiciones de estatus de movimientos en todos los módulos.
resource: dbo.spAfectar
layer: erp-kernel
tenant: null
tags: [afectar, estatus, transiciones, gobierno, escritura]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [afectar, execute_entity]
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
| `Estacion` | **Int32** (no string). Default: `1`. ID de estación de trabajo. Si no hay una estación real, usar `1`. |

# Cómo llamar (recipe)

Usar el **tool dedicado `afectar`** (está en el allow-list de Eve).
**No** usar `execute_entity(Afectar, ...)` — el tool dedicado tiene mejor tipado.

```
afectar(
  Modulo = "DIN",       # o CXP, GAS, etc.
  ID = <id_movimiento>, # int
  Accion = "AFECTAR",   # ver tabla de acciones
  Base = "Todo",
  Usuario = "ADMIN",
  Estacion = 1          # Int32 obligatorio — usar 1 si no hay estación real
)
```

**`Estacion` es Int32 — nunca pasar como string** ("WEB", "1", etc. → error de tipo).

# Retorno

- `Ok`: NULL = éxito; código (ej. 60030, 60040) = error.
- `OkRef`: detalle del resultado.
- **60040** = error de validación de negocio: el movimiento no existe, ya está en CONCLUIDO/CANCELADO (inmutable), o le faltan partidas requeridas. Antes de afectar, verificar con `read_records(Dinero|CXP, filter: "ID eq <n>", select: "ID,Estatus")` que el estatus es `SINAFECTAR`.

# Governance

Escritura de alto impacto. Todo `AFECTAR`/`CANCELAR` debe pasar por approval gate según
la política del tenant (ver overlays en `companies/<tenant>/policies/`).
