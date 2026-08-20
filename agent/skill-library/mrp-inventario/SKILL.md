---
tenant: icf
description: >
  Use when the user pregunta por el presupuesto VACA semanal, por la
  asignación de lotes/series de materia prima (PEPS/FIFO) contra el plan de
  producción ya autorizado, o por el **saldo de inventario de un artículo
  (entradas CargoU menos salidas AbonoU de la rama inventario)**. Corresponde
  a la ruta "Inventario Semanal" del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Inventario Semanal (presupuesto VACA + lotes PEPS)

> **Este skill es SOLO procedural.** Schema: [mrp-vaca.md](`mrp-vaca`)
> y [mrp-explosion.md](`mrp-explosion`)
> (`UtMrpPrevioMateriaPrima`), [mrp-soporte.md](`mrp-soporte`) (`SerieLote`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`vaca_presupuesto_forecast_semanal`** (SP del portal: presupuesto VACA semanal; parámetros `Usuario='MASERP', Ejercicio, Semana`).
`Usuario` fijo: **`"MASERP"`**.

## Si el usuario NO especifica artículo (regla — validado E2E 2026-08-19)

Si la petición es "inventario semanal" sin nombrar artículo, **NO dejar la
respuesta vacía ni solo cargar el skill**. Dos opciones en orden:
1. **Elegir el artículo de mayor programa** del plan del usuario:
   `read_records(ResumenPlaneacionCF, filter: "Usuario eq 'MASERP'", orderby: ["Producir desc"], first: 1)`
   y responder su inventario semanal (declarando que se tomó el de mayor programa).
2. Si no hay plan, pedir el artículo: "¿De qué artículo quieres el inventario
   semanal?" y esperar.

## Origen (portal legacy sigma-icf, ruta `/inventario`)

Esta ruta lista las semanas del periodo (`spFCPPSemanaLista`) y, para cada una,
trae el presupuesto VACA de esa semana (`spVacaPresupuestoForecastSemanal`)
— el forecast consolidado de venta de la línea VACA, distinto del
forecast general del módulo FC.

## Patrón 1 — Presupuesto VACA por semana

```
read_records(CalendarioFC, filter: "Usuario eq 'MASERP'", select: "Ano,Semana,FechaD,FechaA")
read_records(VacaPresupuestoVtaCon, filter: "Ejercicio eq 2026", select: "ID,Ejercicio,SemanaMRP,Version,Estatus")
read_records(VacaPresupuestoVtaConD, filter: "ID eq <ID del encabezado>",
  select: "Renglon,Articulo,Cliente,Programa,S1,S2,...,S12,P1,P2,...,P12")
```

⚠️ El presupuesto VACA **no es snapshot por usuario** (tiene su propio
`Usuario`, p.ej. `MASERP`, y el encabezado más antiguo es `Ejercicio 2021`) —
NO filtrar por `Usuario eq 'MASERP'`; filtrar por `Ejercicio` del año de
trabajo (verificado 2026-08-06).

## Patrón 2 — Validación de lotes (PEPS/FIFO) contra el plan autorizado

El SP `PR_MRP_PREVIO_MATERIA_PRIMA` (invocado con `Ejercicio`/`Periodo`/
`CentroTrabajo`/`Semana`/`Item` opcional) hace una asignación **PEPS
(primeras entradas, primeras salidas)** de lotes/series de inventario
(`SerieLote`) contra los requerimientos de material del plan **YA
AUTORIZADO** (`ForecastPlanSemanal.Situacion = 'Autorizado'`), determinando de
qué lote específico saldría cada material. El resultado queda materializado en
la tabla `UtMrpPrevioMateriaPrima`.

> ⚠️ **`UtMrpPrevioMateriaPrima` NO existe en el MCP de ICF** (EntityNotFound
> verificado 2026-08-06). Este patrón es del proyecto sigma-icf (MSSQL
> MRPCF5000), NO está publicado aquí. Si el usuario pregunta por la asignación
> PEPS/FIFO de lotes contra el plan, responde la limitación (dato no
> disponible) y ofrece en su lugar existencias por artículo/almacén vía
> `ArtDisponibleDesc`.

> 🔒 **NO EJECUTABLE — solo referencia del proyecto legacy sigma-icf** (la
> entidad no está publicada en el MCP ICF; no intentar llamarla):
```
read_records(UtMrpPrevioMateriaPrima,
  filter: "SEMANA eq <N> and ARTICULO eq '<A>'",
  select: "EMPRESA,SEMANA,ALMACEN,ARTICULO,MATERIAL,SERIELOTE,CANTIDAD,CANTIDADBTO,REQUERIDO")
```

Si se necesita el detalle de existencia real por lote (antes de la
asignación), usar `SerieLote` (del sistema, solo lectura).

## Patrón 3 — Saldo de inventario (AuxiliarU)

Cuando se necesita el **saldo/inventario inicial** de un artículo (inventario
semanal, DOH), usar `AuxiliarU` ([mrp-plan-produccion](`mrp-plan-produccion`)
— ledger contable de inventario).

```
# Entradas (CargoU) del artículo en almacenes de inventario
aggregate_records(AuxiliarU, function: "sum", field: "CargoU",
  filter: "Rama eq 'INV' and Empresa eq 'INCF' and Cuenta eq '<ART>'")
# Salidas (AbonoU) del mismo artículo
aggregate_records(AuxiliarU, function: "sum", field: "AbonoU",
  filter: "Rama eq 'INV' and Empresa eq 'INCF' and Cuenta eq '<ART>'")
```

Saldo = `sum(CargoU) − sum(AbonoU)` (validado 2026-08-19: A0716 → 157,545 −
127,663). El almacén vive en `Grupo` (equivale a `Alm.Almacen`); para acotar a
un almacén empacado añadir el join `Grupo in (select Almacen from Alm where
EmpacadoCF = 1)` NO es posible en OData → filtrar por `Grupo eq '<ALMACEN>'`
si se conoce, o consultar y agregar client-side.

⚠️ **Siempre acotar con `Cuenta`** (y si aplica, `Fecha le ...`) — la tabla
supera 1.5M filas en `Rama='INV'`. Campos camelCase.

⚠️⚠️ **NO inventar entidades de inventario**: `InvD`, `InvDisp`, `SaldoInv`,
`InvSerieLote` y similares **no existen** en el MCP de ICF (EntityNotFound). El
saldo de un artículo se calcula con `AuxiliarU` (este patrón); el disponible
actual se lee con `ArtDisponibleDesc`. No intentar otras tablas.

## Limitaciones

- `UtMrpPrevioMateriaPrima` es una instantánea (staging) del proyecto
  sigma-icf — **no publicada en el MCP de ICF** (EntityNotFound verificado
  2026-08-06). El agente no puede leerla; ante preguntas de asignación de
  lotes responde la limitación y ofrece `ArtDisponibleDesc` (existencias) o
  `ExplocionMatCF` (requerimientos).
- No confundir el forecast **VACA** (esta ruta) con el forecast
  **general del módulo FC** (`mrp-forecast`/`mrp-arribos`) — son procesos y
  tablas distintos aunque ambos hablan de "presupuesto"/"forecast".
