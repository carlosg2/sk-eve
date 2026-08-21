---
tenant: icf
description: >
  Use when el usuario pregunta si hay suficientes materiales/insumos para
  producir (validación de insumos), qué porcentaje de alcance/cobertura tiene
  un material para producción, o capacidad de producción por artículo/centro.
  Corresponde a la ruta "Validación de Insumos" (`/produccion`) del portal.
---

# Skill: MRP — Validación de Insumos (produccion)

> **Este skill es SOLO procedural.** Schema: [mrp-explosion.md](`mrp-explosion`)
> (`ExplocionMatCF`), [mrp-plan-produccion.md](`mrp-plan-produccion`)
> (`ResumenPlaneacionCF`, `ForecastPlanSemanal`),
> [mrp-forecast-arribos.md](`mrp-forecast-arribos`) (`UV_QV_FILLRATE`) y el
> kernel (`ArtMaterial`, `ArtDisponible`, `Prod`/`ProdD`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`web_art_material_req_prorrateo`** (requerimiento de materiales prorrateado), **`web_art_explosion_material`** (explosión), **`web_art_explosion_mat_faltante`** (explosión de faltantes).
`Usuario` fijo: **`"MASERP"`**.

## Elegir UN solo SP 

⚠️ **NO llamar varios SPs de esta ruta en el mismo turno.** Cada pantalla
corresponde a UN SP; llamar todos (ej. `web_art_material_req_prorrateo` +
`web_art_explosion_material` + `web_art_explosion_mat_faltante` +
`web_cobertura_materia_prima` + `faltante_insumos` + `faltante_materia_prima`)
sobre-explora y la respuesta puede quedar incompleta. Regla:

| Petición del usuario | Usar SOLO |
|---|---|
| Validación de insumos / explosión de materiales del plan | `web_art_explosion_material` (`Usuario, Ejercicio, Periodo`) → regresa `ExplocionMatCF` completa con cobertura |
| Requerimiento de material prorrateado (padres que comparten material) | `web_art_material_req_prorrateo` (`Empresa='INCF', Usuario, Ejercicio, Periodo`) |
| Explosión de faltantes (nivel del árbol) | `web_art_explosion_mat_faltante` (`Empresa='INCF', Usuario, Nivel`) |
| Faltantes MP / insumos ya calculados | tools dedicados `faltante_materia_prima` / `faltante_insumos` (no los SPs de explosión) |

Si el SP elegido ya trae la cobertura (`Cubre`, `PorAlcance`, `AlcanceDias`),
no recalcular a mano; presentar el grid del portal.

⚠️ **Fallo del SP → respaldo (error interno, no del llamador):** si el SP falla
con `The conversion of a varchar data type to a datetime data type resulted in
an out-of-range value`, es un **error interno del SP/snapshot** (estos SPs NO
reciben fechas: `web_art_explosion_material` solo `Usuario/Ejercicio/Periodo`;
ver kernel `sp-reportes-mrp`). NO reintentes ni cambies formatos de fecha:
declara la limitación y usa como respaldo `read_records(ExplocionMatCF, ...)`
(select de las columnas de cobertura) — mismo patrón aplica a
`web_art_material_req_prorrateo`.

## Origen (portal MRP, ruta `/produccion`, SP `SpProduccionCF`)

`SpProduccionCF` es un **orquestador**: primero corre
`spWebArtMaterialReqProrrateo` (prorratea el requerimiento de material entre
artículos padre que comparten el mismo material) y `spWebExplocionCapacidad`
(cruza la explosión contra la capacidad real de los centros), y después
**regresa `ExplocionMatCF` completa** con todas las columnas de cobertura:

- `Total`/`Producir`/`Forecast` — demanda planeada.
- `InvH`/`InvRequerido`/`InvFinal` — inventario disponible, requerido y
  proyectado final tras el consumo.
- `Cubre` (bandera sí/no), `PorAlcance` (= `MIN(InvH / InvRequerido * 100,
  100)`), `AlcanceDias` — qué tanto alcanza el inventario actual para cubrir
  el requerimiento.
- `CapacidadProduccion` — capacidad real del centro que produce ese artículo.
- `Nivel` (1 = producto padre, 2 = material directo del BOM, 3 = sub-material)
  y `Bandera` (marca renglones "resumen"/no hoja del árbol de explosión).

La ruta también carga `spWebDesgloseForecast` (ver skill `mrp-forecast`) para
mostrar en qué `CtTrabajo` se produce cada artículo padre.

## Regla TARIMA — cadena neta del requerimiento (M1)

**LA regla más importante del motor MRP de Daniel.** El requerimiento REAL de
material (`InvRequerido`) NUNCA es el forecast bruto: es la **cadena neta por
padre**, y solo los padres del usuario generan demanda de material:

```
totalPadre = max(cVenta − VentaReal − Disponible − Produciendo + Stock, 0)
InvRequerido(material) = totalPadre × Cantidad(BOM)
```

- **NUNCA** `SUM(S32 × Cantidad)` ni `Producir × Cantidad` como requerimiento:
  el forecast bruto infla el faltante (regla TARIMA). La demanda de material
  nace del **padre neto** (`totalPadre`), no de la semana del forecast.
- `ExplocionMatCF` ya materializa esta cadena (columnas `Total`/`InvRequerido`).
  Si el snapshot del usuario existe, úsalo (Patrones 1–2). Los patrones de esta
  sección sirven para **reconstruir** la cadena desde los datos fuente cuando el
  snapshot está vacío o para explicar el origen del número.

**Componentes (todo contra el MCP, OData/aggregate — NO SQL):**

1. **Padres del usuario + forecast (`cVenta`):** una fila por artículo en
   `ResumenPlaneacionCF` del usuario (`Venta` = forecast, `Factorstock`):
```
read_records(ResumenPlaneacionCF, filter: "Usuario eq 'MASERP'",
  select: "Articulo,Descripcion,CtTrabajo,Venta,Factorstock,Stock,Producir")
```
2. **`Stock`** (inventario de seguridad) = `cVenta × Factorstock / 100`
   (`Factorstock` en `ResumenPlaneacionCF`; si viene `null`, probar en `Art`).
3. **`VentaReal`** — venta real neta de `UV_QV_FILLRATE`:
   `sum(CANTIDAD_EMBARCADA) − sum(RECHAZO)`. ⚠️ Filtrar por `MES_FISCAL`/
   `SEMANA_FACTURA` (int) — **NUNCA por `FECHA_REMISION`** (varchar dd/mm/yyyy
   → comparación lexicográfica). Patrón existente en skill `mrp-forecast`
   (Patrón 3):
```
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "CANTIDAD_EMBARCADA",
  filter: "NO_ARTICULO eq '<ART>' and MES_FISCAL eq <M>")
aggregate_records(UV_QV_FILLRATE, function: "sum", field: "RECHAZO",
  filter: "NO_ARTICULO eq '<ART>' and MES_FISCAL eq <M>")
```
4. **`Disponible`** — suma de existencias del artículo en **almacenes de
   materia prima** (patrón de la política de operaciones ICF: `CRIBA1MP`,
   `CRIBA2FUM`, `JAMAICA`, `PROCESADOS`, …):
```
aggregate_records(ArtDisponible, function: "sum", field: "Disponible",
  filter: "Articulo eq '<ART>' and (Almacen eq 'CRIBA1MP' or Almacen eq 'CRIBA2FUM'
    or Almacen eq 'JAMAICA' or Almacen eq 'PROCESADOS')")
```
   (con detalle por almacén: `read_records(ArtDisponibleDesc, ...)` — kernel
   `artdisponible.md`.)
5. **`Produciendo`** — órdenes de producción reales del rango de la semana:
   `sum(ProdD.Cantidad)` de encabezados `Prod` `Estatus eq 'CONCLUIDO'` con
   `FechaEmision` dentro de la semana (rango `FechaD`/`FechaA` de
   `CalendarioFC`/`DIM_TIEMPO_SEMANA` del usuario). Sin join en MCP → dos pasos
   (IDs de `Prod` + agregado por `ID` en `ProdD`). ⚠️ Schema de `Prod`/`ProdD`
   no verificado en vivo — si el `select` falla, descubrir con
   `read_records(Prod, first: 1)` sin `select` (kernel `prod.md`).

## Semáforos de cobertura (M3/M7)

Umbrales del motor MRP (los que pinta el portal en la columna "Cobertura",
sobre `PorAlcance`). `requerido` = `InvRequerido` del material; `InvH` =
inventario disponible del material:

```
PorAlcance  = min(round(InvH / requerido * 100), 100)   # %, acotado a 100
AlcanceDias = round(InvH / requerido * 26)              # días de cobertura (26 días hábiles/mes)
```

| Semáforo | PorAlcance |
|---|---|
| 🟢 verde | ≥ 100 |
| 🟡 amarillo | 50 – 99 |
| 🔴 rojo | < 50 |

- Si `requerido = 0` no hay demanda neta → `PorAlcance = 100` (verde).

## M7 — Validación de Insumos (padres + BOM)

La pantalla de Validación de Insumos cruza los **padres del usuario** contra su
**BOM** (`ArtMaterial`) y aplica la cadena neta a cada hijo. Reglas del motor:

- **Padre SOLO si está en `ResumenPlaneacionCF` del usuario** — no inventar
  filas ni tomar padres de otros usuarios.
- **BOM FUENTE = `ArtMaterial`** (nunca `ExplocionMatCF` como dato estable:
  snapshot scratch por usuario, solo referencia). Se filtra por el padre y el
  resultado viene en `result.value[]` (kernel `artmaterial.md`):
```
read_records(ArtMaterial, filter: "Articulo eq '<PADRE>'", first: 50)
```

**Cálculo por hijo (cadena neta del material):**
```
requerido   = round(totalPadre × rendimiento)          # rendimiento = ArtMaterial.Cantidad
invFinal    = round(InvH − requerido)
Cubre       = invFinal >= 0 ? 'CUBRE' : 'NO CUBRE'
SeProduce   = bandera booleana (true/false)            # OData: eq true / eq false (nunca eq 0)
porAlcance  = requerido > 0 ? min(round(InvH / requerido * 100), 100) : 0
alcanceDias = round(InvH / requerido * 26)             # si requerido > 0
```
- `totalPadre` = cadena neta del padre (sección TARIMA). **NUNCA**
  `Producir × rendimiento` para el requerido del hijo.
- `InvH` = disponible del material (misma suma `ArtDisponible` en almacenes MP
  del M1; el legacy de Daniel usa `ARTDISPONIBLEVACA`, NO publicada en el MCP —
  usar `ArtDisponible`/`ArtDisponibleDesc`).

**Fila padre (adicionales):**
```
stock   = round(cVenta × Factorstock / 100)
doh     = cVenta > 0 ? round(Disponible / cVenta × DiasHabilies) : 0
planear = totalPadre
```
`DiasHabilies` del centro: campo presente en `CentroFCTemp`
(`Usuario eq 'MASERP'`); también en `CentroFC`.

## Patrón 1 — Cobertura de materiales para producir (nivel 2 = material directo)

```
read_records(ExplocionMatCF,
  filter: "Usuario eq 'MASERP' and Nivel eq 2",
  select: "Articulo,ArticuloHijo,DescripcionH,InvRequerido,InvH,InvFinal,Cubre,PorAlcance,AlcanceDias,CapacidadProduccion")
```

Usa `Nivel eq 1` si el usuario pregunta por el producto padre (agregado), o
`Nivel eq 3` para sub-materiales (segundo nivel de BOM).

## Patrón 2 — ¿Cuánto alcanza un material específico?

```
read_records(ExplocionMatCF, filter: "Usuario eq 'MASERP' and ArticuloHijo eq '<Material>'",
  select: "Articulo,ArticuloHijo,PorAlcance,AlcanceDias,Cubre")
```

`Cubre` puede venir `null` (no solo `false`/`true` — ):
considerar el material **no cubierto** si `Cubre` no es `true` O
`PorAlcance < 100` → riesgo de producción, no solo "faltante de compra" (eso
es el skill `gap-abasto`/`mrp-faltantes`).

## Patrón 3 — Detalle de lote/almacén asignado (FIFO) contra el plan autorizado

La asignación PEPS/FIFO de lotes (`SerieLote`) contra el plan autorizado
materializa en `UtMrpPrevioMateriaPrima`, que **NO existe en el MCP ICF** (es
staging de la base MSSQL `MRPCF5000` del portal legacy; EntityNotFound). Si el
usuario pregunta por lote específico asignado, declara la limitación y ofrece
`ArtDisponibleDesc` (existencias por artículo/almacén) — ver skill
`mrp-inventario`.

## Limitaciones

- **BOM FUENTE = `ArtMaterial`** — `ExplocionMatCF` es solo referencia
  (snapshot scratch por usuario): nunca construir requerimientos estables desde
  ella. Si regresa vacío, la corrida de `MASERP` no existe en ese snapshot;
  declarar "dato no disponible" (no hay bitácora `UtLogEjcProMrp` en el MCP de
  ICF). Proxy: `aggregate_records(ExplocionMatCF, function: "count", field:
  "*")` o `CalendarioFC`.
- `PorAlcance`/`AlcanceDias` ya vienen calculados en `ExplocionMatCF` — cuando
  el snapshot existe, úsalos tal cual (no recalcules). Las fórmulas de la
  sección "Semáforos de cobertura" definen su semántica y sirven para
  reconstruirlos cuando el snapshot está vacío o en la validación M7. Si
  necesitas más columnas, descubre el schema real con
  `read_records(ExplocionMatCF, first: 1)` sin `select`.
