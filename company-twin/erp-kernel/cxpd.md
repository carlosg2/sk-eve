---
type: Intelisis Entity
title: CxpD — Detalle de Cuentas por Pagar
description: Líneas de aplicación de documentos CXP (abonos, aplicaciones).
resource: dbo.CxpD
layer: erp-kernel
tenant: null
tags: [cxpd, cxp, detalle, aplicacion]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# Resumen

Detalle (líneas) de [CXP](/erp-kernel/cxp.md). Cada renglón es una aplicación o abono
contra el documento cabecera.

- **PK:** `ID` + `Renglon`
- **Tabla:** `dbo.CxpD`
- **FK:** `ID` → [CXP](/erp-kernel/cxp.md).`ID`

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | FK→CXP.ID |
| `Renglon` | int | Línea de detalle |
| `Importe` | money | Importe de la línea |
| `Aplica` | varchar(20) | Tipo de documento que aplica |
| `AplicaID` | varchar(20) | ID del documento que aplica |
| `Fecha` | datetime | Fecha de aplicación |
| `DescuentoRecargos` | money | Descuentos o recargos |

# Examples

```
# Detalle de varios documentos CXP
read_records(entity=CxpD, filter="ID eq 100 or ID eq 101 or ID eq 102")
```
