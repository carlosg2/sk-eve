---
tenant: icf
description: >
  Use when the user pregunta por el programa mensual, situación/avance del
  plan semanal de producción por centro de trabajo, ocupación, tiempo extra o
  autorización del plan semanal. Corresponde a la ruta Programa Mensual
  (/inicio) del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Programa Mensual (inicio / ocupación por centro)

> **Este skill es SOLO procedural.** Schema: [mrp-soporte.md](`mrp-soporte`)
> (`WebInicio`) y [mrp-plan-produccion.md](`mrp-plan-produccion`)
> (`ForecastPlanSemanal`/`ForecastPlanProduccion`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`web_inicio_concentrado`** (SP del portal: Programa Mensual concentrado; parámetros `Usuario, Ejercicio, Periodo`).
`Usuario` fijo: **`"MASERP"`**.

## Origen (portal legacy sigma-icf, ruta `/inicio`, SP `spWebInicio`)

Dashboard por **centro de trabajo** con una fila `Total` agregada. Por cada
centro (excepto la fila `Total`) se calculan: `Venta`, `AProducir`,
`TiempoExtra`, `Ocupacion`, `PzasLibres` (= Ocupacion − AProducir, mínimo 0),
`DiasHAbiles`, `DiasTextra`, `CapacidadHrs` (real, vía
`spFCCentroCapacidadReal`), `HorasProgram` (= AProducir × CapacidadHrs /
Ocupacion), `PorOcupacion` (= HorasProgram / CapacidadHrs × 100), `Maq1` (=
AProducir − Ocupacion), `Inventario` (vía `fnInvForecastDesglosado`), y `DOH`
(= Venta / Inventario). La fila `Total` suma todas las columnas numéricas.

⚠️ `DOH` es una columna **calculada** del SP, NO un campo DAB de `WebInicio`
. No lo incluyas
en `select`; calcúlalo client-side con **NULLIF**: `DOH = Venta / Inventario`
(si `Inventario = 0` → **sin DOH**, no dividir entre 0), redondeado a
2 decimales. `Inventario` SÍ es campo DAB de `WebInicio` (verificado en los
skills actuales) — solo `DOH` no.

La misma ruta también carga, semana por semana (`spFCPPSemanaLista` da la
lista de semanas del periodo), el programa de producción consolidado por
centro (`spProgramaProdConcentadoCentro`) — usa `ForecastPlanProduccion`.

## Patrón 1 — Ocupación/capacidad por centro de trabajo

```
read_records(WebInicio, filter: "Usuario eq 'MASERP'",
  select: "CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,CapacidadHrs,HorasProgram,PorOcupacion,Inventario")
```

La fila con `CentroTrabajo eq 'Total'` es el agregado global — no la excluyas
si el usuario pide "el resumen general", pero exclúyela
(`CentroTrabajo ne 'Total'`) si pide "desglose por centro".

**Reglas del Patrón 1:**

- **DOH calculado** (client-side, no es campo DAB): `DOH = Venta / Inventario`
  con NULLIF — si `Inventario = 0` → **sin DOH** (no dividir entre 0, no
  reportarlo como error). Redondear a 2 decimales. `Inventario` ya viene en el
  `select` de arriba.
- **Centros sobrecargados**: si `Ocupacion > 100` (o `PorOcupacion > 100`),
  destacarlos — ej. 🔴 junto al centro o una nota "centro sobrecargado" — en
  vez de dejarlos pasar como fila normal.
- **Días en 0 no es error**: centros sin programa pueden traer
  `DiasHAbiles`/`DiasTextra` en 0 — no reportarlo como fallo ni pedir datos
  inexistentes.
- **Regla >20 filas**: si el desglose supera 20 filas, entregar TOTALES (fila
  `Total`) y OFRECER filtro por centro antes de volcar el listado.

## Patrón 2 — Programa de la semana por centro

⚠️ **Los campos de `ForecastPlanProduccion` son UPPERCASE en el DAB** (evidencia: `Semana eq 31` → BadRequest; `SEMANA eq 31` → OK). Usa SIEMPRE
UPPERCASE en filter/select de ESTA vista. NO generalices el UPPERCASE a otras
entidades FC (cada vista tiene su casing — ej. `CalendarioFC` usa `Ano`
camelCase); si otra vista falla con BadRequest, verifica su schema con
`read_records(first:1)`.

```
read_records(ForecastPlanProduccion,
  filter: "EJERCICIO eq 2026 and PERIODO eq 7 and SEMANA eq <N> and CENTROTRABAJO eq '<Centro>'",
  select: "RENGLON,ARTICULO,DESCRIPCION,PORPRODUCIR,KILOS,SITUACION")
```

## ⚠️ Autorizar el plan semanal tiene efectos reales en el ERP

El estatus del plan semanal (`ForecastPlanSemanal.Situacion`) avanza vía la
máquina de estados genérica del módulo FC (`Modulo='FC'`, `Mov='Plan Semanal'`
en `MovSituacionFC`). **Cuando la situación pasa a `AUTORIZADO`**, el proceso
real del portal (`spProgramaProdSituacionSemana`) **dispara la generación de
Órdenes de Surtido en el ERP** (`PR_MRP_GENERA_OS`) — es decir, aprobar el
plan aquí tiene consecuencias transaccionales reales fuera de este agente.

**El agente NUNCA debe intentar ejecutar esta transición.** Solo puede leer el
estatus actual:

```
read_records(ForecastPlanSemanal,
  filter: "Ejercicio eq 2026 and Periodo eq 7 and Semana eq <N> and CentroTrabajo eq '<Centro>'",
  select: "ID,Situacion,SituacionUsuario,SituacionFecha")
```

⚠️ `ForecastPlanSemanal` usa **camelCase** (`Ejercicio`/`Periodo`/`Semana`/
`CentroTrabajo`/`Situacion` — `EJERCICIO`/`SITUACION`
dan `BadRequest`). NO pruebes UPPERCASE en esta vista. El UPPERCASE aplica
SOLO a `ForecastPlanProduccion`.

Si el usuario pide "autorizar"/"cambiar situación" del plan, indícale que debe
hacerlo desde el portal MRP directamente.

## Formato de pantalla (obligatorio)

| Pantalla | Columnas |
|---|---|
| **Programa Mensual** | `Centro de Trabajo · Forecast de ventas · Piezas programadas · Capacidad Mensual · Horas Programadas · Ocupación · Piezas Libres · Días Hábiles · Días Extra` (del portal MRP, ruta `/inicio`; fila `Total` incluida si el usuario pide el resumen general) |
| **Plan por semana** | `Semana · Centro de Trabajo · Articulo · Descripción · Por Producir · Kg · Situación` |

Mapeo a `WebInicio`: `CentroTrabajo` → Centro de Trabajo · `Venta` → Forecast de ventas · `AProducir` → Piezas programadas · `CapacidadHrs` → Capacidad Mensual · `HorasProgram` → Horas Programadas · `Ocupacion` → Ocupación · `PzasLibres` → Piezas Libres · `DiasHAbiles` → Días Hábiles · `DiasTextra` → Días Extra.

Regla: reproducir EXACTAMENTE estas columnas/encabezados. **Prohibido inventar columnas** ni consolidaciones que el portal no muestre.

## Limitaciones

- `WebInicio` tiene ~5 filas duplicadas conocidas por calidad de datos
  histórica — deduplicar o advertirlo si se usa para un reporte (ver
  [mrp-soporte.md](`mrp-soporte`)).
- Fuerte solape de datos con la ruta `dashboard` — ver skill `mrp-dashboard`.
