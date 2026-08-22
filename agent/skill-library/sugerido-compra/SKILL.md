---
tenant: marmoles
description: >
  Use when el usuario pide sugerido de compra, planeación de compras, MRP,
  requerimiento neto, punto de reorden, spPlanArt, orden de compra sugerida,
  proveedor por historial de compras, o filtrar por categoria, familia, grupo,
  linea, articulo o descripcion de articulo en el ERP de la empresa Marmoles.
---

# Skill: Sugerido de compra (MRP — Mármoles)

> **Este skill es SOLO procedural.** Schema: conceptos del Company Twin con
> `query_company_twin({ query })` — `empresa`, `empresacfg2`, `art`, `artalm`,
> `artdisponible`, `alm`, `prov`, `planartop`, `planeacion-mrp`, `compra`,
> `comprad`, `venta`, `ventad`, `prod`, `inv`, `movtipo`.

Conexión MCP: **`intelisis-dab`** (empresa `marmoles`, remota). Tools: `read_records`,
`aggregate_records`, `buscar_registro`; `create_record` SOLO en la Fase 2 (OC, requiere
HITL); tool dedicado **`planeacion_mrp`** (SP `spPlanArt`) únicamente para
validar/reconciliar.

Este skill **no ejecuta `spPlanArt` por defecto**: calcula el sugerido con tablas base y
reglas de negocio explícitas (solo lectura). `planeacion_mrp` se usa solo para
**validar/reconciliar** cuando el usuario lo pide o el resultado manual parece dudoso — su
resultado **siempre prevalece**.

## Reglas de oro

1. **Empresa obligatoria.** Antes de cualquier cálculo, resuelve y confirma la empresa: si
   el usuario ya dio una válida en este turno, úsala; si no, `read_records(Empresa,
   filter="Estatus eq 'ALTA'", select="Empresa,Nombre")` y muestra el resultado como
   **lista numerada** (incluso si solo hay una). **No continúes** el cálculo sin
   confirmación.
2. **Consolidado por almacén (por defecto).** NUNCA agrupes ni calcules por separado por
   `Almacen`: suma demanda, existencia y suministro de TODOS los almacenes de la empresa
   en una sola cifra por `Articulo`. Filtra por `Almacen` solo si el usuario lo pide
   explícito; el desglose por almacén es opcional y nunca el formato por defecto.
   `SubCuenta` es un filtro independiente (no afecta la consolidación).
3. **`planeacion_mrp` no es fallback de errores.** Si una consulta manual falla con
   `BadRequest` (campo/entidad inválido), corrige la consulta (campo/entidad correcto) y
   reintenta; NO escales a `execute_entity`/`planeacion_mrp` como atajo — ejecutar el
   store real requiere aprobación humana (HITL) y no es un fallback automático de sintaxis.

## Parámetros de entrada

| Parámetro | Requerido | Default si falta |
|---|---|---|
| `Empresa` | Sí (confirmada por el usuario) | — no hay default, ver regla de oro 1 |
| Al menos 1 filtro de artículo* | Sí, salvo modo general | — |
| `TipoPeriodo` (`DIA`\|`SEMANA`\|`MES`) | No | `EmpresaCfg2.PlanTipoPeriodo` (ver `empresacfg2`), si vacío `SEMANA` |
| `Horizonte` (periodos) | No | `EmpresaCfg2.ProdPeriodosCorrida`, si vacío `10` |
| `Almacen` | No | consolidado (regla de oro 2): todos los almacenes sumados en una sola cifra por artículo |
| `SubCuenta` | No | — |
| Filtros extra: `Fabricante`, `Temporada`, `Proveedor` | No | — |

\* Filtros de artículo válidos: `Categoria`, `Familia`, `Grupo`, `Linea`, `Articulo`
(exacto), `DescripcionArticulo` (texto libre).

**Prioridad de filtros:** `Articulo` exacto > combinación del resto por intersección
(AND); si no llega ningún filtro y no es modo general, pedir al menos un criterio.

**Modo general** (solo si el usuario lo pide explícitamente: "sugerido general", "de toda
la empresa"): universo completo de artículos activos, sin exigir criterio. Mostrar solo
renglones con sugerido > 0; si es demasiado grande, resumir por artículo (consolidado).

**Búsqueda por texto libre** (`DescripcionArticulo` / nombre parcial):
- Buscar coincidencia en `Art.Articulo` (clave) y `Art.Descripcion1`/`Descripcion2`.
- Clave exacta → prioridad, continuar directo.
- Sin clave exacta → `buscar_registro(entidad:"Art", campo:"Descripcion1", termino:"<texto>")`
  para candidatos parciales (nunca paginar `read_records` para esto).
- 1 sola coincidencia → continuar directo con el sugerido.
- Varias coincidencias → lista numerada (`Articulo`, `Descripcion1`, `Categoria`,
  `Familia`, `Linea`) y **esperar selección del usuario** (puede elegir varias). Sin
  selección → no calcular.

## Lógica de cálculo (por Artículo, consolidado en todos los almacenes)

> Consolidación = regla de oro 2. Sin `Almacen` explícito (caso normal): no filtres por
> `Almacen` en ninguna consulta de demanda/existencia/suministro. Con `Almacen` explícito:
> filtra todas las consultas a ese almacén únicamente (un solo resultado, scoped). Desglose
> por almacén: solo si se pide explícitamente (una fila por `Articulo + Almacen`), nunca por
> defecto. `SubCuenta` es un filtro independiente (no afecta la consolidación).

### 1) Universo de artículos

`Art` con `Estatus NOT IN ('BAJA','DESCONTINUADO')`, excluyendo tipo `JUEGO` y artículos de
activo fijo, más los filtros de la sección anterior.

### 2) Config de planeación — concepto `artalm`

`read_records(ArtAlm, filter="Articulo eq '<ART>' and Empresa eq '<EMP>'",
select="Articulo,SubCuenta,Almacen,Minimo,LoteOrdenar,CantidadOrdenar,MultiplosOrdenar")`
(sin filtrar por `Almacen`). Si hay varios renglones (uno por almacén): suma `Minimo` (ver
sección 5) y, para la política de lote, usa el valor común si todos coinciden o el más
conservador (mayor `CantidadOrdenar`/`MultiplosOrdenar`) si difieren, para no subestimar
el sugerido. Si el artículo **no tiene** ningún renglón en `ArtAlm`, **no lo excluyas**: continúa con defaults `Minimo=0, LoteOrdenar='LOTE POR LOTE', CantidadOrdenar=1,
MultiplosOrdenar=1`.

### 3) Demanda por periodo (DA / DT)

Señales de salida: `PV` (pedidos venta pendientes), `PVE` (extraordinarios), `SOL`
(solicitudes de inventario), `OT`/`OI` (transferencias/traspasos salida), `RB` (requerimiento
bruto por explosión, solo si se habilita fase MRP), `IS` (inventario de seguridad como
demanda, si aplica config).

- `DA` (Demanda Actual) = suma de señales de salida aplicables por periodo.
- `DT` (Demanda Total) = `DA` en zona congelada; fuera de zona congelada, `MAX(DA, PRV)`.

**`PV` (MANDATORIO — no es opcional ni "si existe"):** concepto `ventad`, SIEMPRE con
**`CantidadPendiente`** (nunca `Cantidad` — eso es lo solicitado original, no lo pendiente
por surtir). `VentaD` no tiene `Empresa` → el join a `Venta` es **obligatorio siempre**
(no una "variante estricta" opcional) para no mezclar demanda de otra empresa:

```
PASO 1: read_records(Venta, filter="Estatus eq 'PENDIENTE' and Empresa eq '<EMP>'", select="ID")
PASO 2: read_records(VentaD, filter="Articulo eq '<ART>' and CantidadPendiente gt 0 and (ID eq <id1> or ID eq <id2> ...)",
                     select="ID,Articulo,Almacen,CantidadPendiente,FechaRequerida")
PV = suma de CantidadPendiente de TODOS los renglones devueltos (todos los almacenes juntos).
```

Solo con `Almacen` explícito: filtrar `VentaD` además con `Almacen eq '<ALM>'`.
`PV_periodo` = suma de `CantidadPendiente` (de todos los almacenes) de los renglones cuyo
`FechaRequerida` cae en ese periodo (bucket, sección 8); para el total del horizonte
(formato compacto A), sumar todos los renglones sin filtrar por fecha.

**`PVE`, `SOL`, `OT`, `OI` = 0** (sin señal confiable: `PVE` requeriría un campo
`Extra`/equivalente en `Venta` no confirmado; `SOL`/`OT`/`OI` requerirían `InvD` —
detalle de traspasos por artículo — que **no** está publicado; solo existe `Inv`, encabezado
sin `Articulo`/`Cantidad`). Si el usuario pregunta por traspasos/solicitudes, declara la
limitación en vez de inventar un cálculo.

**`RB`** = fuera de alcance de este skill (requiere explosión de materiales/BOM).

### 4) Suministro por periodo (RP)

Señales de entrada: `OC` (compras pendientes), `OP` (producción pendiente), `ROT`/`ROI`
(transferencias/traspasos entrada), `RTI` (en tránsito), `ROPF`/`REPF` (órdenes/distribución
firmes).

`RP` = suma de `OC + OP + ROT + ROI + RTI` por periodo (+ firmes si se pide consolidado
completo). Consolidado por defecto (regla de oro 2): suma cada señal de TODOS los almacenes
antes de calcular `RP`.

**`OC`:** concepto `comprad` — `CompraD` tampoco tiene `Empresa`, mismo patrón de join
obligatorio que `PV`:

```
PASO 1: read_records(Compra, filter="Estatus eq 'PENDIENTE' and Empresa eq '<EMP>'", select="ID")
PASO 2: read_records(CompraD, filter="Articulo eq '<ART>' and (ID eq <id1> or ID eq <id2> ...)",
                     select="ID,Articulo,Almacen,Cantidad,FechaRequerida")
OC = suma de Cantidad de TODOS los renglones devueltos (todos los almacenes juntos).
```

**`OP`:** conceptos `prod`/`prodd`. Antes de consultar, verifica `Art.SeProduce`: si es
`0`/falso, `OP = 0` directo sin llamar a `Prod`/`ProdD`. En esta empresa no hay registros
en esas tablas (giro: compra/vende, no produce) → `OP = 0` casi siempre.

**`ROT`/`ROI`/`RTI` = 0** (requieren `InvD` — detalle por artículo de traspasos — que
**no** está publicado; solo existe `Inv`, encabezado sin `Articulo`/`Cantidad`). Declarar la
limitación si el usuario pregunta por traspasos en tránsito.

### 5) Existencia proyectada (EP) y requerimiento neto (RN)

Para cada periodo `p = 0..Horizonte`:

```
EP_p = EP_(p-1) + RP_p - DT_p

Si EP_p < 0                    -> RN_p = -EP_p + IS
Si 0 <= EP_p < IS              -> RN_p = IS - EP_p
Si EP_p = 0 y ya inició demanda -> RN_p = IS
```

`E` (existencia inicial, periodo -1) = suma consolidada de `Disponible` en todos los
almacenes (o del almacén pedido):
`aggregate_records(ArtDisponible, sum, Disponible, filter="Articulo eq '<ART>' and Empresa eq '<EMP>'")
(concepto `artdisponible`).
`IS` = suma de `ArtAlm.Minimo` de todos los renglones del artículo en la empresa (o
default `0` si no hay ninguno — sección 2).

### 6) Política de lote → ROP (concepto `artalm`)

```
ROP_base = RN
LOTE POR LOTE                    -> ROP = RN
CANTIDAD FIJA / MINIMA / MULTIPLOS -> ROP = max(RN, CantidadOrdenar)
ROP = CEILING(ROP / MultiplosOrdenar) * MultiplosOrdenar
```

### 7) Comprar vs. producir vs. distribuir

⚠️ `AlmacenROP` **NO existe en `PlanArtOP`** — es un campo de [`Art`](`art`)
(`Art.AlmacenROP`). Nunca lo selecciones sobre `PlanArtOP` (da `BadRequest`). La
comparación `Art.AlmacenROP` vs. `PlanArtOP.Almacen` **solo aplica al reconciliar contra el
store oficial** (`planeacion_mrp`, que calcula por almacén y ahí distingue compra de
distribución). El cálculo manual **consolidado** no distingue compra vs. distribución:
asume que todo el requerimiento neto consolidado requiere **comprar**, salvo que
`Art.SeProduce = 1` (posible producción, fuera de alcance de este skill — excluir).

### 8) Bucketing de periodos

`DIA`: `DATEDIFF(day, FechaBase, FechaEvento)` · `SEMANA`: `DATEDIFF(week, ...)` ·
`MES`: `DATEDIFF(month, ...)`. Fecha < `FechaBase` → periodo `-1`. Conservar solo periodos
`-1..Horizonte`.

## Dataset base (solo lectura — todas publicadas y verificadas)

- Universo: `Art`. Config: `ArtAlm`. Existencia: `ArtDisponible`/`ArtDisponibleDesc`.
- Demanda/suministro transaccional (consolidadas en todos los almacenes, regla de oro 2):
  `Venta`/`VentaD` (PV, **obligatorio**, `CantidadPendiente`), `Compra`/`CompraD` (OC, join
  obligatorio por `Empresa`), `Prod`/`ProdD` (OP, normalmente 0), `Inv` (traspasos, **solo
  encabezado** hasta que se publique `InvD`).
- Órdenes ya planeadas/firmes: `PlanArtOP` (`Estado eq 'LIBERADO' and Accion eq 'COMPRAR'
  and LiberacionID eq null and Cantidad gt 0`).

## Proveedor sugerido (para OC)

Prioridad obligatoria:
1. `Art.Proveedor`, si existe y es válido.
2. Si no, **historial**: último documento de compra del artículo (`CompraD` → `Compra`,
   `Compra.FechaEmision DESC, Compra.ID DESC`), excluyendo proveedores vacíos/no válidos.
3. Si no hay proveedor por ninguna vía: **no generar OC**, reportar bloqueo de proveedor.

## Reglas de eficiencia (obligatorio)

- **NUNCA pagines** `Venta`/`VentaD`/`Compra`/`CompraD`/`ArtDisponibleDesc` con `first` alto
  para "buscar" — usa filtros exactos por `Articulo`/`Empresa`/`Almacen` primero.
- **`select` siempre** con las columnas que vas a usar/mostrar.
- Universo grande (modo general o familia amplia): **acota primero** el universo de
  artículos objetivo antes de traer existencias/compras completas — no traigas todo el
  catálogo y filtres en el modelo.
- 2+ lecturas independientes del mismo flujo → **UNA `read_parallel({ operations: [...] })`**
  con las operaciones EXACTAS (ej. `ArtAlm` + `ArtDisponibleDesc` del mismo artículo).
  Nunca "en paralelo cuando se pueda".
- Joins tabulares grandes: delega el cruce a un **subagente** en vez de sumar a mano en el
  contexto principal (los joins grandes hechos "a ojo" por el modelo producen resultados
  incorrectos).

## Formato de respuesta (obligatorio)

Dos formatos según el tipo de consulta; no mezclarlos. **Reglas de visualización (ambos):**
una fila por `Articulo`, consolidando SIEMPRE todos los almacenes (regla de oro 2) — el
desglose por almacén solo si se pide explícito (fila por `Articulo + Almacen`, y el
`SugeridoTotal` del resumen sigue siendo la suma consolidada). Mostrar **solo** renglones
con `SugeridoCompra > 0`, salvo que el usuario pida "incluye ceros" o "desglose completo".
Sin renglones → exactamente **"Sin sugerido de compra"**. Artículos sin `ArtAlm`
(calculados con defaults) o sin proveedor resoluble → listarlos aparte al final (no
bloquean el resto del resultado).

### A) Artículo específico (`Articulo` exacto, 1 o pocos) — formato compacto

Usar siempre que el usuario pida el sugerido de un artículo puntual (ej. "sugerido del
articulo ADIT-0026", "dame el sugerido de X"):

```
Aquí está el sugerido de compra para <Articulo>, con la cantidad pendiente verificada en la base:

Resumen ejecutivo
Artículo: <Articulo>
Sugerido: <SugeridoTotal>

| Articulo | Descripcion | Demanda | IS | Existencia | Suministro | RN | Sugerido |
|---|---|---:|---:|---:|---:|---:|---:|
| <Articulo> | <Descripcion1> | <DT> | <IS> | <E> | <RP> | <RN> | <ROP> |

Conclusión operativa
Acción sugerida: comprar <SugeridoTotal> unidades para cubrir el requerimiento neto de <Articulo>.
```

Una fila por `Articulo`, agregando todo el horizonte (no desglosa por periodo — la tabla
detalle de la sección B solo si el usuario la pide). Columnas: `Demanda` = `DT` total del
horizonte (consolidado) · `IS` = suma de `ArtAlm.Minimo` de todos los almacenes (o default
0) · `Existencia` = `E` inicial consolidada (periodo -1) · `Suministro` = `RP` total
(recibos/OC pendientes **verificados en la base**, no estimados) · `RN` = requerimiento
neto final consolidado · `Sugerido` = `ROP` (tras política de lote/múltiplo). Si varios
artículos fueron seleccionados de una búsqueda por texto, repite el bloque completo por
cada uno, o consolida la tabla en una sola con una fila por `Articulo` si son muchos.
`Sugerido = 0` consolidado → **"Sin sugerido de compra"**.

### B) Categoria/Familia/Grupo/Linea/modo general (muchos artículos) — 2 fases

**Fase 1 — Análisis (siempre, solo lectura):**

1. Confirmar en 1 línea los parámetros usados: empresa, filtro, `TipoPeriodo`, `Horizonte`.
2. Resumen ejecutivo: total sugerido, número de artículos con sugerido.
3. Tabla resumen (liderando la respuesta):

| Empresa | Familia | Artículo | Descripción | Existencia | CantidadSugeridaTotal | PrimerPeriodoConCompra | ProveedorSugerido |
|---|---|---|---|---:|---:|---|---|

4. Tabla detalle (opcional/secundaria, solo si el usuario la pide o hay pocos renglones):

| Artículo | SubCuenta | Periodo | FechaLiberación | FechaEntrega | DemandaPeriodo | ReciboPeriodo | EP_Antes | RN | ROP | PolíticaLote | Múltiplo | IS |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|

5. Conclusión operativa en una línea.

**Fase 2 — Generación de OC (solo si el usuario la pide explícitamente después de la Fase 1):**

- Requiere aprobación humana (HITL) — es escritura (`create_record`).
- Crear `Compra` con `Estatus = 'CONFIRMAR'` (nunca `PENDIENTE`).
- Crear `CompraD` con los renglones (`Articulo`, `Cantidad`, `Proveedor`, `Almacen`, costos).
- Agrupar por Proveedor + Almacén (una `Compra` por grupo), salvo que la política pida un
  documento por renglón.
- Marcar el origen en `PlanArtOP` si aplica (concepto `planartop` — "Marcar un renglón
  como liberado").
- Validaciones mínimas antes de insertar: `Proveedor` no nulo, `Almacen` no nulo,
  `Cantidad > 0`, `Unidad` válida.

## Estilo de comunicación

- No narres el proceso interno ("voy a consultar…", "ahora calculo…") salvo que el usuario
  lo pida.
- Encabezado corto → resumen ejecutivo → tabla → conclusión; sin mensajes de
  "pensando"/"trabajando" intermedios.
- Prioriza velocidad: flujo directo, consultas acotadas, sin pasos de proceso innecesarios.

## Consistencia con el store oficial

Si el usuario pide validar/reconciliar, o el cálculo manual se ve dudoso (ej. demasiados
artículos con RN negativo grande, o discrepancia evidente), ejecuta
[`planeacion_mrp`](`planeacion-mrp`) (`spPlanArt`) con `Empresa` + el mismo filtro y lee el
resultado vigente de `PlanArtOP`. El resultado del store **siempre prevalece** sobre el
cálculo manual de este skill.

## Limitaciones declaradas

- Esta versión **no** ejecuta explosión de materiales/BOM (`ArtJuego`/`ArtJuegoD` o
  equivalente) ni genera documentos de producción — solo comprar.
- Esta versión **no** reemplaza la liberación de `PlanArtOP`: si se genera la OC
  manualmente, hay que marcar el renglón como liberado a mano (ver Fase 2). El
  sub-procedimiento `xpPlanArtOPLiberar` puede existir como stub sin efecto real — no
  asumas lógica adicional por invocarlo.
- Si un patrón documentado aquí falla, confirma los nombres de tools/campos con
  `read_records(<Ent>, first:1)` (la verdad de runtime) — no con `describe_entities`.
