---
type: Intelisis Entity
title: CXP — Cuentas por Pagar
description: Cabecera de Cuentas por Pagar. Facturas y documentos pendientes de pago a proveedores.
resource: dbo.CXP
layer: erp-kernel
tenant: null
tags: [cxp, tesoreria, proveedores, pagos]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Cabecera de Cuentas por Pagar en Intelisis. Cada registro es un documento (factura,
nota de cargo, etc.) que la empresa **debe pagar** a un [proveedor](/erp-kernel/prov.md).
El detalle de partidas vive en [CxpD](/erp-kernel/cxpd.md).

- **PK:** `ID` (int)
- **Tabla:** `dbo.CXP`
- **Estatus (ciclo de vida universal de movimientos Intelisis):**
  `SINAFECTAR` (borrador, capturado sin afectar) → `PENDIENTE` (afectado, pendiente de pago) → `CONCLUIDO` (pagado) · `CANCELADO` (anulado). La transición la ejecuta el SP `Afectar` (AFECTAR concluye; CANCELAR anula).
- **Situacion:** sub-estado dentro de `PENDIENTE` (ej. Normal → Autorizado), se cambia con `CambiarSituacion`.
- **Saldo pendiente:** `Saldo` = `Importe` − abonos aplicados (solo lectura)

# Schema

Campos clave (la tabla tiene 120 campos; aquí los operativos):

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | PK, autoincremento |
| `Mov` | varchar(20) | **requerido**. Tipo de movimiento. FK→MovTipo |
| `MovID` | varchar(20) | Consecutivo (folio) |
| `Proveedor` | varchar(10) | **requerido**. FK→[Prov](/erp-kernel/prov.md) |
| `Moneda` | varchar(10) | **requerido**. FK→Mon (MXN/USD) |
| `FechaEmision` | datetime | **requerido**. Default: fecha de trabajo |
| `Vencimiento` | datetime | Fecha límite de pago. Default: hoy |
| `Importe` | money | Monto total del documento |
| `Saldo` | money | Pendiente por pagar. **Solo lectura** |
| `Impuestos` | money | IVA / impuestos |
| `Estatus` | varchar(15) | SINAFECTAR \| PENDIENTE \| CONCLUIDO \| CANCELADO |
| `Condicion` | varchar(50) | Condición de pago |
| `CtaDinero` | varchar(10) | FK→[CtaDinero](/erp-kernel/ctadinero.md). Cuenta de pago |
| `FormaPago` | varchar(50) | Forma de pago |
| `FechaProgramada` | datetime | Fecha programada de pago (tesorería) |

# Relaciones

- N:1 [Prov](/erp-kernel/prov.md) — proveedor (via `Proveedor`)
- N:1 [CtaDinero](/erp-kernel/ctadinero.md) — cuenta bancaria de pago (via `CtaDinero`)
- 1:N [CxpD](/erp-kernel/cxpd.md) — partidas de detalle
- N:1 Mon — moneda (via `Moneda`)

# Examples

Filtros OData (fechas **sin comillas**, strings con comillas simples):

```
# CXP pendientes de pago
read_records(entity=CXP, filter="Estatus eq 'PENDIENTE'")

# Vencidas antes de fin de año
read_records(entity=CXP, filter="Estatus eq 'PENDIENTE' and Vencimiento le 2026-12-31")

# Total pendiente por proveedor
aggregate_records(entity=CXP, filter="Estatus eq 'PENDIENTE'", groupBy=Proveedor, aggregate="sum(Saldo)")
```

# Reglas de escritura

- `create_record` requiere: `Mov`, `Proveedor`, `Moneda`, `FechaEmision`.
- `Saldo` es solo lectura (lo calcula el ERP).
- Transiciones de estatus (AFECTAR/CANCELAR) se hacen vía el stored proc `Afectar`, no con `update_record`.
