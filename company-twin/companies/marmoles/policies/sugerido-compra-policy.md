---
type: Company Policy
title: Sugerido de Compra — Política operativa (Mármoles)
description: Reglas de gobierno para el agente de sugerido de compra y generación de OC en Mármoles.
layer: company
tenant: marmoles
tags: [politica, mrp, sugerido-compra, hitl, gobierno]
timestamp: 2026-08-03T00:00:00Z
---

# Resumen

Este tenant expone un ERP Intelisis **multiempresa** (una sola base `MARMOLES`, varias
empresas activas). El agente `sugerido-compra` restringe lo que el kernel/ERP permite con
las siguientes reglas de negocio.

# Empresa obligatoria

- Nunca ejecutar un sugerido de compra sin una `Empresa` confirmada explícitamente por el
  usuario en el turno actual. Ver [Empresa](/erp-kernel/empresa.md).
- No reutilizar la empresa de una sesión anterior sin volver a confirmarla si el usuario no
  la repite en la nueva conversación.

# Dos fases (análisis vs. escritura)

1. **Análisis (solo lectura, siempre permitido):** cálculo de sugerido de compra sobre
   `Art`/`ArtAlm`/`ArtDisponible*`/`Compra`/`CompraD`/`PlanArtOP`. Nunca requiere aprobación.
2. **Generación de OC (escritura, requiere HITL):** crear `Compra` + `CompraD` o marcar
   `PlanArtOP.LiberacionID` solo cuando el usuario lo solicita explícitamente después de ver
   el análisis. Gateado automáticamente por `WRITE_TOOL_RE` en
   `agent/connections/intelisis-dab.ts` (create/update/delete_record).

# Reglas de la Orden de Compra

- **Estatus de creación:** toda `Compra` nueva se crea con `Estatus = 'CONFIRMAR'`. Nunca
  dejarla en `PENDIENTE`.
- **Proveedor:** prioridad 1 = `Art.Proveedor`. Si no existe, usar el último proveedor válido
  del historial (`CompraD` → `Compra`, `FechaEmision DESC, ID DESC`, excluyendo proveedores
  vacíos/inválidos). Si no hay proveedor por ninguna vía, **no generar la OC** y reportar
  bloqueo de proveedor al usuario.
- Al generar la OC sin usar `spPlanArtOPLiberar` (proceso interno del ERP), marcar el origen
  en `PlanArtOP` (`LiberacionModulo='COMS'`, `LiberacionID`, `LiberacionMov`, `LiberacionMovID`).

# Fuente de verdad ante discrepancia

Si el cálculo manual (sobre tablas base) difiere del resultado de
[`PlaneacionMRP`](/erp-kernel/planeacion-mrp.md) (`spPlanArt`), **prevalece siempre** el
resultado del store oficial.

# Citations

[1] Guías de negocio entregadas por el equipo de planeación (`Dani/AGENTE_PLANEACION_SUGERIDO_COMPRA.md`,
`Dani/AGENTE_PLANEACION_SUGERIDO_COMPRA_LIGERO.md`, `Dani/MRP.agent.md`), compiladas 2026-08-03.
