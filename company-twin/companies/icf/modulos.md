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

Tampoco están publicadas algunas entidades que el kernel/skills documentan como
universales (EntityNotFound verificado en runtime, 2026-08-06/14):
- `ArtAlm`, `UtLogEjcProMrp` (bitácora del MRP; ver `mrp/mrp-explosion.md` para
  proxies).

> ⚠️ **`DimTiempoSemana` SÍ se publicó el 2026-08-19** (junto con `Usuario`,
> `UV_QV_FILLRATE` y `AuxiliarU`). Ya NO está en esta lista: se puede usar
> para traducir semanas (campos `Anio`/`MES`/`SEMANA`/`FECHAINICIO`/
> `FECHAFIN`) además de `CalendarioFC`. La publicación amplía el total de
> entidades del MCP de ICF a 73.

> ✅ **Tool `fcforcast_cfnuk` publicado (2026-08-19)**: el SP de carga inicial
> `spFCForcastCFNuk` se expone como tool ejecutable (11 tools en el MCP). Con
> la corrida de `MASERP · 2026 · Periodo 8` ya ejecutada, el plan de
> `ResumenPlaneacionCF` está poblado en línea (90 filas, S32=3,978,128).
> Detalle del tool en el [kernel](/erp-kernel/fcforcast-cfnuk.md).

> ✅ **SPs del portal MRP publicados (2026-08-19)**: el config pasó a **100
> entidades** y el MCP expone **37 tools** (7 DML + 30 custom de SPs): la
> cadena de carga P0 (`fcasignar_bases_defaul`, `art_centro_defaul`,
> `art_centro_balanceo`, `web_forecast12`, `web_forecast_fam12_s`,
> `web_forecast_bbc12`, `web_forecast_arribos12`,
> `web_forecast_arribos_materia_prima12`, `web_forecast_arribos_insumo12`,
> `generar_web_inicio`) y los **16 SPs de reporte P1** (`web_desglose_forecast`,
> `web_cobertura_materia_prima`, `cfarticulo_cumplimiento`,
> `cfcentra_trabajo_cumplimiento`, `fccentro_capacidad_real`, etc. — detalle en
> [kernel](/erp-kernel/sp-reportes-mrp.md)). Los SPs de reporte están en la
> allow-list del agente; los de carga NO (regeneración = backend).

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
