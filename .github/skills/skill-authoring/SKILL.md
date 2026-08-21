---
name: skill-authoring
description: >
  Autoridad de autoría de skills de sk-eve (Sigma AGI): autorar y homogenizar
  los skills del RUNTIME (agent/skill-library/<slug>/SKILL.md, que consume el
  agente Sigma) y los skills de la FÁBRICA (.github/skills/<nombre>/SKILL.md,
  que opera VS Code Copilot). Úsalo al crear, editar, revisar o auditar
  cualquier skill, o para homogenizar el catálogo. Conoce el mecanismo de carga
  (Eve + library.ts + skill-compiler + load_skill + read_skill_file), las
  convenciones por tipo y el checklist de validación. Operado por VS Code
  Copilot (la fábrica), NUNCA por el agente Sigma en runtime.
---

# Skill: skill-authoring — Autoridad de autoría de skills sk-eve

Eres la **autoridad de autoría** del stack. Antes de crear, editar o auditar un
skill: (1) cómo lo carga el sistema (§1), (2) qué tipo conviene (§2), (3) las
reglas duras del runtime (§3). El detalle operativo vive en
`references/skills-runtime.md` (frontmatter campo por campo, compilación,
validación) y los principios universales en `references/principios-escritura.md`
(adaptación de `writing-for-agents`). Este archivo es la decisión compacta; las
referencias son el cómo.

> **Separación de poderes.** Este skill lo opera VS Code Copilot (la fábrica).
> El agente Sigma en runtime NUNCA auto-edita su conocimiento. Un skill del
> runtime es para el AGENTE; un skill de fábrica es para la FÁBRICA.

---

## 1. Cómo se carga cada skill (mecanismo)

### 1.1 Cadena de carga del runtime

1. `agent/skills/library.ts` — `defineDynamic` resuelve el catálogo en
   `session.started`.
2. `loadScopedSkills(agent)` (`agent/lib/runtime-config.ts`) — intersecta la
   **membresía** del agente (`agent.md → skills:`) con la **visibilidad** por
   tenant (`tenant:` del frontmatter). Lee el `SKILL.md` y sus **subcarpetas**
   (`references/`, `scripts/`, `templates/`, `assets/`) como `files`
   package-relative.
3. **`skill-compiler.ts::compileSkillMarkdown`** — COMPILA el markdown final
   ANTES de `defineSkill`: al `SKILL.md` procedural le anexa la
   **"Vista operativa"** (body de `erp-kernel/<ent>.md` por cada entidad de
   `entities:`) y el **"Contexto del Company Twin"** (body de
   `companies/<tenant>/<path>.md` por cada `twin_concepts:`). Blindado: si
   falla devuelve el original.
4. `defineSkill({ description, markdown: <compilado>, files })` → el modelo ve
   el catálogo en `agent-active.ts` y `load_skill('<slug>')` devuelve el
   **markdown compilado** (sin frontmatter). Los archivos hermanos se leen
   on-demand con `read_skill_file` — solo el compilado entra al prompt.

**Consecuencias para el autor:**
- El **description** es el pointer de ruteo permanente: triggers front-loaded,
  uno por rama, en **español**.
- Los archivos hermanos existen **solo si el SKILL.md los lista** (paths
  relativos). El slug es la identidad; no hay `name:`.
- **El skill compilado ES la fuente del schema de su flujo** (anti-rediscovery):
  si trae su Vista operativa, el cuerpo NO instruye `query_company_twin` por
  esas entidades.
- **Cada entidad de `entities:` cuesta ~4k chars al prompt**; un skill
  compilado de 20k+ chars dispara varianza. Declara SOLO lo que el flujo usa.
- **No declarar `entities:`/`twin_concepts:`** obliga al modelo a rediscoverear
  por turno (6+ `query_company_twin`).

### 1.2 Capas de conocimiento (constitución §2)

| Conocimiento | Hogar | Prohibido en |
|---|---|---|
| Capacidades del motor (OData, casing, fechas) | `erp-kernel/index.md` | skills, instructions |
| Schema de entidad | `erp-kernel/<entidad>.md` | skills (texto), instructions |
| Hecho/política del tenant | `companies/<tenant>/` (OKF) | kernel, skills (texto) |
| Cómo ejecutar un flujo | `agent/skill-library/<x>/SKILL.md` | instructions, twin |
| Ruteo "para X usa fuente Y" | `agent/instructions.md` | skills, twin |

**Matiz (compilador):** el schema NO va en el TEXTO del skill, pero SÍ llega al
prompt **compilado** desde `erp-kernel/` (vía `entities:`) y desde
`companies/<tenant>/` (vía `twin_concepts:`). El skill sigue siendo procedural
en su redacción; el schema se anexa en `session.started` sin que el autor lo
duplique en el cuerpo.

---

## 2. Tipos de skill

### 2.1 Runtime (procedural) — `agent/skill-library/<slug>/SKILL.md`

El caso dominante. Frontmatter mínimo:

```yaml
---
tenant: icf            # null = universal; [a, b] = multi-tenant
description: >
  Use when el usuario pregunta por <ramas>…
entities: [EntA, EntB]            # → compilador: "Vista operativa" (schema)
twin_concepts: [mrp/mrp-concepto] # → compilador: "Contexto del Company Twin"
related_skills: [slug-a, slug-b]  # red declarada de la familia
---
```

Reglas duras:
- **Cero schema en el TEXTO**: el schema se declara (`entities:`/`twin_concepts:`)
  y el compilador lo anexa; lo no declarado se referencia como concepto del
  twin (`[mrp-explosion.md](`mrp-explosion`)`).
- **Prescripción mecánica**: 2+ lecturas independientes → UNA llamada
  `read_parallel({ operations: [...] })` con las operaciones EXACTAS y ejemplo
  JSON. Nunca "en paralelo cuando se pueda" (el modelo no emite multi-acciones).
- **Periodo determinista**: si el usuario no da ejercicio/periodo, prescribe el
  VIGENTE (año/mes actuales) y prohíbe probar variantes (la exploración de
  periodos es la causa de turnos de 1.4M tokens).
- **Cuerpo accionable**: tool calls EXACTOS (entidad, filtro, select, `first`
  numérico), criterios de finalización comprobables, limitaciones honestas,
  formato de respuesta si el portal lo prescribe.
- **Cero jerga de fábrica** (knowledge-hygiene §2).

Estructura de secciones: header "SOLO procedural" + referencia al twin →
Conexión/Tools → Patrones (uno por rama) → Reglas de eficiencia → Formato →
Limitaciones. (Detalle en `references/skills-runtime.md` §2.)

### 2.2 Fábrica — `.github/skills/<nombre>/SKILL.md`

Operado por Copilot. Frontmatter `name` + `description` (español). Puede
describir proceso de la fábrica, referenciar `tesis/`, `scripts/`, `docs/` y la
radiografía (`.data/sessions.sqlite3`, `/api/audit/*`). Estructura: descripción →
cuándo → prerrequisitos → cómo ejecutar → validación → errores → checklist.
Nunca debe confundirse con uno del runtime: la descripción y el cuerpo dejan
claro que lo opera Copilot, no el agente.

### 2.3 Índice / router — no escribas routers vacíos

**Regla dura:** un router cuyo contenido central sea punteros a skills hermanos
("para X, carga Y") añade un salto de indirección y duplica los triggers
`Use when` de cada hermano. **Prueba de corte: si quedaría vacío sin los
punteros, no lo escribas** — el catálogo (`agent-active.ts`) ya enruta.

Excepción — **índice con valor propio** (ej. `mrp`): ruteo + **reglas
transversales** de la familia (contrato de sesión, formato, eficiencia común),
cero schema, cero duplicación de los leaves.

---

## 3. Convenciones del runtime (detalle en `references/skills-runtime.md`)

### 3.1 Frontmatter

| Campo | Regla |
|---|---|
| `tenant` | `null` (universal) · slug · `[a, b]` (multi-tenant). Controla la visibilidad. |
| `description` | Español, `Use when …`, triggers front-loaded, uno por rama, concisa. |
| `entities` | Entidades del kernel que el flujo usa → "Vista operativa" (~4k chars/entidad). Declara TODAS las que consultas Y solo esas. |
| `twin_concepts` | Paths de conceptos del tenant (`mrp/mrp-sesion-periodo`) → "Contexto del Company Twin". Para hechos que el flujo necesita siempre. |
| `related_skills` | Slugs de la familia (red estilo Hermes). |
| sin `name`/`version` | El slug es la identidad. |

Gotchas: `---` en el byte 0 · sin comillas dobles en `description: >` · listas
flow en UNA línea sin comentarios internos.

### 3.2 Cuerpo

Header obligatorio `> **Este skill es SOLO procedural.** Schema: <conceptos>`.
Luego Conexión/Tools → Patrones → Eficiencia → Formato → Limitaciones. Cero
narrativa de proceso, cero comparaciones ("al igual que X").

**Prescripción mecánica (regla central):** prescribe el MECANISMO concreto, no
la intención. Para 2+ lecturas independientes del mismo flujo, UNA llamada:
```
read_parallel({ operations: [ { tool: '<tool>', args: {...} }, ... ] })
```
Con las operaciones EXACTAS del flujo (máx 10 ops/lote; si hay dependencia,
declara los lotes: lote 1 → lote 2). Cada paso extra cuesta ~15-20s.

**Periodo vigente (regla determinista):** si el usuario no da periodo,
prescribe el vigente (año/mes actuales) + semanas del calendario
(`DIM_TIEMPO_SEMANA`/`CalendarioFC`); prohíbe probar variantes.

### 3.3 El compilador y la Vista operativa

El compilador resuelve el schema SIN rediscovery. Reglas del autor (detalle en
`references/skills-runtime.md` §6):
- Declara `entities:` SOLO lo que el flujo consulta (8+ = skill de 25k+ →
  varianza alta).
- Anti-rediscovery: si el skill trae su Vista operativa, no re-consultar el
  twin por esas entidades.
- Entidad sin archivo kernel se salta en silencio → verifica que exista
  `erp-kernel/<ent>.md` (lowercase) o publica `<skill>/kernel/<ent>.md`
  (override local; útil para snapshots scratch del MCP).
- `twin_concepts:` solo para hechos que el flujo necesita siempre.
- El compilador es blindado (no rompe el turno); valida con ts-hook que compile.

### 3.4 Subcarpetas (references/, scripts/, templates/, assets/)

Se montan package-relative; el modelo las lee con `read_skill_file`. El SKILL.md
**debe listar** cada archivo con path relativo (uno no listado es invisible).
Disclosure: inline lo que toda rama necesita; hermano lo que solo algunas
alcanzan. Nunca schema en los hermanos.

### 3.5 Referencias entre capas

| Desde | Hacia | Formato |
|---|---|---|
| Skill runtime | otra skill | `` `slug` `` + `load_skill('slug')` |
| Skill runtime | twin/kernel | `[concepto.md](`concepto`)` |
| Skill runtime | archivo hermano | `references/x.md` + `read_skill_file('<slug>', 'references/x.md')` |
| Skill runtime | archivo de la fábrica | ❌ NO (el agente no tiene filesystem) |
| Skill de fábrica | scripts/docs/tesis | rutas relativas normales |

### 3.6 Higiene (knowledge-hygiene)

Antes de crear/editar un skill del runtime, aplica el checklist de
`knowledge-hygiene` §5 (grep de jerga → sanitizar → linter → evals → E2E).
Regla de oro: **el conocimiento del runtime describe el DOMINIO, nunca el
proceso de la fábrica**.

---

## 4. Principios de escritura (detalle: `references/principios-escritura.md`)

- **Context pointer**: la redacción del pointer (description, línea que apunta a
  material externo), no su destino, decide cuándo se alcanza. Front-load el
  trigger; un trigger por rama.
- **Dos cargas**: *context load* (lo siempre cargado) vs *cognitive load* (lo
  que el humano recuerda). El runtime optimiza context load; la fábrica gasta
  cognitive load deliberadamente.
- **Jerarquía de información**: paso inline > referencia inline > referencia
  disclosada. **Progressive disclosure**: inline lo que toda rama necesita,
  disclosa lo que solo algunas alcanzan.
- **Co-location**: definición, reglas y caveats bajo un mismo heading.
- **Leading words**: una palabra conocida (*snapshot*, *gap*) que ancla
  comportamiento con el mínimo de tokens; repítela como token, nunca como frase.
- **Negación en positivo**: prohibir arrastra el comportamiento prohibido;
  redacta el comportamiento POSITIVO.
- **Prescripción mecánica**: prescribe la CONCRETA con ejemplo, no la intención
  ("en paralelo" → `read_parallel({ operations: [...] })`). Verificado en vivo:
  intención vaga → 0 uso; prescripción con ejemplo → adopción 4.5×.
- **Completion criteria**: cada paso termina en condición comprobable y
  exigente. **Pruning**: single source of truth, el entorno es fuente de
  verdad, caza no-ops. **Sprawl**: documento demasiado largo → disclosa o
  divide.

---

## 5. Homogenización del catálogo

Al auditar skills del runtime, verifica (definen "un skill sk-eve"):

1. **Frontmatter**: `tenant` + `description: >` en TODOS; sin `name:`.
2. **Idioma**: descripción y cuerpo en español, `Use when …`.
3. **Estructura**: header "SOLO procedural" + secciones homogéneas (Patrón,
   Reglas de eficiencia, Formato de respuesta, Limitaciones).
4. **Referencias**: por slug/`load_skill` y concepto del twin; cero rutas.
5. **Higiene**: cero jerga de fábrica (grep knowledge-hygiene §5).
6. **Compilación**: `entities:`/`twin_concepts:` declarados para TODO lo que el
   flujo consulta Y solo eso; `related_skills:` con hermanos reales.
7. **Prescripción mecánica + periodo**: 2+ lecturas → `read_parallel` con JSON;
   periodo "vigente, nunca variantes".
8. **Tamaño y peso**: ≤ ~200 líneas; compilado en ~10-18k chars (20k+ →
   adelgazar).
9. **Membresía**: todo skill visible está en `agent.md → skills:` de su tenant.

Auditoría rápida:

```bash
# Frontmatter completo y sin name:
for f in agent/skill-library/*/SKILL.md; do
  grep -q "^tenant:" "$f" || echo "SIN tenant: $f"
  grep -q "^description:" "$f" || echo "SIN description: $f"
  grep -q "^name:" "$f" && echo "CON name (quitar): $f"
done
# Jerga de proceso (0 fuera de log.md / metadatos OKF):
grep -rnE "verificado 2026|validado 2026|E2E|linter|probe|wrun_|/agent/skill-library/|la fábrica|costó|calls /" \
  agent/skill-library 2>/dev/null | grep -v "/.eve/" | grep -v "log.md"
# Rutas absolutas / referencias rotas:
grep -rnE "\(/agent/|\[.*\]\(\.\./\.\./\.\." agent/skill-library/*/SKILL.md 2>/dev/null
# Linter de conocimiento (0 críticos):
nvm use 24 >/dev/null 2>&1 && node scripts/check-knowledge.ts
```

---

## 6. Proceso de autoría

1. **Estudia lo existente**: extiende/refina un hermano antes de crear uno
   estrecho.
2. **Verifica contra lo real ANTES de redactar (protocolo de 3 fuentes)**:
   nada del skill (entidades, campos, casing, tools, patrones) se escribe de
   memoria; todo se corrobora contra las 3 fuentes:
   - **MCP del tenant** (la verdad de runtime): explora el catálogo real
     (`mcpListTools`/`tools/list` del MCP) y haz `read_records(<Ent>, first:1..5)`
     para CADA entidad y tool que el skill va a usar → existencia, campos,
     casing por vista. ⚠️ **`describe_entities` NO es fuente de verdad**
     (medido 2026-08-21 en el MCP ICF, cruce de 120 entidades): de 100 nombres
     que lista, **38 NO son consultables** con `read_records` — el desglose:
     **29 son SPs/tools custom** listados como si fueran entidades con nombre
     PascalCase (`ArtCentroBalanceo`→`art_centro_balanceo`,
     `WebForecastHistLista`→`web_forecast_hist_lista`; se ejecutan con su tool
     propio, `read_records` los rechaza con `InvalidEntity`), **4 son vistas con
     el nombre NORMALIZADO INCORRECTO** (`UvQvPptoCompra` no funciona, pero su
     nombre crudo `UV_QV_PPTOCOMPRA` SÍ — y ese no aparece en el catálogo),
     **4 entidades no usables** (`UtLogEjcProMrp`, `UtMaxMinCompra`,
     `UtMrpPrevioMateriaPrima`, `ArtDisponibleVaca`) y `buscar_registro`.
     Además **omite las 4 vistas funcionales** (`UV_QV_PPTOCOMPRA`,
     `DIM_TIEMPO_SEMANA`, `DIM_TIEMPO_SEMANA_ISO`, `UV_QV_FILLRATE`) y **no
     revela los 29 SPs custom** (solo `tools/list` los expone). La disponibilidad
     real se valida con `read_records(first:1)` + `mcpListTools`.
   - **Twin del tenant**: los conceptos que el skill referencia
     (`query_company_twin`) existen y son consistentes; los hechos del tenant
     (módulos publicados, políticas, usuario de corrida) están declarados; si un
     hecho que el flujo necesita siempre falta → créalo o decláralo en
     `twin_concepts:`.
   - **Kernel**: cada entidad declarada en `entities:` tiene página
     `erp-kernel/<ent>.md` (lowercase) o un override local
     `<skill>/kernel/<ent>.md`; los campos/casing del kernel coinciden con el
     MCP real (si difieren, corrige el kernel, no el skill).
   - **3 niveles de verdad** (lección validada): distingue (a) existe en la BD,
     (b) publicada en el MCP (lo que el runtime ve), (c) documentada en el
     twin/kernel. Nunca afirmes "no existe"/"no disponible" sin verificar (a) y
     (b) contra el MCP del tenant.
3. **Decide tipo y capa**: runtime vs fábrica; el schema/twin no es un skill.
4. **Redacta** con §3 (o `references/skills-runtime.md`).
5. **Valida**: `npm run check` + linter 0 críticos + grep de jerga +
   **compilador** (ts-hook: `compileSkillMarkdown` produce la vista y el peso
   razonable) + si cambia comportamiento, E2E midiendo adopción de patrones
   (read_parallel, steps/calls/tokens).
6. **Registra**: `log.md`/memoria del repo, o `promote-learnings` si es
   promoción del buffer.

---

## 7. Errores comunes (lecciones validadas)

**Schema y conocimiento**
1. **Schema en el TEXTO** → contradicciones al cambiar el kernel. Declara
   `entities:`/`twin_concepts:` o apunta al twin; nunca defines.
2. **`entities:` infladas** (declarar lo que el flujo no usa) → vista operativa
   de 25k+ → varianza. Y lo inverso: **entidades usadas SIN declarar** →
   rediscovery por turno. Declara exactamente lo que consultas.
3. **`twin_concepts:`/`entities:` que no existen** → el compilador las salta en
   silencio y el modelo rediscoverea. Verifica el archivo al declarar.
4. **`query_company_twin` recurrente de un mismo concepto** (periodo, calendario)
   → muévelo a `twin_concepts:` (el compilador lo anexa, 0 consultas).

**Redacción**
5. **Reglas vagas de mecanismo** ("en paralelo cuando se pueda", "agrupa") → el
   modelo no emite multi-acciones. Prescribe `read_parallel` con JSON.
6. **Exploración de variantes de periodo** (probar 7, 12, 2025 "por si acaso")
   → turnos de 18 steps / 1.4M tokens. Prescribe el vigente, prohíbe variantes.
7. **Valores de verificación en el cuerpo** ("CRIBACF → 629.6/1,359,936") → el
   agente los repite SIN ejecutar. Los valores de prueba nunca son canónicos.
8. **Errores de formato validados** (jerga de fábrica, descripciones en inglés,
   rutas absolutas, comillas dobles en `description: >`, frontmatter sin `---`
   en byte 0, listas YAML con comentarios internos, subcarpetas sin listar,
   contadores stale) → el remedio común es el checklist §8 (detalle en
   `references/skills-runtime.md` §1).

---

## 8. Checklist (antes de dar un skill por bueno)

- [ ] Frontmatter: `tenant` + `description: >` (español, triggers front-loaded),
      sin `name:`, `---` en byte 0
- [ ] `entities:`/`twin_concepts:` = exactamente lo que el flujo consulta, con
      archivo existente; `related_skills:` con hermanos reales
- [ ] Compilador OK (ts-hook): vista operativa presente, peso ~10-18k chars
- [ ] Cero schema en texto (referencia o compilado vía `entities:`)
- [ ] Periodo determinista: "vigente, nunca variantes"
- [ ] 2+ lecturas independientes → `read_parallel` con JSON (cero "en paralelo
      cuando se pueda")
- [ ] Tool calls exactos verificados contra el MCP real (`read_records first:1`
      por entidad + catálogo `tools/list`); `first` numérico; `describe_entities`
      NO es fuente de verdad (medido: 38/100 no consultables, 4 vistas omitidas,
      29 SPs invisibles)
- [ ] Twin y kernel corroborados: conceptos referenciados existen; entidades de
      `entities:` con página de kernel (o override local); campos/casing
      coinciden con el MCP; los 3 niveles de verdad (BD/publicada/documentada)
      distinguidos
- [ ] Cero jerga de fábrica (grep knowledge-hygiene §5 = 0)
- [ ] Archivos hermanos listados con paths relativos + `read_skill_file`
- [ ] Criterios de finalización comprobables; limitaciones honestas
- [ ] `npm run check` 0 · linter `check-knowledge.ts` 0 · (si cambia
      comportamiento) evals + E2E de humo
- [ ] El skill está en `agent.md → skills:` de su tenant/agente
