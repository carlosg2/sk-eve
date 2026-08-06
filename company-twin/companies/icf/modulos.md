---
type: Intelisis Module Reference
title: MCP de ICF — módulos disponibles
description: Cobertura del MCP de ICF: qué módulos expone y cuáles NO (CXP/tesorería/cuentas bancarias no está disponible → EntityNotFound). Restringe al kernel.
layer: company
tenant: icf
tags: [icf, mcp, cobertura, modulos, restriccion]
timestamp: 2026-08-05T00:00:00Z
mcp_tools: [read_records, aggregate_records]
---

# MCP de ICF — módulos disponibles

Cobertura del endpoint MCP del tenant **ICF** (`https://api2.maserp.mx/icf/mcp`).
Este documento **restringe** al [ERP Kernel](/erp-kernel/index.md): el kernel describe el
ERP universal de Intelisis; aquí se registra qué publica **este** tenant.

## Módulos disponibles

- **MRP / Forecast-Planeación (FC)** — explosión de materiales, forecast y plan de
  producción. Entidades: `ExplocionMatCF`, `ForecastPlanProduccion`, `CalendarioFC`,
  `UV_QV_PPTOCOMPRA`, `ArtDisponibleDesc`, `ArtDisponible`, `ArtMaterial`, `CentroFCTemp`,
  etc. Ver [mrp](/companies/icf/mrp/index.md).
- **Catálogos core** — `Art`, `Alm`, `Prov`, `Almacen*` y demás entidades expuestas por el
  DAB del tenant (verificar con `describe_entities` / `read_records(first:1)`).

## No disponible en ICF (EntityNotFound verificado en runtime)

El módulo **CXP / Tesorería / Cuentas bancarias** NO está publicado en el MCP de ICF.
Consultar estas entidades devuelve
`EntityNotFound: Entity '<X>' is not defined in the configuration.` (verificado en
varias corridas, 2026-08-05):

- `CXP`, `CxpD`, `CxpConSaldo`, `CXPD`
- `CtaDinero`, `Dinero`, `DineroD`

Los nombres pueden variar en mayúsculas/minúsculas (`CXP`/`Cxp`/`cxp`); en todos los casos
la entidad no existe en la configuración del DAB de ICF.

## Notas

- `describe_entities` es un catálogo **incompleto**: no lista todas las entidades usables
  (ej. `UV_QV_PPTOCOMPRA` no aparece y sí funciona en `read_records`). La disponibilidad real
  se valida con `read_records(entity, first: 1)` (regla del linter `npm run lint:knowledge`).
- Un `EntityNotFound` significa "no está publicado en el MCP de ICF", no que el dato sea cero.

## Citations

- Trazas de runtime del hook de memoria, keys `ent-inexistente-*` en
  [state/learnings.md](/companies/icf/state/learnings.md) (2026-08-05).
- Linter de conocimiento `scripts/check-knowledge.ts`: `read_records(first:1)` →
  `EntityNotFound` para estas entidades contra el MCP ICF.
