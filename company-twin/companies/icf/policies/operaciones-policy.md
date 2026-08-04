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

# Catálogo MovTipo verificado

| Clave | Movimientos ICF |
|---|---|
| `VTAS.P` | Pedido, Orden Surtido, Orden Surtido R, Ingreso, Contratos, Pedido Posfechado, Reservacion |
| `VTAS.F` | Factura, Factura Credito, Factura Activo, Factura Flexible, Factura Prorrateada, FacturaDIF, FacturaE, Nota Venta, Nota Venta R, Cancelacion NC |
| `COMS.O` | Orden Compra, Orden Compra OP, Orden Compra AF, Orden Compra AFSocio, Orden Compra Socios, Orden Compra Emida, Aduana, Confirma Proveedor, Control Calidad, Factura Proveedor |
| `COMS.F` | Entrada Compra, Entrada Mercancia, Entrada Maquila, Entrada Consignacion, Entrada Insumos, Entrada Herramienta, Entrada Consumibles, Entrada de Prestamo, Compra Activos, CompraActivos Socios |

# Reportes de faltante (MRP) — tools dedicados `faltante_insumos` / `faltante_materia_prima`

Agregados por el equipo backend (2026-07-31) como stored procedures registrados en el DAB
de ICF: `spWebFCFaltanteInsumos` → tool `faltante_insumos`, `spWebFCFaltanteMateriaPrima` →
tool `faltante_materia_prima`. Ambos son **read-only** (no pasan por `execute_entity`, no
requieren HITL) y ya hacen la explosión de materiales (MRP) internamente — no re-calcules
el gap manualmente con `Venta`/`Compra`/`ArtDisponibleDesc` si estos tools responden.

Parámetros obligatorios: `Usuario`, `Ejercicio`, `Periodo`.

- **`Usuario`** es un valor **estático fijo: `"CGARZA"`** para este tenant (ICF). Es el
  usuario ERP que corre la **explosión de materiales** (tabla interna
  `ExplocionMatCF.Usuario`), **NO** el usuario que hace la pregunta en el chat. Usar
  siempre por default, sin preguntarlo ni pedir confirmación.
- `Ejercicio`/`Periodo`: año y mes/periodo fiscal, enteros (ej. `2026`, `7`).

Ver el patrón completo de uso en `agent/skills/gap-abasto/SKILL.md`.
