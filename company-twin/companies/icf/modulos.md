---
type: Intelisis Module Reference
title: MCP de ICF — módulos disponibles
description: Cobertura del MCP de ICF: qué módulos expone y cuáles NO (CXP/tesorería/cuentas bancarias no está disponible → EntityNotFound).
layer: company
tenant: icf
tags: [icf, mcp, cobertura, modulos, restriccion]
mcp_tools: [read_records, aggregate_records]
---

# MCP de ICF — módulos disponibles

Cobertura del endpoint MCP de la empresa **ICF** (`https://api2.maserp.mx/icf/mcp`).
Este documento registra qué publica **esta** empresa y qué no está disponible.

## Módulos disponibles

- **MRP / Forecast-Planeación (FC)** — explosión de materiales, forecast y plan de
  producción. Entidades: `ExplocionMatCF`, `ForecastPlanProduccion`, `CalendarioFC`,
  `UV_QV_PPTOCOMPRA`, `ArtDisponibleDesc`, `ArtDisponible`, `ArtMaterial`, `CentroFCTemp`,
  etc. Ver [mrp](/companies/icf/mrp/index.md).
- **Catálogos core** — `Art`, `Alm`, `Prov`, `Almacen*` y demás entidades expuestas por el
  DAB de la empresa (verificar con `describe_entities` / `read_records(first:1)`).

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

## Detalles operativos del catálogo `Art` en ICF

- **Estatus de artículo:** además de `ALTA` y `BAJA`, ICF usa **`BLOQUEADO`** (artículo
  bloqueado, no opera) y **`PROTOTIPO`** (artículo en desarrollo — no es un artículo final
  de compra/producción). Al consultar disponibilidad/compras, filtrar por `Estatus eq 'ALTA'`
  salvo que el usuario pida explícitamente los otros.
- **`AlmacenROP`:** en uso en ICF. Distingue compra vs distribución en la planeación de
  compras (`Art.AlmacenROP = PlanArtOP.Almacen` → compra; distinto → distribución).
