---
tenant: icf
description: >
  Use when el usuario pregunta por cumplimiento de producción (programado vs.
  producido), forecast vs. venta real, o KPIs de eficiencia por centro de
  trabajo, familia o artículo. Corresponde a la ruta "Indicadores" del portal MRP.
---

# Skill: MRP — Indicadores (cumplimiento plan vs. real)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](`mrp-plan-produccion`)
> y [mrp-vaca.md](`mrp-vaca`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`cfarticulo_cumplimiento`**, **`cfcentra_trabajo_cumplimiento`** (SPs del portal: grid EXACTO de cumplimiento por artículo/centro; parámetros `Usuario, Ejercicio, Periodo`).
`Usuario` fijo: **`"MASERP"`**.

## Origen (portal legacy sigma-icf, ruta `/indicadores`)

Tres comparaciones plan-vs-real, cada una con su propio SP:

1. **`CFForecastvsVtas`** — compara el forecast de venta (`Sn` de
   `ResumenPlaneacionCF`/`VacaPresupuestoVtaConD`) contra venta real
   facturada. Regresa también `DOH` (Days On Hand) = venta / inventario.
2. **`spCFArticuloCumplimiento`** — cumplimiento por artículo: compara
   `Producir`/`Kg` programado (`ResumenPlaneacionCF`) contra lo realmente
   producido (`Prod`/`ProdD` filtrado por fecha de la semana), como
   porcentaje.
3. **`spCFCentraTrabajoCumplimiento`** — mismo cálculo pero agregado por
   `CentroTrabajo` en vez de por artículo.

Filtros de la UI (`spCFFamiliaLista`/`spCFCentroLista`): el usuario puede
acotar por familia o centro específico.

## Patrón 1 — Cumplimiento por artículo (programado vs. producido real)

```
# 1) Programado (scratch por usuario, del periodo)
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'MASERP' and Articulo eq '<A>'",
  select: "Articulo,Producir,Kg")

# 2) Real producido (transaccional, filtrar por rango de fecha de la semana/periodo)
aggregate_records(ProdD, filter: "Articulo eq '<A>' and FechaEntrega ge <inicio>T00:00:00Z and FechaEntrega le <fin>T23:59:59Z",
  function: "sum", field: "Cantidad")
```

Cumplimiento % = `SUM(Cantidad producida real) / Producir programado * 100`.
Usar `DIM_TIEMPO_SEMANA` (campos `Anio`/`MES`/`SEMANA`/
`FECHAINICIO`/`FECHAFIN`) o `CalendarioFC` (camelCase `Ano`/`Semana`/
`FechaD`/`FechaA`) para traducir semana → rango de fechas antes de filtrar
`ProdD`. Nota: `ProdD` no tiene campo `Fecha` — usar
`FechaEntrega`/`FechaRequerida` con formato ISO `...T00:00:00Z` (fecha sola o
sin `Z` da error). Con 0 filas, `sum` devuelve `null` — tratar como 0.

## Patrón 2 — Forecast vs. venta real (DOH)

```
read_records(VacaPresupuestoVtaConD, filter: "...",
  select: "Articulo,S1,S2,...,S12")   # forecast
read_records(VentaTCalc, filter: "Articulo eq '<A>' and FechaEmision ge <inicio>T00:00:00Z and FechaEmision le <fin>T23:59:59Z",
  select: "Articulo,Cantidad,Importe")   # venta real
```

DOH = Venta / Inventario (usar `ArtDisponibleDesc` para existencias con
descripción, o `ArtDisponible` solo para agregados numéricos puros;
`ArtDisponibleVaca` NO existe en el MCP ICF).

### Variante con `UV_QV_FILLRATE` (fuente oficial del módulo FC)

Cuando la comparación es contra la **venta real embarcada** del módulo FC (la
misma que usa el portal), usar `UV_QV_FILLRATE` por `MES_FISCAL` en vez de
`VentaTCalc`:

```
# Venta real bruta del mes fiscal M
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "CANTIDAD_EMBARCADA",
  filter: "MES_FISCAL eq <M> and NO_ARTICULO eq '<A>'")
# Rechazos
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "RECHAZO",
  filter: "MES_FISCAL eq <M> and NO_ARTICULO eq '<A>'")
```

Neta = bruta − rechazo. ⚠️ `UV_QV_FILLRATE` es UPPERCASE y `FECHA_REMISION` es
varchar dd/mm/yyyy → **nunca filtrar por fecha**, usar `MES_FISCAL`/
`SEMANA_FACTURA` .

## Fórmulas exactas de los indicadores (portadas de skill-analisis de Daniel)

### I1 — Forecast vs. Ventas (por centro)

- **Forecast** = suma de las semanas de la ventana activa (`Sn` de
  `ResumenPlaneacionCF`, `Usuario eq 'MASERP'`), por `Articulo` + `CtTrabajo`
  (en el portal legacy: `SUM(S1..S54)` con solo filas con forecast > 0).
  ⚠️ NO sumar columna por columna con `aggregate_records` (54 calls =
  anti-patrón): leer UNA vez y sumar client-side.
- **Inventario** = `TotalInv` de `ResumenPlaneacionCF` (mismo read).
- **Ventas** = venta real neta del módulo FC: `sum(CANTIDAD_EMBARCADA) −
  sum(RECHAZO)` de `UV_QV_FILLRATE` (2 aggregates; variante del Patrón 2).
  Acotar por `NO_ARTICULO` (al set del forecast) y `MES_FISCAL` — NUNCA por
  `FECHA_REMISION`.

```
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'MASERP'",
  select: "Articulo,CtTrabajo,TotalInv,S1,...,S54", first: <N>)   # sumar Sn client-side
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "CANTIDAD_EMBARCADA",
  filter: "MES_FISCAL eq <M> and NO_ARTICULO eq '<A>'")
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "RECHAZO",
  filter: "MES_FISCAL eq <M> and NO_ARTICULO eq '<A>'")
```

**Fórmulas exactas** (por centro):

- `Cumplimiento = Ventas > 0 ? round(Ventas/Forecast*100) : 0`
- `Participacion = totalVentas > 0 ? round(100/totalVentas*Ventas*100)/100 : 0`
  (`totalVentas` = suma de ventas de la ventana; 0/null → 0)
- `DOH = Inventario > 0 ? round(Forecast/Inventario*100)/100 : 0`
  (tratar `Inventario` null como 0 — mismo efecto que `NULLIF`)
- Fila **`TOTAL`**: sumar las columnas numéricas (Forecast, Ventas); los % del
  TOTAL se recalculan con las fórmulas sobre los totales, no se suman ciegos.
- Centro sin nombre (`CtTrabajo` null/'') → se muestra `null` (NO
  "(SIN CENTRO)").

### I2 — Cumplimiento de Centros / I3 — Cumplimiento de Artículos

- **Programado** por artículo+centro: `ResumenPlaneacionCF` (`Usuario eq
  'MASERP'`), campos `Producir` (pzas), `Kg`, `Gramaje`, `CtTrabajo`,
  `FamiliaCF`, `Descripcion`.
- **Producido pzas** = `sum(Cantidad)` de `ProdD` en el rango de la semana
  (patrón del Patrón 1: `FechaEntrega ge <inicio>T00:00:00Z and le
  <fin>T23:59:59Z`; 0 filas → `null` → tratar como 0).
- ⚠️ **El producido del PERIODO completo SÍ se aísla por rango de fechas**
  : `FechaD..FechaA` = `MIN(FECHAINICIO)..MAX(FECHAFIN)`
  de las semanas del periodo según `DIM_TIEMPO_SEMANA` (`Anio eq <Y> and MES eq
  <P>`) o `CalendarioFC` (`Ano`/`MES`). NO declarar "no se puede aislar el
  producido del periodo" sin intentar este rango; si `FechaEntrega` trae 0
  filas, reintentar con `FechaRequerida` antes de rendirse.
- `prodKg = prodPzas × Gramaje` (Gramaje de `ResumenPlaneacionCF`; si viene
  null, usar `Art.Gramaje`).
- `cumplimiento = progPzas > 0 ? round(prodPzas/progPzas*10000)/100 : 0`
  (2 decimales).
- **Modo CENTRO (I2)**: agrupar por centro — sumar `Kg` y `Pzas` programados y
  producidos por `CtTrabajo` (aggregate `ProdD` con `groupby: ["Centro"]` si el
  campo existe en `ProdD`; verificar con `read_records(ProdD, first:1)` si
  falla). Salida + fila `TOTAL` (suma de columnas; % recalculado sobre totales).
- **Modo ARTÍCULO (I3)**: una fila por artículo; filtros opcionales `Centro`
  (`CtTrabajo eq '<C>'`) y `Familia` (`FamiliaCF eq '<F>'`).
- Comparar por **clave** (artículo/centro), NO por orden de filas: construir
  `prodMap['Centro|Articulo']` desde `ProdD` y cruzarlo con el plan.
- Centro sin nombre → `null`; Familia vacía → `vacio`.

### Regla de volumen (>20 filas)

Si el resultado supera ~20 filas: mostrar los **totales** y **ofrecer filtro**
(por centro/familia/artículo) antes de volcar la tabla completa.

## Formatos de pantalla (obligatorios)

| Tab | Columnas (orden del portal) |
|---|---|
| **Forecast vs Ventas** | `Centro de Trabajo · Forecast · Ventas · Cumplimiento · Participacion · DOH` |
| **Cumplimiento de Centros** | `Centro de Trabajo · Programado Kg. · Programado Piezas · Producido Kg · Producido Pzas · Cumplimiento` |
| **Cumplimiento de Artículos** | `Articulo · Descripción · Centro · Familia · Programado Kg · Programado Pzs · Producido Kg · Producido Pzs · Cumplimiento` |

Reglas: reproducir EXACTAMENTE estas columnas/encabezados (del portal MRP, ruta
Indicadores). Añadir fila `TOTAL` en las comparaciones que el portal la muestra
(Forecast vs Ventas y Cumplimiento de Centros). **Prohibido inventar columnas**
ni consolidaciones que el portal no muestre; `null`/`vacio` se muestran como
vienen de la BD (Centro sin nombre → `null` en el portal, Familia vacía →
`vacio`).

## Limitaciones

- No hay un solo tool que ya calcule el % de cumplimiento — hay que combinar
  el plan (`ResumenPlaneacionCF`) con lo real (`Prod`/`ProdD` o `VentaTCalc`)
  a mano (patrones verificados contra el MCP; `Fecha` no existe en
  `ProdD`/`VentaTCalc`, usar `FechaEntrega`/`FechaEmision` con ISO `Z`).
- ⚠️ El producido del periodo NO es "no aislable": se filtra `ProdD` por el
  rango de fechas del periodo completo (`DIM_TIEMPO_SEMANA`/`CalendarioFC` →
  `MIN FECHAINICIO..MAX FECHAFIN`). Un turno declaró la
  limitación sin intentarlo — regla: intentar siempre el patrón antes de
  declarar "no disponible". Si `ProdD` viene vacío, confirmar que la fecha
  existe en `Prod` (cabecera) y filtrar por la del detalle si aplica.
- Confirmar con el usuario si "cumplimiento" se refiere a **piezas/Kg
  producidos** (Patrón 1) o a **venta vs. forecast** (Patrón 2) — son
  comparaciones distintas que esta ruta agrupa bajo el mismo menú.
