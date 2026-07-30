---
type: Intelisis Entity
title: Compra — Cabecera de compras
description: Cabecera de documentos del módulo COMS (órdenes de compra, entradas, etc.)
resource: dbo.Compra
layer: erp-kernel
tenant: null
tags: [compra, coms, proveedores, inventario]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Cabecera de movimientos del módulo de Compras (COMS). Un registro por documento.
El detalle de líneas de artículos vive en [CompraD](/erp-kernel/comprad.md).

- **PK:** `ID` (int)
- **Tabla:** `dbo.Compra` (133 campos)
- **Estatus:** `SINAFECTAR` → `PENDIENTE` → `CONCLUIDO` | `CANCELADO`
- **Tipos por clave MovTipo:**
  - `COMS.O` = documentos abiertos/pendientes (Orden Compra, Mercancia Recibida, etc.)
  - `COMS.F` = documentos en firme/concluidos (Entrada Compra, etc.)

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `ID` | int | PK |
| `Empresa` | varchar | **requerido**. Ej: `CP` |
| `Mov` | varchar | Tipo de movimiento. Ver MovTipo |
| `MovID` | varchar | Folio/número del documento |
| `FechaEmision` | datetime | Fecha del documento |
| `Proveedor` | varchar(10) | FK → [Prov](/erp-kernel/prov.md) |
| `Importe` | decimal | Importe sin impuestos |
| `Impuestos` | decimal | IVA u otros impuestos |
| `Saldo` | decimal | Saldo pendiente |
| `Estatus` | varchar | `SINAFECTAR` \| `PENDIENTE` \| `CONCLUIDO` \| `CANCELADO` |
| `Moneda` | varchar | `Pesos` \| `Dolares` |
| `TipoCambio` | decimal | Tipo de cambio aplicado |
| `Almacen` | varchar | Almacén destino |
| `Ejercicio` | int | Año contable |
| `Periodo` | int | Mes contable |
| `SubModulo` | varchar | Siempre `COMS` en este módulo |

# Patrones de consulta

```
# Compras pendientes (COMS.O)
PASO 1: read_records(MovTipo, filter="Modulo eq 'COMS' and Clave eq 'COMS.O'", select="Mov")
PASO 2: read_records(Compra, filter="Estatus eq 'PENDIENTE' and (Mov eq 'Orden Compra' or Mov eq 'Mercancia Recibida' or ...)", select="ID,Mov,MovID,FechaEmision,Proveedor,Importe,Estatus")

# Compras en firme (COMS.F)
PASO 1: read_records(MovTipo, filter="Modulo eq 'COMS' and Clave eq 'COMS.F'", select="Mov")
PASO 2: read_records(Compra, filter="Estatus eq 'CONCLUIDO' and (Mov eq 'Entrada Compra' or ...)", select="ID,Mov,MovID,FechaEmision,Proveedor,Importe,Estatus")

# Total de compras por proveedor
aggregate_records(Compra, sum, Importe, filter="Estatus eq 'PENDIENTE'", groupby=["Proveedor"], orderby="desc")
```
