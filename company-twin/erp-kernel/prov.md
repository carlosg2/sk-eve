---
type: Intelisis Entity
title: Prov — Proveedores
description: Catálogo maestro de proveedores. Razón social, RFC, condiciones de pago.
resource: dbo.Prov
layer: erp-kernel
tenant: null
tags: [prov, proveedores, cxp, maestro]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Catálogo maestro de proveedores en Intelisis. Referenciado por [CXP](/erp-kernel/cxp.md)
vía el campo `Proveedor`.

- **PK:** `Proveedor` (varchar(10))
- **Tabla:** `dbo.Prov` (125 campos; aquí los operativos)
- **Estatus:** `ALTA` (activo) | `BAJA`. Activos: `Estatus eq 'ALTA'`

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `Proveedor` | varchar(10) | PK. **requerido** |
| `Nombre` | varchar(100) | **requerido**. Razón social |
| `Estatus` | varchar(15) | **requerido**. Default `ALTA`. `ALTA` \| `BAJA` |
| `Tipo` | varchar(15) | **requerido**. Default `Proveedor` |
| `DefMoneda` | varchar(10) | **requerido**. Moneda por omisión (usa default del sistema) |
| `RFC` | varchar(15) | RFC |
| `Condicion` | varchar(50) | Condición de pago por defecto |
| `Zona` | varchar(30) | Zona |

# Examples

```
# Proveedores activos
read_records(entity=Prov, filter="Estatus eq 'ALTA'", fields=[Proveedor, Nombre, RFC])

# Resolver nombres de varias claves
read_records(entity=Prov, filter="Proveedor eq 'P0001' or Proveedor eq 'P0201'", fields=[Proveedor, Nombre])
```

# Reglas de escritura

- `create_record` requiere: `Proveedor` (≤10 chars), `Nombre`, `Estatus` (default 'ALTA'), `Tipo` (default 'Proveedor'), `DefMoneda`.
