---
type: Intelisis Entity
title: Cte — Clientes (catálogo maestro)
description: Catálogo maestro de clientes.
resource: dbo.Cte
layer: erp-kernel
tenant: null
tags: [cte, clientes, maestro, vtas]
timestamp: 2026-07-30T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Catálogo maestro de clientes. Referenciado por [Venta](/erp-kernel/venta.md) vía `Cliente`.

- **PK:** `Cliente` (varchar(10))
- **Tabla:** `dbo.Cte` (313 campos)
- **Estatus:** `ALTA` (activo) | `BAJA`

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `Cliente` | varchar(10) | PK |
| `Nombre` | varchar(100) | Razón social |
| `NombreCorto` | varchar | Nombre corto |
| `RFC` | varchar(15) | RFC |
| `Estatus` | varchar | `ALTA` \| `BAJA` |
| `Condicion` | varchar | Condición de pago |
| `Zona` | varchar | Zona geográfica |

# Patrones de consulta

```
# Clientes activos
read_records(Cte, filter="Estatus eq 'ALTA'", select="Cliente,Nombre,RFC,Zona", first=20)

# Resolver nombre de cliente por clave
read_records(Cte, filter="Cliente eq 'C00554'", select="Cliente,Nombre,RFC")

# Resolver múltiples clientes
read_records(Cte, filter="Cliente eq 'C00554' or Cliente eq 'PUBGRAL'", select="Cliente,Nombre")
```
