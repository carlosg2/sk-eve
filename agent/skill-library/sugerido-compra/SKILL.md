---
tenant: marmoles
description: >
  Use when the user asks for sugerido de compra, planeacion de compras, MRP,
  requerimiento neto, punto de reorden, spPlanArt, orden de compra sugerida,
  proveedor por historial de compras, o pide filtrar por categoria, familia,
  grupo, linea, articulo o descripcion de articulo en el ERP del tenant
  Marmoles (entidades Empresa, EmpresaCfg2, Art, ArtAlm, ArtDisponible,
  Alm, Prov, PlanArtOP, Compra, CompraD, Venta, VentaD, Prod, ProdD, Inv, MovTipo).
---

# Skill: Sugerido de compra (MRP — Mármoles)

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })` → conceptos `empresa`, `empresacfg2`,
> `art`, `artalm`, `artdisponible`, `alm`, `prov`, `planartop`, `planeacion-mrp`, `compra`,
> `comprad`, `venta`, `ventad`, `prod`, `inv`, `movtipo`.

Conexión MCP: **`intelisis-dab`** (tenant `marmoles`, remota). Tools genéricos
(`read_records`, `aggregate_records`, `create_record`, `update_record`, `execute_entity`) +
tool dedicado **`planeacion_mrp`** (SP `spPlanArt`, solo consulta/reconciliación).

Este skill **NO ejecuta `spPlanArt`/procedimientos anidados por defecto**: calcula el
sugerido con tablas base y reglas de negocio explícitas (más rápido, solo lectura). Usa
`planeacion_mrp` únicamente para **validar/reconciliar** un cálculo cuando el usuario lo
pida o el resultado manual parezca dudoso — su resultado **siempre prevalece**.

⚠️ Si una consulta manual (`read_records`/`aggregate_records`) falla con `BadRequest`
(campo inválido, entidad incorrecta, etc.), **NO escales a `execute_entity`/`planeacion_mrp`
como atajo**: corrige la consulta (nombre de campo/entidad correcto) y reintenta. Ejecutar
el store real (`PlaneacionMRP`/`execute_entity`) requiere aprobación humana (HITL) y no debe
usarse como fallback automático ante un error de sintaxis.

## Regla de oro — Empresa obligatoria

**Antes de cualquier cálculo**, resuelve y confirma la empresa:

1. Si el usuario ya dio una `Empresa` válida en este turno, úsala.
2. Si no, consulta `read_records(Empresa, filter="Estatus eq 'ALTA'", select="Empresa,Nombre")`
   y muestra el resultado como **lista numerada** (incluso si solo hay una empresa).
3. **No continúes** con el cálculo hasta que el usuario confirme una empresa de esa lista.

## Parámetros de entrada

| Parámetro | Requerido | Default si falta |
|---|---|---|
| `Empresa` | Sí (confirmada por el usuario) | — no hay default, ver arriba |
| Al menos 1 filtro de artículo* | Sí, salvo modo general | — |
| `TipoPeriodo` (`DIA`\|`SEMANA`\|`MES`) | No | `EmpresaCfg2.PlanTipoPeriodo` (ver [empresacfg2](/company-twin/erp-kernel/empresacfg2.md)), si vacío `SEMANA` |
| `Horizonte` (periodos) | No | `EmpresaCfg2.ProdPeriodosCorrida`, si vacío `10` |
| `Almacen` | No | consolidado: SIEMPRE todos los almacenes de la empresa sumados en una sola cifra por artículo — nunca se desglosa por almacén salvo que el usuario lo pida explícitamente |
| `SubCuenta` | No | — |
| Filtros extra: `Fabricante`, `Temporada`, `Proveedor` | No | — |

\* Filtros de artículo válidos: `Categoria`, `Familia`, `Grupo`, `Linea`, `Articulo`
(exacto), `DescripcionArticulo` (texto libre).

### Modo general (sin filtro de artículo)

Solo si el usuario lo pide explícitamente ("sugerido general", "de toda la empresa"): usar
el universo completo de artículos activos de la empresa, sin exigir criterio. Mostrar solo
renglones con sugerido > 0; si el resultado es demasiado grande, resumir por artículo
(consolidado en todos los almacenes, sin desglose por almacén).

### Prioridad de filtros

1. `Articulo` exacto tiene prioridad sobre cualquier otro filtro.
2. Si no hay `Articulo`, combinar el resto por intersección (AND).
3. Si no llega ningún filtro y no es modo general, pedir al menos un criterio.

### Búsqueda por texto libre (`DescripcionArticulo` / nombre parcial)

- Buscar coincidencia en `Art.Articulo` (clave) y `Art.Descripcion1`/`Descripcion2`.
- Coincidencia exacta por clave → tiene prioridad, continuar directo.
- Sin coincidencia exacta → usar `buscar_registro(entidad:"Art", campo:"Descripcion1", termino:"<texto>")` para candidatos parciales (nunca pagines `read_records` para esto).
- 1 sola coincidencia → continuar directo con el sugerido.
- Varias coincidencias → mostrar lista numerada (`Articulo`, `Descripcion1`, `Categoria`,
  `Familia`, `Linea`) y **esperar selección del usuario** (puede elegir varias). Sin
  selección → no calcular.

## Lógica de cálculo (por Artículo, consolidado en todos los almacenes)

**Regla obligatoria: NUNCA agrupes ni calcules por separado por `Almacen`.** Por defecto,
consolida SIEMPRE demanda, existencia y suministro de TODOS los almacenes de la empresa
para producir una sola cifra de requerimiento neto/sugerido por `Articulo`. Este es el
único comportamiento por defecto — el desglose por almacén de versiones anteriores de este
skill era inconsistente (a veces aparecían todos los almacenes, a veces no) y queda
eliminado como comportamiento por defecto.

- **Sin `Almacen` explícito (caso normal):** consolida todos los almacenes de la empresa —
  no filtres por `Almacen` en ninguna de las consultas de demanda/existencia/suministro.
- **Con `Almacen` explícito del usuario:** filtra todas las consultas a ese almacén
  únicamente (un solo resultado, scoped a ese almacén, sin mezclar con los demás).
- **Desglose por almacén (solo si se pide explícitamente):** repite el cálculo completo
  una vez por cada almacén con actividad y muestra una fila por `Articulo + Almacen` —
  esto es secundario/opcional, nunca el formato de respuesta por defecto.

`SubCuenta` sigue siendo un filtro opcional independiente (no afecta la consolidación por
almacén).

### 1) Universo de artículos

`Art` con `Estatus NOT IN ('BAJA','DESCONTINUADO')`, excluyendo tipo `JUEGO` y artículos de
activo fijo, más los filtros de la sección anterior.

### 2) Config de planeación por artículo/almacén — [`ArtAlm`](/company-twin/erp-kernel/artalm.md)

Consolidado: consulta `ArtAlm` **sin filtrar por `Almacen`** — `read_records(ArtAlm,
filter="Articulo eq '<ART>' and Empresa eq '<EMP>'", select="Articulo,SubCuenta,Almacen,
Minimo,LoteOrdenar,CantidadOrdenar,MultiplosOrdenar")` — puede devolver un renglón por
almacén. Si hay varios renglones, suma `Minimo` (ver sección 5) y, para la política de
lote, usa el valor común si todos coinciden o el más conservador (mayor `CantidadOrdenar`/
`MultiplosOrdenar`) si difieren, para no subestimar el sugerido.

Si el artículo **no tiene** ningún renglón en `ArtAlm`, **no lo excluyas**: continúa con
defaults `Minimo=0, LoteOrdenar='LOTE POR LOTE', CantidadOrdenar=1, MultiplosOrdenar=1`.

### 3) Demanda por periodo (DA / DT)

Señales de salida: `PV` (pedidos venta pendientes), `PVE` (extraordinarios), `SOL`
(solicitudes de inventario), `OT`/`OI` (transferencias/traspasos salida), `RB` (requerimiento
bruto por explosión, solo si se habilita fase MRP), `IS` (inventario de seguridad como
demanda, si aplica config).

- `DA` (Demanda Actual) = suma de señales de salida aplicables por periodo.
- `DT` (Demanda Total) = `DA` en zona congelada; fuera de zona congelada, `MAX(DA, PRV)`.

**`PV` (obligatorio, MANDATORIO calcularlo — no es opcional ni "si existe"):** publicado
y verificado en vivo en el MCP de marmoles (2026-08-03). Fuente:
[`VentaD`](/company-twin/erp-kernel/ventad.md), usando siempre **`CantidadPendiente`**
(nunca `Cantidad` — esa es lo solicitado originalmente, no lo pendiente por surtir).

**Consolidado por defecto — NO filtres por `Almacen`.** `VentaD` no tiene `Empresa`, así
que el join a `Venta` es **obligatorio siempre** (no una "variante estricta" opcional) para
no mezclar demanda de otra empresa al quitar el filtro de `Almacen`:

```
# PV consolidado (todos los almacenes de la empresa) — patrón por defecto
PASO 1: read_records(Venta, filter="Estatus eq 'PENDIENTE' and Empresa eq '<EMP>'", select="ID")
PASO 2: read_records(VentaD, filter="Articulo eq '<ART>' and CantidadPendiente gt 0 and (ID eq <id1> or ID eq <id2> ...)",
                     select="ID,Articulo,Almacen,CantidadPendiente,FechaRequerida")
PV = suma de CantidadPendiente de TODOS los renglones devueltos (todos los almacenes
     juntos — no agrupar por Almacen).

# Solo si el usuario pidió explícitamente un almacén concreto:
read_records(VentaD, filter="Articulo eq '<ART>' and Almacen eq '<ALM>' and CantidadPendiente gt 0",
             select="ID,Articulo,Almacen,CantidadPendiente,FechaRequerida")
```

`PV_periodo` = suma de `CantidadPendiente` (de todos los almacenes) de los renglones cuyo
`FechaRequerida` cae en ese periodo (bucket, ver sección 8). Para el total del horizonte
(formato compacto A), sumar todos los renglones sin filtrar por fecha.

**`PVE`, `SOL`, `OT`, `OI`:** sin señal confiable todavía — `PVE` requeriría un campo
`Extra`/equivalente en `Venta` no confirmado; `SOL`/`OT`/`OI` requerirían
[`InvD`](/company-twin/erp-kernel/inv.md) (detalle de traspasos por artículo), que **no**
está publicado aún (solo `Inv`, encabezado sin `Articulo`/`Cantidad`). Tratar estas señales
como `0` y, si el usuario pregunta explícitamente por traspasos/solicitudes, declarar la
limitación en vez de inventar un cálculo.

**`RB`:** fuera de alcance de este skill (requiere explosión de materiales/BOM).

### 4) Suministro por periodo (RP)

Señales de entrada: `OC` (compras pendientes), `OP` (producción pendiente), `ROT`/`ROI`
(transferencias/traspasos entrada), `RTI` (en tránsito), `ROPF`/`REPF` (órdenes/distribución
firmes).

**Consolidado por defecto** — igual que la demanda (sección 3): NO filtres por `Almacen`
salvo que el usuario lo pida explícitamente. Suma cada señal de TODOS los almacenes de la
empresa antes de calcular `RP`.

`RP` = suma de `OC + OP + ROT + ROI + RTI` por periodo (+ firmes si se pide consolidado
completo).

**`OC`:** `CompraD` tampoco tiene `Empresa` — mismo patrón de join obligatorio que `PV`,
sin filtrar por `Almacen`:

```
PASO 1: read_records(Compra, filter="Estatus eq 'PENDIENTE' and Empresa eq '<EMP>'", select="ID")
PASO 2: read_records(CompraD, filter="Articulo eq '<ART>' and (ID eq <id1> or ID eq <id2> ...)",
                     select="ID,Articulo,Almacen,Cantidad,FechaRequerida")
OC = suma de Cantidad de TODOS los renglones devueltos (todos los almacenes juntos).
```

Ver también "Dataset base recomendado".

**`OP`:** fuente [`Prod`/`ProdD`](/company-twin/erp-kernel/prod.md) (publicadas
2026-08-03). Antes de consultar, verificar `Art.SeProduce`: si es `0`/falso, usar
`OP = 0` directo sin llamar a `Prod`/`ProdD`. En el tenant `marmoles` no hay registros
actuales en ninguna de las dos tablas (giro de negocio: compra/vende, no produce) —
`OP = 0` es el resultado esperado casi siempre.

**`ROT`/`ROI`/`RTI`:** requieren `InvD` (detalle por artículo de traspasos), que **no**
está publicado — solo existe `Inv` (encabezado, sin `Articulo`/`Cantidad`, ver
[`Inv`](/company-twin/erp-kernel/inv.md)). Tratar como `0` y declarar la limitación si el
usuario pregunta explícitamente por traspasos en tránsito.

### 5) Existencia proyectada (EP) y requerimiento neto (RN)

Para cada periodo `p = 0..Horizonte`:

```
EP_p = EP_(p-1) + RP_p - DT_p

Si EP_p < 0                    -> RN_p = -EP_p + IS
Si 0 <= EP_p < IS              -> RN_p = IS - EP_p
Si EP_p = 0 y ya inició demanda -> RN_p = IS
```

`E` (existencia inicial, periodo -1) = suma de `Disponible` en TODOS los almacenes de la
empresa para ese artículo (consolidado, salvo que el usuario pida un almacén específico):

```
aggregate_records(ArtDisponible, sum, Disponible, filter="Articulo eq '<ART>' and Empresa eq '<EMP>'")
```

Ver [`ArtDisponible`/`ArtDisponibleDesc`](/company-twin/erp-kernel/artdisponible.md).
`IS` = suma de `ArtAlm.Minimo` de todos los renglones del artículo en la empresa (o
default `0` si no hay ninguno — ver sección 2).

### 6) Política de lote → ROP (ver [`ArtAlm`](/company-twin/erp-kernel/artalm.md))

```
ROP_base = RN
LOTE POR LOTE                    -> ROP = RN
CANTIDAD FIJA / MINIMA / MULTIPLOS -> ROP = max(RN, CantidadOrdenar)
ROP = CEILING(ROP / MultiplosOrdenar) * MultiplosOrdenar
```

### 7) Comprar vs. producir vs. distribuir

⚠️ `AlmacenROP` **NO existe en `PlanArtOP`** — es un campo de [`Art`](/company-twin/erp-kernel/art.md)
(`Art.AlmacenROP`). Nunca lo selecciones sobre `PlanArtOP` (da `BadRequest`).

La comparación `Art.AlmacenROP` vs. `PlanArtOP.Almacen` **solo aplica al reconciliar contra
el store oficial** (`planeacion_mrp`), que sigue calculando por almacén internamente y ahí
sí distingue compra de distribución entre almacenes. El cálculo manual **consolidado** de
este skill no distingue compra vs. distribución por almacén: asume que todo el
requerimiento neto consolidado de la empresa requiere **comprar**, salvo que
`Art.SeProduce = 1` (posible producción, fuera de alcance de este skill — excluir).

### 8) Bucketing de periodos

`DIA`: `DATEDIFF(day, FechaBase, FechaEvento)` · `SEMANA`: `DATEDIFF(week, ...)` ·
`MES`: `DATEDIFF(month, ...)`. Fecha < `FechaBase` → periodo `-1`. Conservar solo periodos
`-1..Horizonte`.

## Dataset base recomendado (solo lectura)

- Universo de artículos: `Art` (filtros de sección "Universo de artículos").
- Config de planeación: [`ArtAlm`](/company-twin/erp-kernel/artalm.md).
- Existencia: [`ArtDisponible`/`ArtDisponibleDesc`](/company-twin/erp-kernel/artdisponible.md).
- Demanda/suministro transaccional (todas publicadas y verificadas en vivo, 2026-08-03),
  **siempre consolidadas en todos los almacenes de la empresa (nunca filtradas por
  `Almacen` salvo pedido explícito)**:
  [`Venta`/`VentaD`](/company-twin/erp-kernel/venta.md) (demanda `PV`, **obligatorio**,
  usar `CantidadPendiente`), `Compra`/`CompraD` (suministro `OC`, join obligatorio a
  `Compra` por `Empresa`), [`Prod`/`ProdD`](/company-twin/erp-kernel/prod.md) (suministro
  `OP` — normalmente `0` en este tenant, ver kernel doc), [`Inv`](/company-twin/erp-kernel/inv.md)
  (encabezado de traspasos, **sin** detalle por artículo hasta que se publique `InvD`).
- Órdenes ya planeadas/firmes: [`PlanArtOP`](/company-twin/erp-kernel/planartop.md)
  (`Estado eq 'LIBERADO' and Accion eq 'COMPRAR' and LiberacionID eq null and Cantidad gt 0`).

## Proveedor sugerido (para OC)

Prioridad obligatoria:
1. `Art.Proveedor`, si existe y es válido.
2. Si no, **historial**: último documento de compra del artículo
   (`CompraD` → `Compra`, `Compra.FechaEmision DESC, Compra.ID DESC`), excluyendo
   proveedores vacíos/no válidos.
3. Si no hay proveedor por ninguna vía: **no generar OC**, reportar bloqueo de proveedor.

## Reglas de eficiencia (obligatorio)

- **NUNCA pagines** `Venta`/`VentaD`/`Compra`/`CompraD`/`ArtDisponibleDesc` con `first` alto
  para "buscar" — usa filtros exactos por `Articulo`/`Empresa`/`Almacen` primero.
- **`select` siempre** con las columnas que vas a usar/mostrar.
- Si el universo de artículos es grande (modo general o familia amplia), **acota primero**
  el universo de artículos objetivo antes de traer existencias/compras completas — no
  traigas todo el catálogo y filtres en el modelo.
- Encadena tools independientes en paralelo dentro del mismo paso (ej. `ArtAlm` +
  `ArtDisponibleDesc` del mismo artículo).
- Para volúmenes grandes de renglones transaccionales a cruzar (joins tabulares grandes),
  delega el cálculo a un subagente en vez de sumarlos manualmente en el contexto principal —
  los joins grandes hechos "a ojo" por el modelo producen resultados incorrectos.

## Formato de respuesta (obligatorio)

Hay **dos formatos de salida** según el tipo de consulta. No mezclarlos.

### A) Consulta por artículo específico (`Articulo` exacto, 1 o pocos artículos)

Formato **compacto**, replicando el comportamiento observado del agente original de Dani —
úsalo siempre que el usuario pida el sugerido de un artículo puntual (ej. "sugerido del
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

Reglas de esta tabla compacta:
- **Una sola fila por `Articulo`**, consolidando SIEMPRE todos los almacenes de la empresa
  (nunca desglosar por `Almacen` en esta tabla, salvo pedido explícito — ver abajo),
  agregando todo el horizonte (no desglosa por periodo — para eso está la tabla detalle de
  la sección B, mostrarla solo si el usuario la pide explícitamente).
- Columnas: `Demanda` = `DT` total del horizonte, consolidado en todos los almacenes · `IS`
  = suma de `ArtAlm.Minimo` de todos los almacenes (o default `0`) · `Existencia` = `E`
  (existencia inicial consolidada, periodo -1, suma de `Disponible` en todos los almacenes)
  · `Suministro` = `RP` total del horizonte, consolidado (recibos/OC pendientes
  **verificados en la base**, no estimados) · `RN` = requerimiento neto final consolidado ·
  `Sugerido` = `ROP` (tras política de lote/múltiplo).
- **Solo si el usuario pide explícitamente el desglose por almacén** ("por almacén",
  "desglosado por almacén", "en cada almacén"): agrega una columna `Almacen` y repite el
  cálculo completo una vez por almacén con actividad, con una fila por `Articulo + Almacen`;
  el `SugeridoTotal` del resumen ejecutivo sigue siendo la suma consolidada de todos los
  almacenes.
- Si varios artículos fueron seleccionados de una búsqueda por texto, repite el bloque
  completo (resumen + tabla + conclusión) por cada artículo, o consolida la tabla en una
  sola con una fila por `Articulo` si son muchos.
- Si `Sugerido = 0` consolidado → responder exactamente **"Sin sugerido de compra"**.

### B) Consulta por Categoria/Familia/Grupo/Linea/modo general (muchos artículos esperados)

**Fase 1 — Análisis (siempre, solo lectura):**

1. Confirmar en 1 línea los parámetros usados: empresa, filtro, `TipoPeriodo`, `Horizonte`.
2. Resumen ejecutivo: total sugerido, número de artículos con sugerido.
3. Tabla resumen (liderando la respuesta) — **una fila por `Artículo`, consolidando
   SIEMPRE todos los almacenes de la empresa** (nunca desglosar por almacén aquí salvo
   pedido explícito):

| Empresa | Familia | Artículo | Descripción | Existencia | CantidadSugeridaTotal | PrimerPeriodoConCompra | ProveedorSugerido |
|---|---|---|---|---:|---:|---|---|

4. Tabla detalle (opcional/secundaria, solo si el usuario la pide o hay pocos renglones) —
   igualmente consolidada por `Articulo` (sin columna de almacén salvo desglose explícito):

| Artículo | SubCuenta | Periodo | FechaLiberación | FechaEntrega | DemandaPeriodo | ReciboPeriodo | EP_Antes | RN | ROP | PolíticaLote | Múltiplo | IS |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|

5. Conclusión operativa en una línea.

**Reglas de visualización (ambos formatos):**
- Mostrar **solo** renglones con `SugeridoCompra > 0`, salvo que el usuario pida "incluye
  ceros" o "desglose completo".
- Sin renglones: responder exactamente **"Sin sugerido de compra"**.
- Si hay artículos sin `ArtAlm` (calculados con defaults) o sin proveedor resoluble,
  listarlos aparte al final (no bloquean el resto del resultado).

**Fase 2 — Generación de OC (solo si el usuario lo pide explícitamente después de la Fase 1):**

- Requiere aprobación humana (HITL) — es escritura (`create_record`).
- Crear `Compra` con `Estatus = 'CONFIRMAR'` (nunca `PENDIENTE`).
- Crear `CompraD` con los renglones (`Articulo`, `Cantidad`, `Proveedor`, `Almacen`, costos).
- Agrupar por Proveedor + Almacén (una `Compra` por grupo), salvo que la política pida un
  documento por renglón.
- Marcar el origen en `PlanArtOP` si aplica (ver
  [`PlanArtOP`](/company-twin/erp-kernel/planartop.md) — sección "Marcar un renglón
  como liberado").
- Validaciones mínimas antes de insertar: `Proveedor` no nulo, `Almacen` no nulo,
  `Cantidad > 0`, `Unidad` válida.

## Estilo de comunicación

- No narres el proceso interno ("voy a consultar…", "ahora calculo…") salvo que el usuario
  lo pida explícitamente.
- Formato profesional: encabezado corto, resumen ejecutivo, tabla, conclusión — sin mensajes
  de "pensando"/"trabajando" intermedios.
- Prioriza velocidad: flujo directo, consultas acotadas, sin pasos de proceso innecesarios.

## Consistencia con el store oficial

Si el usuario pide validar/reconciliar, o el cálculo manual se ve dudoso (ej. demasiados
artículos con RN negativo grande, o discrepancia evidente), ejecuta
[`planeacion_mrp`](/company-twin/erp-kernel/planeacion-mrp.md) (`spPlanArt`) con
`Empresa` + el mismo filtro, y lee el resultado vigente de
[`PlanArtOP`](/company-twin/erp-kernel/planartop.md). El resultado del store
**siempre prevalece** sobre el cálculo manual de este skill.

## Limitaciones declaradas

- Esta versión **no** ejecuta explosión de materiales/BOM (`ArtJuego`/`ArtJuegoD` o
  equivalente) ni genera documentos de producción — solo comprar.
- Esta versión **no** reemplaza `spPlanArtOPLiberar`: si se genera la OC manualmente, hay
  que marcar `PlanArtOP` como liberado a mano (ver arriba). El sub-procedimiento
  `xpPlanArtOPLiberar` puede existir como stub sin efecto real — no asumir que corrió lógica
  adicional por invocarlo.
- No se ha validado en vivo end-to-end contra el MCP remoto de `marmoles` todavía — nombres
  exactos de tools (`planeacion_mrp`) y campos deben confirmarse con `describe_entities`
  solo si un patrón documentado aquí falla, y luego promoverse a este skill/Twin.

# Citations

[1] `Dani/AGENTE_PLANEACION_SUGERIDO_COMPRA.md` — guía completa (reglas de negocio, validaciones, plantilla SQL, generación de OC sin SP anidados).
[2] `Dani/AGENTE_PLANEACION_SUGERIDO_COMPRA_LIGERO.md` — guía rápida de ejecución/formato de salida (prevalece la guía completa ante discrepancia de detalle).
[3] `Dani/MRP.agent.md` — identidad/tono del agente original y reglas fijas de proveedor/estatus de OC.
