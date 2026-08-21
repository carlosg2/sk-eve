---
type: Intelisis Module Reference
title: Módulos disponibles — empresa ICF
description: Cobertura de la fuente de datos de ICF: qué módulos están disponibles y cuáles no (CXP/tesorería/cuentas bancarias no disponible).
layer: company
tenant: icf
tags: [icf, cobertura, modulos, disponibilidad, restriccion]
mcp_tools: [read_records, aggregate_records]
---

# Módulos disponibles — empresa ICF

Qué módulos publica la fuente de datos de la empresa **ICF** y qué no está disponible.

## Módulos disponibles

- **MRP / Forecast-Planeación (FC)** — explosión de materiales, forecast y plan de
  producción. Entidades: `ExplocionMatCF`, `ForecastPlanProduccion`, `CalendarioFC`,
  `UV_QV_PPTOCOMPRA`, `ArtDisponibleDesc`, `ArtDisponible`, `ArtMaterial`, `CentroFCTemp`,
  etc. Ver [mrp](/companies/icf/mrp/index.md).
- **Catálogos core** — `Art`, `Alm`, `Prov`, `Almacen*` y demás entidades de la fuente de
  datos de la empresa (validar la disponibilidad real consultando la entidad).

## No disponible en esta empresa (dato no disponible)

El módulo **CXP / Tesorería / Cuentas bancarias** no está disponible en la fuente de datos
de ICF. Consultar estas entidades devuelve "entidad no definida en la configuración":

- `CXP`, `CxpD`, `CxpConSaldo`, `CXPD`
- `CtaDinero`, `Dinero`, `DineroD`

Tampoco están expuestas algunas entidades que el conocimiento general documenta como
universales:
- `ArtAlm`, `UtLogEjcProMrp` (bitácora del MRP; ver `mrp/mrp-explosion.md` para
  alternativas).
- `EmpresaCfg2` (existe en la base de datos, pero no está expuesta en la fuente de datos).
- `InvD` (existe en la base de datos, pero no está expuesta).

Entidades que **no existen** (no consultarlas; las existencias se consultan con
`ArtDisponibleDesc` o `AuxiliarU`):
- `SaldoInv`, `InvSerieLote`, `InvDisp`
- `ArtPrototipo`, `ArtPrototipoMaterial` (catálogo de prototipos; la explosión de
  materiales real se consulta con `ArtMaterial` / `web_art_explosion_material`).

> ⚠️ **`DIM_TIEMPO_SEMANA` SÍ está disponible** (junto con `Usuario`,
> `UV_QV_FILLRATE` y `AuxiliarU`). Sirve para traducir semanas (alternativa a
> `CalendarioFC`). Campos: `Anio`, `MES`, `SEMANA`, `NMES` (ej. "12 Diciembre"),
> `NSEMANA` (ej. "SEM 53/08"), `FECHAINICIO`, `FECHAFIN`, `PERIODOCERRADO`.

> ✅ **El plan de `MASERP · 2026 · Periodo 8` ya está cargado**: `ResumenPlaneacionCF`
> está poblado (90 filas — detalle en
> [mrp-plan-produccion](/companies/icf/mrp/mrp-plan-produccion.md)).

> ✅ **Consultas del portal MRP disponibles**: la fuente de datos expone las consultas
> del portal (`web_desglose_forecast`, `web_cobertura_materia_prima`,
> `cfarticulo_cumplimiento`, `cfcentra_trabajo_cumplimiento`, `fccentro_capacidad_real`,
> etc. — detalle en [sp-reportes-mrp](/erp-kernel/sp-reportes-mrp.md)). Las de consulta
> están disponibles para el agente; las de carga regeneran el plan y no deben usarse
> directamente.

Los nombres pueden variar en mayúsculas/minúsculas (`CXP`/`Cxp`/`cxp`); en todos los casos
la entidad no existe en la configuración de ICF.

## Notas

- El catálogo de entidades es incompleto: no lista todas las entidades usables
  (ej. `UV_QV_PPTOCOMPRA` no aparece y sí funciona al consultarla). La disponibilidad real
  se valida consultando la entidad directamente.
- Cuando una consulta devuelve "entidad no definida", significa que no está disponible en
  la fuente de datos de esta empresa, no que el dato sea cero.

## Detalles operativos del catálogo `Art` en ICF

- **Estatus de artículo:** además de `ALTA` y `BAJA`, ICF usa **`BLOQUEADO`** (artículo
  bloqueado, no opera) y **`PROTOTIPO`** (artículo en desarrollo — no es un artículo final
  de compra/producción). Al consultar disponibilidad/compras, filtrar por `Estatus eq 'ALTA'`
  salvo que el usuario pida explícitamente los otros.
- **`AlmacenROP`:** en uso en ICF. Distingue compra vs distribución en la planeación de
  compras (`Art.AlmacenROP = PlanArtOP.Almacen` → compra; distinto → distribución).
