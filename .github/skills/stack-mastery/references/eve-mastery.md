# Manual de dominio: Eve 0.29.2

> Referencia de dominio para el framework de agentes durables de Vercel usado en sk-eve.
> Fuente primaria: `node_modules/eve/docs/` (paquete `eve@0.29.2`, "filesystem-first framework for durable backend AI agents"). Verificado contra el uso real en `agent/` y `evals/` de sk-eve.

## 1. Modelo de ejecución y durabilidad

Eve organiza el trabajo en tres niveles anidados:

- **Session**: la conversación durable completa. Vive días/semanas, sobrevive crashes, reinicios y redeploys.
- **Turn**: un mensaje de usuario y todo lo que dispara (llamadas al modelo, tools, razonamiento).
- **Step**: checkpoint durable dentro del turno (una llamada al modelo + las tool calls que hace).

Cada turno corre como un *durable workflow* (Workflow SDK de Vercel; Vercel Workflow al desplegar en Vercel, "local world" con estado en `.eve/.workflow-data` servido por Nitro en dev/self-host). Eve hace checkpoint al final de cada step: **un step completado nunca se re-ejecuta** (se rehace *replay* del resultado registrado); un step interrumpido sí se reintenta (hasta 4 veces). Consecuencia práctica: los efectos secundarios no idempotentes (cargos, emails) deben ser idempotentes o gatearse con aprobación. El reintento re-emite sus eventos al stream con ids NUEVOS (mismo `turnId`/`stepIndex`/`sequence`), así que los consumidores ven ambos intentos.

**Parked work**: la aprobación humana (HITL), un OAuth de conexión o un subagente largo *parkean* el turno: el workflow suspende sin retener cómputo y retoma exactamente donde quedó cuando llega el input.

**Dos handles que no se confunden** (el error más común):
- `continuationToken`: handle de *resume* (lo posee el channel). Se usa para mandar el siguiente mensaje a la misma sesión. Solo hay uno activo; uno stale se rechaza.
- `sessionId` / `runId`: handle de *stream e inspección* (lo posee el runtime).

No hay cola FIFO durable de mensajes: envía un turno a la vez y espera `session.waiting` antes del siguiente. Sesiones por defecto duran 30 días (`limits.sessionTimeoutMs` en `agent.ts`, o `false` para desactivar).

**Stream NDJSON** (`GET /eve/v1/session/:id/stream`): eventos `session.started`, `turn.started`, `message.received`, `step.started`, `actions.requested` (tool calls antes de ejecutar), `action.result`, `input.requested` (HITL), `subagent.called`/`subagent.completed`, `reasoning.*`, `message.*`, `result.completed` (output schema), `compaction.*`, `authorization.*`, `step/turn.completed|failed|cancelled`, `session.waiting|failed|completed`. Cada evento lleva `meta: { id, at }` — `meta.id` es un ULID estable, la clave para ingestar a BD sin duplicados (`on conflict (id) do nothing`). **Orden de dispatch por evento**: 1) handler del channel, 2) proyección de metadata, 3) hooks, 4) resolvers dinámicos (que ya ven la metadata fresca).

## 2. Primitivas de la API TypeScript

La identidad sale del **filesystem**, no de un campo: `agent/tools/get_weather.ts` es el tool `get_weather`. La mayoría de archivos son `import { defineX } from "eve/..."; export default defineX({...})`.

| Primitiva | Import | Dónde | Cuándo usarla |
|---|---|---|---|
| `defineAgent` | `eve` | `agent/agent.ts` (y `agent/subagents/<id>/agent.ts`) | Config raíz: `model` (obligatorio si existe `agent.ts`), `reasoning`, `compaction`, `limits`, `outputSchema`, `experimental.workflow.world`, `build.externalDependencies`. |
| `defineTool` | `eve/tools` | `agent/tools/<name>.ts` | Integraciones tipadas: `description`, `inputSchema` (Zod), `execute(input, ctx)`, `approval`. |
| `defineDynamic` | `eve/tools`, `eve/skills`, `eve/instructions` | `agent/{tools,skills,instructions}/` | Resolver capabilities por sesión/turno/step (ver §3). |
| `defineMcpClientConnection` / `defineOpenAPIConnection` | `eve/connections` | `agent/connections/<name>.ts` | Tools remotos MCP / operaciones OpenAPI (ver §8). |
| `defineSkill` | `eve/skills` | `agent/skills/<name>.ts` | Procedimientos bajo demanda (`load_skill`). Alternativa: markdown plano o `SKILL.md` empaquetado. |
| `defineInstructions` | `eve/instructions` | `agent/instructions.ts` | Prompt compuesto a build time. |
| `defineHook` | `eve/hooks` | `agent/hooks/<slug>.ts` | Observar el stream de eventos (ver §4). |
| `defineSchedule` | `eve/schedules` | `agent/schedules/<name>.ts` | Trabajo recurrente (ver §6). |
| `defineState` | `eve/context` | tools/hooks/lifecycle | Memoria durable por sesión: `defineState("ns.name", () => initial)` → `get()`/`update(fn)`. Requiere contexto Eve activo. Nunca compartida con subagentes. |
| `defineSandbox` | `eve/sandbox` | `agent/sandbox.ts` | Backend, recursos y política de red del sandbox. |
| `defineInstrumentation` | `eve/instrumentation` | `agent/instrumentation.ts` | Export OTel + runtime context por step. |
| `defineRemoteAgent` | `eve` | `agent/subagents/<id>/agent.ts` | Delegar a OTRO deployment de Eve (requiere `description`). |
| `defineEval` / `defineEvalConfig` / `mockModel` | `eve/evals` | `evals/*.eval.ts`, `evals/evals.config.ts` | Evals (ver §5). |
| `eveChannel` y platform channels | `eve/channels/*` | `agent/channels/<name>.ts` | Front-door de mensajería + auth de rutas (`auth: [localDev(), vercelOidc()]`). |

Complementos: `disableTool()` (quita un built-in; el nombre de archivo elige cuál), `experimental_workflow()` (`agent/tools/workflow.ts`, tool `Workflow` para que el modelo orqueste subagentes desde JS en un solo step durable, `maxSubagents` 100 por defecto, root-only, corre en sandbox QuickJS), `sleep` (`eve/tools/sleep`), `always()/once()/never()` (`eve/tools/approval`), built-ins importables de `eve/tools/defaults` (`bash`, `readFile`, `writeFile`, `glob`, `grep`, `webFetch`, `webSearch`, `todo`, `loadSkill`). Built-ins por defecto: `bash`, `read_file`, `write_file` (con read-before-write), `glob`, `grep` (proxean al sandbox), `web_fetch`, `web_search`, `todo`, `ask_question` (HITL), `agent` (root-only), `load_skill`, `connection_search`.

**⚠️ Nombres que NO existen en 0.29.2** (verificado contra `dist/src/public/index.d.ts`): no hay `defineSubagent` (los subagentes se declaran con `defineAgent` bajo `agent/subagents/<id>/` o `defineRemoteAgent`), no hay `defineWorkflow` (es el tool opt-in `experimental_workflow`), no hay helper `needsApproval` (la aprobación es el campo `approval` con `always/once/never` o una política custom). No inventes estas APIs.

## 3. `defineDynamic` a fondo

`defineDynamic({ events })` resuelve en runtime qué tools/skills/instructions/modelo ve el agente, leyendo `ctx.session.auth` o metadata del channel (quién llama, qué tenant, feature flags).

**Eventos soportados** (resuelven en este orden: step > turn > session > fallback):

| Evento | Tools | Skills | Instructions | Modelo |
|---|---|---|---|---|
| `session.started` | ✅ una vez por sesión | ✅ | ✅ | ✅ |
| `turn.started` | ✅ una vez por turno | ✅ (no step) | ✅ | ✅ |
| `step.started` | ✅ antes de cada llamada | ❌ | ❌ | ✅ (único scope que admite devolver `LanguageModel` en vivo) |

**Qué puede devolver**: un `defineTool(...)`/`defineSkill(...)`/`defineInstructions(...)` único (se nombra por el slug del archivo), un `Record<string, def>` (nombrado por la **key pelada**, sin prefijo automático — namespácea tú: `"tenant__export"`), o `null` (nada). **Override**: un tool/skill dinámico con el mismo nombre que uno *authored* lo reemplaza por caller; dos dinámicos con el mismo nombre lanzan error de build. **Regla crítica de replay**: `execute` debe ser una función inline (arrow/method como valor directo de la propiedad); `execute: myFn` o `execute: makeFn()` funciona el primer step pero no sobrevive replay tras crash/resume. Para el modelo, `fallback` es obligatorio (ancla el metadata de build) y los fallos degradan al siguiente scope, nunca rompen el turno. Prefiere `session.started`: los prompt caches son por modelo y cambiar a mitad de sesión re-ingesta a precio no cacheado.

## 4. Hooks

`defineHook({ events: { "evento"(event, ctx) {...}, "*"(...) } })`. Suscriben a **cualquier evento del stream** (+ `*` para todos). **Son observe-only**: no pueden vetar una tool call ni inyectar contexto al modelo (eso es trabajo de `defineDynamic`/`defineInstructions`); sus valores de retorno se ignoran. Corren SIEMPRE después de que el evento quedó durablemente registrado, en orden (handlers tipados primero, luego `*`). `HookContext`: `{ agent, channel, session }`. `toolResultFrom(event.data.result, toolDef)` (de `eve/tools`) estrecha un `action.result` a un tool authored (output tipado) o conexión (output `unknown`).

**Semántica at-least-once**: si un step se interrumpe y reintenta, el hook corre de nuevo con eventos nuevos (ids nuevos). Para efectos únicos por turno, key por `turnId`/`stepIndex`/`sequence`; para contenido almacenado, key por `meta.id` (el reintento puede traer texto distinto bajo las mismas coordenadas). **Un hook que lanza → `turn.failed` → posible `session.failed`**: envuelve el cuerpo en try/catch. Los hooks de subagentes solo ven el scope del subagente.

## 5. Evals

`evals/*.eval.ts` + un `evals/evals.config.ts` (obligatorio, puede estar vacío). `defineEval({ description, test(t), judge, tags, timeoutMs })`; el id es la ruta del archivo.

- **Driver**: `await t.send(msg)` (resuelve al asentarse; devuelve turn inmutable con `.message`), `t.start` (turn en vivo: `waitForEvent`, `cancel`, `result`), `t.respond/respondAll`, `t.cancel`, `t.sendFile`, `t.newSession`, `t.requireInputRequest(filter)`, `t.require(value, assertion)` (gate que detiene el script si falla). Acceso: `t.reply`, `t.sessionId`, `t.events`, `t.target` (`fetch`, `dispatchSchedule(id)`, `attachSession(sessionId)`, `watchTurn`).
- **Aserciones deterministas**: `t.succeeded()`, `t.parked()`, `t.messageIncludes`, `t.calledTool(name, {input, output, status, count})` (matchers: literal parcial, RegExp o predicado), `t.notCalledTool`, `t.toolOrder`, `t.usedNoTools`, `t.maxToolCalls(n)`, `t.noFailedActions`, `t.calledSubagent`, `t.event/notEvent`, `t.eventOrder`, `t.eventsSatisfy(label, fn)` (escape hatch), `t.check(value, builder)` con `includes/equals/matches(schema)/similarity/satisfies` de `eve/evals/expect`.
- **Judge LLM**: `t.judge.autoevals.{factuality, summarizes, closedQA, sql}` — blando por defecto; `.atLeast(t)` (falla solo con `--strict`), `.gate(t)`. El modelo judge se resuelve per-call > per-eval > `defineEvalConfig` y **nunca es el modelo bajo prueba**; sin credenciales, un judge-backed eval hace skip visible.
- **Gates vs soft**: los métodos de run y `includes/equals/matches` son gates (falla → exit 1); `similarity` y `t.judge.*` son soft. `.soft()/.gate()/.atLeast()` para ajustar.
- **Correr**: `npx eve eval` (bootea dev server), `eve eval <id|prefijo>`, `eve eval --url <deploy> --strict --junit .eve/junit.xml` (recomendado para CI; exit 0/1/2), `--tag/--exclude-tag`, `--max-concurrency 8`, `--list`. Artifacts en `.eve/evals/<ts>/`. `mockModel` (de `eve/evals`) da un modelo determinista de fixture (`mockModel("texto")` o callback con `{lastUserMessage, toolResults...}`). Datasets: exportar un array de `defineEval` + `loadYaml/loadJson` de `eve/evals/loaders`.

## 6. Schedules / loops

`agent/schedules/<name>.ts`: `defineSchedule({ cron, markdown | run })` — **exactamente uno** de `markdown` (prompt fire-and-forget; "task mode", no puede parkear) o `run({ receive, waitUntil, appAuth })` (handler con control: entrega a un channel con `receive(channel, {message, target, auth})`, `waitUntil(promise)` mantiene la tarea viva, `appAuth` es el principal de la app). Cron de 5 campos, granularidad de minuto, **UTC en Vercel** (cada schedule = Vercel Cron Job). `eve dev` NUNCA dispara schedules por cron; en prod (`eve build && eve start`) corren como Nitro scheduled tasks. Para probarlos en dev: `POST /eve/v1/dev/schedules/<name>` (dev-only, devuelve `sessionIds`). Schedules son root-only. **Patrón dynamic scheduling**: un solo dispatcher `cron: "* * * * *"` que reclama filas vencidas de tu store (lease atómico) y llama `receive` por job + tools CRUD (`create_schedule` etc.) para que el agente gestione filas por tenant; entrega al menos una vez → idempotencia en efectos.

## 7. Subagentes

Dos formas de delegar:

1. **Tool built-in `agent`** (root-only): copia fresca del agente raíz; hereda instructions/tools/conexiones/sandbox; historia y state frescos; no recibe `agent` ni `Workflow`. Input `{ message, outputSchema? }`.
2. **Subagentes declarados**: `agent/subagents/<id>/agent.ts` con `defineAgent({ description (obligatoria), model })`. **Aislamiento total**: discovery trata el directorio como raíz propia; hereda NADA del padre (un slot ausente cae al default del framework, no a la versión del root); state NUNCA compartido; `schedules/` y `channels/` no existen en subagentes. El nombre del tool es el nombre pelado del path (`researcher`), sin prefijo — colisionar con un tool del mismo nombre es error de build. `outputSchema` → task mode con salida estructurada. El padre ve `subagent.called` (con `childSessionId` para suscribirse al stream hijo) y `subagent.completed`. La delegación NO es una frontera de aprobación por sí sola.

## 8. Conexiones MCP

`agent/connections/<name>.ts` → `defineMcpClientConnection({ url (Streamable HTTP o SSE), description (para el modelo), auth, tools: { allow | block }, approval })`. Los tools se exponen como `<conexion>__<tool>` vía el built-in `connection_search` (round-trip de discovery en el primer step). Auth: `connect("<uid>")` de `@vercel/connect/eve` (OAuth gestionado, user-scoped → emite `authorization.required` y parkea; `principalType: "app"` no interactivo), `auth.getToken` (bearer estático), o `headers` (API keys). El token se inyecta por llamada, cachea por step y **nunca se serializa al estado durable**. **Approval gates**: `once()` (primera vez por sesión), `always()`, `never()`, o política custom `(ctx) => "user-approval" | "not-applicable" | "approved" | "denied"` — recibe `toolName` CALIFICADO (`conn__tool`, matchea con `.includes/.endsWith`) y `toolInput` crudo no confiable (léelo defensivamente). Prefiere `tools.allow` (superficie mínima) sobre `block`.

## 9. Patrones multi-tenant que ya trae Eve

- **Approvals**: el campo `approval` es un hook async → un adaptador único (`decideTenantApproval(ctx)`) traduce `{session.auth.current, toolName, toolInput}` a la política de tu app; aplica igual a tools authored, OpenAPI y MCP. Re-chequea tenancy dentro del executor (approval es gate, no autorización) y usa idempotency keys (`${session.id}:${turn.id}`).
- **Auth outbound**: route auth estampa `tenantId` en `ctx.session.auth.current` (atributo verificado, nunca del prompt); helpers reutilizables `requireTenantCaller(ctx)` y `tenantBearerAuth(service)` (auth no interactivo `principalType: "user"` con `getToken({principal})` para conexiones); `headers` como función async de `ctx` para `X-Tenant-Id`. Tu app es dueña del ACL de session ids en las rutas de session/stream.
- **Memoria multi-tenant**: compón 3 primitivas — auth (tenant+user en `ctx.session.auth`), instructions dinámicas en `turn.started` que cargan las memorias del caller, y tools ordinarios `remember/list_memories/forget` (el executor elige tenant/user; el modelo solo key+value). El storage es de tu app; `defineState` NO sirve para memoria a largo plazo.
- **Dynamic scheduling**: ver §6.

## 10. Deployment

- **Vercel**: `eve link` + `eve deploy` (o git). El string de model id va por Vercel AI Gateway autenticado con OIDC de proyecto (sin API key). Vercel corre el web runtime, Vercel Workflow (persistencia durable), Vercel Cron (schedules, UTC) y Vercel Sandbox (`defaultBackend()`). El dashboard gana la pestaña **Agent Runs** (tags `$eve.*` automáticos: type/parent/root/subagent/trigger/title/model/tokens/tool_count) sin necesidad de instrumentation.
- **Self-host**: `eve build` → `eve start` (servidor Nitro en `.output/`). Persiste `.eve/.workflow-data` en disco o elige `experimental.workflow.world: "@workflow/world-postgres"` (línea `5.0.0-beta`, pinneado). Proxy: reenvía `/eve/` **y** `/.well-known/workflow/` (callbacks) sin reescribir. Schedules = Nitro scheduled tasks. `defaultBackend()` local; auth: no dependas de `vercelOidc()` fuera de Vercel.

## 11. Cómo usa Eve sk-eve (estado real)

- **Modelo dinámico por `step.started`** (`agent/agent.ts`): `defineDynamic` con `fallback` deepseek vía `@ai-sdk/gateway`; `buildModel()` usa `wrapLanguageModel` para sobreescribir `providerId/modelId` y que el id compuesto (metadata de context window/compaction) coincida con el catálogo del gateway. Cambiar `agent.md` en /studio surte efecto sin reiniciar.
- **Sin `agent/connections/`**: los tools MCP se resuelven como `defineDynamic` en `agent/tools/erp.ts` — `mcpListTools/mcpCallTool` (cliente JSON-RPC propio en `agent/lib/mcp-client.ts`, handshake con `mcp-session-id`, cache TTL 5 min, hardening de `first/primero` a número) contra el MCP del tenant ACTIVO, nombrados `intelisis-dab__<tool>` (allow-list por agente desde `agent.md`), escrituras con `approval: always()`.
- **Instrucciones dinámicas** en `session.started` (4 resolvers): `tenant.ts` (identidad), `agent-active.ts` (instrucciones del agente activo + soft-gate de tools MCP — los hooks no pueden vetar), `context-planner.ts` (mapa de ruteo del Company Twin; fase B bloqueada: `ctx.messages` llega vacío en `turn.started` y `message.received` corre después — workaround en el middleware), `memory.ts` (learnings del Twin inyectados).
- **Skills dinámicas** (`agent/skills/library.ts`): catálogo `agent/skill-library/*/SKILL.md` scopeado por tenant × membresía del agente.
- **Hooks**: `memory.ts` (captura errores de tools MCP en `action.result`, normaliza shapes DAB, escribe `state/learnings.md` — bucle de self-improvement, blindado) y `session-log.ts` (índice de sesiones + espejo `"*"` a SQLite `.data/sessions.sqlite3`, dedupe por `meta.id`, descarta deltas `*.appended` que cuadruplicaban la BD).
- **Instrumentación**: `step.started` captura el input real al LLM por step (`.eve/llm-io.jsonl` + copia durable en SQLite). Sin export OTel aún.
- **Guard de contexto**: middleware de modelo (`agent/lib/context-budget.ts`, `transformParams`) — trunca descriptions/schemas de tools, compacta tool-results de lectura (proyección por entidad + tope de filas), deduplica resultados repetidos, avisa de tool calls duplicadas e inyecta el plan de contexto por mensaje (fase B).
- **Evals** (4, deterministas, `evals.config.ts` timeoutMs 300s): `write-needs-approval` (toda escritura parquea en HITL), `eficiencia-turno` (≤10 calls, sin dups/errores), `no-entity-inexistente` (entidades reales del tenant, sin `describe_entities`), `schema-from-twin`. Corren contra el dev server interno con `--url`.
- **Gotchas documentados** (`.github/copilot-instructions.md`): hooks observe-only (el scope de tools por agente se comunica vía instrucciones); `step.started` NO es evento válido para instructions (se ignora silenciosamente); `connection_search` round-trip aceptado en 0.29.2; TODO el código de runtime va en try/catch (un throw rompe el turno y recarga la página); no recargar durante un turno activo (sesiones huérfanas + contenedores Docker del sandbox); `rm -rf .eve` es purga habitual pero el workflow-data vive en `.data/eve-workflow` (symlink); sesión = snapshot en `session.started` (editar skills no afecta la sesión activa); el proxy dev de Eve detecta el origin por la PRIMERA URL en stdout (nunca loguear `mcpUrl` al arrancar).

## 12. Oportunidades para sk-eve (primitivas SIN usar)

1. **`defineSchedule` → watchdog/loops proactivos**: hoy el agente solo responde. Un schedule (o el patrón dynamic-scheduling con store + CRUD) habilitaría monitoreo de gap-abasto/MRP, digests diarios de faltantes, limpieza de learnings stale o verificación de disponibilidad de entidades ICF, entregando por el canal eve/twilio con `receive` + `appAuth`.
2. **Subagentes declarados (`defineAgent` bajo `agent/subagents/`) → enjambre**: un analista de queries OData (solo tools de lectura, sandbox propio, sin `bash`), un validador de datos (contra-agente que verifica invariantes antes de responder) y un generador de skills. Cada uno con su propio `instructions/` y allow-list — aislamiento de contexto gratis. Complementar con el tool `experimental_workflow` para fan-out paralelo durable.
3. **Evals con judge + datasets**: `t.judge.autoevals.closedQA/factuality` para calidad de respuestas (hoy solo deterministas), evals de seguridad de memoria (que el agente no repita credenciales/learnings ajenos), multi-turn HITL con `t.respond`, `t.target.dispatchSchedule` para evaluar schedules, y `--strict` + `--junit` en CI. `mockModel` para fixtures sin llamar al proveedor.
4. **Patrón multi-tenant-memory formal**: los learnings actuales son un buffer append-only inyectado al prompt; convertirlos en el patrón oficial (tools `remember/list/forget` scopeados por tenant+user + dynamic instructions en `turn.started`) daría dedupe, borrado por producto y retención.
5. **Instrumentación OTel real**: hoy solo se captura el input; `defineInstrumentation({ setup })` con un exporter (Braintrust/Honeycomb) + `traceChannelRequests` daría spans de modelo/tools con costos (`gen_ai.usage.*` del AI Gateway) y correlación con el dashboard Agent Runs de Vercel.
6. **`defineState` para estado de sesión**: contadores/planes por sesión (p.ej. presupuesto de queries del turno) podrían vivir en `defineState` en vez de SQLite — con reset en `turn.started` vía hook si se quiere por turno.
7. **Políticas de aprobación por input**: reemplazar `always()` global en escrituras por una política custom que gatee por tool (create/update vs delete vs `execute_entity`/`afectar`) e input (solo cantidades/importes grandes), siguiendo el patrón multi-tenant-approvals.
8. **Conexión MCP nativa por tenant**: `defineMcpClientConnection` con `auth`/`headers` como funciones de `ctx` (patrón multi-tenant-auth) eliminaría el cliente MCP propio y daría `connection_search`, filtros `tools.allow` y approval por conexión — el cliente custom se justifica hoy por el URL dinámico por tenant, que la conexión nativa también soporta vía `headers`/`auth` async.
9. **`defineRemoteAgent`**: delegar a otros deployments (p.ej. un agente de otro tenant o un servicio de validación) como subagente remoto.
10. **Eliminar el round-trip de `connection_search`** documentado como pendiente: con los tools dinámicos de `erp.ts` ya no depende de la conexión estática; medir si el round-trip persiste y evaluar pre-registro por `step.started` dinámico.

---

*Fuentes: `node_modules/eve/docs/` (README, concepts/*, guides/*, evals/*, schedules.mdx, skills.mdx, subagents.mdx, connections/mcp.mdx, patterns/*, reference/*, agent-config.md, getting-started.mdx) y código real de sk-eve (`agent/`, `evals/`, `.github/copilot-instructions.md`). Generado 2026-08-10.*
