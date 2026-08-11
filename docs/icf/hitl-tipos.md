# Atlas HITL — Todos los tipos de Human-in-the-Loop del agente Sigma

> Documento de la fábrica (2026-08-11). Catálogo exhaustivo de los **tipos de gate HITL**
> que el agente Sigma (Eve 0.29.2) puede producir, mapeados 1:1 con:
> (a) el **contrato de Eve** (web channel + `input.requested` / `authorization.required`),
> (b) el **equivalente en VS Code Copilot** (tool `ask_user`, `ChatInputQuestion`,
> `PendingConfirmation`, autorización OAuth),
> (c) el **componente Questionnaire** de sk-eve,
> (d) los **requerimientos de negocio del tenant ICF** (reunión 2026-08-05).
>
> Referencias: `docs/icf/hitl-copilot-ask.md`, `docs/icf/requerimientos-reunion-2026-08-05.md`,
> `docs/icf/demo-agente-icf-primer-usecase.md`, `src/routes/chat/hitl-atlas/` (demo).

---

## 1. El contrato de Eve (verificado contra `vercel/eve` `main`)

### 1.1 `input.requested` → part `dynamic-tool`

Cuando el modelo necesita una decisión humana, el runtime emite el evento
`input.requested` con uno o más `InputRequest`. El reducer del cliente proyecta
cada request como un part `dynamic-tool` con `toolMetadata.eve.inputRequest`
(state `approval-requested`). Responder = `agent.send({ inputResponses: [{ optionId?, text?, requestId }] })`.

**Kinds de `InputRequest`** (`#runtime/input/types.js`):

| Kind | Qué significa | UI natural |
|---|---|---|
| `question` | El modelo pregunta (tool `ask_question` / `ask_user`) | radios / dropdown / texto libre |
| `tool-approval` | Aprobar/denegar la ejecución de un tool (operación peligrosa: escritura) | tarjeta de confirmación (approve/cancel) |
| `session-limit` | Continuar la sesión tras el límite (harness-authored, sin tool call detrás) | confirmación de continuación |

**Clase del request** (`input-request-class.ts`):

| Clase | Comportamiento |
|---|---|
| `required` | Debe responderse explícitamente; otros inputs entran en cola y se reenvían tras la respuesta |
| `dismissable` | Un mensaje normal del usuario cuenta como "siguió de largo"; el request se resuelve como `tool-result` con `status: "ignored"` y el modelo continúa en el MISMO step |

**Display** (cómo lo renderizan los canales; p. ej. Slack `renderInputRequestBlocks`):
- `display: "select"` con ≤ N opciones → radios/botones (una respuesta).
- `display: "select"` con muchas opciones → dropdown/select.
- Sin opciones o `allowFreeform: true` → campo de texto libre.
- Opciones con estilo `primary` / `danger` → botones de acción (aprobación).

### 1.2 `authorization.required` → part `authorization`

Evento separado para **autorización de conexiones** (OAuth / device code). El
harness emite `authorization.required` por cada challenge y **parquea** la sesión;
los canales renderizan un affordance de sign-in. El modelo NUNCA ve la URL/código
(se omite del output de tool). Al completarse → `authorization.completed` con
outcome `authorized | declined | timed-out | failed`.

Reto desde una tool: `requestAuthorization(challenges)` (con `name`, `challenge`,
`hookUrl`, `resume`). Los challenges tienen `url` (OAuth) o `userCode` (device code).

### 1.3 Eventos del stream relevantes

| Evento | Contenido |
|---|---|
| `input.requested` | `requests: InputRequest[]` (kind, display, prompt, options, allowFreeform) |
| `authorization.required` | `name`, `description`, `authorization?` (url/userCode), `webhookUrl?` |
| `authorization.completed` | `name`, `authorization?`, outcome |
| `message.completed` | texto del modelo |
| `actions.requested` / `action.result` | tool calls |

---

## 2. El catálogo completo de tipos HITL (10) — Atlas

Cada tipo tiene su gate en el demo `/chat/hitl-atlas`. Mapa:

| # | Tipo (surface) | Contrato Eve | Equivalente Copilot | Questionnaire | Req. ICF | Implementado |
|---|---|---|---|---|---|---|
| 1 | **Pregunta con opciones** (single-select) | `question` / display select | `ask_user { question, choices }` · `single-select` | `Choice` radio | R-FIN-06 (enfoque de desviaciones) | ✅ demo2/demo3 + atlas |
| 2 | **Selección múltiple** (multi-select) | `question` con varias respuestas | `multi-select` | `Item multiple` (checkbox) | R-COM-02 (faltantes a requisicionar) | ✅ atlas |
| 3 | **Texto libre** (freeform) | `question` con `allowFreeform` | `allow_freeform: true` · `wasFreeform` | `Input` libre | R-COM historial (proveedor "otro") | ✅ demo2/demo3 + atlas |
| 4 | **Formulario estructurado** (multi-campo) | `question` con schema | `ask_user { requestedSchema }` | `Item` + varios `Input`/`NativeSelect` | R-COM-01/R-COM-03 (datos de compra) | ✅ demo `form` + atlas |
| 5 | **Aprobación de escritura** (tool-approval) | `tool-approval` / display confirmation | `PendingConfirmation` · permission gates | tarjeta con botones primary/danger | R-FIN-01 (tope de presupuesto) | ✅ chat real + atlas |
| 6 | **Sí/No** (boolean) | `question` con 2 opciones | `boolean` | 2 `Choice` | R-COM-03 (recálculo de forecast) | ✅ atlas |
| 7 | **Cantidad** (number) | `question` con campo numérico | `number` / `integer` (min/max/default) | `Input type=number` | R-FIN-05 (semanas de cobertura) | ✅ atlas |
| 8 | **Omitible** (dismissable) | clase `dismissable` | "seguir de largo cuenta como moverse" | gate + botón "Continuar sin responder" | R-DIR-01/R-DIR-04 (no microgestionar) | ✅ atlas |
| 9 | **Autorización de conexión** (OAuth) | `authorization.required` → part `authorization` | OAuth / device code de permisos | card de sign-in (código + URL) | conexión a finanzas/ERP | ✅ chat real + atlas |
| 10 | **Timeout / auto-cancel** | grace window del canal | `UNOBSERVED_CLIENT_TOOL_GRACE_MS` (5 s) | countdown + auto-cancel | R-DIR-01 (política por defecto) | ✅ demo `timeout` + atlas |

### Tipos "de framework" que NO son gates de pregunta (contexto)

| Gate | Evento | Nota |
|---|---|---|
| Permisos de tool (read/write/shell/MCP/url) | `permission.requested` | auto-aprueba en autopilot |
| Aprobación de plan | `exit_plan_mode.requested` | "Ready to code?" |
| **Pregunta al usuario** | `ask_user` / `input.requested` | NUNCA se auto-responde (solo timeout) |
| Continuación de sesión | `session-limit` | harness-authored |

---

## 3. Mapeo a requerimientos de negocio ICF (2026-08-05)

Cada gate del atlas resuelve un requerimiento real de la reunión, con datos reales
del MCP (presupuesto julio 2026, faltantes MRP, proveedores, plan a 3 meses):

| Gate (tipo) | Requerimiento | Pregunta de negocio (surface) |
|---|---|---|
| G1 single-select | R-FIN-06 — "solo las desviaciones" | "¿Cómo enfocamos la revisión de las desviaciones?" (Solo críticos / Causa raíz / Por proveedor) |
| G2 multi-select | R-COM-02 — no comprar lo que ya hay | "¿Qué faltantes confirmas para la requisición?" (FRIJOL NEGRO 2024, TARIMA CHEP, PIMIENTA MOLIDA) |
| G3 form | R-COM-01/R-COM-03 — datos de compra + lead times | "Captura los datos de la compra directa" (material, cantidad, unidad, fecha) |
| G4 approval | R-FIN-01 — no operar sin presupuesto | "¿Autorizas la escritura en el ERP?" (tope excedido → autorización extraordinaria) |
| G5 freeform | R-COM — historial de proveedor | "¿Con qué proveedor cotizamos? (o escribe otro)" (RG / LETICIA / VACA + texto libre) |
| G6 number | R-FIN-05 — días de consumo por familia | "¿Cuántas semanas de cobertura configuramos para granos?" (1–8, default 4) |
| G7 boolean | R-COM-03 — recálculo al modificar forecast | "¿Autorizas el recálculo del plan al alza?" (Sí/No) |
| G8 dismissable | R-DIR-01 — no microgestionar | "¿Libero los primeros 2 meses para ejecución?" (Autorizar / Continuar sin responder) |
| G9 authorization | escritura → conexión con finanzas | "Conectar Finanzas" (OAuth con código + botón) |
| G10 timeout | R-DIR-01 — política por defecto | "¿Confirmas el alta de la OC?" (countdown 12 s → auto-cancel) |

---

## 4. Cómo se implementa cada tipo (sk-eve)

### 4.1 Componentes reutilizables

- **`src/routes/chat/hitl-atlas/atlas-gate.svelte`** — gate genérica con `variant`:
  `single | multiple | number | form | approval | boolean | dismissable`
  (+ `freeform` opcional en single, + `timeoutMs` opcional). Tras responder
  colapsa a resumen Q/A persistente. El `onsubmit(summary, data)` entrega el
  texto de la respuesta al chat scripteado.
- **`src/routes/chat/hitl-atlas/authorization-card.svelte`** — part `authorization`:
  estado `required` (código + botón "Iniciar sesión con X") → `completed/authorized`.
- **`src/routes/chat/demo2/hitl-gate.svelte`** — single-select + freeform (base).
- **`src/lib/components/ai-elements/input-request/`** — gate HITL del chat REAL
  (contrato Eve directo: `toolMetadata.eve.inputRequest`).
- **`src/lib/components/ai-elements/authorization/`** — part `authorization` real.

### 4.2 El patrón de timeline (demo3 → atlas)

Las gates son **content parts persistentes** del transcript: cada gate se intercala
justo después del assistant que preguntó y, al responder, colapsa a su resumen Q/A
en esa posición (base para almacenar/precargar conversaciones: cada turno lleva sus
gates resueltas como registro Q/A serializable). Sin autoScroll (patrón /demo):
tu respuesta queda arriba y la respuesta del agente genera debajo; flecha ↓ con
badge ámbar cuando hay pregunta pendiente.

### 4.3 Reglas de superficie (convención "surface simple, core procedural interno")

- El usuario ve SOLO lenguaje de negocio; nunca el tipo de gate, ni `ask_user`,
  ni kinds/eventos, ni entidades/SPs/campos UPPERCASE. En el atlas SÍ se muestran
  badges de tipo porque es un demo de la fábrica (para inspección), no de negocio.
- El agente reanuda con la respuesta como tool_result (no "relee" la conversación).
- Toda gate de pregunta tiene timeout de cancelación (política por defecto).
- La pregunta nunca se auto-responde; solo los gates de permiso se auto-aprueban.

---

## 5. Siguientes pasos (maximizar el provecho según la tesis)

1. **Real `/chat`**: los 10 tipos ya tienen su mapeo al contrato Eve (la UI real ya
   renderiza `inputRequest` + `authorization`). Falta: `multiple`, `form`, `number`,
   `boolean`, `dismissable`, `timeout` como variantes de render del part
   `dynamic-tool` (hoy solo options + freeform).
2. **Conexiones reales**: `authorization.required` requiere un connection
   definido en el agente (p. ej. conexión OAuth a finanzas/ERP). Verificar qué
   connections publica el runtime de sk-eve y añadir la que habilite escritura.
3. **`dismissable` real**: verificar que Eve 0.29.2 soporta clase `dismissable`
   en `InputRequest` y exponerla (hoy el runtime emite `required`).
4. **Almacenar/precargar**: el modelo de timeline (gates resueltas como Q/A) es la
   base del requerimiento original del usuario (conversaciones pasadas).
5. **Evals**: añadir `evals/hitl-atlas.eval.ts` que verifique que cada gate del
   atlas responde y reanuda (invariante por tipo, no ruta).
