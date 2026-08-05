---
tenant: [icf, marmoles]
description: >
  Use when the user asks about faltante de materia prima o insumos, gap de
  abasto, si alcanza el inventario para surtir pedidos/forecast del mes, o
  pide cruzar demanda (pedidos/ventas pendientes) contra existencias y
  compras pendientes para detectar quiebres de stock.
---

# Skill: Gap de abasto — faltante de insumos y materia prima

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })`.

Conexión MCP: **`intelisis-dab`**. Tools **dedicados** (no `execute_entity`, read-only,
ya hacen la explosión de materiales/MRP internamente): **`faltante_insumos`**,
**`faltante_materia_prima`**.

## MÉTODO PRINCIPAL (usar SIEMPRE primero) — tools `faltante_insumos` / `faltante_materia_prima`

Agregados por el equipo backend (2026-07-31): `spWebFCFaltanteInsumos` y
`spWebFCFaltanteMateriaPrima`. Cada uno **ya calcula el gap completo internamente**
(inventario requerido vs. disponibilidad, vía una explosión de materiales/MRP previa
guardada en `ExplocionMatCF`) y regresa **solo las filas con faltante real** — no hay
que traer `Venta`/`VentaD`/`Compra`/`CompraD`/`ArtDisponibleDesc` ni calcular Gap a mano
para este caso. Esto reemplaza el patrón manual anterior (ver "Método de respaldo" abajo).

- `faltante_insumos`: artículos del grupo **"INSUMOS DE PRODUCCION"** (empaques, tarimas,
  consumibles de planta — no la materia prima principal del proceso).
- `faltante_materia_prima`: artículos que **no se producen** (`Art.SeProduce = 0`) —
  materia prima que se consume/vende tal cual (granos, etc.).

Si la pregunta del usuario no distingue, **llama a ambos** y combina los resultados en
una sola respuesta (son complementarios, no se traslapan).

### Parámetros obligatorios: `Usuario`, `Ejercicio`, `Periodo`

- **`Ejercicio`/`Periodo`**: año y mes fiscal, enteros (ej. `2026`, `7`). Usa el periodo
  actual salvo que el usuario pida otro mes explícito.
- **`Usuario`**: valor **estático fijo `"CGARZA"`** para este tenant (ICF) — es el usuario
  ERP que corre la **explosión de materiales (MRP)** (`ExplocionMatCF.Usuario`), NO el
  usuario que está chateando. Úsalo siempre por default, no lo preguntes al usuario ni lo
  inventes con otro valor.

```
faltante_insumos(Usuario: "CGARZA", Ejercicio: 2026, Periodo: 7)
faltante_materia_prima(Usuario: "CGARZA", Ejercicio: 2026, Periodo: 7)
```

### Campos de respuesta y cómo interpretarlos

Ambos regresan `{ entity, message, parameters, value: { value: [...] }, status }`. Cada
fila = un artículo con faltante > 0. `Faltante` = **cantidad a comprar/reabastecer**, ya
calculada — no la reproduzcas ni la recalcules.

**`faltante_insumos`** — campos: `Articulo, Descripcion, InventarioRequerido,
DisponibilidadICF, Faltante, RequisicionEnviadaAlERP, InvMin, InvMax`.
- `RequisicionEnviadaAlERP` no vacío → ya existe una requisición de compra en trámite en
  el ERP para ese artículo; diagnóstico: "requisición enviada, dar seguimiento" (indica el
  valor del campo si aporta detalle).
- `RequisicionEnviadaAlERP` vacío ("") → nadie ha generado nada; diagnóstico: "sin
  requisición generada, urgente".

**`faltante_materia_prima`** — campos: `Articulo, Descripcion, InventarioRequerido,
DisponibilidadICF, InventarioAlmacenadoAVC, SolicitudTraspasoAVC,
SolicitudTraspasoAVCEstatus, InventarioAlmacenadoPBC, SolicitudTraspasoPBC,
SolicitudTraspasoPBCEstatus, ExistenciasAVC, SolicitudPrestamoCompraAVC,
SolicitudPrestamoCompraAVCEstatus, ExistenciasPBC, SolicitudPrestamoCompraPBC,
SolicitudPrestamoCompraPBCEstatus, ArribosAVC, RedireccionArriboAVC,
RedireccionArriboAVCEstatus, Faltante, InvMin, InvMax`. (AVC/PBC = almacenes/plantas del
tenant; trata cada par Inventario/Solicitud/Existencia/Arribo por almacén.)
Diagnóstico por prioridad (revisa en este orden, usa el primero que aplique):
1. `ArribosAVC > 0` (o el campo de arribo equivalente) → "arribo en camino a AVC: <cantidad>".
2. `SolicitudTraspasoAVC/PBC > 0` con `...Estatus` no vacío → "traspaso solicitado
   (<estatus>), aún no llega".
3. `SolicitudPrestamoCompraAVC/PBC > 0` con `...Estatus` no vacío → "préstamo/compra en
   trámite (<estatus>)".
4. Todo lo anterior en 0 y estatus vacíos → "sin ninguna acción en trámite, requiere
   compra urgente".

### Unidad de medida (opcional, solo si el usuario la pide)

Estos SPs no regresan `Unidad`. Si hace falta, haz **un solo** `read_records(Art, filter:
"Articulo eq 'X' or Articulo eq 'Y' or ...", select: "Articulo,Descripcion1,Unidad")`
acotado a los artículos que ya salieron con faltante — nunca antes, nunca sin filtrar.

## Formato de respuesta — LIDERAR CON LA DECISIÓN, NO CON EL DIAGNÓSTICO (método principal)

**La primera tabla de la respuesta es SIEMPRE la de compra.** El usuario quiere saber
qué comprar, no cómo se calculó.

Abrir con el resumen accionable: **N artículos requieren compra · cantidad total
crítica**. Luego la tabla de decisión:

| Artículo | Descripción | Cantidad a comprar (Faltante) | Diagnóstico / acción en trámite |
|---|---|---|---|

- Ordenar por `Faltante` descendente (el más voluminoso/crítico primero).
- Si combinaste `faltante_insumos` + `faltante_materia_prima`, puedes separarlos en dos
  tablas o en una sola con una columna "Tipo" (Insumo / Materia prima) — lo que sea más
  legible según cuántas filas haya.
- Si el usuario pide urgencia y el SP no la da explícita, infiérela de si ya hay algo en
  trámite (arribo/traspaso/préstamo/requisición) vs. "sin ninguna acción en trámite".

## Método de respaldo (SOLO si `faltante_insumos`/`faltante_materia_prima` fallan o no aplican)

Si estos tools regresan error, o el usuario pregunta específicamente por demanda de
**ventas/pedidos** cruzada contra existencia (no por faltante de insumos/materia prima
per se), usa el patrón manual con `Venta`, `VentaD`, `ArtDisponibleDesc`, `Compra`,
`CompraD`. Es más caro (varios tool calls, agregaciones grandes) — solo como fallback.

Entidades: `Venta`, `VentaD`, `ArtDisponibleDesc`, `Compra`, `CompraD`, `Art`.

**Paso 1 — Demanda del periodo (pedidos a surtir).**
Resolver la clave de MovTipo pendiente de ventas con la política del tenant
(`<MOVS_VTAS_P>`), luego traer el detalle por artículo con `CantidadPendiente`
(NO `Cantidad`: esa es la cantidad original, no lo que falta por surtir).

```
PASO 1: read_records(Venta,
  filter: "Estatus eq 'PENDIENTE' and (<MOVS_VTAS_P>) and Ejercicio eq 2026 and Periodo eq 7",
  select: "ID,FechaEmision,Cliente,Estatus")

PASO 2: read_records(VentaD,
  filter: "ID eq 1001 or ID eq 1002 or ...",   # IDs del paso 1
  select: "ID,Articulo,Cantidad,CantidadPendiente,Almacen,Unidad")

PASO 3: aggregate_records(VentaD, sum, CantidadPendiente,
  filter: "ID eq 1001 or ID eq 1002 or ...",
  groupby: ["Articulo"], orderby: "desc")
→ Demanda[Articulo] = suma de CantidadPendiente
```

**Paso 2 — Existencia disponible hoy (neta de compromisos de venta).**
`DispMenosApartado` ya descuenta lo apartado por otras ventas; es el número
correcto para comparar contra demanda nueva, no `Disponible` a secas.

```
read_records(ArtDisponibleDesc,
  filter: "Articulo eq 'A001' or Articulo eq 'A002' or ...",
  select: "Articulo,Descripcion1,Disponible,Apartado,DispMenosApartado,Almacen,Unidad")
→ Existencia[Articulo] = suma de DispMenosApartado (todos los almacenes de materia prima/insumo)
```

**Paso 3 — Compras pendientes que llegan en el horizonte (hoy/mañana/próximos días).**
`CompraD.FechaRequerida` es la fecha de entrega comprometida; úsala para
filtrar lo que entra en el rango que pregunte el usuario (hoy, mañana, la
semana). No hay campo de "arribo confirmado" separado — `FechaEntrega` solo
se llena cuando la compra ya se concluyó (entonces ya estaría en existencia,
no como "en camino").

```
PASO 1: read_records(Compra,
  filter: "Estatus eq 'PENDIENTE' and (<MOVS_COMS_O>)",
  select: "ID,MovID,FechaEmision,Proveedor,Estatus")

PASO 2: read_records(CompraD,
  filter: "(ID eq 2001 or ID eq 2002 or ...) and FechaRequerida le 2026-08-07",
  select: "ID,Articulo,Cantidad,FechaRequerida,Almacen")

PASO 3: aggregate_records(CompraD, sum, Cantidad,
  filter: "(ID eq 2001 or ID eq 2002 or ...) and FechaRequerida le 2026-08-07",
  groupby: ["Articulo"], orderby: "desc")
→ EnCamino[Articulo] = suma de Cantidad de compras pendientes con entrega en el horizonte
```

**Paso 4 — Calcular el Gap por artículo y traducirlo a cantidad a comprar.**

```
Gap[Articulo] = Existencia[Articulo] + EnCamino[Articulo] − Demanda[Articulo]
CantidadAComprar[Articulo] = -Gap[Articulo]     # solo si Gap < 0
```

- `Gap >= 0` → cubierto, no requiere compra.
- `Gap < 0` → faltante real. Diagnóstico:
  - ¿Hay compra pendiente para ese artículo? Si NO → "sin compra generada".
  - ¿Hay compra pendiente pero `FechaRequerida` cae después del horizonte? →
    "compra en camino, llega tarde: <fecha>".
  - ¿No hay compra ni existencia? → "sin cobertura, requiere compra urgente".

Usa el mismo formato de respuesta (tabla de decisión primero) que el método principal.

## Limitaciones a declarar siempre que apliquen (regla de integridad del prompt base)

- `faltante_insumos`/`faltante_materia_prima` dependen de que exista una explosión de
  materiales (`ExplocionMatCF`) ya corrida para `Usuario: "CGARZA"` en el `Ejercicio`/
  `Periodo` solicitado — si el usuario pide un periodo sin explosión corrida, el SP puede
  regresar vacío; no lo interpretes como "todo cubierto" sin confirmar que la explosión existe.
- El **método de respaldo** (manual) NO explosiona BOM (`ArtJuego`/`ArtJuegoD` no existen
  en este MCP) — compara el artículo pedido directamente contra su propia existencia. Solo
  es correcto cuando el artículo demandado *es* la materia prima/insumo en sí.
- `FechaRequerida` de `CompraD` (método de respaldo) es la fecha comprometida por el
  proveedor, no una confirmación de arribo físico; tratarla como estimado.

No presentes estas limitaciones como si el módulo no existiera en el ERP — son
particularidades de cómo está calculado el dato, no ausencia del proceso de producción.
