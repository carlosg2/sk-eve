---
tenant: icf
description: >
  Use when the user asks sobre el sistema MRP/Forecast de Campo Fresco
  (MRPCF5000) del tenant ICF: ¿tenemos materia prima suficiente?, stock de
  seguridad o inventario mínimo/máximo, cobertura de inventario, plan de
  producción vs. disponible, estado del MRP, faltantes de producción,
  cumplimiento de producción, "¿cuánto frijol/concentrado tenemos?", "¿qué nos
  falta para producir?". Analista MRP CF: combina los snapshots del proceso
  (ExplocionMatCF, ResumenPlaneacionCF) con catálogos (UV_QV_PPTOCOMPRA,
  ArtDisponible, ArtMaterial, DimTiempoSemana) sin ejecutar stored procedures.
---

# Skill: MRP CF Analyst (Campo Fresco / ICF)

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company
> Twin: [mrp-explosion.md](/company-twin/companies/icf/mrp/mrp-explosion.md),
> [mrp-plan-produccion.md](/company-twin/companies/icf/mrp/mrp-plan-produccion.md),
> [mrp-centros-estaciones.md](/company-twin/companies/icf/mrp/mrp-centros-estaciones.md),
> [mrp-vaca-ganadera.md](/company-twin/companies/icf/mrp/mrp-vaca-ganadera.md)
> y `erp-kernel` (`ArtDisponible`, `Art`, `Alm`, `Prod`, `ProdD`).

Conexión MCP: **`intelisis-dab`** (remoto, tenant ICF). Tools: `read_records`,
`aggregate_records`. `Usuario` fijo del módulo FC: **`"CGARZA"`** (los snapshots
de este módulo son por usuario ERP que corrió el proceso, no por quien chatea).

## Contract

Dada una pregunta de negocio sobre producción, inventario o materia prima:

1. Identifica qué entidades del módulo MRP/FC responden la pregunta.
2. Construye la consulta mínima y suficiente (DAB/OData, NO SQL).
3. Ejecútala contra el MCP del tenant ICF.
4. Interpreta el resultado en términos de negocio (no jerga técnica).
5. Señala explícitamente si los datos son de un ejercicio anterior al actual.

**Garantías:**
- Nunca ejecutar DML (`create_record`/`update_record`/`execute_entity`) — solo lectura.
- Verificar que el MRP se corrió (`UtLogEjcProMrp`) antes de reportar "no hay datos".
- Advertir cuando `DimTiempoSemana` no cubre el año actual.
- Calificar los datos por ejercicio y `Usuario` de sesión.

## Modelo de datos clave

```
ResumenPlaneacionCF   — Plan de producción por usuario/artículo (S1..S54/P1..P54 + Producir/Kg)
ExplocionMatCF        — Explosión de materiales vs. disponible (snapshot de sesión)
ArtDisponible         — Inventario actual por almacén y empresa (erp-kernel)
ArtMaterial           — Lista de materiales (BOM): artículo → materiales
DimTiempoSemana       — Calendario de semanas por año/mes (en DAB se llama
                        DimTiempoSemana, NO DIM_TIEMPO_SEMANA)
UV_QV_PPTOCOMPRA      — Stock mínimo/máximo y máx. de compra por artículo/familia (materia prima)
ArtFamFC              — Familias del sistema Forecast CF
CentroFCTemp / EstacionTFCTemp — Centros/estaciones y capacidades (sesión de usuario)
Prod / ProdD          — Producción real transaccional (erp-kernel)
VentaTCalc            — Ventas reales para comparar vs. forecast
```

### Schema verificado — `UV_QV_PPTOCOMPRA` (vista de presupuesto de compra)

Columnas (2026-08-04, `read_records` en vivo):
`NIVELAGRUPAMIENTO` (ARTICULO/FAMILIA), `TIPO`, `FAMILIA`, `LINEA`, `ARTICULO`,
`DESCRIPCION`, `TIPOCATALOGO`, `INVMINIMOKG`, `INVMAXIMOKG`, `MAXCOMPRAKG`.

`INVMINIMOKG`/`INVMAXIMOKG` son el **stock de seguridad** (mínimo/máximo en Kg);
`MAXCOMPRAKG` el máximo de compra en Kg. Pueden venir `null` para artículos sin
parámetro configurado — no asumir 0.

## Fase 1 — Clasificar la pregunta

| Tipo de pregunta | Entidades principales |
|---|---|
| Stock de seguridad / min-máx | `UV_QV_PPTOCOMPRA`, `Art` |
| Inventario disponible | `ArtDisponible`, `Art`, `Alm` |
| Cobertura de materia prima (30 días) | `ExplocionMatCF`, `ArtMaterial` |
| Plan de producción | `ResumenPlaneacionCF` / `ForecastPlanProduccion` |
| Cumplimiento real vs. plan | `ResumenPlaneacionCF`, `Prod`, `ProdD` |
| Capacidad de centros | `CentroFCTemp`, `EstacionTFCTemp` |
| Forecast vs. ventas | `ResumenPlaneacionCF`, `VentaTCalc` |

## Fase 2 — Construir la consulta (convenciones DAB)

1. Parámetros sin `$`: `filter`, `select`, `first`, `orderby`.
2. Fechas sin comillas: `Fecha ge 2026-01-01`; strings con comillas simples:
   `Estatus eq 'ALTA'`. `in` NO soportado → encadenar `or`.
3. Filtrar SIEMPRE por `Usuario eq 'CGARZA'` (snapshots por usuario) y por
   `Ejercicio`/`Periodo` cuando aplique — no traer corridas de otros usuarios.
4. Para inventario: `Almacen eq '<ALM>'` (política del tenant) y `Disponible gt 0`.
5. Antes de afirmar "no hay datos", verificar en `UtLogEjcProMrp` que el proceso
   se corrió para ese usuario/periodo.
6. Si un `read_records` con `select` falla (schema no verificado), usar
   `read_records(<Entidad>, first: 1)` sin `select` para descubrir columnas reales.

### Consultas base reutilizables

- **Q1 — Stock de seguridad por familia/artículo**
```
read_records(UV_QV_PPTOCOMPRA,
  filter: "NIVELAGRUPAMIENTO eq 'ARTICULO' and FAMILIA eq '<F>'",
  select: "FAMILIA,LINEA,ARTICULO,DESCRIPCION,INVMINIMOKG,INVMAXIMOKG,MAXCOMPRAKG")
```
Para el nivel familia, filtrar `NIVELAGRUPAMIENTO eq 'FAMILIA'`.

- **Q1b — Stock de seguridad AGRUPADO por familia (resumen)**
Cuando el usuario pide el resumen "por familia" o "agrupado por familia", **NO**
leas la vista completa (`read_records` con `first` alto devuelve ~60k chars que se
re-envían en cada step e inflan el contexto). Usar `aggregate_records` con
`groupby` directamente:
```
aggregate_records(UV_QV_PPTOCOMPRA,
  filter: "INVMINIMOKG gt 0",
  groupby: "FAMILIA", function: "sum", field: "INVMINIMOKG")
aggregate_records(UV_QV_PPTOCOMPRA,
  filter: "INVMINIMOKG gt 0",
  groupby: "FAMILIA", function: "sum", field: "INVMAXIMOKG")
```
Combinar los dos resultados por `FAMILIA`. Si hace falta el detalle por artículo
de UNA familia, recién ahí usar Q1 con filtro `FAMILIA eq '<F>'`. Limitar
siempre `select`/`filter`; nunca traer la vista entera.

- **Q2 — Inventario de materia prima (disponible por artículo)**
```
read_records(ArtDisponible, filter: "Almacen eq '<ALM>' and Disponible gt 0",
  select: "Articulo,Descripcion1,Disponible,Unidad", orderby: ["Disponible desc"], first: 50)
```

- **Q3 — Cobertura de materia prima (explosión)**
```
read_records(ExplocionMatCF, filter: "Usuario eq 'CGARZA'",
  select: "Articulo,Descripcion1,Requerido,Disponible")
```
Si `ExplocionMatCF` viene vacío o desactualizado, armar manualmente cruzando
`ArtMaterial` (BOM) × `ArtDisponible` — ver el skill `gap-abasto` para ese patrón.
Para "30 días" aproximar: `(4.3 / semanas_totales_del_plan) × plan_total` y
declarar la aproximación.

- **Q4 — Plan de producción por familia (piezas y kg)**
```
aggregate_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'CGARZA' and Ejercicio eq <AÑO> and Producir gt 0",
  groupby: "FamiliaCF", function: "sum", field: "Producir")
aggregate_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'CGARZA' and Ejercicio eq <AÑO> and Producir gt 0",
  groupby: "FamiliaCF", function: "sum", field: "Kg")
```
Si `aggregate_records` no soporta dos `sum` en una llamada, ejecutarlas por
separado y combinar por `FamiliaCF`.

- **Q5 — Cumplimiento (producido real vs. programado)**
```
aggregate_records(ProdD, filter: "Articulo eq '<A>' and Fecha ge <inicio> and Fecha le <fin>",
  function: "sum", field: "Cantidad")
```
Cumplimiento % = `SUM(Cantidad real) / Producir programado * 100`; traducir
semana → rango de fechas con `DimTiempoSemana`/`CalendarioFC` antes de filtrar.

- **Q6 — Vigencia del calendario (¿cubre hoy?)**
```
read_records(DimTiempoSemana, filter: "Ano ge 2026",
  select: "Ano,Semana,FechaD,FechaA", orderby: ["Ano desc"], first: 5)
```

## Fase 3 — Interpretar el resultado

Estructura de respuesta estándar:

```
⚠️  [Advertencia de datos si el ejercicio es < al actual o DimTiempoSemana no cubre hoy]

## [Pregunta respondida]

### Resumen ejecutivo
[1-2 oraciones con la respuesta directa]

### Detalle por familia
[tabla con cifras relevantes]

### Conclusión y acción sugerida
[qué hacer con esta información]
```

## Output Format

- Tablas en Markdown para datos tabulares.
- Números con separador de miles.
- Kg siempre en Kg (no convertir a toneladas salvo que se pida).
- Semáforo: 🔴 crítico / 🟡 parcial / 🟢 OK.
- Incluir de forma breve las entidades consultadas (no hace falta pegar los
  JSON completos).

## Limitaciones conocidas

- `DimTiempoSemana` puede no cubrir el año actual; preguntas que requieran
  semanas fuera del rango usan aproximaciones proporcionales y se advierte.
- `ExplocionMatCF`/`ResumenPlaneacionCF` son snapshots de la última corrida del
  usuario — pueden estar desactualizados si no se reejecutó el proceso
  (verificar `UtLogEjcProMrp`).
- `UV_QV_PPTOCOMPRA` es una vista calculada: `INVMINIMOKG`/`INVMAXIMOKG`/
  `MAXCOMPRAKG` pueden ser `null` para artículos sin parámetro.
- Las columnas exactas de las entidades MRP vienen de `describe_entities`
  remoto contra ICF (sin tipos/PK reales); si un `select` falla, descubrir el
  schema con `read_records(first: 1)` antes de reintentar.
- El agente es de **solo lectura** sobre este módulo: nunca intentar replicar
  escrituras ni transiciones de estatus.
