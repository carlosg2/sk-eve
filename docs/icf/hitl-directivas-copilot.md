# Directivas HITL de Copilot — qué instrucciones contempla para saber CÓMO y CUÁNDO usar `ask` y los gates

> Documento de la fábrica (2026-08-11). Investigación verificada contra el código fuente de
> `microsoft/vscode` (main): el prompt real del agente Copilot CLI (snapshots E2E de
> `src/vs/platform/agentHost/test/node/e2e/providers/__snapshots__/`), la tool `ask_user`,
> el protocolo agent host y los gates de permiso. Objetivo: extraer las **directivas
> accionables** para el agente Sigma (Eve 0.29.2) y cerrar el hueco entre el Atlas HITL
> (`/chat/hitl-atlas`, `docs/icf/hitl-tipos.md`) y el comportamiento real del agente.

---

## 1. La sección `<ask_user>` del system prompt de Copilot (VERBATIM)

El prompt real que recibe el agente Copilot contiene esta sección (idéntica en todos los
snapshots de modelos gpt-5, claude-*, gemini-*):

```
<ask_user>
Use the ask_user tool to ask the user clarifying questions when needed.

**IMPORTANT: Never ask questions via plain text output.** When you need input from the user,
use this tool instead of asking in your response text. The tool provides a better UX and
ensures the user's answer is captured properly.

Guidelines:
- Prefer multiple choice (provide choices array) over freeform for faster UX
- Do NOT include "Other", "Something else", or similar catch-all choices - the UI
  automatically adds a freeform input option
- Only use pure freeform (no choices) when the answer truly cannot be predicted
- Ask one question at a time - do not batch multiple questions
- Don't ask the questions in bullet points or numbered lists. Ask each question in a clear
  sentence or paragraph form.
- If you recommend a specific option, make that the first choice and add "(Recommended)"
  to the label
  Example: choices: ["PostgreSQL (Recommended)", "MySQL", "SQLite"]

Examples:
1. BAD - bundling multiple questions into one and asking the user to confirm or break them
   apart → WORKAROUND - ask one focused question per tool call
2. BAD - embedding choices in the question text instead of using the choices field →
   WORKAROUND - put the options in the choices array

When to STOP and ask (do not assume):
- Design decisions that significantly affect implementation approach
- Behavioral questions (e.g., "should this be unlimited or capped?")
- Scope ambiguity (e.g., which features to include/exclude)
- Edge cases where multiple reasonable approaches exist
</ask_user>
```

### La descripción de la tool `ask_user` (schema que ve el modelo)

```
#### ask_user
Ask the user a question and wait for their response.
Use this tool when you need to ask the user questions during execution. This allows you to:
1. Gather user preferences or requirements
2. Clarify ambiguous instructions
3. Get decisions on implementation choices as you work
4. Offer choices to the user about what direction to take
```

---

## 2. El equilibrio: sesgo a la acción vs. detenerse a preguntar

Copilot balancea la autonomía con dos bloques del mismo prompt:

### `<tips_and_tricks>` (cuándo pedir guía)
```
* Ask for guidance if uncertain; use the ask_user tool to ask clarifying questions
```

### `<solution_persistence>` (cuándo NO preguntar)
```
<solution_persistence>
Be extremely biased for action. If a user provides a directive that is somewhat ambiguous
on intent, assume you should go ahead and make the change. If the user asks a question like
"should we do x?" and your answer is "yes", you should also go ahead and perform the action.
It's very bad to leave the user hanging and require them to follow up with a request to
"please do it."
</solution_persistence>
```

**Lectura conjunta:** NO preguntar por defecto (actúa con el supuesto razonable y decláralo),
pero DETENTE y pregunta cuando (a) la decisión cambia el enfoque de forma significativa,
(b) es una pregunta de comportamiento/umbral, (c) hay ambigüedad de alcance real, o (d) hay
varios enfoques razonables y mutuamente excluyentes. Y cuando preguntes, SIEMPRE por la
tool (nunca en texto plano).

---

## 3. Los gates de permiso/aprobación (además de ask_user)

El agent host distingue DOS superficies de HITL (ver `agentHost/common/agentHostSchema.ts`,
`agentHost/node/copilot/copilotAgentSession.ts`, `agentHost/node/claude/CONTEXT.md`):

| Gate | Evento / mecanismo | UI | Autopilot |
|---|---|---|---|
| **Pregunta al usuario** | `ask_user` / `user_input.requested` | question carousel (options + freeform) | NUNCA se auto-responde (se cancela por timeout) |
| **Permiso de tool** | `permission.requested` / `canUseTool` (Claude) | tarjeta Aprobar/Denegar | auto-aprueba (`permissionMode: bypassPermissions`) |

### `permissionMode` (cómo el SDK decide qué llega al humano)

- **`default`**: auto-aprueba lecturas; **escrituras / shell / red** pasan por el gate
  (`canUseTool`). Es el "read-only por defecto" de Sigma.
- **`acceptEdits`**: las ediciones también se auto-aprueban (solo shell/red gating).
- **`bypassPermissions`**: modo autopilot; todo auto-aprobado.
- **`plan`**: modo plan (solo planificación).
- Los built-ins interactivos (`AskUserQuestion`, `ExitPlanMode`) están **exentos** del
  auto-approval: SIEMPRE llegan al humano.
- Denegar = `{ behavior: "deny", message }` → el modelo recibe `status: "denied"` y se
  adapta (cancela, ajusta o pregunta).
- `chat.autoReply` (setting): en autopilot el host puede auto-responder preguntas en vez de
  bloquear.

### Respuesta del modelo cuando el usuario no está disponible (autopilot)

```ts
// askQuestionsTool.ts
export const AUTOPILOT_ASK_USER_RESPONSE =
  'The user is not available to respond and will review your work later. Work autonomously and make good decisions.';
```

---

## 4. Mapeo al agente Sigma (Eve 0.29.2) — estado actual vs. lo que falta

| Concepto Copilot | En Sigma hoy | Hueco |
|---|---|---|
| Sección `<ask_user>` del prompt | **NO existe** en `agent/instructions.md` | ❌ el modelo no tiene directivas de cuándo/cómo preguntar |
| "Nunca preguntar en texto plano" | El agente hoy suele terminar el turno preguntando en texto | ❌ debe usar `ask_question` (gate) |
| Tool `ask_user` | `ask_question` (framework tool de Eve): "Pregunta al usuario y espera respuesta (evento HITL input.requested)" | ⚠️ descripción mínima; el guidance va en el system prompt |
| Gate de pregunta | `input.requested` → part `dynamic-tool` → UI `/chat` (validado) | ✅ |
| Gate de permiso/escritura | `approval: always()` en tools de escritura MCP (`erp.ts` `WRITE_TOOL_RE`) | ✅ |
| `permissionMode default` | read-only por defecto + approval en escrituras | ✅ (equivalente) |
| Autopilot fallback | No aplica (chat síncrono); timeout de gates cubre el "usuario no disponible" | ✅ (Atlas G10) |
| Balance "bias for action" | Parcial: instructions exigen silencio/acción pero sin regla explícita de cuándo preguntar | ⚠️ |

**Conclusión:** lo que falta es la **sección de directivas HITL en el system prompt** del
agente (equivalente al `<ask_user>` de Copilot + el balance), adaptada al lenguaje de
negocio del tenant y a los tipos de decisión reales de ICF (Atlas G1..G10). La UI y el
contrato ya están listos (Atlas + `input-request.svelte`).

---

## 5. Directivas propuestas para `agent/instructions.md` (Sigma)

### 5.1 Principio: sesgo a la acción, pregunta solo lo que importa

1. **Por defecto NO preguntes.** Ejecuta con el supuesto razonable (periodo actual,
   familia por contexto, "todas las variantes") y declara el supuesto en la respuesta.
2. **Nunca preguntes en texto plano.** Si necesitas una decisión, usa la tool
   `ask_question` (pausa el turno y muestra una gate con opciones). Terminar el turno con
   "¿quieres X o Y?" en texto es un defecto: el usuario no tiene dónde responder.

### 5.2 Cuándo SÍ detenerse y preguntar (gate `ask_question`)

- **Antes de escribir en el ERP** cuando hay alternativas mutuamente excluyentes
  (proveedor, prioridad, meses a liberar) — el approval gate ya confirma la escritura;
  la pregunta decide CÓMO.
- **Ambigüedad de alcance real**: el usuario no distingue entre opciones que cambian el
  resultado (qué periodo, qué familia, qué almacén) y no hay un default obvio.
- **Decisiones de negocio con opciones excluyentes** (enfoque de revisión, umbrales de
  cobertura, autorizar recálculo).
- **Casos borde con varias interpretaciones razonables** del dato que se pide.

### 5.3 Cuándo NO preguntar

- Consultas de solo lectura con default razonable (responde y menciona el supuesto).
- Cuando el Company Twin/skill ya define el comportamiento.
- Cuando la pregunta sería trivial (el usuario espera el dato, no un cuestionario).
- Solo lectura + el agente ya tiene todos los parámetros.

### 5.4 Cómo formular la pregunta (reglas de superficie)

- **Una sola pregunta por llamada** de `ask_question`; si hay varias, secuéncialas.
- **Prefiere opciones** (2-4) sobre texto libre; no incluyas "Otro" (la UI añade el campo
  libre automáticamente).
- Si recomiendas una opción, ponla primero con "(Recomendado)".
- Lenguaje de negocio (nunca entidades/tools/campos); la pregunta como la haría un
  analista: "¿Con qué proveedor cotizamos?", no "¿Quieres que ejecute create_record?".
- Nunca una lista numerada de preguntas; una oración clara.

### 5.5 Contraste con el approval gate (escritura)

- `ask_question` = **decisión** (qué hacer). El approval = **confirmación** (ejecutar la
  escritura). Ambos pueden encadenarse: decide con opciones → confirma la escritura.
- Si el usuario no responde (timeout), continúa con la política por defecto declarada
  (nunca inventar una escritura).

---

## 6. Referencias de código (microsoft/vscode, main)

- Prompt real del agente (snapshot E2E): `src/vs/platform/agentHost/test/node/e2e/providers/__snapshots__/Agent_Host_E2E___Copilot_prompts_gpt-5.prompt.md` (sección `<ask_user>` + `<tips_and_tricks>` + `<solution_persistence>`; el mismo bloque en todos los snapshots de modelos).
- Tool `ask_user` (definición): `extensions/copilot/src/extension/chatSessions/copilotcli/common/copilotCLITools.ts` y `src/vs/platform/agentHost/node/copilot/copilotToolDisplay.ts`.
- Autopilot fallback: `src/vs/workbench/contrib/chat/common/tools/builtinTools/askQuestionsTool.ts` (`AUTOPILOT_ASK_USER_RESPONSE`).
- Schema agent host (autoReply, permissionMode): `src/vs/platform/agentHost/common/agentHostSchema.ts`.
- Gates de permiso: `src/vs/platform/agentHost/node/claude/claudeCanUseTool.ts`, `claudeToolDenial.ts`, `claudeSessionPermissionMode.ts`, `claude/CONTEXT.md`.
- Otros agentes: `src/vs/platform/agentHost/node/codex/codexUserInputMapper.ts` (codex solo expone `request_user_input` en modo plan), `codexElicitationMapper.ts` (forma `form` del schema).
