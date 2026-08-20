---
tenant: icf
description: >
  Use when the user asks about arribos (recepciones) proyectados a 12 semanas,
  cobertura de materia prima o BBC a futuro, cuándo se debe generar un embarque
  sugerido, o arribos pendientes de la línea VACA. Corresponde a la ruta
  "Programa de Arribos" del portal MRP legacy (sigma-icf).
---

# Skill: MRP — Programa de Arribos (cobertura y arribos proyectados)

> **Este skill es SOLO procedural.** El schema vive en el Company Twin:
> [mrp-forecast-arribos.md](`mrp-forecast-arribos`)
> y [mrp-vaca.md](`mrp-vaca`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`web_cobertura_materia_prima`** (cobertura MP 12S), **`fcarribos_vaca`** (arribos Vaca pendientes, 3 bases).
`Usuario` fijo: **`"MASERP"`** (mismo criterio que `gap-abasto`/`mrp`).

## Origen (portal legacy sigma-icf, ruta `/arribos`)

Esta ruta del portal MRP calcula, por artículo/familia, cuántas piezas van a
**arribar** (recepción de compra o traspaso) en cada una de las próximas 12
semanas, y compara contra el forecast de consumo para decidir si hay que
generar un embarque/orden de compra. Los stored procedures fuente
(`spWebForecastArribosMateriaPrima12`, `spWebForecastArribosInsumo12`,
`spWebForecastArribosConcentrado12`, `spWebCoberturaMateriaPrima`,
`spWebCoberturaBBC`, `spFCArribosVacaPendientes`) explotan
`VacaPresupuestoVtaConD` (forecast de venta) contra el BOM (`ArtMaterial`)
semana por semana y comparan contra compras reales (`Compra`/`CompraD`). El
agente **no puede recalcular esto** — solo lee el resultado ya corrido
(tablas `Arribos12`/`Arribos12S`/`ArribosSub12S`/`FCArribos`).

## Patrón 1 — Arribos proyectados a 12 semanas por artículo

```
read_records(Arribos12,
  filter: "Usuario eq 'MASERP'",
  select: "Articulo,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12")
```

⚠️ **No pagines en grande**: `read_records(Arribos12, first: 500)` sin filtro
re-envía ~36k chars por step (anti-patrón). Limita
`first` a ≤100, acota con `filter` (artículo/familia) o usa `aggregate_records`
para totales. `Arribos12` tiene una fila por artículo/usuario.

Usar `Arribos12S` si se necesita el desglose por familia o el ajuste (`An`)
en vez del detalle por artículo , sin semanas ni ajuste).

⚠️⚠️ **NUNCA hagas un aggregate por columna semanal** (12 llamadas
`aggregate_records(Arribos12S, sum, S1, groupby ["Familia"])` + `S2` + ...)
— es un anti-patrón costoso. Si necesitas el
desglose por familia, lee **UNA sola vez** `read_records(Arribos12S,
select: "Familia,S1,S2,...,S12", filter: "Usuario eq 'MASERP'", first: 200)`
y suma/agrega client-side. Máximo 1-2 llamadas para el total.

## Patrón 2 — Cobertura por familia (regla de reorden real)

La lógica de negocio real (`spWebCoberturaMateriaPrima`/`spWebCoberturaBBC`)
arma, por `Familia`, una tabla rodante de 12 semanas con estas filas
conceptuales — **replícalo agregando, no lo inventes distinto**:

1. Inventario inicial (disponibilidad actual, `ArtDisponible` filtrado a
   materia prima — ver `fnWebArtFamDisponible` conceptualmente).
2. Forecast/consumo de la semana (`ForecastArtFam12.Sn`).
3. (+) Mercancía en tránsito = arribos ya confirmados (`Arribos12`/`FCArribos`
   o compras reales `Compra`/`CompraD` con `FechaEntrega` en la semana).
4. (=) Inventario final = inicial − consumo + arribos.
5. Semanas de cobertura = inventario final / consumo de esa semana.
6. Lead time (semanas) = `ArtFamFC.TiempoEntrega`.

**Regla de reorden**: si el inventario final de la semana N cae
`<= ArtFamFC.StockMinimo`, se sugiere un embarque de
`ArtFamFC.StockMaximo - InventarioFinal` para la semana `N + TiempoEntrega`.

```
read_records(ForecastArtFam12, filter: "Usuario eq 'MASERP'",
  select: "Familia,S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12")
read_records(ArtFamFC, select: "Familia,TiempoEntrega,StockMinimo,StockMaximo")
read_records(Arribos12, filter: "Usuario eq 'MASERP'", select: "Articulo,S1,...,S12")
```

Combina los tres en el análisis; no hay un tool dedicado que ya calcule la
cobertura completa (a diferencia de `faltante_insumos`/`faltante_materia_prima`
en el skill `gap-abasto`).

## Patrón 3 — Traducir semana N a fecha real

```
read_records(CalendarioFC, filter: "Usuario eq 'MASERP'",
  select: "Ano,Semana,NoSemana,FechaD,FechaA")
```

## Reglas de presentación (skill-arribos §4)

- **Siempre 12 semanas completas** (Arribos → Consumo → Inventario Final por
  semana), nunca omitir semanas con 0.
- Orden por semana: **Arribos → Consumo → Inventario Final** (A → S → IF).
- **Prohibido combinar celdas** (cada semana es su propia columna).
- Cabeceros con acentos tal cual del portal: `Mercancia enTransitos`,
  `Solicitud de generacion de embarque sugerido por sistema`, etc.
- **Redondeo a ENTERO en la presentación** (las fórmulas internas usan
  decimales; la tabla muestra enteros).

## Regla de reorden (A3/A4 — Embarques MP/BBC): fórmulas exactas

Refuerzo del Patrón 2 (cobertura) con las fórmulas exactas del SP fuente, por
semana `n` (1..12) y por entidad (familia MP / artículo BBC):

- `IF[n] = II[n] − S[n] + A[n] + AP[n]`
  - `II[n]` = inventario inicial (disponible, ver §Disponible)
  - `S[n]` = forecast/consumo de la semana (`ForecastArtFam12.Sn` MP /
    `ForecastBBC12.Sn` BBC)
  - `A[n]` = arribos confirmados (`Arribos12`/`FCArribos` o `Compra`/`CompraD`
    con `FechaEntrega` en la semana)
  - `AP[n]` = arribos proyectados **no confirmados** (embarques sugeridos, abajo)
- `CO[n] = S[n] != 0 ? round(IF[n]/S[n]*100)/100 : 0` (semanas de cobertura)
- **Regla de reorden**: si `IF[n] <= StockMinimo` →
  `SG[n] = StockMaximo − IF[n]` (embarque sugerido de la semana n), aplicado a
  `AP[n+TiempoEntrega] += SG[n]` si `n + TiempoEntrega < 13`.
- `TiempoEntrega`/`StockMinimo`/`StockMaximo` de `ArtFamFC` (MP) o `Art` (BBC).

⚠️ `AP` es un cálculo **APROXIMADO** del agente — no presentarlo como valor
exacto del sistema (el SP real lo recorre de forma distinta).

## A5 — Arribos Pendientes (Compra/CompraD/Prov)

`Compra`/`CompraD`/`Prov` ya documentadas (Patrón 2 y twin): portar la lógica
de `spFCArribosVacaPendientes` al MCP:

- **Filtros (Compra)**: `Empresa eq 'INCF' and Estatus eq 'PENDIENTE' and
  (Mov eq 'ORDEN COMPRA' or Mov eq 'ORDEN CON GASTOS')` + ventana de fechas
  (`FechaEmision` de los últimos ~3 meses). Las líneas `VACA`/`PDB` viven en la
  BD linked (fuera del MCP) — cruzar con [mrp-vaca.md](`mrp-vaca`) y declarar
  la limitación si se piden.
- **Detalle (CompraD)**: join client-side por `ID`; `CantidadPendiente gt 0` y
  `Articulo` `startswith 'A'`; `Art.Estatus eq 'ALTA'` (join client-side con
  `Art`).
- **JS de presentación**:
  - `Cantidad` (neta) = `Cantidad − CantidadCancelada`
  - `CantidadPendiente` = si `Estatus eq 'BORRADOR'` → `Cantidad`, si no →
    `CantidadPendiente` del registro
  - Fechas ISO (`FechaEmision`/`FechaEntrega`, `yyyy-MM-dd`) → presentar
    `dd/mm/aaaa`
  - Orden: `Empresa, FechaEmision ASC, MovID ASC`
- ⚠️ `CantidadCancelada`/`CantidadPendiente` provienen de la fuente de Daniel
  (CompraD): si el `select` falla, confirmar el campo real con
  `read_records(CompraD, first:1)`.

### Regla de volumen (>20 filas)

Si el resultado supera ~20 filas: mostrar los **totales** y **ofrecer filtro**
(por artículo/familia/proveedor) antes de volcar la tabla completa.

## Formatos de pantalla (obligatorios)

| Tab | Columnas |
|---|---|
| **MP 12S por familia** | `Familia · Inventario Inicial · DOH` + por cada semana N: `Arribos {N} · Consumo {N} · Inventario Final {N}` (12 semanas) |
| **Insumos 12S por artículo** | `Articulo · Descripción · Inventario Inicial · DOH` + por cada semana N: `Arribos {N} · Consumo {N} · Inventario Final {N}` (12 semanas) |
| **Embarques MP/BBC** | 9 renglones × `S1..S12`: `Inventario Inicial · Forecast · Mercancia en Tránsito · Solicitud de generación de embarque sugerido · Arribos proyectados no confirmados · Inventario final · Semanas de cobertura · Lead time (semanas)` |
| **Arribos Pendientes** | `Articulo · Familia · Descripción · Empresa · Orden de Compra · Rama · Fecha de Emisión · Fecha de Entrega · Proveedor · ProvNombre · Cantidad · Cantidad Pendiente · Contenedor · Aduana Entrada · Tipo de Envío · Tipo de Contenedor · BL` (+ columnas `S1..S12` de lo que arriba por semana) |

Regla: reproducir EXACTAMENTE estas columnas/encabezados (del portal MRP, ruta
`/arribos`). **Prohibido inventar columnas** ni consolidaciones que el portal
no muestre; las semanas fuera de la ventana van en blanco.

## Limitaciones

- No hay tool dedicado para "cobertura" — hay que combinar `ForecastArtFam12`
  + `ArtFamFC` + `Arribos12`/`FCArribos` a mano (ver Patrón 2). Patrones 1-3
  validados contra el MCP (entidades y campos confirmados).
- **Arribos VACA** (`spFCArribosVacaPendientes`, integración BBC) usa
  las mismas tablas base pero con filtros de línea de negocio VACA/PDB — el
  detalle exacto de esos filtros no se verificó línea por línea; si el usuario
  pregunta específicamente por "arribos VACA", cruza con
  [mrp-vaca.md](`mrp-vaca`)
  y declara la limitación si el resultado no cuadra.
- **Ambigüedad "arribos"**: si la pregunta no distingue entre arribo
  proyectado (este skill) y recepción de compra transaccional real
  (`Compra`/`CompraD`, del sistema), preferir este skill solo si se menciona
  "forecast", "proyectado", "12 semanas" o "cobertura" explícitamente (mismo
  criterio que el skill `mrp` general).
