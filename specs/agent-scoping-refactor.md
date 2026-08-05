# Spec — Scoping de capacidades por agente (tenant + agente)

Estado: **Implementado (Fases 1-3)** · 2026-08-04
Alcance: `sk-eve` (Eve 0.29.2 + SvelteKit studio)

> Implementación aplicada: catálogo `agent/skill-library/` (17 skills con `tenant`),
> resolver dinámico `agent/skills/library.ts`, manifest en `agent.md`
> (`skills`/`kernel`/`mcp_tools`), `loadScopedSkills` + kernel-scope en
> `query_company_twin`, soft-gate MCP en `agent-active.ts`, y en el studio los tabs
> **Capabilities** (checkboxes → `agent.md`) y **Evolve** (draft→diff→apply).
> Verificado: `marmoles/sugerido-compra` advierte 3 skills (mrp-* filtrado),
> `icf/asistente-erp` 16. `npm run check` sin errores.

---

## 1. Problema

Hay 3 agentes reales y el conocimiento se "revuelve":

- `marmoles/agents/sugerido-compra` (activo en `runtime.json`)
- `icf/agents/asistente-erp`
- (tenants `joyarock-300326`, `comercial-parras` son referencia/legacy)

Las **capacidades no declaran a quién pertenecen**, y activar un agente en
`/studio` casi no filtra nada. Síntomas concretos:

1. **Skills globales sin scope.** Eve escanea `agent/skills/` y advierte las ~17
   skills vía `load_skill` para **cualquier** agente/tenant. Las 12 skills
   `mrp-*` son exclusivas de ICF (lo dice su índice
   `agent/skills/mrp/SKILL.md`), pero se le ofrecen también al agente
   `sugerido-compra` de marmoles. Ese es el "bleed".
2. **Tres buckets de skills desconectados:**
   - `agent/skills/<slug>/` — globales, on-demand, **sin scope**.
   - `company-twin/companies/<t>/agents/<a>/skills/` — por agente pero
     **inyectadas siempre** (no on-demand), y hoy casi sin uso.
3. **La activación de agente no scopea.** `agent/instructions/agent-active.ts`
   solo intercambia modelo + `instructions.md` + skills-por-agente. **No filtra**
   skills globales, tools MCP (allow-list estática superset en
   `agent/connections/intelisis-dab.ts`), ni conceptos del kernel.
4. **No hay toggles.** No existe forma en el studio de decir "este agente usa
   estas skills / estos conceptos de kernel / estos tools".

Lo único ya bien scopeado: `agent/tools/query_company_twin.ts` filtra conceptos
por `tenant` (`null` o el activo).

## 2. Objetivos y no-objetivos

**Objetivos**

- Cada agente **declara** su set de capacidades (skills, kernel, mcp_tools) en el
  frontmatter de su `agent.md`. Esa declaración es la **fuente de verdad de los
  toggles**.
- Al activar un agente, el runtime advierte/carga **solo** lo declarado por ese
  agente (con match de tenant). Nada más.
- El kernel y el company-twin, que ya manejan `tenant`, se filtran también por
  el scope del agente.
- Studio expone **checkboxes** sobre el catálogo (skills/kernel/tools) que
  escriben de vuelta a `agent.md`.
- Loop de diseño/iteración estilo **Evolve** (fase posterior).

**No-objetivos**

- No cambiar el motor de Eve ni parchearlo (`patches/` se mantiene fuera).
- No tocar el DAB/MCP server ni el schema del ERP.
- No introducir multi-tenant runtime simultáneo: sigue habiendo **un** agente
  activo a la vez (`runtime.json`), pero limpio.

## 3. Palanca técnica (validado contra Eve 0.29.2)

- Eve **no puede ocultar** una skill estática (`agent/skills/*`) por agente:
  las advierte todas. (`node_modules/eve/docs/skills.mdx`.)
- **`defineDynamic`** (`eve/skills`, `eve/tools`, `eve/instructions`) resuelve
  por `session.started` / `turn.started` (skills, instructions) y además
  `step.started` (tools). Puede devolver un `defineSkill` (o map) o `null`, y una
  dinámica **override** a la authored del mismo nombre.
  (`node_modules/eve/docs/guides/dynamic-capabilities.md`.)
- **Conclusión:** para scopear skills hay que **servirlas dinámicamente** desde
  un resolver que lee el agente activo, en vez de autorarlas estáticas.
- Las **conexiones MCP** usan `tools.allow`/`tools.block` **estáticos** (no
  aceptan `defineDynamic`). El scoping fino de tools MCP por agente se hace con un
  **hook** sobre `actions.requested` (ver §7.3), no con la allow-list.

## 4. Modelo de datos objetivo

### 4.1 Catálogo único de skills de dominio

Mover las skills de dominio a `agent/skill-library/<slug>/SKILL.md` (fuera del
auto-scan de Eve). Cada una lleva frontmatter de **visibilidad**:

```yaml
---
description: >
  Use when ...            # hint de ruteo (igual que hoy)
tenant: icf               # visibilidad: null = cualquier tenant | <slug> | [slugs]
---
```

- `tenant: null` → la skill **puede** usarla cualquier tenant (opt-in por agente).
- `tenant: icf` (o lista) → solo visible para esos tenants.

### 4.2 Bucket global "verdaderamente universal" (se conserva)

`agent/skills/` queda **reservado para meta-skills genuinamente universales**
(aplican a todo agente de todo tenant, sin opt-in). Tras la migración queda
prácticamente vacío de skills de dominio. Regla: una skill vive en `agent/skills/`
**solo si** debe estar disponible siempre, para todos, sin declararla en ningún
`agent.md`. En caso de duda → va al catálogo scopeado (§4.1).

### 4.3 Manifest en `agent.md` (fuente de los toggles)

Extender el frontmatter existente de `company-twin/companies/<t>/agents/<a>/agent.md`:

```yaml
---
type: Agent
name: Sugerido de Compra
model: anthropic/claude-sonnet-4-5
reasoning: null
description: ...
tenant: marmoles
# --- nuevo: manifest de capacidades ---
skills: [sugerido-compra, gap-abasto]        # slugs del catálogo que ESTE agente carga
kernel: "*"                                   # "*" (todos) | [cxp, prov, compra]
mcp_tools: [read_records, aggregate_records, buscar_registro, planeacion_mrp]
---
```

Semántica:

- **Visibilidad** (`tenant` de la skill) vs **Membresía** (`skills[]` del agente).
  El resolver advierte la **intersección**: skills cuyo `tenant` hace match con el
  tenant activo (o `null`) **y** cuyo slug ∈ `skills[]` del agente activo.
- `kernel: "*"` = todos los conceptos `layer: erp-kernel`; lista = solo esos ids.
- `mcp_tools` = allow-list efectiva del agente (subset del superset del tenant).

## 5. Clasificación de las 17 skills actuales

| Skill (`agent/skills/`) | Destino | `tenant` |
|---|---|---|
| `cxp` | catálogo scopeado | `null` (opt-in; cualquier tenant con CXP) |
| `gap-abasto` | catálogo scopeado | `[icf, marmoles]` (abasto, compartida) |
| `sugerido-compra` | catálogo scopeado | `marmoles` |
| `icf` | catálogo scopeado | `icf` |
| `mrp` (índice) | catálogo scopeado | `icf` |
| `mrp-arribos` | catálogo scopeado | `icf` |
| `mrp-articulos` | catálogo scopeado | `icf` |
| `mrp-concentrado` | catálogo scopeado | `icf` |
| `mrp-dashboard` | catálogo scopeado | `icf` |
| `mrp-faltantes` | catálogo scopeado | `icf` |
| `mrp-forecast` | catálogo scopeado | `icf` |
| `mrp-indicadores` | catálogo scopeado | `icf` |
| `mrp-inicio` | catálogo scopeado | `icf` |
| `mrp-inventario` | catálogo scopeado | `icf` |
| `mrp-modelado-centros` | catálogo scopeado | `icf` |
| `mrp-produccion` | catálogo scopeado | `icf` |
| `mrp-traspasos` | catálogo scopeado | `icf` |

> Ninguna califica como "verdaderamente universal" hoy → `agent/skills/` queda
> vacío tras migrar. `cxp` es el caso frontera: se deja scopeada con `tenant: null`
> (opt-in por agente) en vez de global, para mantener la regla limpia. Si en el
> futuro se quiere una meta-skill universal, ese es el único caso que vuelve a
> `agent/skills/`.

Membresía inicial sugerida por agente (a escribir en cada `agent.md`):

- `marmoles/sugerido-compra`: `skills: [sugerido-compra, gap-abasto, cxp]`
- `icf/asistente-erp`: `skills: [icf, mrp, mrp-arribos, mrp-articulos,
  mrp-concentrado, mrp-dashboard, mrp-faltantes, mrp-forecast, mrp-indicadores,
  mrp-inicio, mrp-inventario, mrp-modelado-centros, mrp-produccion, mrp-traspasos,
  gap-abasto, cxp]`

## 6. Componente runtime nuevo: resolver de skills

`agent/skills/library.ts` (única skill "estática" que en realidad es un resolver
dinámico):

```ts
import { defineDynamic, defineSkill } from "eve/skills";
import { loadActiveAgent, loadScopedSkills } from "../lib/runtime-config.js";

// Advierte SOLO las skills del agente activo (membresía ∩ visibilidad de tenant).
export default defineDynamic({
  events: {
    "session.started": () => {
      const agent = loadActiveAgent();
      if (!agent) return null;
      const skills = loadScopedSkills(agent);           // lee agent/skill-library, filtra
      return Object.fromEntries(
        skills.map((s) => [s.slug, defineSkill({ markdown: s.markdown })]),
      );
    },
  },
});
```

`loadScopedSkills(agent)` (nuevo en `agent/lib/runtime-config.ts`):

1. Lee `agent/skill-library/*/SKILL.md`.
2. Filtra: `slug ∈ agent.skills` **y** (`skill.tenant == null` || incluye
   `agent.tenant`).
3. Devuelve `{ slug, description, markdown }`.

Naming: cada entry del map se nombra por su **bare key** (§dynamic-capabilities),
así el modelo ve `mrp-arribos`, `cxp`, etc. igual que hoy.

## 7. Cambios por archivo

### 7.1 Skills (fase 1 — el mayor dolor)

- **Add** `agent/skill-library/<slug>/SKILL.md` × 17 (mover contenido + añadir
  `tenant` al frontmatter). Conservar `references/`/`assets/` si alguna es
  packaged.
- **Add** `agent/skills/library.ts` (resolver §6).
- **Remove** `agent/skills/<slug>/` (los 17 dirs de dominio) una vez migrados.
- **Edit** `agent/lib/runtime-config.ts`: parsear `skills`/`kernel`/`mcp_tools`
  del `agent.md`; añadir `loadScopedSkills()`.
- **Edit** `agent/instructions/agent-active.ts`: **eliminar** la inyección de
  per-agent skills (bloque `## Skills de ${agent.name}`). Las skills ahora se
  cargan on-demand por el resolver, no se inyectan siempre. Mantener la inyección
  de `instructions.md`.
- **Remove** (opcional) el bucket `company-twin/.../agents/<a>/skills/` y su API
  en el studio, o reconvertirlo (ver §8). Decisión: **eliminar** para no dejar
  tres buckets; el contenido relevante migra al catálogo o a `instructions.md`.

### 7.2 Kernel scope (fase 2)

- **Edit** `agent/tools/query_company_twin.ts`: además del filtro por tenant,
  si el agente activo declara `kernel: [ids]`, restringir los conceptos
  `layer: erp-kernel` a esos ids. `kernel: "*"` o ausente = todos. Leer el
  agente activo con `loadActiveAgent()`.

### 7.3 MCP tools scope (fase 2)

- La allow-list de `agent/connections/intelisis-dab.ts` se queda como **superset
  del tenant** (el MCP de cada tenant solo publica sus tools; filtro natural).
- **Los hooks de Eve son solo-observación** (`node_modules/eve/docs/guides/hooks.md`:
  "Handlers are observe-only"; corren *después* de registrar el evento), así que
  **no pueden vetar** una tool call. Y las conexiones usan allow-list **estática**
  (no `defineDynamic`). → El gating duro por agente no aplica.
- **Mecanismo elegido: soft-gate.** `agent/instructions/agent-active.ts` inyecta
  la lista `mcp_tools` del agente activo ("usa únicamente estas tools"). Las
  escrituras siguen gateadas por HITL (`approval`) en la conexión, así que el
  riesgo de una tool fuera de scope es bajo y visible. Studio expone los toggles
  que escriben `mcp_tools` en `agent.md`.

## 8. Studio (fase 1 UI + fase 3)

### 8.1 Panel "Capabilities" con checkboxes (fase 1)

Nuevo tab de agente `capabilities` (junto a los `AGENT_SECTIONS` en
`StudioShell.svelte`), server-side en `src/lib/server/studio/harness.ts`:

- **Listar** el catálogo `agent/skill-library/` filtrado por el tenant del
  agente (visibilidad), marcando las que están en `agent.skills`.
- **Listar** conceptos `layer: erp-kernel` del twin, marcando las de `kernel`.
- **Listar** tools del MCP (ya existe `listMcpTools`) marcando las de `mcp_tools`.
- **Toggle** → `PATCH` a `agent.md` (reescribir solo las tres claves del
  frontmatter; reusar `parseFrontmatter`/writeback). Endpoint nuevo
  `src/routes/studio/api/agent/capabilities/+server.ts`.

Reutilizar `SkillsSection.svelte` como base; el selector de scope
`agent | global` pasa a `catálogo (del tenant) | universal`.

### 8.2 Preview de activación honesto (fase 1)

`resolveActiveAgent()` (en `harness.ts`) ya arma un preview; extenderlo para
mostrar exactamente **qué se levanta** al activar: skills advertidas, kernel en
scope, tools MCP permitidas. Que el usuario vea "activar X carga solo: …".

### 8.3 Pestaña Evolve (fase 3, aprendido de eve-studio)

Loop de auto-mejora inspirado en `eve-studio/src/main/evolve.ts` +
`views/Evolve.tsx`:

- Textarea "describe un cambio" → llamada al modelo (AI Gateway con la credencial
  del proyecto) que **draftea una propuesta** tipada: `{ kind: "skill" |
  "instructions" | "toggle" | "kernel", files: [{path, before, after}] }`.
- Mostrar **diff**; aplicar al aprobar (escribe a disco vía `harness`).
- MVP sk-eve: soportar `kind: "skill"` (crear en catálogo + añadir a `skills[]`)
  y `kind: "toggle"` (editar manifest). El backend de propuestas de eve-studio
  (blob/arcana queue) **no** se porta; basta draft→diff→apply en memoria.

## 9. Plan de ejecución por fases (checkpoints)

**Fase 1 — Scoping de skills + toggles (esta iteración objetivo).**
1. Crear `agent/skill-library/` y migrar las 17 skills con frontmatter `tenant`.
2. `runtime-config.ts`: parsear manifest + `loadScopedSkills()`.
3. `agent/skills/library.ts` resolver dinámico.
4. Quitar inyección de skills en `agent-active.ts`.
5. Escribir `skills:` en los `agent.md` de los 2 agentes reales (§5).
6. Borrar los 17 dirs de `agent/skills/`.
7. Studio: tab Capabilities con checkboxes de skills → escribe `agent.md`.
8. **Checkpoint E2E:** activar `icf/asistente-erp` → solo ve skills ICF; activar
   `marmoles/sugerido-compra` → solo ve las suyas. Verificar en `/chat` +
   `Agent inspector` (ver `.github/copilot-instructions.md`).

**Fase 2 — Kernel + MCP scope.**
9. `query_company_twin` honra `kernel`.
10. Hook `mcp-scope.ts` (validado) + toggles kernel/tools en studio.

**Fase 3 — Evolve.**
11. Pestaña Evolve (draft→diff→apply), MVP skills+toggles.

## 10. Riesgos y validaciones

- **Prompt cache:** el resolver debe correr en `session.started` (no `step`) para
  no re-ingestar a precio no cacheado (`dynamic-capabilities.md`).
- **`load_skill` framework:** confirmar que un `defineDynamic` en
  `agent/skills/library.ts` coexiste con `load_skill` y que los nombres del map
  llegan al modelo tal cual (bare key).
- **Purga de caché tras cambios de skill/manifest:** `rm -rf .eve
  node_modules/.vite && npm run dev` (ver copilot-instructions: `LoadCompiledManifestError`).
- **Regla dev-server / URLs a stdout:** no imprimir config/URLs en arranque
  (`runtime-config.ts` ya lo advierte; el resolver tampoco debe loggear URLs).
- **Hook de rechazo MCP:** validar el contrato de `actions.requested` antes de
  asumir que un hook puede vetar una tool.

## 11. Criterios de aceptación (Fase 1)

- Activar `icf/asistente-erp`: el modelo **solo** puede `load_skill` de las skills
  ICF declaradas; `mrp-*` **no** aparece para `marmoles/sugerido-compra`.
- `agent/skills/` no contiene skills de dominio; el catálogo vive en
  `agent/skill-library/`.
- Marcar/desmarcar una skill en el tab Capabilities de studio reescribe
  `skills:` en el `agent.md` correspondiente y surte efecto sin reiniciar
  (nueva sesión).
- `agent-active.ts` ya no inyecta cuerpos de skills en el prompt base.
