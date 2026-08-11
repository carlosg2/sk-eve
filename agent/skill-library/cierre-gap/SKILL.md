---
tenant: icf
description: >
  Use when the user asks to CLOSE the abasto gap with a purchase: "cierra el
  gap de abasto", "arma la requisición de lo que falta", "cubre los faltantes
  del mes", "prepara la compra de los faltantes críticos". It is the
  HITL-heavy requisition flow with IDEAL AUTONOMY: plan with the todo tool,
  resolve in silence what the data decides, ask ONLY what builds the next step,
  then present the requisition and ask authorization AFTER showing it, then
  close with the 3-filter authorization board.
---

# Skill: Cierre del gap de abasto — requisición controlada

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })` y `layer: "company"`.

Conexión MCP: **`intelisis-dab`** (tenant ICF). Tools: **`faltante_insumos`**,
**`faltante_materia_prima`** (SPs del backend que ya calculan el gap), más `read_records`,
`aggregate_records`, `buscar_registro` para el cruce de inventario, presupuesto y proveedor.

## Cuándo usar este skill (NO confundir con otros)

| Pregunta del usuario | Skill correcto |
|---|---|
| "¿Qué nos falta comprar?" / diagnóstico del gap (solo informativo) | `gap-abasto` |
| "¿Qué compras se salen del presupuesto?" / desviaciones | `control-compras` |
| "¿Qué se va a producir / plan / cobertura?" | `mrp` / `mrp-cf` |
| **"Cierra el gap / arma la requisición / cubre los faltantes"** (flujo de compra) | **ESTE skill (cierre-gap)** |

Este skill NO es solo diagnóstico: es el **flujo de decisión** que convierte el faltante en
una **requisición de compra lista**. El agente es **SOLO LECTURA**: la emisión final de la
requisición la ejecuta el ERP/portal (planeación propone → finanzas autoriza → compras
ejecuta); aquí se entrega la requisición **pre-llenada y autorizada por decisión del usuario**.

## Planear con la tool `todo` (OBLIGATORIO — el flujo es conocido)

Al iniciar este flujo, crea la lista de tareas con la tool `todo` del framework (reemplaza
la lista completa en cada llamada; incluye siempre las restantes con su estado):

```
todo({ todos: [
  { content: "Investigar faltantes y cobertura", priority: "high", status: "in_progress" },
  { content: "Definir proveedor", priority: "high", status: "pending" },
  { content: "Definir cantidad", priority: "high", status: "pending" },
  { content: "Presentar requisición y obtener autorización", priority: "high", status: "pending" },
  { content: "Entregar sábana de cierre", priority: "medium", status: "pending" }
] })
```

Marca cada tarea conforme avanzas (`in_progress` → `completed`) con el mismo `todo` (lista
completa actualizada). La lista es interna (la ve el usuario en el panel de tareas, no en el
chat) — no la narres en el mensaje.

## Superficie de respuesta — LINEAL Y SIMPLE (OBLIGATORIO)

La superficie que ve el usuario es lineal y simple: **decisión → datos → siguiente paso**.
Por debajo es procedural (investigas, cruzas, calculas), pero NUNCA muestras la mecánica.

**PROHIBIDO mostrar al usuario:**
- Siglas de requerimientos (`R-FIN-*`, `R-COM-*`, `R-PROD-*`, `R-DIR-*`).
- Usuario ERP (`CGARZA`), ni "ejercicio/periodo/usuario" en títulos o texto.
- Nombres de entidades, campos o tools (`MAXCOMPRAKG`, `UV_QV_PPTOCOMPRA`, `ArtFamFC`,
  `CompraD`, `faltante_insumos`, `read_records`, etc.).
- Términos técnicos: "sin parámetro ⚪" → "sin tope de compra definido"; "lead no
  configurado" → "sin tiempo de entrega estimado"; "tope MAXCOMPRAKG" → "tope de compra".
- **"Autorización extraordinaria"** → **"aprobación de finanzas"** (es una aprobación normal
  de presupuesto, no algo raro). Solo di que el monto "requiere aprobación de finanzas".

**Formato de superficie:**
- Título simple: "Requisición de abasto — Julio 2026" (nunca con usuario/ejercicio).
- Tabla de negocio: Artículo | Descripción | Cantidad | Proveedor | Llega en ~ | Importe.
- Hallazgo en una línea, datos, y (opcional) siguiente paso. Sin narración de proceso.

## Fase 0 — Investigación + resoluciones (sin HITL) · [todo: investigar → completed]

Ejecuta todo en silencio (acotado, en paralelo cuando se pueda):

1. `faltante_insumos(Usuario: "CGARZA", Ejercicio, Periodo)` + `faltante_materia_prima(...)`.
2. Clasifica con semáforo: 🔴 sin nada en trámite (frena línea) / 🟡 en trámite / 🟢 cubierto.
3. Inventario: `ArtDisponibleDesc` acotado (or-chain de artículos con faltante).
4. Lead time: `Art` (Familia) + `ArtFamFC` (TiempoEntrega) → "llega en ~N semanas".
5. Consolidación: faltantes del mismo grano/producto → una sola línea.
6. Proveedores del periodo: `aggregate_records(Compra, sum Importe, groupby Proveedor)` +
   `read_records(Prov)`. Si el grueso es grano, recomendado = beneficiadora del top.
7. Costos: `CompraD` acotado → importe estimado (anómalo → gemelo o "no estimable").
8. Presupuesto: `UV_QV_PPTOCOMPRA` acotado (UPPERCASE) → topes; si la requisición supera un
   tope, la autorización "requiere aprobación de finanzas".

**Resuelve SOLO (decláralo, no preguntes):** periodo/usuario, alcance si no hay mezcla
(todos críticos → inclúyelos), consolidación, proveedor recomendado, importe, topes.

Presenta la tabla de decisión (superficie limpia):

| Artículo | Descripción | Faltante | Urgencia | Llega en ~ | Consolidación |
|---|---|---|---|---|---|

## Fase 1 — Batch multistep: SOLO las preguntas que construyen la propuesta · [todo: proveedor/cantidad → in_progress]

En el MISMO turno, emite `ask_question` UNA por decisión, solo si es relevante:

### P1 — Proveedor (SIEMPRE)
```
ask_question({
  prompt: "¿Con qué proveedor fincamos la requisición?",
  allowFreeform: true,
  options: [
    { id: "prov1", label: "<beneficiadora del grano (Recomendado)>" },
    { id: "prov2", label: "<top 2>" },
    { id: "prov3", label: "<top 3>" }
  ]
})
```
Si el usuario escribe otro, resuélvelo a clave con `buscar_registro(Prov)` en la fase 2.

### P2 — Cantidad (SOLO si hay alternativa real: gemelos o stock objetivo)
```
ask_question({
  prompt: "¿Qué cantidad compramos de los artículos confirmados?",
  allowFreeform: true,
  options: [
    { id: "familia", label: "Consolidar por familia, <N> kg de <grano> (Recomendado)" },
    { id: "faltante", label: "El faltante exacto por partida" },
    { id: "cobertura", label: "Cobertura completa (faltante + objetivo)" }  // solo si hay stock objetivo
  ]
})
```
Si NO hay alternativa (sin gemelos ni stock objetivo), resuélvelo solo: "compro el faltante
exacto" — no preguntes.

### P3 — Alcance (SOLO si hay mezcla de clasificaciones)
### P4 — Desviación de inventario dudoso (SOLO si aplica: defecto/gorgojo/vencido)

**Ejemplo real (julio 2026):** 4 críticos sin mezcla → no alcance; sin inventario dudoso →
no desviación; hay gemelos de frijol → sí cantidad. El batch queda **[proveedor, cantidad]**.

## Fase 2 — Requisición pre-llenada + AUTORIZACIÓN (turno posterior) · [todo: presentar+autorizar → in_progress]

Tras responder el batch, construye la requisición y preséntala (tabla limpia). Luego emite
la autorización en ESTE turno (finanzas autoriza la propuesta después de verla):

```
## Requisición propuesta — Julio 2026

| Artículo | Descripción | Cantidad | Proveedor | Llega en ~ | Importe |
|---|---|---|---|---|---|

<una línea: importe total y, si aplica, "requiere aprobación de finanzas">
```

```
ask_question({
  prompt: "La requisición queda así: <resumen con importe>. ¿Autorizas que quede lista para finanzas?",
  options: [
    { id: "autorizar", label: "Autorizar (Recomendado)", style: "primary" },
    { id: "ajustar", label: "Ajustar", style: "danger" }
  ]
})
```

- El agente es read-only: no ejecuta escrituras; la emisión la hace el ERP/portal.
- Si "Ajustar", reabre solo la decisión que corresponda y vuelve a presentar.

## Fase 3 — Sábana final (respuesta completa) · [todo: todo completed]

```
## Requisición de abasto — Julio 2026 (autorizada por ti)

| Artículo | Descripción | Cantidad | Proveedor | Llega en ~ | Importe | Estatus |
|---|---|---|---|---|---|---|

Sábana de autorización:
- Planeación propone: ✅ requisición lista
- Finanzas autoriza: ⏳ pendiente de aprobación
- Compras ejecuta: ⏳ pendiente → el sistema emite la orden

- Aprobación de finanzas: <si el importe supera un tope, indicarlo>
- Impacto en producción: <con tiempo de entrega de N semanas, el material llega la semana X>
- Siguiente paso: <qué sigue>.
```

No inventes aprobaciones pendientes (finanzas/compras quedan ⏳ hasta que el sistema las
confirme).

## Reglas de eficiencia

- Los SPs de faltante ya hacen la explosión: no traigas entidades completas.
- `ArtDisponibleDesc`/presupuesto/costos SOLO de los artículos con faltante (or-chain
  acotado, máx ~25).
- Lead time: `Art` (or-chain) + `ArtFamFC` (catálogo chico) UNA vez.
- Proveedores: un `aggregate_records` + un `read_records(Prov)`.
- Encadena pasos independientes en paralelo en el mismo step.
- Si el usuario no responde una gate (timeout), continúa con la opción recomendada y
  decláralo.
