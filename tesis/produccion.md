# Camino a producción — sk-eve (Sigma)

> Estado: PLAN (2026-08-06). Documenta la decisión pendiente **E**: cómo llevar el
> stack (SvelteKit + Eve + MCP/DAB + radiografía durable) a un entorno de
> producción real. Complementa `tesis/arquitectura.md`, `tesis/decisiones.md` y
> `tesis/protocolo-pruebas.md`.

## 1. Estado actual (dev / self-host)

- **UI + agent**: SvelteKit 2 + Eve 0.29.2, modelo `deepseek/deepseek-v4-flash-0731`
  vía AI Gateway de Vercel (`AI_GATEWAY_API_KEY`).
- **Estado durable local** en `.data/` (no se purga):
  - `.data/eve-workflow` — estado de máquina de Eve (runs/steps/streams) vía
    symlink `.eve/.workflow-data → .data/eve-workflow` (necesario para CONTINUAR
    sesiones; Eve hardcodea el path).
  - `.data/sessions.sqlite3` — radiografía (tablas `sessions`, `events`,
    `llm_inputs`, `turn_summaries`, `evaluaciones`) vía `node:sqlite`
    (`DatabaseSync`, archivo local, built-in Node 24).
- **MCP/ERP**: DAB remoto por tenant (`https://api2.maserp.mx/<tenant>/mcp`) o DAB
  local en 5050; el agente NO sirve el ERP — solo lo consulta por HTTP/MCP.
- **`vercel.json` YA preparado** con `experimentalServices` (web + eve) y rewrite
  `/eve/v1/*` → `/_eve_internal/eve/eve/v1/*`. Falta `eve link` y el despliegue.
- **Auth de rutas**: canal `vercelOidc` (funciona solo dentro de Vercel);
  `placeholderAuth()` en dev.

## 2. Dos caminos posibles (elegir A o B)

### A. Vercel (recomendado — el stack ya está orientado a Vercel)

`vercel.json` ya declara los dos servicios. Pasos (doc oficial:
`node_modules/eve/docs/guides/deployment/vercel.mdx`):

1. `eve link` (o `vercel link --project <name> --yes --non-interactive` en CI).
2. Credenciales en el proyecto: `AI_GATEWAY_API_KEY` (modelo string → AI Gateway),
   credenciales de providers/tools/connections, signing keys del canal de auth.
   Reemplazar `placeholderAuth()` por la política real (ver §4).
3. Sandbox: dejar `backend` sin setear → `defaultBackend()` = **Vercel Sandbox**.
   ⚠️ Si el sandbox tiene `bootstrap()`/seed files, el build prewarma un template
   y un fallo de prewarm DETIENE el deploy.
4. `eve deploy` (o push a un proyecto Git-connected). En build hosted (`VERCEL`),
   `eve build` escribe el bundle en `.vercel/output`.
5. Vercel entonces ejecuta: **Web runtime** (health/session/stream/channel/
   callback/schedule), **Vercel Workflow** (persiste y reanuda runs durables —
   REEMPLAZA nuestro `.data/eve-workflow` local), **Vercel Cron** (schedules),
   **Vercel Sandbox**.
6. Verificar: `curl https://<agent>.vercel.app/eve/v1/health` y `eve dev <url>`.

**Observabilidad**: Vercel detecta Eve y añade un tab **Agent Runs** bajo
Observability (requiere enablement del team). Para tracing externo: OpenTelemetry
(`node_modules/eve/docs/guides/instrumentation.md`).

### B. Self-host Node (VPS/container, sin Vercel)

Doc oficial: `node_modules/eve/docs/guides/deployment/self-hosting.md`.

1. `eve build` + `PORT=3000 eve start --host 0.0.0.0` (servidor Nitro en `.output/`).
2. **Workflow**: montar `.eve/.workflow-data` en storage persistente (volumen/EBS),
   o instalar un Workflow world package (`experimental.workflow.world` en `agent.ts`)
   construido contra la línea `@workflow/*` 5.0.0-beta.
3. **Sandbox**: `defaultBackend()` elige local (Docker/microsandbox); NO usar
   `vercel()` fuera de Vercel.
4. **Proxy**: reenviar AMBOS prefijos `/eve/` y `/.well-known/workflow/` (si falta
   el segundo, el run se cuelga en su callback).
5. **Auth**: `vercelOidc()` NO vale fuera de Vercel → Basic/JWT/OIDC genérico.
6. **Schedules**: `eve start` corre el schedule runner de Nitro.
7. `AI_GATEWAY_API_KEY` para enrutar el modelo por el Gateway desde host externo.

## 3. La radiografía durable (la parte NUESTRA) en producción

El self-improvement (tesis) depende de `.data/sessions.sqlite3`. Ese archivo es
LOCAL y EFÍMERO en Vercel (filesystem por instancia) → **hay que mover la
radiografía a una DB gestionada** o perderemos la minería/auditoría en prod.

### 3.1 Migración de `node:sqlite` → driver gestionado

Hoy `agent/lib/session-store.ts` usa `node:sqlite` `DatabaseSync` (archivo local).
Para producción:

- **Opción 1 — Neon/Postgres gestionado (recomendada)**: extraer una interfaz de
  storage (`SessionsStore`, `EventsStore`, `LlmInputsStore`, `TurnSummariesStore`,
  `EvaluacionesStore`) y dos implementaciones: `SqliteStore` (dev, actual) y
  `PostgresStore` (prod, `pg` + `DATABASE_URL`). Mismas tablas/esquema; el
  `node:sqlite` SQL ya es SQL estándar (solo revisar AUTOINCREMENT → SERIAL,
  `PRAGMA`/`ALTER TABLE` de migraciones → migraciones SQL reales).
- **Opción 2 — Vercel Blob/KV**: Blob para eventos (JSONL/append) + KV para
  índices. Más barato, pero pierde queries relacionales de `/api/audit/*` y el
  evaluador de calidad.

La retención TTL de `llm_inputs` (ya implementada, `SIGMA_LLM_RETENTION_DAYS`)
aplica igual en Postgres.

### 3.2 Qué NO vive en Vercel

- `.data/eve-workflow` (lo sustituye Vercel Workflow en camino A).
- `.env.local`, `dab/dab-config.json` (solo dev local), `node_modules/.vite`.
- El buffer `state/learnings.md` SÍ es del repo (se commitea) — en Vercel el
  runtime no debe escribirlo en filesystem efímero; revisar `agent/hooks/memory.ts`
  (si escribe al FS, en prod debe escribir a la DB o a un bucket).

## 4. Auth y rutas de producción

- **Canales**: `vercelOidc()` solo dentro de Vercel. Para B: Basic/JWT/OIDC
  genérico (`agent/channels/eve.ts`).
- **HITL/escrituras ERP**: el approval gate del connection MCP sigue igual
  (no depende del host). WhatsApp/Twilio (channels) requieren webhooks públicos
  + credenciales en el entorno.
- **Modelo**: string vía AI Gateway (ya es el default) — en Vercel se autentica
  por OIDC del proyecto; fuera de Vercel, `AI_GATEWAY_API_KEY`.

## 5. Plan de ejecución (orden sugerido)

| # | Tarea | Esfuerzo | Riesgo |
|---|---|---|---|
| 1 | Abstraer storage de `session-store.ts` en interfaz + driver SQLite/Postgres | M | Medio (toca hooks + endpoints de auditoría) |
| 2 | `eve link` + credenciales del proyecto Vercel | S | Bajo |
| 3 | Reemplazar `placeholderAuth()` por política real de rutas | S | Bajo |
| 4 | `eve deploy` y validar `/eve/v1/health` + un turno E2E | S | Medio (prewarm sandbox, OIDC) |
| 5 | Mover radiografía a Postgres gestionado (Neon) y validar `/api/audit/*` | M | Medio |
| 6 | Ajustar hooks que escriben al FS (`memory.ts` learnings) para prod | S | Bajo |
| 7 | Decidir observabilidad: tab Agent Runs (Vercel) vs OTel | S | Bajo |

## 6. Decisiones abiertas (para el usuario)

1. **Camino A (Vercel) vs B (self-host)** — A es el camino natural del stack; B
   si el cliente exige datos/ERP en infraestructura propia.
2. **DB de radiografía**: Neon/Postgres (recomendada) vs Vercel Blob/KV.
3. **¿El runtime debe seguir escribiendo `learnings.md` al repo en prod?** (la
   tesis dice que el buffer es efímero y la fábrica promueve — en prod quizá
   convenga un bucket/DB para el buffer).
4. **Schedules/loops** (tesis v1): Vercel Cron (A) o el schedule runner de Nitro (B).
