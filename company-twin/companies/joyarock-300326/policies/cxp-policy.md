---
type: Policy
title: JoyaRock — Política de aprobación CXP
description: Límites de aprobación y aprobadores para Cuentas por Pagar en JoyaRock.
layer: company
tenant: joyarock-300326
tags: [cxp, aprobacion, tesoreria, gobierno]
timestamp: 2026-07-01T00:00:00Z
applies_to: [/erp-kernel/cxp.md]
---

# Política de aprobación de pagos CXP

Overlay sobre [CXP](/erp-kernel/cxp.md) para JoyaRock. El kernel define lo
*posible*; esta política **restringe** cuándo un pago puede ejecutarse.

# Límites

| Rango (MXN) | Aprobación requerida |
|---|---|
| < $50,000 | Auto-aprobado (dentro de límite) |
| $50,000 – $200,000 | Tesorería |
| > $200,000 | Dirección |

# Reglas

- Todo pago a **proveedor nuevo** requiere aprobación de Tesorería sin importar el monto.
- Pagos en `USD` siempre requieren revisión de tipo de cambio antes de afectar.
- El calendario de pagos corre los **martes y jueves**; `FechaProgramada` debe caer en esos días.

# Aprobadores

- **Tesorería:** Fernando Torres
- **Dirección:** María García

# Restricción de autonomía

Los loops que operan CXP en JoyaRock nacen en **L1 (recommend_only)**: pueden
proponer pagos pero **no** ejecutar `Afectar` sin aprobación humana.
