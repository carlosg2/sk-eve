---
name: skill-authoring
description: >
  Autoridad de autoría de skills de sk-eve (Sigma AGI): autorar y homogenizar
  los skills del RUNTIME (agent/skill-library/<slug>/SKILL.md, que consume el
  agente Sigma) y los skills de la FÁBRICA (.github/skills/<nombre>/SKILL.md,
  que opera VS Code Copilot). Úsalo al crear, editar, revisar o auditar
  cualquier skill, o para homogenizar el catálogo. Conoce el mecanismo de carga
  (Eve + library.ts + load_skill + read_skill_file), las convenciones por tipo
  y el checklist de validación. Operado por VS Code Copilot (la fábrica), NUNCA
  por el agente Sigma en runtime.
---

# Skill: skill-authoring — Autoridad de autoría de skills sk-eve

Eres la **autoridad de autoría** del stack sk-eve. Antes de crear, editar o
auditar cualquier skill, conoce: (1) **cómo carga el sistema** cada skill (§1),
(2) **en qué capa vive cada tipo de conocimiento** (constitución §2), y (3) **qué
conviene por tipo de skill** (§2-§3). Los principios universales de escritura
están en `references/principios-escritura.md`; el detalle de las convenciones del
runtime en `references/skills-runtime.md`.

> **Separación de poderes.** Este skill lo opera VS Code Copilot (la fábrica).
> El agente Sigma en runtime NUNCA auto-edita su conocimiento. Un skill del
> runtime es para el AGENTE; un skill de fábrica es para la FÁBRICA.

---

## 1. El sistema: cómo se cargan y consumen los skills

### 1.1 Dos poblaciones, dos consumidores

| Población | Dónde vive | Quién la consume | Qué contiene |
|---|---|---|---|
| **Skills del runtime** | `agent/skill-library/<slug>/SKILL.md` | El agente Sigma (Eve), vía `load_skill('<slug>')` | Procedural: cómo consultar el ERP (patrones, reglas de eficiencia). Cero schema, cero jerga de fábrica |
| **Skills de la fábrica** | `.github/skills/<nombre>/SKILL.md` | VS Code Copilot (fábrica/meta-fábrica) | Proceso de mejora/compilación/autoría del stack (promote-learnings, knowledge-hygiene, stack-mastery, este skill) |

Un skill del runtime **nunca** describe el proceso de la fábrica (probes, E2E,
linter, fechas de validación, métricas de corridas, sesiones `wrun_`): el agente
no tiene ese contexto y lo repite como ruido (regla de oro de
`knowledge-hygiene`).

### 1.2 Mecanismo de carga del runtime (verificado en código, 2026-08-20)

1. `agent/skills/library.ts` — `defineDynamic` resuelve el catálogo en
   `session.started` (una vez por sesión; no rompe el prompt cache).
2. `agent/lib/runtime-config.ts::loadScopedSkills(agent)` — intersecta la
   **membresía** del agente (`agent.skills` en `agent.md`) con la **visibilidad**
   por tenant del catálogo (`tenant:` del frontmatter del SKILL.md). Lee el
   `SKILL.md` Y las **subcarpetas** del skill (`references/`, `scripts/`,
   `templates/`, `assets/`) como `files` package-relative.
3. **`agent/lib/skill-compiler.ts::compileSkillMarkdown`** — COMPILA el
   markdown final del skill en `session.started` (ANTES de `defineSkill`):
   `SKILL.md` procedural + sección `## Vista operativa (compilada del kernel)`
   (body de `erp-kernel/<ent>.md` por cada entidad del frontmatter
   `entities: [...])` + sección `## Contexto del Company Twin (compilado)`
   (body de `company-twin/companies/<tenant>/<path>.md` por cada concepto del
   frontmatter `twin_concepts: [...]`). Blindado: si algo falla devuelve el
   markdown original. **Esto elimina el rediscovery** (6+ `query_company_twin`
   por turno → el schema llega ya en el prompt del skill).
4. `defineSkill({ description, markdown, files })` — el `markdown` es el
   COMPILADO del paso 3; Eve **materializa** los `files` al sandbox
   (`$HOME/.agents/skills/<slug>/...`) y anuncia al modelo: *"Skill files live
   under …/<slug>/"*.
5. El modelo ve el catálogo en `agent/instructions/agent-active.ts`
   (`- <slug> — <description>`, lista EXHAUSTIVA) y el **description** es el
   hint de ruteo que `context-planner` puntúa contra el mensaje del usuario
   (**español**).
6. `load_skill('<slug>')` devuelve el `SKILL.md` **compilado** (procedural +
   vista operativa + contexto twin, sin frontmatter). Los archivos hermanos se
   leen on-demand con `read_skill_file('<slug>', '<path>')` (tool custom, vía
   `ctx.getSkill`) o `read_file` del sandbox. **Solo el markdown compilado
   entra al prompt** → las subcarpetas no cuestan tokens por turno.

**Consecuencias para el autor:**
- El **description** es un pointer de contexto permanente: su redacción decide
  cuándo se dispara el skill. Triggers front-loaded, un trigger por rama,
  en español (el usuario pregunta en español).
- Los archivos hermanos existen para el modelo **solo si el SKILL.md los
  lista** con paths relativos explícitos. Un archivo no listado es invisible.
- El slug (nombre de la carpeta) es la identidad del skill; no hay campo
  `name:` en los skills del runtime.
- **El skill compilado ES la fuente del schema para su flujo** (regla
  anti-rediscovery): si el skill cargado trae su Vista operativa, el cuerpo NO
  instruye volver a `query_company_twin` por esas entidades.
- **Cada entidad de `entities:` cuesta ~4k chars al prompt** (tope
  `BODY_CHARS_PER_ENTITY`). Declara SOLO las entidades que el flujo usa; un
  skill compilado de 20k+ chars dispara varianza (más steps/tokens por turno).
- **`entities:` y `twin_concepts:` son los hooks del compilador**: declarar
  entidades del kernel / conceptos del twin que el flujo usa hace que su
  schema llegue COMPILADO al prompt del skill (cero rediscovery). NO declarar
  `entities:` obliga al modelo a `query_company_twin` por turno (costo).
- El `related_skills:` declara la red de la familia (estilo Hermes) — el
  planificador la consume para precargar skills hermanos.

### 1.3 Capas de conocimiento asociadas (constitución §2)

| Tipo de conocimiento | Hogar | Prohibido en |
|---|---|---|
| Capacidades del motor (OData, casing, fechas) | `erp-kernel/index.md` | skills, instructions |
| Schema de entidad (campos, tipos, estatus) | `erp-kernel/<entidad>.md` | skills (texto), instructions |
| Hecho/política del tenant (módulos, límites) | `companies/<tenant>/` (OKF) | kernel, skills (texto) |
| Cómo ejecutar un flujo | `agent/skill-library/<x>/SKILL.md` (cero schema en texto) | instructions, twin |
| Ruteo "para X usa fuente Y" | `agent/instructions.md` | skills, twin |

⚠️ **Matiz (compilador, 2026-08-21)**: el schema NO va en el TEXTO del skill,
pero SÍ llega al prompt **compilado** desde `erp-kernel/` (vía `entities:`) y
desde `companies/<tenant>/` (vía `twin_concepts:`). El skill sigue siendo
procedural en su redacción; el schema se anexa en `session.started` sin que el
autor lo duplique en el cuerpo.

---

## 2. Tipos de skill

### 2.1 Skill del runtime (procedural) — `agent/skill-library/<slug>/SKILL.md`

El caso dominante del catálogo. Frontmatter mínimo:

```yaml
---
tenant: icf            # null = universal; [a, b] = multi-tenant
description: >
  Use when el usuario pregunta por <ramas de activación>… 
entities: [Ent1, Ent2]            # opcional: entidades del kernel a compilar
                                  # (schema anexado como "Vista operativa")
twin_concepts: [mrp/mrp-concepto]  # opcional: conceptos del twin del tenant a
                                   # compilar (path relativo a companies/<tenant>/)
related_skills: [slug-a, slug-b]   # opcional: red de la familia
---
```

Reglas duras:
- **Cero schema en el TEXTO**: tablas de campos, tipos y estatus NO se
  escriben en el cuerpo. Si el flujo usa entidades cuyo schema ya está en
  `erp-kernel/`, decláralas en `entities:` y el compilador las anexa
  (si el archivo del kernel NO existe, la entidad se omite sin fallar —
  el modelo entonces la descubre vía twin). Si el flujo depende de un hecho
  del twin del tenant (ej. periodo vigente), decláralo en `twin_concepts:`.
- **Cero jerga de fábrica** (knowledge-hygiene §2): sin fechas de validación,
  E2E, linter, probe, métricas de corridas, `wrun_`, "la fábrica", rutas
  absolutas `/agent/...`.
- **Cuerpo accionable**: conexión MCP + tools, patrón por rama con tool calls
  EXACTOS (entidad, filtro, select, primero), reglas de eficiencia sin métricas,
  formato de respuesta si aplica, limitaciones honestas.
- **Periodo/ejercicio determinista**: si el usuario no da ejercicio/periodo,
  prescribir el VIGENTE (año/mes actuales de la fecha del sistema) y prohibir
  EXPLÍCITAMENTE probar variantes de periodo — la exploración de periodos
  (7, 12, ejercicios anteriores) es la causa de turnos de 1.4M tokens.
- **`read_parallel` prescrito con JSON**: cuando el flujo tiene 2+ lecturas
  independientes, escribir "UNA llamada `read_parallel({ operations: [...] })`"
  con ejemplo JSON de las operaciones reales. NUNCA "en paralelo cuando se
  pueda" (regla vaga → el modelo no emite multi-acciones).
- **Criterios de finalización** comprobables por rama ("el grid del portal",
  "la tabla de decisión con X columnas").
- **Subcarpetas permitidas** (§3.3) para material voluminoso.

Estructura de secciones recomendada (ver `references/skills-runtime.md`):
header "SOLO procedural" + referencia al twin → Conexión/Tools → Patrones
(numerados, uno por rama) → Reglas de eficiencia → Formato de respuesta →
Limitaciones.

### 2.2 Skill de la fábrica — `.github/skills/<nombre>/SKILL.md`

Operado por Copilot. Frontmatter `name` + `description` (español, una frase de
capacidad + disparadores). Puede describir **proceso de la fábrica** (es su
audiencia), referenciar `tesis/`, `scripts/`, `docs/` y la radiografía
(`.data/sessions.sqlite3`, `/api/audit/*`). Estructura: descripción general →
cuándo usarlo → prerrequisitos → cómo ejecutar → validación → errores comunes →
checklist. NUNCA un skill de fábrica debe confundirse con uno del runtime: la
descripción y el cuerpo dejan claro que lo opera Copilot, no el agente.

### 2.3 Índice / router — no escribas routers vacíos

**Regla dura** (principio de Hermes agent-skill-authoring, adoptado): un
router/hub/index cuyo contenido central sea una tabla de ruteo apuntando a
skills hermanos ("para X, carga el skill Y") añade un **salto de indirección**
y **duplica los triggers `Use when` que cada hermano ya declara**. Prueba de
corte: si el skill quedaría **vacío** sin los punteros "carga X en su lugar",
**no lo escribas** — el catálogo (`agent-active.ts`) y los triggers de cada
hermano ya hacen ese trabajo.

Excepción — **índice con valor propio** (ej. `mrp` como índice de la familia
MRP): ruteo + **reglas transversales** que aplican a toda la familia (contrato
de sesión, formato, eficiencia común), cero schema, cero duplicación de los
leaves (cada leaf lleva su contenido). Un índice sin esas reglas no agrega
valor: es contexto que el agente paga cada turno sin cambiar su
comportamiento.

---

## 3. Convenciones de autoría (detalle en `references/skills-runtime.md`)

### 3.1 Frontmatter del runtime

- `tenant:` — `null` (universal), un slug, o lista `[a, b]` (multi-tenant). La
  visibilidad la controla este campo (intersección con la membresía del agente).
- `description:` — **español**, patrón `Use when …`, triggers front-loaded, un
  trigger por rama, sin sinónimos duplicados, concisa (el description se paga
  en cada turno como hint de ruteo y entra al catálogo de `agent-active.ts`).
  Empieza con la palabra de activación que usaría el usuario.
- `entities:` — **opcional**. Lista de entidades del kernel que el flujo usa;
  el compilador anexa su schema como `## Vista operativa` (acota ~4k
  chars/entidad; omite sin fallar las que no tienen archivo en
  `erp-kernel/`). Regla: declara TODAS las entidades que consultas (reduce
  `query_company_twin` a 0 para ese flujo).
- `twin_concepts:` — **opcional**. Lista de paths de conceptos del twin del
  tenant, relativa a `company-twin/companies/<tenant>/` sin extensión (ej.
  `mrp/mrp-sesion-periodo`). El compilador anexa su body como
  `## Contexto del Company Twin` — ideal para hechos transversales que el
  modelo consultaba una y otra vez (periodo vigente, sesión, calendario).
- `related_skills:` — **opcional**. Slugs de la familia (red estilo Hermes);
  el planificador la consume para precargar skills hermanos.
- SIN `name:` (el slug del directorio es el nombre), SIN `version`/`author`/
  `license`/`platforms` (no aplican en el runtime).

### 3.2 Cuerpo del runtime

Header obligatorio: `> **Este skill es SOLO procedural.** Schema: <conceptos
del twin en backticks>`. Luego: Conexión MCP + tools (con `Usuario` fijo si
aplica), patrones numerados, reglas de eficiencia, formato de respuesta,
limitaciones. Cero narrativa de proceso, cero comparaciones con otros skills
("al igual que X").

- **Prescribe el MECANISMO, no la intención** (lección `read_parallel`): si un
  paso necesita 2+ lecturas independientes, escribe explícitamente
  `read_parallel({ operations: [...] })` con las operaciones y un ejemplo JSON
  — NUNCA "encadena pasos en paralelo cuando se pueda": el modelo casi nunca
  emite varias tool calls por step y no traduce la intención. Cada paso extra
  cuesta ~15-20s. Si hay dependencia entre lotes, declárala (lote 1 → lote 2).

**Periodo vigente (regla determinista):** si el usuario no menciona
periodo/ejercicio, prescribir el vigente (año/mes actuales — ej. 2026/8) y
prohibir probar variantes. Incluye las semanas del periodo desde el calendario
(`DIM_TIEMPO_SEMANA`/`CalendarioFC`). Esta sección elimina el peor patrón
lento del runtime (exploración de periodos = 18 steps / 1.4M tokens).

**`read_parallel`:** para 2+ lecturas independientes del MISMO flujo (plan +
SP + snapshot + agregados), prescribir UNA llamada:
```
read_parallel({ operations: [ { tool: '<tool>', args: {...} }, ... ] })
```
Con las operaciones EXACTAS del flujo. Regla: máximo 10 ops por lote; si el
flujo exige más, 2 lotes (nunca más de 2-3 por turno). No incluir escrituras.

### 3.3 Subcarpetas (references/, scripts/, templates/, assets/)

- Se montan como archivos package-relative (verificado E2E 2026-08-20) y el
  modelo los lee con `read_skill_file('<slug>', '<path>')` o `read_file`.
- El SKILL.md **debe listar** los archivos hermanos con paths relativos
  explícitos (ej. "el detalle por artículo está en `references/cobertura.md` —
  léelo con `read_skill_file('mrp-produccion', 'references/cobertura.md')`").
- Criterio de disclosure: lo que solo **algunas ramas** necesitan va a un
  hermano; lo que **todas** necesitan va inline. No escondas material
  imprescindible.
- No pongas schema en los hermanos: también son procedural o material de
  apoyo; el schema sigue en el twin.

### 3.4 Higiene (knowledge-hygiene)

Antes de crear/editar cualquier skill del runtime, aplica el checklist de
`knowledge-hygiene` §5 (grep de jerga → sanitizar → linter → evals → E2E de
humo). Regla de oro: **el conocimiento del runtime describe el DOMINIO, nunca
el proceso de la fábrica**.

### 3.5 Referencias entre capas (patrón correcto)

| Desde | Hacia | Formato |
|---|---|---|
| Skill runtime | otra skill | `` `mrp-arribos` `` + "cargar con `load_skill('mrp-arribos')`" |
| Skill runtime | twin/kernel | `[mrp-explosion.md](`mrp-explosion`)` (concepto, no ruta) |
| Skill runtime | archivo hermano | `references/cobertura.md` + `read_skill_file('<slug>', '<path>')` |
| Skill runtime | archivo de la fábrica | ❌ NO (el agente no tiene filesystem) |
| Skill de fábrica | scripts/docs/tesis | rutas relativas normales (es Copilot quien lo lee) |

### 3.6 El compilador y la Vista operativa (schema embebido)

El compilador corre en `session.started` y resuelve el schema SIN rediscovery:
el modelo ya trae en el skill cargado los bodies del kernel de las entidades
que declaraste. Reglas del autor:

- **Declara en `entities:` SOLO lo que el flujo consulta.** Cada entidad suma
  ~4k chars al prompt; 8+ entidades = skill de 25k+ chars → varianza alta
  (más steps/tokens por turno). El schema de una rama que solo algunos flujos
  alcanzan va a `references/` o se consulta on-demand, no a la lista.
- **Anti-rediscovery (regla dura):** si el skill trae su Vista operativa, el
  cuerpo NO instruye volver a `query_company_twin` por esas entidades.
- **Entidad sin archivo kernel** se salta en silencio → el modelo pierde ese
  schema y rediscoverea. Al declarar, verifica que exista
  `erp-kernel/<entidad>.md` (lowercase) o publica `<skill>/kernel/<entidad>.md`
  (gana sobre el global; útil para snapshots scratch del MCP).
- **`twin_concepts:`** para las reglas del tenant que el flujo necesita siempre
  (ej. `mrp/mrp-sesion-periodo`); no para material de una sola rama.
- **El compilador es blindado**: si falla devuelve el SKILL.md original (sin
  vista operativa) y no rompe el turno. Valida con ts-hook que compile.

---

## 4. Principios de escritura (resumen; detalle en `references/principios-escritura.md`)

- **Context pointer**: el `description` (y cualquier línea del cuerpo que
  apunte a material fuera de contexto) nombra el material Y codifica la
  condición para alcanzarlo. La redacción del pointer, no su destino, decide
  cuándo se alcanza.
- **Dos cargas**: *context load* (lo siempre cargado: description, catálogo) y
  *cognitive load* (lo que el humano debe recordar). Los skills del runtime
  optimizan context load (progressive disclosure); los de la fábrica pueden
  gastar cognitive load deliberadamente.
- **Jerarquía de información**: paso inline > referencia inline > referencia
  disclosada (subcarpeta/hermano). La tensión "top bloat vs material escondido"
  es la decisión.
- **Progressive disclosure**: bajar material por la jerarquía para proteger el
  top. Prueba limpia: **inline lo que toda rama necesita; disclosa lo que solo
  algunas ramas alcanzan**.
- **Co-location**: definición, reglas y caveats de un concepto bajo un mismo
  heading; el documento debe leerse como documentación del agente.
- **Leading words**: una palabra compacta y ya conocida (ej. *snapshot*, *gap*,
  *cobertura*) que ancla comportamiento con el mínimo de tokens. Repetir el
  token, nunca la frase.
- **Negación**: prohibir arrastra el comportamiento prohibido al contexto.
  Redacta el comportamiento POSITIVO ("lee con `first` numérico") en vez de la
  prohibición ("no uses string").
- **Prescripción mecánica**: ante un mecanismo que el modelo debe ejecutar
  (paralelismo, un tool específico, una agrupación), prescribe la CONCRETA — la
  tool con su nombre y un ejemplo — y no la intención ("en paralelo",
  "agrupa"). Verificado en vivo: "encadena en paralelo cuando se pueda" → 0
  uso de `read_parallel`; "usa UNA llamada `read_parallel({ operations: [...]
  })`" con ejemplo → adopción 4.5× en una sesión.
- **Completion criteria**: cada paso termina con una condición comprobable
  (clara y exigente). "Cada artículo con su cobertura calculada" fuerza más que
  "produce el reporte".
- **Pruning**: single source of truth (sin duplicar el twin), el entorno es
  fuente de verdad (no cachear lo que el modelo puede mirar), relevancia por
  línea, cazar no-ops (lo que el modelo ya hace por default).
- **Sprawl**: documento demasiado largo aunque cada línea viva → disclosa o
  divide.

---

## 5. Homogenización del catálogo

Al auditar/homogenizar los skills del runtime, verifica estos criterios de
consistencia (son los que definen "un skill sk-eve"):

1. **Frontmatter**: `tenant` + `description: >` en TODOS. Sin `name:`.
2. **Idioma**: descripción y cuerpo en **español** (el agente y las consultas
   son en español). Patrón `Use when el usuario pregunta/pidiendo …`.
3. **Estructura**: header "SOLO procedural" + referencia al twin; secciones con
   la misma nomenclatura (Patrón, Reglas de eficiencia, Formato de respuesta,
   Limitaciones).
4. **Referencias**: por slug/load_skill y por concepto del twin; cero rutas de
   archivo.
5. **Higiene**: cero jerga de fábrica (grep de knowledge-hygiene §5).
6. **Tamaño**: ≤ ~200 líneas salvo excepción justificada (material disclosado
   en subcarpetas).
7. **Membresía**: todo skill visible para un agente debe estar en su `agent.md`
   (`skills:`), y todo skill con `tenant` debe estar en la membresía de al menos
   un agente de ese tenant (verifica con `agent/instructions/agent-active.ts`
   que la lista sea la esperada).
8. **Compilación**: `entities:` (y `twin_concepts:` donde aplique) declarados
   para TODO lo que el flujo consulta Y solo eso (probe de
   `compileSkillMarkdown` verifica que anexa la vista; un skill que consulta
   entidades SIN declararlas genera rediscovery por turno). `related_skills:`
   en los skills con hermanos.
9. **Prescripción mecánica**: los pasos con 2+ lecturas independientes
   prescriben `read_parallel` con ejemplo JSON; cero "en paralelo cuando se
   pueda".
10. **Periodo determinista**: todo skill que consulta por periodo lleva la
    regla "vigente, nunca variantes".
11. **Peso compilado**: SKILL.md + vista operativa en ~10-18k chars; skills de
    20k+ → adelgazar (entities mínimas, material voluminoso a `references/`).

Checklist de auditoría rápido:

```bash
# 1. Frontmatter completo y sin name:
for f in agent/skill-library/*/SKILL.md; do
  grep -q "^tenant:" "$f" || echo "SIN tenant: $f"
  grep -q "^description:" "$f" || echo "SIN description: $f"
  grep -q "^name:" "$f" && echo "CON name (quitar): $f"
done
# 2. Jerga de proceso (debe dar 0 fuera de log.md / metadatos OKF)
grep -rnE "verificado 2026|validado 2026|E2E|linter|probe|wrun_|/agent/skill-library/|la fábrica|costó|calls /" \
  agent/skill-library 2>/dev/null | grep -v "/.eve/" | grep -v "log.md"
# 3. Rutas absolutas / referencias rotas
grep -rnE "\(/agent/|\[.*\]\(\.\./\.\./\.\." agent/skill-library/*/SKILL.md 2>/dev/null
# 4. Linter de conocimiento (0 críticos)
nvm use 24 >/dev/null 2>&1 && node scripts/check-knowledge.ts
```

---

## 6. Proceso de autoría (pasos)

1. **Estudia lo existente**: ¿existe un skill hermano que cubra la rama?
   Prefiere extender/refinar sobre crear un hermano estrecho.
2. **Verifica contra lo real ANTES de escribir**: `read_records(<Ent>, first:1)`
   contra el MCP del tenant para confirmar entidad/campos/casing (la verdad de
   runtime). Nunca escribas schema o tool calls de memoria.
3. **Decide tipo y capa**: runtime (procedural) vs fábrica; y si el hecho es
   schema/twin, no es un skill.
4. **Redacta** con las convenciones de §3 (o `references/skills-runtime.md`).
5. **Valida**: `npm run check` (con `nvm use 24`), linter `check-knowledge.ts`
   (0 críticos), grep de jerga, **compilador** (ts-hook: `compileSkillMarkdown`
   produce la Vista operativa y el peso es razonable), y si cambió
   comportamiento: evals + E2E de humo midiendo adopción de patrones
   (read_parallel, steps/calls/tokens — protocolo en
   `tesis/protocolo-pruebas.md`).
6. **Registra**: si toca conocimiento del runtime → `log.md`/memoria del repo;
   si es promoción del buffer → `promote-learnings`.

---

## 7. Errores comunes (lecciones validadas)

1. **Schema en el TEXTO del skill** en vez del kernel/twin → contradicciones
   al cambiar el kernel. Regla: el skill apunta (o declara `entities:` para
   compilar), no define.
2. **Jerga de fábrica** (fechas, E2E, probes, métricas) → el agente la repite.
3. **Valores de verificación en el cuerpo** ("CRIBACF → 629.6/1,359,936") → el
   agente los repite SIN ejecutar. Los valores de prueba nunca son canónicos.
4. **Rutas absolutas** `/agent/skill-library/...` → el modelo no las navega y
   el validador da falsos positivos. Usar slug/concepto.
5. **Descripciones en inglés** en un agente español → ruteo más pobre
   (context-planner puntúa contra el mensaje del usuario). Homogeneizar a
   español.
6. **Comillas dobles dentro de `description: >`** → rompen el parser de Eve
   (errores fantasma "File not found"/"Skill should provide a name"). Texto
   plano o comillas simples.
7. **Listas YAML flow con comentarios internos** en `agent.md` → el parser
   casero trunca la lista (allow-list vacía → expone TODOS los tools MCP).
   Comentarios en líneas aparte.
8. **Frontmatter con línea en blanco inicial o BOM** antes de `---` → el
   frontmatter no se parsea. `---` en el byte 0.
9. **Subcarpeta sin listar en el SKILL.md** → el archivo existe en disco pero
   el modelo no sabe que está (invisible). Siempre listar con paths relativos.
10. **Contadores/descripciones stale** ("12 skills" cuando hay 13+) → el
    catálogo cambia; no hardcodear conteos en skills.
11. **`entities:` infladas** (declarar entidades que el flujo no usa) → la
    Vista operativa crece ~4k/entidad y el skill compilado pasa de 20k chars →
    varianza alta. Declara solo lo que consultas.
12. **Entidades usadas SIN declarar en `entities:`** → el skill compilado no
    trae su schema y el modelo hace `query_company_twin` por turno (rediscovery
    caro). Declarar las entidades que el flujo consulta.
13. **Reglas vagas de paralelismo** ("en paralelo cuando se pueda", "agrupa
    lecturas") → el modelo NO emite multi-acciones por defecto. Prescribir
    `read_parallel` con JSON explícito, nunca frases genéricas.
14. **Exploración de variantes de periodo** (probar 7, 12, 2025/12 "por si
    acaso") → turnos de 18 steps / 1.4M tokens. Prescribir el vigente
    (año/mes actuales) y prohibir explícitamente probar variantes.
15. **`twin_concepts:`/`entities:` que no existen** → el compilador las salta
    en silencio y el modelo rediscoverea el schema. Verifica el archivo al
    declarar.
16. **`query_company_twin` recurrente del mismo concepto** (ej. periodo
    vigente, calendario) → mover ese hecho a `twin_concepts:` para que el
    compilador lo anexe al skill (0 consultas).

---

## 8. Checklist de verificación (antes de dar un skill por bueno)

- [ ] Frontmatter: `tenant` + `description: >` (español, triggers front-loaded),
      sin `name:`, `---` en el byte 0
- [ ] `entities:`/`twin_concepts:` declarados para TODO lo que el flujo
      consulta Y solo eso (probe: `compileSkillMarkdown` anexa la vista
      operativa y el contexto del twin; peso compilado razonable ~10-18k;
      archivos de kernel/concepto existentes)
- [ ] Periodo/ejercicio: regla "vigente (año/mes actuales), nunca probar
      variantes" presente en todo skill que consulta por periodo
- [ ] `read_parallel` prescrito con JSON explícito para 2+ lecturas
      independientes (nunca "en paralelo cuando se pueda")
- [ ] Cero schema en texto (referencia al twin por concepto o compilado vía
      `entities:`)
- [ ] Cero jerga de fábrica (grep de knowledge-hygiene §5 = 0)
- [ ] Referencias por slug/`load_skill` y concepto; cero rutas de archivo
- [ ] Archivos hermanos (si existen) listados con paths relativos + nota de
      `read_skill_file`
- [ ] Estructura de secciones consistente con la familia del skill
- [ ] Cada patrón/rama con tool call exacto (entidad, filtro, select, primero)
      verificado contra el MCP real
- [ ] Criterios de finalización comprobables; reglas de eficiencia sin métricas
- [ ] Limitaciones honestas declaradas ("no documentado", "no cubierto")
- [ ] `related_skills:` con hermanos reales donde aplique
- [ ] `npm run check` 0 errores · linter `check-knowledge.ts` 0 críticos ·
      (si cambia comportamiento) evals + E2E de humo
- [ ] El skill está en la membresía (`agent.md` → `skills:`) de su tenant/agente