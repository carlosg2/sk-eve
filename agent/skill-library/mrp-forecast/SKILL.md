---
tenant: icf
description: >
  Use when el usuario pregunta por el desglose semanal de forecast/plan de
  producción (S1-S54, P1-P54) por artículo, cliente, centro de trabajo,
  concepto o programa, o por la **venta real embarcada** de un
  artículo/periodo (UV_QV_FILLRATE). Corresponde a la ruta "Desglose de
  Forecast" del portal MRP.
entities: [ResumenPlaneacionCF, ArtFamFC, ForecastHist, UV_QV_FILLRATE, CalendarioFC]
twin_concepts: [mrp/mrp-sesion-periodo]
related_skills: [mrp-sesion, mrp-produccion, mrp-indicadores, mrp-cf]
---

# Skill: MRP — Desglose de Forecast (grid maestro de planeación)

> **Este skill es SOLO procedural.** Schema: [mrp-plan-produccion.md](`mrp-plan-produccion`)
> y [mrp-explosion.md](`mrp-explosion`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`web_desglose_forecast`** (SP del portal: grid EXACTO del Desglose de Forecast; parámetro `Usuario`).
`Usuario` fijo: **`"MASERP"`**.

## Periodo vigente (regla determinista)

Si el usuario no menciona ejercicio/periodo, usa el **VIGENTE** derivado de la
fecha actual (año y mes actuales — hoy 2026/8). **NUNCA pruebes variantes** de
periodo (ni 7, ni 12, ni ejercicios anteriores "por si acaso") — eso multiplica
las consultas. Si el usuario pide un periodo específico, usa ESE y solo ese. Las
semanas del periodo salen del calendario (`DIM_TIEMPO_SEMANA`/`CalendarioFC`).

## Origen (portal legacy sigma-icf, ruta `/forecast`, SP `spWebDesgloseForecast`)

Es el **grid maestro** de la planeación: cada renglón de `ResumenPlaneacionCF`
representa un artículo/cliente/centro con una fila de venta pronosticada
(`S1..S54`, una por semana del año) y una fila espejo de plan de producción
(`P1..P54`), más columnas de contexto (`Concepto`, `Cliente`/`NombreCte`,
`Programa`, `CtTrabajo`/centro de trabajo, `FamiliaCF`/`VariedadCF`,
`Gramaje`) y totales de
inventario (`Stock`, `InvEmp`, `InvGra`, `TotalInv`). Este grid es la fuente
de la que se derivan tanto `mrp-produccion` (validación de insumos, vía
`ExplocionMatCF`) como `mrp-indicadores` (cumplimiento).

La ruta `produccion` (Validación de Insumos) en el portal **carga este mismo
SP** (`spWebDesgloseForecast`, solo con `Usuario`) junto con `SpProduccionCF`,
y cruza `Articulo` con `CtTrabajo` para saber en qué centro se produce cada
artículo del BOM — si el usuario pregunta "¿en qué centro se hace el
artículo X?", este es el patrón.

## Lectura en paralelo (read_parallel)

Los pasos de contexto y de lectura independientes del desglose van agrupados en
**UNA** tool call `read_parallel` (el modelo no emite varias tool calls por
step). Operaciones de solo lectura con los mismos args que la llamada directa;
nombres SIN prefijo `intelisis-dab__`.

Antes de desglosar, ejecuta en un solo `read_parallel`:

1. **Grid maestro** — `read_records(ResumenPlaneacionCF, ...)` (Patrón 1).
2. **Calendario/semana** — `read_records(CalendarioFC, ...)` (o
   `DIM_TIEMPO_SEMANA`) para saber qué `Sn`/`Pn` corresponde a la
   semana/periodo activo.
3. **Histórico/versiones** — `read_records(ForecastHist, ...)` si la pregunta
   menciona corridas o versiones (Patrón 4).
4. **Vista web_** — `web_desglose_forecast({ Usuario: "MASERP" })` cuando el
   usuario pide el grid EXACTO del portal.

Ejemplo (desglose del periodo, ventana S32–S35):

```json
read_parallel({ operations: [
  { "tool": "read_records", "args": { "entity": "ResumenPlaneacionCF",
      "filter": "Usuario eq 'MASERP'",
      "select": "CtTrabajo,Articulo,Concepto,Cliente,Programa,FamiliaCF,VariedadCF,Producir,Kg,Stock,InvEmp,InvGra,TotalInv" } },
  { "tool": "read_records", "args": { "entity": "CalendarioFC",
      "filter": "Ano eq 2026 and Semana ge 32 and Semana le 35",
      "select": "Ano,Semana,FechaD,FechaA" } },
  { "tool": "read_records", "args": { "entity": "ForecastHist",
      "filter": "Ejercicio eq 2026 and Usuario eq 'MASERP'",
      "select": "ID,Ejercicio,Periodo,FechaEmision,UltimoCambio,Usuario,MovID" } },
  { "tool": "web_desglose_forecast", "args": { "Usuario": "MASERP" } }
]})
```

Si una operación falla, `read_parallel` reporta `{ ok: false }` para esa
operación con `hasErrors: true` sin tumbar las demás — declara "dato no
disponible" solo para la fuente que falló.

## Patrón 1 — Grid completo por artículo/centro

```
read_records(ResumenPlaneacionCF,
  filter: "Usuario eq 'MASERP'",
  select: "CtTrabajo,Articulo,Concepto,Cliente,Programa,FamiliaCF,VariedadCF,Producir,Kg,Stock,InvEmp,InvGra,TotalInv")
```

Si se necesita el desglose semanal completo (`S1..S54`/`P1..P54`), agrégalo al
`select` solo para el rango de semanas que interesa (evita traer las 54 si el
usuario solo pregunta por "esta semana" o "el próximo mes" — usa
`CalendarioFC` para saber qué `Sn`/`Pn` corresponde a la semana actual).

## Patrón 2 — Centro de trabajo de un artículo específico

```
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'MASERP' and Articulo eq 'A2502'",
  select: "Articulo,CtTrabajo")
```

## Escritura (el agente NO la ejecuta)

El portal permite **capturar/actualizar** el plan (`P1..P54`) vía
`spWebDesgloseForecastActualizar` (bulk update por OPENJSON). El agente
**solo lee** este grid — si el usuario pide modificar el plan, indícale que
debe hacerlo desde el portal MRP, no lo intentes vía `update_record`.

## Patrón 3 — Venta real por artículo/periodo (UV_QV_FILLRATE)

Cuando la pregunta cruza el forecast/plan con **venta real embarcada** (ej.
"¿cuánto se vendió real de X en el mes?"), usar `UV_QV_FILLRATE`
([mrp-forecast-arribas](`mrp-forecast-arribas`) — venta real).

```
# Venta real bruta embarcada del artículo en el MES_FISCAL 8
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "CANTIDAD_EMBARCADA",
  filter: "NO_ARTICULO eq '<A>' and MES_FISCAL eq <M>")
# Rechazos del mismo artículo/mes
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "RECHAZO",
  filter: "NO_ARTICULO eq '<A>' and MES_FISCAL eq <M>")
```

Venta real neta = `sum(CANTIDAD_EMBARCADA) − sum(RECHAZO)`.

⚠️ **NUNCA filtrar por `FECHA_REMISION`** (varchar dd/mm/yyyy → el filtro OData
`ge` es lexicográfico e incorrecto). Filtrar por `MES_FISCAL`/`SEMANA_FACTURA`
(int) — . Los campos de la vista son UPPERCASE.

## Patrón 4 — Histórico / versiones del forecast (F3)

El portal guarda una cabecera por corrida/versión del forecast. Existe
`ForecastHist` en el MCP ICF . Para listar
versiones históricas:

```
read_records(ForecastHist,
  filter: "Ejercicio eq 2026 and Usuario eq 'MASERP'",
  select: "ID,Ejercicio,Periodo,FechaEmision,UltimoCambio,Usuario,MovID")
```

Para el detalle de una versión se usa el grid maestro con el mismo
`Ejercicio/Periodo/Usuario` (ver Patrón 1). No hay bitácora de corridas en el
MCP — si el usuario pide "qué versión se corrió", listar `ForecastHist`.

## Patrón 5 — Inventario Semanal (F2, 13 columnas)

El portal deriva el Inventario Semanal de un artículo cruzando tres fuentes
(entidades verificadas):

1. **Inventario Inicial** = saldo al inicio de la semana: `AuxiliarU`
   (`sum(CargoU) − sum(AbonoU)` con `Rama eq 'INV' and Empresa eq 'INCF' and
   Cuenta eq '<Articulo>'`) — ver skill `mrp-inventario` Patrón 3.
2. **Ventas Semana** = `UV_QV_FILLRATE` sumando `CANTIDAD_EMBARCADA − RECHAZO`
   por `SEMANA_FACTURA` — ver Patrón 3 de este skill.
3. **Producción Semana** = `ProdD` (`sum(Cantidad)` filtrando por el rango de
   fechas de la semana con `DIM_TIEMPO_SEMANA`/`CalendarioFC`) — ver skill
   `mrp-indicadores` Patrón 1.

Inventario Final = Inventario Inicial − Ventas + Producción.
DOH = `InventarioFinal / VentasSemana` (si Ventas = 0, DOH en blanco — no
dividir entre cero); DOH Inicial = `InventarioInicial / VentasSemana`.

## Formato de respuesta (estructura del portal — OBLIGATORIO)

Al entregar el Desglose de Forecast (o cualquier grid del módulo FC), seguir la
estructura del portal :

1. **Cabecera de sesión**: `**Sesión:** <Usuario> · <Ejercicio> · Periodo <N>
   (<Mes>) · Ventana S<A>–S<B>` + `**Artículos:** <nº de filas del grid>`.
2. **Totales por columna**: tabla `| Columna | S | P |` con la suma de cada
   semana de la ventana, más filas finales `Total Inventario` y
   `Stock 15 Días`. Los totales se calculan con `aggregate_records` (una
   `sum` por columna, máximo 5-6 llamadas) — **NUNCA sumando a mano en el
   texto** (aritmética LLM no fiable; los agregados van server-side).
3. **Muestra**: si el grid supera ~20 filas, mostrar los **10 de mayor programa
   de la primera semana de la ventana** (`read_records` con
   `orderby: ["S<A> desc"]`, `first: 10`) con columnas resumidas
   `Artículo · Descripción · S<A> · P<A> · Total Inv. · Stock 15`.
4. **Cierre**: ofrecer `¿Quieres el listado completo o filtrar por artículo
   (ej. "desglose de A6722")?`.
5. **Números redondeados a enteros** (el portal hace `CONVERT(int, ROUND(...))`).

## Formatos de pantalla (obligatorios)

| Pantalla | Columnas |
|---|---|
| **Desglose de Forecast** | `Articulo · Descripcion · S32/P32 · S33/P33 · S34/P34 · S35/P35 · S36/P36 · Total Inventario · Stock 15 Días` — solo se muestran las semanas `[PrimerSemana .. PrimerSemana+4]` (ventana de 5) |
| **Inventario Semanal** | `Semana · Articulo · Descripción · Concepto · Nombre Cliente · Programa · Cantidad · DOH Inicial · Inventario Inicial · Ventas Semana · Producción Semana · Inventario Final · DOH Final` |
| **Histórico (versiones)** | `S1..S54 + P1..P54` visibles `[PrimerSemana .. +4]` + `Programa, Familia, CtTrabajo, Concepto, NombreCte, Venta, TotalInv, Producir, Kg` |

Regla: reproducir EXACTAMENTE estas columnas/encabezados (del portal MRP, ruta
Desglose de Forecast). **Prohibido inventar columnas** ni consolidaciones que
el portal no muestre; las semanas que no aplican se muestran en blanco.

## Ventana y usuario de la corrida 

- La **ventana visible** = la que el usuario pide o la del periodo activo de la
  sesión; si la ventana pedida viene en cero, mostrar la última ventana con
  datos del snapshot y declararlo (no inventar ceros).
- El **usuario fijo del módulo FC es `MASERP`** (mismo criterio que el motor
  de referencia: corrida `MASERP · Ejercicio · Periodo · S<n>..S<n+4>`).
- ✅ **Corrida `MASERP` cargada en el MCP **: el snapshot remoto del
  Periodo 8 tiene el plan poblado (90 artículos; ventana **S32–S35**; S36 sin
  datos → reportar "sin datos", no cero). Si un periodo futuro no tiene plan
  (semanas en `null`), declarar "pendiente de re-corrida" y NO inventar.
  Totales de referencia en el Twin: `mrp-plan-produccion` (concepto
  `query_company_twin`).
- Fuente del agente: siempre el **MCP** (misma corrida `MASERP · Periodo 8 ·
  S32–S36`).

## Limitaciones

- `ResumenPlaneacionCF` es scratch por usuario — si regresa vacío, la corrida
del usuario `MASERP` no existe en ese snapshot; declarar "dato no disponible"
(no hay bitácora `UtLogEjcProMrp` en el MCP de ICF para verificarla).
- 54 columnas semanales por fila es costoso — siempre acota `select` a las
semanas relevantes.
