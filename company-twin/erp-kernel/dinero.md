---
type: Intelisis Entity
title: Dinero — Tesorería (movimientos bancarios)
description: Movimientos de tesorería: pagos, depósitos, transferencias entre cuentas.
resource: dbo.Dinero
layer: erp-kernel
tenant: null
tags: [dinero, tesoreria, pagos, bancos]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Cabecera de movimientos de tesorería (pagos, depósitos, transferencias). El detalle de
aplicación a documentos vive en [DineroD](/erp-kernel/dinerod.md).

- **PK:** `ID` (int)
- **Tabla:** `dbo.Dinero` (106 campos; aquí los operativos)
- **Estatus (ciclo universal de movimientos):** `SINAFECTAR` (borrador) → `PENDIENTE` → `CONCLUIDO` · `CANCELADO`. Transición vía [Afectar](/erp-kernel/afectar.md).

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | PK |
| `Mov` | varchar(20) | **requerido**. Tipo de movimiento. FK→MovTipo |
| `MovID` | varchar(20) | Consecutivo (folio) |
| `FechaEmision` | datetime | **requerido**. Default: fecha de trabajo |
| `Moneda` | varchar(10) | **requerido**. FK→Mon |
| `CtaDinero` | varchar(10) | FK→[CtaDinero](/erp-kernel/ctadinero.md). Cuenta origen |
| `CtaDineroDestino` | varchar(10) | Cuenta destino (en transferencias) |
| `Importe` | money | Monto del movimiento |
| `Saldo` | money | Pendiente. **Solo lectura** |
| `Estatus` | varchar(15) | SINAFECTAR \| PENDIENTE \| CONCLUIDO \| CANCELADO |
| `BeneficiarioNombre` | varchar(100) | Beneficiario |
| `Referencia` | varchar(50) | Referencia bancaria |
| `Concepto` | varchar(50) | Descripción |
| `TipoCambio` | numflotante | Tipo de cambio |

# Relaciones

- N:1 [CtaDinero](/erp-kernel/ctadinero.md) — cuenta bancaria (via `CtaDinero`)
- 1:N [DineroD](/erp-kernel/dinerod.md) — líneas de aplicación

# Examples

```
# Movimientos por cuenta, más recientes primero
read_records(entity=Dinero, filter="CtaDinero eq '20713'", orderby="FechaEmision desc", first=3, fields=[ID, FechaEmision, Importe, Mov, BeneficiarioNombre])

# Pendientes
read_records(entity=Dinero, filter="Estatus eq 'PENDIENTE'")
```

# Nota

`AFECTADO` **no** es un estatus. Es la acción del SP [Afectar](/erp-kernel/afectar.md).
Los movimientos "afectados/aplicados" están en `CONCLUIDO`.
