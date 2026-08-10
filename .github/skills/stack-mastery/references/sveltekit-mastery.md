# Manual de dominio: SvelteKit / UI (sk-eve)

> Referencia de dominio para la capa de presentación: `/chat` (interfaz
> principal), `/studio` (harness designer), `/audit` (radiografía) y las API
> routes. Fuente primaria: `src/` del repo sk-eve. Verificado contra el código
> real 2026-08-10.

## 1. Arquitectura de la UI (244 archivos en src/)

```
src/
├── routes/
│   ├── +page.svelte              # landing (redirige a /chat)
│   ├── chat/                     # INTERFAZ PRINCIPAL del usuario final
│   │   ├── +page.svelte          # ChatSession.svelte (streaming, inspector)
│   │   ├── ChatSession.svelte    # orquesta la sesión Eve (stream NDJSON)
│   │   ├── demo/                 # página de demo
│   │   └── style-vega.css, layout.css, chat-utilities.css
│   ├── studio/                   # HARNESS DESIGNER (la "fábrica" en UI)
│   │   ├── +page.svelte          # StudioShell + TreeItems (explorador twin)
│   │   ├── [...path]/            # editor de archivos del twin
│   │   ├── components/           # 10 componentes: SkillsSection, McpToolsSection,
│   │   │                         #   CapabilitiesSection, EvolveSection, ProfileSection,
│   │   │                         #   FileEditor, FolderSection, StudioShell, TreeItems
│   │   └── api/                  # 13 endpoints REST del studio (ver §3)
│   ├── audit/                    # RADIOGRAFÍA: sesiones, turnos, evaluaciones
│   │   └── +page.svelte          # timeline de turnos + razonamiento + métricas
│   ├── api/                      # endpoints públicos
│   │   ├── sessions/             # sidebar de conversaciones
│   │   ├── traces/               # resúmenes + tendencia
│   │   ├── audit/{turns,turn,llm,evaluaciones}  # radiografía
│   │   └── debug/{llm-io,tools}  # debugging
│   └── ...
├── lib/
│   ├── components/
│   │   ├── ai/                   # markdown streaming del agente
│   │   ├── ai-elements/          # queue, reasoning, tool (eventos en vivo)
│   │   ├── ui/                   # shadcn-svelte (button, sidebar, message-scroller…)
│   │   └── custom/icon-placeholder
│   ├── hooks/                    # (use-sidebar, etc.)
│   ├── lib/                      # helpers internos
│   └── server/studio/harness.ts  # EL PUENTE: CRUD del twin + agentes (923 líneas)
```

## 2. El puente UI ↔ runtime (la conexión invisible más importante)

**`src/lib/server/studio/harness.ts`** es el punto donde la UI **escribe el
conocimiento que el runtime lee**. El studio NO toca `.eve/` ni la BD: opera
sobre `company-twin/` (archivos versionados en git).

- **Modelo**: Tenant → Agentes. El tenant se declara en `profile.md` (frontmatter);
  cada agente vive en `agents/<slug>/agent.md`.
- **Seguridad del harness**: rechaza path traversal (todas las rutas se resuelven
  contra `twinRoot`) y solo permite escribir `.md`, `.ts`, `.json`
  (`ALLOWED_WRITE_EXT`).
- **Tipos clave**: `TenantSummary` (slug, companyName, erpCompany, mcpUrl,
  profilePath, agents, active), `AgentSummary` (slug, tenant, name, model,
  reasoning, description, defPath, active).
- **Flujo**: `/studio` lista el árbol del twin → editas `agent.md`/`profile.md`/
  skills → `PATCH` escribe al FS → el runtime lo lee en `session.started`
  (defineDynamic) → nueva sesión usa el snapshot.

## 3. Endpoints del studio (13 API routes)

| Endpoint | Función |
|---|---|
| `api/tree` | Árbol del company-twin |
| `api/file` | Leer/escribir archivo (con validación de ext) |
| `api/tenant` | Resumen de tenants |
| `api/agent` | Resumen/edición de agente |
| `api/agent/capabilities` | Toggles skills/kernel/mcp_tools → agent.md |
| `api/agent/evolve` | Draft→diff→apply (mejora asistida) |
| `api/activate` | Activar tenant/agente (runtime.json) |
| `api/skills` | Catálogo de skills |
| `api/mcp-tools` | Tools del MCP (del tenant) |
| `api/runtime-tools` | Tools del runtime |
| `api/mcp-ping` | Health del MCP |
| `api/preview` | Preview de activación |

## 4. El chat (interfaz del usuario final)

- `ChatSession.svelte` consume el **stream NDJSON** de Eve (`/eve/v1/session/:id/stream`):
  eventos `reasoning.*`, `message.*`, `actions.requested`, `action.result`,
  `input.requested` (HITL)…
- **Agent inspector** (región `pre[aria-label="Inspector..."]`): status, tokens,
  DIAGNOSTICS (steps/times/cache/warnings), TRACE, `trend:`. Es la herramienta
  de diagnóstico textual de la fábrica (el protocolo de pruebas dice: NO usar
  screenshots para diagnóstico).
- **HITL**: los `input.requested` (ask_question / approval gates) se muestran
  como prompts de confirmación en el chat.

## 5. El audit (radiografía navegable)

- Lista de sesiones (sidebar) → turnos con métricas → **trayectoria secuencial**
  (timeline): razonamiento por paso, tool calls con input/output y duración,
  tokens por step, mensajes y HITL, ordenados con tiempo relativo (t+).
- Endpoints: `/api/audit/turns` (lista), `/api/audit/turn` (holístico),
  `/api/audit/llm` (inputs reales al LLM), `/api/audit/evaluaciones` (calidad).

## 6. Stack visual

- **Tailwind v4** + `tw-animate-css` + shadcn-svelte (bits-ui, runed,
  mode-watcher). `components.json` presente.
- `@fontsource-variable/inter`, `@lucide/svelte` (iconos).
- Temas: modo claro/oscuro (mode-watcher).

## 7. Oportunidades para sk-eve (UI)

1. **Agent Inbox (F6 de la tesis v2)**: el paradigma 2026 es bandeja de tareas
   (notify/question/review), no chat síncrono. El chat ya tiene el streaming y
   HITL; falta la vista de "tareas pendientes" que el watchdog genere.
2. **Vista de loops/schedules**: cuando F1 implemente watchdogs, el /audit o una
   vista nueva debería mostrar el estado de cada loop (último tick, hash, deltas).
3. **Studio → Evolve completo**: `EvolveSection` (draft→diff→apply) es el germen
   de la fábrica en UI; extenderlo a más kinds (kernel, instructions, policies).
4. **Seguridad de la UI**: el studio escribe al twin — en producción debe exigir
   auth real (hoy `placeholderAuth()` en dev; `vercelOidc` en Vercel).
5. **El inspector como fuente de evals**: el `trend:` y DIAGNOSTICS podrían
   alimentar directamente la tabla `evaluaciones` (hoy el evaluador usa la API).

## 8. Gotchas

- **No recargar durante un turno activo** → sesiones huérfanas de Eve + Docker
  saturando (gotcha #1 del protocolo).
- **Sesión = snapshot**: editar skills/kernel en /studio no afecta la sesión
  activa; reiniciar conversación.
- El studio escribe SOLO `.md/.ts/.json`; no puede editar el DAB ni la BD.
- `+page.server.ts` del chat/studio: server-side (las credenciales viven en el
  server, nunca en el cliente).

---

*Fuentes: `src/` (244 archivos), `src/lib/server/studio/harness.ts`,
`.github/copilot-instructions.md`, `tesis/protocolo-pruebas.md`. Generado
2026-08-10.*
