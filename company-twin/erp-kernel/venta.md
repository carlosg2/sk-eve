---
type: Intelisis Entity
title: Venta — Cabecera de ventas
description: Cabecera de documentos del módulo VTAS (pedidos, facturas, notas, etc.)
resource: dbo.Venta
layer: erp-kernel
tenant: null
tags: [venta, vtas, clientes, facturacion]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Cabecera de movimientos del módulo de Ventas (VTAS). Un registro por documento.
El detalle de líneas de artículos vive en [VentaD](/erp-kernel/ventad.md).

- **PK:** `ID` (int)
- **Tabla:** `dbo.Venta` (275 campos)
- **Estatus:** `SINAFECTAR` → `PENDIENTE` → `CONCLUIDO` | `CANCELADO`
- **Tipos por clave MovTipo:**
  - `VTAS.P` = documentos pendientes (Pedido, Apartado, Ingreso, etc.)
  - `VTAS.F` = documentos en firme/facturados (Factura, etc.)

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | PK |
| `Empresa` | varchar | **requerido**. Ej: `CP` |
| `Mov` | varchar | Tipo de movimiento. Ver [MovTipo](/erp-kernel/movtipo.md) |
| `MovID` | varchar | Folio/número del documento |
| `FechaEmision` | datetime | Fecha del documento |
| `Cliente` | varchar(10) | FK → [Cte](/erp-kernel/cte.md) |
| `Importe` | decimal | Importe sin impuestos |
| `Impuestos` | decimal | IVA u otros impuestos |
| `Saldo` | decimal | Saldo pendiente |
| `Estatus` | varchar | `SINAFECTAR` \| `PENDIENTE` \| `CONCLUIDO` \| `CANCELADO` |
| `Moneda` | varchar | `Pesos` \| `Dolares` |
| `TipoCambio` | decimal | Tipo de cambio aplicado |
| `Ejercicio` | int | Año contable |
| `Periodo` | int | Mes contable |

# Patrones de consulta

```
# Ventas pendientes (VTAS.P) — 2 pasos
PASO 1: read_records(MovTipo, filter="Modulo eq 'VTAS' and Clave eq 'VTAS.P'", select="Mov")
PASO 2: read_records(Venta, filter="Estatus eq 'PENDIENTE' and (Mov eq 'Pedido' or Mov eq 'Apartado' or ...)", select="ID,Mov,MovID,FechaEmision,Cliente,Importe,Estatus", orderby=["FechaEmision asc"])

# Ventas en firme/facturadas (VTAS.F)
read_records(Venta, filter="Estatus eq 'CONCLUIDO' and Mov eq 'Factura'", select="ID,Mov,MovID,FechaEmision,Cliente,Importe,Estatus")

# Total facturado por cliente
aggregate_records(Venta, sum, Importe, filter="Estatus eq 'CONCLUIDO' and Mov eq 'Factura'", groupby=["Cliente"], orderby="desc")
```
