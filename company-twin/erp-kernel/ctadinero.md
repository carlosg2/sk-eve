---
type: Intelisis Entity
title: CtaDinero — Cuentas Bancarias
description: Catálogo de cuentas bancarias / de dinero de la empresa.
resource: dbo.CtaDinero
layer: erp-kernel
tenant: null
tags: [ctadinero, cuentas, bancos, tesoreria]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [read_records, aggregate_records, create_record, update_record]
---

# Resumen

Catálogo de cuentas bancarias (y otras cuentas de dinero) de la empresa. Referenciado por
[CXP](/erp-kernel/cxp.md) (cuenta de pago) y [Dinero](/erp-kernel/dinero.md) (movimientos).

- **PK:** `CtaDinero` (varchar(10))
- **Tabla:** `dbo.CtaDinero` (41 campos; aquí los operativos)
- **Estatus:** `ALTA` (activa) | `BAJA`. Activas: `Estatus eq 'ALTA'`

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `CtaDinero` | varchar(10) | PK. Clave de la cuenta |
| `Descripcion` | varchar(100) | Banco + cuenta |
| `NumeroCta` | varchar(100) | Número de cuenta bancaria |
| `CLABE` | varchar(18) | CLABE interbancaria |
| `Institucion` | varchar(20) | FK→InstitucionFin. 01=Banorte 02=Intercam 03=MIFEL 04=Santander 05=BBVA 06=Banbajio 07=CIBanco |
| `Moneda` | varchar(10) | MXN / USD |
| `Estatus` | varchar(15) | `ALTA` \| `BAJA` |
| `Tipo` | varchar(20) | Default `Banco` |
| `SaldoInicial` | money | Saldo inicial |

# Examples

```
# Cuentas activas en USD
read_records(entity=CtaDinero, filter="Estatus eq 'ALTA' and Moneda eq 'USD'", fields=[CtaDinero, Descripcion, CLABE, Institucion])

# Contar cuentas activas
aggregate_records(entity=CtaDinero, function=count, field=*, filter="Estatus eq 'ALTA'")
```
