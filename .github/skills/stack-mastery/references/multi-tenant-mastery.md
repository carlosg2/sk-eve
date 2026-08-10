# Manual de dominio: Infraestructura multi-tenant (sk-eve)

> Referencia de dominio para cómo sk-eve sirve múltiples clientes/tenants con un
> solo código: `runtime.json`, `profile.md`, `agent.md` (manifest), scoping de
> skills/kernel/tools, canales, y los límites de aislamiento REALES (qué está
> aislado y qué no). Fuente primaria: `agent/lib/runtime-config.ts`,
> `agent/instructions/*.ts`, `agent/tools/erp.ts`, `company-twin/`.
> Verificado contra el código 2026-08-10.

## 1. El modelo: un solo runtime, N tenants, 1 agente activo

```
company-twin/runtime.json          → { "activeTenant": "icf", "activeAgent": "asistente-erp" }
company-twin/companies/<tenant>/   → per-tenant: profile.md + agents/ + policies/ + state/
company-twin/companies/<tenant>/agents/<agente>/agent.md  → manifest del agente
```

**Regla fundamental:** hay **UN agente activo a la vez** (definido en
`runtime.json` o `SIGMA_TENANT`). No es multi-tenant simultáneo en runtime — es
selección por tenant/agente al iniciar sesión. El spec de scoping lo confirma:
"sigue habiendo un agente activo a la vez, pero limpio".

## 2. `runtime-config.ts` (242 líneas — el corazón de la resolución)

- `resolveCompanyTwinRoot()`: sube hasta 8 niveles buscando `company-twin/`
  (funciona en dev y bundleado).
- `loadRuntimeConfig()` → `{ tenant, companyName, erpCompany, mcpUrl }` — lee
  `runtime.json` + `companies/<tenant>/profile.md` (frontmatter: companyName,
  erpCompany, mcpUrl).
- `loadActiveAgent()` → `ActiveAgent` — lee `companies/<tenant>/agents/<agente>/agent.md`
  con su manifest: `model`, `reasoning`, `description`, `skills[]`, `kernel`,
  `mcpTools[]`, `instructions`.
- `loadScopedSkills(agent)`: catálogo `agent/skill-library/` filtrado por
  **membresía** (slug ∈ agent.skills) **∩ visibilidad** (frontmatter `tenant` del
  skill: null = universal, o el tenant activo).
- Parser de frontmatter propio: soporta escalares, listas inline `[a, b]`,
  `null`, y **block scalars** (`>`/`|`) — necesario para los manifests.

## 3. El scoping por agente (manifest en agent.md)

```yaml
---
type: Agent
name: Sugerido de Compra
model: anthropic/claude-sonnet-4-5
tenant: marmoles
skills: [sugerido-compra, gap-abasto, cxp]   # membresía (∩ visibilidad)
kernel: "*"                                   # "*" | [cxp, prov, compra]
mcp_tools: [read_records, aggregate_records, buscar_registro, planeacion_mrp]
---
```

**Semántica (del spec agent-scoping-refactor):**
- **Visibilidad** (tenant del skill) vs **Membresía** (skills[] del agente): el
  resolver advierte la **intersección**.
- `kernel: "*"` = todos los conceptos `layer: erp-kernel`; lista = solo esos ids.
- `mcp_tools` = allow-list efectiva del agente (subset del superset del tenant).

## 4. Cómo se aplica el scoping en runtime (defineDynamic)

| Capa | Mecanismo | Evento |
|---|---|---|
| Skills | `agent/skills/library.ts` (defineDynamic) → `loadScopedSkills` | `session.started` |
| Instructions del agente | `agent/instructions/agent-active.ts` (defineDynamic) → inyecta `instructions.md` + soft-gate de tools | `session.started` |
| Tools MCP | `agent/tools/erp.ts` (defineDynamic) → `mcpListTools(mcpUrl)` filtrado por `agent.mcpTools` | `session.started` |
| Modelo | `agent/agent.ts` (defineDynamic en `step.started`) → `loadActiveAgent()?.model` | `step.started` |
| Conceptos twin | `agent/tools/query_company_twin.ts` → filtro por tenant + kernel scope | por llamada |
| Learnings | `agent/instructions/memory.ts` → `state/learnings.md` del tenant activo | `session.started` |

## 5. Canales y auth (multi-tenant en la frontera)

- `agent/channels/eve.ts`: `eveChannel({ auth: [localDev(), vercelOidc()] })`.
  `vercelOidc` solo funciona dentro de Vercel; `localDev` en dev.
- `agent/channels/twilio.ts`: canal WhatsApp con **deny-by-default**
  (`TWILIO_WHATSAPP_ALLOW` vacío = se rechazan TODOS los mensajes entrantes).
  Nunca `"*"`. El prefijo `whatsapp:+...` es obligatorio en allowFrom.
- **Patrón multi-tenant de Eve** (del manual eve-mastery §9): el route auth
  estampa `tenantId` en `ctx.session.auth.current` (atributo verificado, nunca
  del prompt). sk-eve aún NO usa este patrón formal — resuelve por
  `runtime.json` global, no por caller.

## 6. Límites reales del aislamiento (lo que NO está aislado)

| Aspecto | Aislado | Nota |
|---|---|---|
| Datos del twin (conceptos, policies) | ✅ por tenant | `query_company_twin` filtra |
| Skills advertidas | ✅ por tenant × agente | `loadScopedSkills` |
| Tools MCP | ⚠️ soft-gate | **Instrucción al modelo, no veto** (hooks son observe-only). Las escrituras sí gateadas por HITL |
| Learnings buffer | ✅ por tenant | `state/learnings.md` del tenant activo |
| **Sesiones/eventos en SQLite** | ❌ **NO** | `sessions.sqlite3` mezcla tenants (el campo `source` solo distingue chat/eval, no tenant) |
| **`runtime.json` global** | ❌ NO | un solo tenant activo para todo el proceso |
| **Radiografía (llm_inputs)** | ❌ NO | sin columna tenant |
| **MCP URL** | ✅ por tenant | `profile.md` mcpUrl |

**⚠️ HALLAZGO VERIFICADO (2026-08-10, contra `agent/lib/session-store.ts`):**
**la radiografía y las sesiones no distinguen tenant.** La tabla `sessions` solo
tiene `source` ("chat"|"eval") — **sin columna tenant** — y los endpoints
`/api/audit/*` y `/api/sessions/*` **no filtran por tenant** (grep vacío). En
producción multi-cliente, un turno del cliente A y del B comparten la misma
tabla y la misma vista de auditoría.

**Impacto (ADR-009 / Five Eyes):** viola "datos del cliente A jamás visibles al
B". No es solo privacidad — es un requisito de cumplimiento (EU AI Act Annex
III, SOX) y de confianza comercial.

**Plan de remediación (sprint F2, en orden):**
1. `ALTER TABLE sessions/events/llm_inputs/turn_summaries/evaluaciones ADD COLUMN tenant TEXT` (migración idempotente, patrón `archived`/`source` ya existente en `getDb()`).
2. Escribir `tenant` en los hooks (`session-log.ts` lee `loadRuntimeConfig().tenant` al registrar) y en `appendLlmInput`/`appendTurnSummary`.
3. Filtrar por tenant en `/api/audit/*`, `/api/sessions/*` y el sidebar de /chat (el caller autenticado define el tenant — patrón multi-tenant-auth de Eve).
4. Eval nuevo: "una sesión del tenant A no aparece en las consultas del tenant B" (invariante de aislamiento).
5. Backfill: `UPDATE sessions SET tenant = 'joyarock-300326'` para las sesiones históricas de dev (las de antes del cambio no tienen tenant; decidir default por fecha/contexto).

## 7. Oportunidades (multi-tenant)

1. **`tenantId` en la radiografía** (F2): columna tenant en las 5 tablas de
   SQLite + filtro en `/api/audit/*` y en el sidebar de /chat. **Plan completo
   en §6 (hallazgo verificado) — 5 pasos con migración idempotente, hooks,
   filtros, eval de aislamiento y backfill.**
2. **Auth por caller en vez de runtime.json global**: patrón multi-tenant-auth de
   Eve (`ctx.session.auth.current.tenantId`) para que el tenant venga del
   usuario autenticado, no de un archivo global. Desbloquea multi-tenant
   simultáneo real.
3. **Aislamiento de sesiones por tenant**: el índice del sidebar debe filtrar
   por tenant del caller.
4. **Scoping duro de tools MCP**: hoy soft-gate; con un policy decision point
   (patrón Five Eyes) el gating sería efectivo. Requiere hook de Eve que pueda
   vetar o mover el gating a la conexión por tenant.
5. **Per-tenant secrets**: `TWILIO_WHATSAPP_ALLOW` y credenciales por tenant
   (hoy globales por env var).

## 8. Gotchas

- **Un solo agente activo**: cambiar runtime.json reinicia el scope; la sesión
  activa NO cambia (snapshot).
- **`mcpUrl` nunca se loguea al arranque** (el proxy dev de Eve usa la primera
  URL de stdout como origin).
- **El soft-gate de tools depende del modelo**: un modelo que no obedece "usa
  únicamente estas tools" puede llamar otras (no hay veto). Los evals
  (`no-entity-inexistente`, `eficiencia-turno`) vigilan el comportamiento.
- **Deny-by-default en WhatsApp**: sin `TWILIO_WHATSAPP_ALLOW`, todo mensaje
  entrante se rechaza — no es un bug, es diseño.

---

*Fuentes: `agent/lib/runtime-config.ts`, `specs/agent-scoping-refactor.md`,
`agent/instructions/agent-active.ts`, `agent/tools/erp.ts`, manual eve-mastery
§9 (patrones multi-tenant). Generado 2026-08-10.*
