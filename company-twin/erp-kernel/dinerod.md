---
type: Intelisis Entity
title: DineroD — Detalle de Tesorería
description: Líneas de aplicación de movimientos de Dinero a documentos (CXP u otros).
resource: dbo.DineroD
layer: erp-kernel
tenant: null
tags: [dinerod, tesoreria, detalle, aplicacion]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Detalle (líneas) de [Dinero](/erp-kernel/dinero.md). Relaciona cada movimiento de
tesorería con los documentos que aplica (ej. [CXP](/erp-kernel/cxp.md)).

- **PK:** `ID` + `Renglon`
- **Tabla:** `dbo.DineroD`
- **FK:** `ID` → [Dinero](/erp-kernel/dinero.md).`ID`

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | FK→Dinero.ID |
| `Renglon` | numflotante | Línea del detalle |
| `Importe` | money | Monto de la línea |
| `Aplica` | varchar(20) | Módulo/mov del documento aplicado (ej. CXP) |
| `AplicaID` | varchar(20) | ID del documento aplicado |
| `Referencia` | varchar(50) | Referencia |
| `FormaPago` | varchar(50) | Forma de pago |
| `CtaDinero` | varchar(10) | FK→[CtaDinero](/erp-kernel/ctadinero.md) |
| `Moneda` | varchar(10) | FK→Mon |

# Examples

```
# Detalle de varios movimientos de Dinero
read_records(entity=DineroD, filter="ID eq 500 or ID eq 501")
```
