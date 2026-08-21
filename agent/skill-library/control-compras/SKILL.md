---
tenant: icf
description: >
  Use when el usuario pregunta por control de gasto de compras del periodo: qué se
  compró, cuánto se gastó y con qué proveedor, en qué estatus están las órdenes
  de compra (sábana de estatus), o qué compras se salen del presupuesto
  (desviaciones de presupuesto por artículo vs UV_QV_PPTOCOMPRA). Temas de la
  reunión de descubrimiento ICF (R-FIN-06/07, R-CS-01, R-COM-01).
twin_concepts: [mrp/mrp-sesion-periodo]
---

# Skill: Control de compras del periodo — gasto, estatus y desviaciones de presupuesto

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query })` para `Compra`/`CompraD`/`Prov` y
> `query_company_twin({ query })` para el presupuesto ICF
> (`presupuesto-compras`, `mrp/mrp-explosion`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.

## Periodo vigente (regla determinista)

Si el usuario no menciona ejercicio/periodo, usa el **VIGENTE** derivado de la
fecha actual (año y mes actuales — hoy 2026/8). **NUNCA pruebes variantes** de
periodo (ni 7, ni 12, ni ejercicios anteriores "por si acaso") — eso multiplica
las consultas. Si el usuario pide un periodo específico, usa ESE y solo ese. Las
semanas del periodo salen del calendario (`DIM_TIEMPO_SEMANA`/`CalendarioFC`).

## Cuándo usar este skill (NO confundir con otros)

| Pregunta del usuario | Skill correcto |
|---|---|
| "¿Qué me falta comprar?" / gap de abasto | `gap-abasto` (faltante_insumos / faltante_materia_prima) |
| "¿Qué se va a producir / plan / stock de seguridad / cobertura?" | `mrp` / `mrp-cf` |
| "¿Qué compramos en <mes>? ¿cuánto gastamos? ¿con quién?" | **ESTE skill (control-compras)** |
| "¿En qué estatus están las OC del periodo?" / sábana | **ESTE skill** |
| "¿Qué compras se salen del presupuesto?" / desviaciones | **ESTE skill** |

## Reglas críticas (verificadas contra el MCP ICF)

1. **El periodo SIEMPRE es el periodo fiscal del cabecero**: filtrar `Compra` con
   `Ejercicio eq <año> and Periodo eq <mes>` (enteros). NUNCA filtres por fechas en
   `CompraD` (`FechaRequerida` viene null en Entrada Compra y el filtro de fecha ahí
   falla con `InvalidArguments` por tipo Edm.Date). El `Ejercicio`/`Periodo` actual:
   `2026`/`7` salvo que el usuario pida otro mes.
2. **Casing por vista**: `UV_QV_PPTOCOMPRA` es **UPPERCASE** (`ARTICULO`, `FAMILIA`,
   `MAXCOMPRAKG`, `INVMINIMOKG`, `INVMAXIMOKG`); `Compra`/`CompraD`/`Prov` son
   camelCase (`Ejercicio`, `Periodo`, `FechaEmision`, `Articulo`, `Cantidad`).
3. **`groupby` SIEMPRE como ARRAY** (`["Proveedor"]`, `["Mov","Estatus"]`). Si se pasa
   string, el DAB lo IGNORA silenciosamente y devuelve un total global sin agrupar.
4. **`aggregate_records`**: `orderby` es string (`"desc"`); `field: "*"` para count.
5. **La desviación se calcula en CANTIDAD** (comparar `ΣCompraD.Cantidad` del periodo
   contra `MAXCOMPRAKG`), no en importe — el presupuesto está en kg/unidad.
   Si `CompraD.Unidad` del artículo no es `kg` (p.ej. pz), indicarlo en la respuesta.
6. **Agente es SOLO LECTURA** sobre este módulo: nunca modifica el presupuesto
   (`UV_QV_PPTOCOMPRA`) ni las compras. El presupuesto lo configura finanzas en el ERP.

## Patrón 1 — Gasto del periodo y por proveedor (resumen ejecutivo)

```
PASO 1 (total): aggregate_records(Compra, function: sum, field: Importe,
  filter: "Ejercicio eq 2026 and Periodo eq 7")

PASO 2 (top proveedores): aggregate_records(Compra, function: sum, field: Importe,
  groupby: ["Proveedor"], filter: "Ejercicio eq 2026 and Periodo eq 7",
  orderby: "desc", first: 15)

PASO 3 (nombres): read_records(Prov,
  filter: "Proveedor eq 'PP-0021' or Proveedor eq 'PP-0295' or ...",
  select: "Proveedor,Nombre")
```

## Patrón 2 — Sábana de estatus del periodo (qué pedido / en qué está)

```
aggregate_records(Compra, function: count, field: "*",
  groupby: ["Mov","Estatus"], filter: "Ejercicio eq 2026 and Periodo eq 7", first: 50)
```

Devuelve filas como `{Mov: "Entrada Compra", Estatus: "CONCLUIDO", count: N}`. Es la
visión "aquí lo pidieron, aquí ya está" de la reunión: cuántos documentos de cada tipo
(Entrada Compra, Control Calidad, Orden Compra…) hay en cada estatus del ciclo
(SINAFECTAR → PENDIENTE → CONCLUIDO | CANCELADO).

## Patrón 3 — Desviaciones de presupuesto por artículo (EL NÚCLEO)

Responde "¿qué compras se salen del presupuesto?" / "revisa el presupuesto de compra
del periodo y dime qué desviaciones hay".

```
PASO 1 (IDs del periodo — ACOTADO): read_records(Compra,
  filter: "Ejercicio eq 2026 and Periodo eq 7", select: "ID", first: 200)
→ ⚠️⚠️ NUNCA uses `after`/paginación para enumerar el periodo completo: si el
  periodo tiene muchos movimientos (julio 2026 ≈ 987), el or-chain de IDs crece,
  la tool call se trunca y el turno FALLA con "Tool calls cutoff by max_tokens".
  Acota a `first: 200` (or-chain ≈ 2.6k chars, seguro) y declara cobertura:
  "basado en los primeros 200 movimientos del periodo".

PASO 2 (comprado por artículo): aggregate_records(CompraD,
  function: sum, field: Cantidad, groupby: ["Articulo"],
  filter: "ID eq <id1> or ID eq <id2> or ...", orderby: "desc", first: 30)

PASO 3 (presupuesto de esos artículos): read_records(UV_QV_PPTOCOMPRA,
  filter: "ARTICULO eq 'A6319' or ARTICULO eq 'A5944' or ...",
  select: "ARTICULO,DESCRIPCION,FAMILIA,INVMINIMOKG,INVMAXIMOKG,MAXCOMPRAKG")
```

**Cálculo de desviación** (por artículo con presupuesto, `MAXCOMPRAKG > 0`):
`desv% = Comprado(periodo) / MAXCOMPRAKG × 100`

| Semáforo | Condición | Significado |
|---|---|---|
| 🔴 | desv% > 100 | **Sobre presupuesto** — se compró más del máximo permitido |
| 🟡 | 80 ≤ desv% ≤ 100 | Cerca del tope de presupuesto |
| 🟢 | desv% < 80 | Dentro del presupuesto |
| ⚪ | sin fila o `MAXCOMPRAKG` null | **Sin parámetro de presupuesto** configurado |

Un artículo comprado SIN fila en `UV_QV_PPTOCOMPRA` (o con `MAXCOMPRAKG` null) va a una
sección aparte "sin presupuesto configurado" — no se inventa un tope.

## Patrón 4 — Compra del periodo vs existencias (R-COM-01 de la reunión)

Responde "¿qué compramos en <mes> y cuánto tenemos en existencias de esos artículos?".
TODOS los pasos son ACOTADOS — nunca enumerar el periodo completo (ver anti-paginación
en Patrón 3).

```
PASO 1 (top proveedores + total, opcional): aggregate_records(Compra, sum Importe,
  groupby: ["Proveedor"], filter: "Ejercicio eq 2026 and Periodo eq 7",
  orderby: "desc", first: 15)

PASO 2 (IDs acotados): read_records(Compra,
  filter: "Ejercicio eq 2026 and Periodo eq 7", select: "ID", first: 200)

PASO 3 (comprado por artículo): aggregate_records(CompraD,
  function: sum, field: Cantidad, groupby: ["Articulo"],
  filter: "ID eq <id1> or ID eq <id2> or ...", orderby: "desc", first: 25)

PASO 4 (existencias SOLO de esos artículos): read_records(ArtDisponibleDesc,
  filter: "Articulo eq '<X1>' or Articulo eq '<X2>' or ...",  -- máx 25 artículos
  select: "Articulo,Descripcion1,Disponible,Almacen,Unidad")
```

Respuesta: tabla por artículo con Comprado (periodo) vs Disponible actual y, si el
usuario lo pide, el cociente/disponibilidad. Si el periodo tiene más de 200
movimientos, indicar cobertura — nunca paginar para abarcarlos todos.

## Formato de respuesta — LIDERAR CON LA DESVIACIÓN (la decisión)

**Abrir con el resumen accionable** del periodo: total gastado, N movimientos, y
**cuántos artículos se salieron del presupuesto** (🔴). Luego:

### Tabla 1 — Desviaciones de presupuesto (artículos con presupuesto)
| Artículo | Descripción | Comprado (periodo) | Unidad | Presupuesto máx | Desviación | Semáforo |
|---|---|---|---|---|---|---|

Ordenar por desviación descendente. Los 🔴 primero.

### Tabla 2 — Gasto por proveedor (top)
| Proveedor | Importe |
|---|---|

### Tabla 3 — Sábana de estatus (si aplica)
| Mov | Estatus | Documentos |
|---|---|---|

### Notas finales (solo si aplican)
- Cobertura: "basado en los primeros N movimientos del periodo (el periodo tiene M)".
- Artículos comprados sin presupuesto configurado (sección corta).
- Si `CompraD.Unidad` difiere de kg, indicarlo ("las bolsas se miden en pz").
- **"Dato no disponible"** si un tool falla (nunca inventar totales ni topes).

## Reglas de eficiencia

- Todo son agregados o lecturas acotadas — **NUNCA pagines** una entidad completa
  (`first` alto + `after`) para el cruce.
- `select` siempre acotado. `first` bajo en lecturas (IDs: 500 como máximo técnico;
  proveedores: 15; artículos: 30).
- Agrupa los agregados/lecturas independientes del periodo en **UNA** tool call
  `read_parallel` (el modelo no emite varias tool calls por step) — ver la
  sección "Agregados en paralelo (read_parallel)" abajo.
- Si el usuario pide un periodo sin mes/año, usar el periodo fiscal actual (`2026`/`7`).

## Agregados en paralelo (read_parallel)

Los agregados del periodo que NO dependen entre sí van agrupados en **UNA** tool
call `read_parallel` (el modelo no emite varias tool calls por step).
Operaciones de solo lectura con los mismos args que la llamada directa; nombres
SIN prefijo `intelisis-dab__`; `groupby` SIEMPRE como array.

**Lote 1 (independientes — total + top proveedores + sábana de estatus):**

```json
read_parallel({ operations: [
  { "tool": "aggregate_records", "args": { "entity": "Compra", "function": "sum",
      "field": "Importe", "filter": "Ejercicio eq 2026 and Periodo eq 7" } },
  { "tool": "aggregate_records", "args": { "entity": "Compra", "function": "sum",
      "field": "Importe", "groupby": ["Proveedor"],
      "filter": "Ejercicio eq 2026 and Periodo eq 7", "orderby": "desc", "first": 15 } },
  { "tool": "aggregate_records", "args": { "entity": "Compra", "function": "count",
      "field": "*", "groupby": ["Mov", "Estatus"],
      "filter": "Ejercicio eq 2026 and Periodo eq 7", "first": 50 } }
]})
```

**Lote 2 (depende de los resultados del Lote 1):** los nombres de proveedores
(`Prov`), el comprado por artículo (`CompraD` con los IDs del periodo) y el
presupuesto de esos artículos (`UV_QV_PPTOCOMPRA`) se ejecutan DESPUÉS, en un
segundo `read_parallel`, usando los proveedores/IDs/artículos que devolvió el
primero. Los pasos encadenados del Patrón 3 (IDs → `CompraD` → presupuesto) son
intrínsecamente secuenciales: cada lote depende del anterior — NO los agrupes en
el mismo `read_parallel`.

Si una operación falla, `read_parallel` reporta `{ ok: false }` para esa
operación con `hasErrors: true` sin tumbar las demás — declara "Dato no
disponible" solo para la fuente que falló.

## Decisiones del usuario (HITL) — gates de este use case

Cuando el usuario pide la **revisión de desviaciones** ("revisa el presupuesto y dime qué
desviaciones hay") y no define el enfoque, el flujo TIENE una decisión de negocio con
opciones excluyentes: usa la tool `ask_question` (regla general: nunca en texto plano).
Si el usuario ya definió el enfoque en su mensaje, NO preguntes: ejecuta directamente.

### Gate A — Enfoque de la revisión de desviaciones (cuando no lo define)

```
ask_question({
  question: "¿Con qué enfoque revisamos las desviaciones del presupuesto?",
  choices: [
    "Solo los críticos (Recomendado)",   // desviación > +150% → Patrón 3
    "Causa raíz",                        // cruce con faltantes del MRP → Patrón 3 + gap-abasto
    "Por proveedor",                     // top del gasto → Patrón 1/2
  ]
})
```

- **"Solo los críticos"** → ejecuta Patrón 3 y muestra SOLO los 🔴 sobre +150% (lo que
  pidió finanzas: "no me enseñes todo el chorizo").
- **"Causa raíz"** → ejecuta Patrón 3 y cruza los artículos sobre presupuesto contra los
  faltantes del MRP (`gap-abasto`) para explicar por qué se desvió.
- **"Por proveedor"** → ejecuta Patrón 1 (gasto por proveedor) y la sábana (Patrón 2).

### Gate B — Proveedor de una requisición/OC (cuando hay que fincar)

Si el flujo requiere fincar una orden con proveedor y hay historial, ofrece el top real:

```
ask_question({
  question: "¿Con qué proveedor cotizamos?",
  choices: ["<proveedor top 1 (Recomendado)>", "<top 2>", "<top 3>"]  // del historial del periodo
})
```

El campo libre lo añade la UI (para "otro proveedor"). Responde según el proveedor elegido.

### Reglas de la gate en este módulo

- Una pregunta por llamada; la recomendada primero con "(Recomendado)"; lenguaje de negocio.
- El approval gate (escritura) NO aplica aquí: este módulo es SOLO LECTURA (regla 6).
- Si el usuario no responde (timeout), continúa con la opción recomendada y decláralo.
- Las opciones exactas viven en ESTE skill (por use case), no en el prompt global.
