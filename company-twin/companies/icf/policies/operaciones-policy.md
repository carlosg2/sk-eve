---
type: Policy
title: ICF — Política de operaciones
description: Reglas de aprobación y autonomía del agente para Industrias Campo Fresco.
layer: company
tenant: icf
tags: [compras, ventas, aprobacion, gobierno]
timestamp: 2026-07-30T00:00:00Z
applies_to: [/erp-kernel/compra.md, /erp-kernel/venta.md]
---

# Política de operaciones ICF

Overlay sobre los módulos COMS y VTAS del ERP Kernel para ICF.

# Empresa ERP

Código de empresa en Intelisis: **`INCF`**. Siempre incluirlo en `create_record`.

# Autonomía del agente

El agente opera en modo **read-only por default**. Toda escritura (create/update/delete)
requiere confirmación explícita del usuario. El HITL gate está activo para:
- `create_record`, `update_record`, `delete_record`
- `execute_entity`

# Límites de aprobación (placeholder — actualizar con reglas reales)

| Operación | Límite automático | Requiere aprobación |
|---|---|---|
| Consulta de disponibilidad | Sin límite | No |
| Consulta de ventas/compras | Sin límite | No |
| Crear/modificar registros | Cualquier monto | Sí (siempre) |

# Reglas operativas

- Almacén de producto terminado: **`C. FRESCO`** y variantes (`C. FRESCO1`, `C.FRESCO02`…`C.FRESCO05`)
- Almacenes de materia prima: `CRIBA1MP`, `CRIBA2FUM`, `JAMAICA`, `PROCESADOS`, etc.
- Almacén general: **`GRAL`** (si existe; verificar con `Alm`)
- Moneda base: Pesos MXN
- Tipos de movimiento pendientes VTAS: `VTAS.P` (Pedido, Apartado, etc.)
- Tipos de movimiento en firme VTAS: `VTAS.F` (Factura, etc.)
- Tipos de movimiento pendientes COMS: `COMS.O` (Orden Compra, Mercancia Recibida, etc.)
- Tipos de movimiento en firme COMS: `COMS.F` (Entrada Compra, etc.)
