# Trace2Skill — el Enterprise Skill Compiler de Sigma (Meta-fábrica §1.3)

> Spec de la fábrica (2026-08-11). Aterriza la visión "meta-skill trace2enterprise-skill":
> convertir **operación real del ERP** (traces MSSQL / Extended Events / Query Store +
> evidencia de runtime) en **capacidad ejecutable**: IA agent skills, wiki operativa y
> dab-config/MCP tools. Es el componente **Trace2Skill** de la Meta-fábrica
> (`tesis/arquitectura.md §1.3`) y el motor del "Enterprise Skill Compiler".
>
> Estado: **Draft → In Progress** (implementación F1 en `scripts/trace2skill-draft.ts`).

---

## 1. Por qué esto, y no reglas escritas a mano (la lección de Range)

El entorno de Sigma (ERP + IA + organización + humano) es un **wicked environment**
(Range, David Epstein): las reglas cambian, el feedback es ambiguo, los humanos alteran
el sistema. En entornos así, **sobre-especializar temprano con reglas estáticas es
frágil**: el "experto" se aferra a su modelo, deja de notar anomalías y confunde
familiaridad con comprensión.

Por eso el conocimiento de Sigma **no se escribe a mano como reglas detalladas**; se
**compila desde la evidencia de cómo opera realmente el departamento**:

```
usuario final → acción en Intelisis → SQL/tool call real → entidades usadas
  → intención implícita → reglas implícitas → skill + wiki + tool reutilizable
```

El trace no es "qué SQL corrió": es la **evidencia de la secuencia organizacional viva**
(el Process Execution Graph de la tesis). El compilador no inventa procedimientos; los
**extrae de la operación real** y los emite en su hogar canónico. Eso es lo que separa a
Sigma de "knowledge orchestration": es **procedural organizational cognition** con
materia prima real.

## 2. Pipeline (9 pasos, aterrizados al stack)

```
1. CAPTURA      Extended Events / Query Store / archivos .xel / consultas del agente
                (validado en el MCP real) → `raw/traces/*.json`
2. LIMPIEZA     quitar ruido: queries temporales, duplicados, selects irrelevantes
3. AGRUPACIÓN   detectar patrones de operación (mismo dominio, mismas entidades)
4. INTENCIÓN    inferir el objetivo de negocio (consultar pendientes, validar, afectar)
5. MAPEO ERP    entidades/SPs/vistas/campos/joins/filtros/movimientos (vs kernel + db-metadata)
6. GENERACIÓN   skill (SKILL.md procedural) + wiki (humana) + dab-config (entities/tools)
7. REVISIÓN     la fábrica (Copilot) aprueba/edita cada artefacto (gate humano-en-el-loop)
8. PUBLICACIÓN  promote a su hogar canónico (constitución §1) + validar (check-knowledge + evals)
9. RETRO        el runtime usa la skill → aprende (buffer) → nuevo trace → v2
```

## 3. Artefactos y hogar canónico (constitución)

| Artefacto | Contenido | Hogar | Formato |
|---|---|---|---|
| **Agent Skill** | intención (user_goal + example_questions), business objects, entidades detectadas, operaciones (read/reasoning/action_plan), qué requiere HITL | `agent/skill-library/<dominio>/SKILL.md` | markdown + frontmatter `tenant`/`description` (cero schema; referencia al Twin) |
| **Wiki operativa** | qué resuelve, tablas, preguntas soportadas, reglas de negocio detectadas | `docs/icf/wiki/<dominio>.md` (o twin del tenant) | markdown |
| **DAB config** | entities sugeridas (source.object + type), permissions read-only por defecto, rest/graphql, tools MCP | `dab/dab-config.json` (via fábrica sigma-dab) | JSON |

**Reglas de compilación:**
- El skill **nunca** contiene schema (va al kernel) ni políticas (van al twin).
- Las **escrituras** se compilan como `action_plan` con `requires_human_confirmation: true`
  (el approval gate del runtime lo refuerza).
- Lo que el trace muestra como `read` puro → skill read + entity DAB read-only.
- Multi-tenant: el dominio se compila UNA vez (kernel + skill con frontmatter `tenant`);
  las políticas del cliente van al twin de ese tenant.

## 4. Evidencia de entrada (fuentes legítimas)

1. **Traces MSSQL reales**: Extended Events (`sqlserver.rpc_completed`, `sql_statement_completed`)
   o Query Store — de la BD del cliente (ej. `Intelisis5000` en `sv5-sqlserver`).
2. **Consultas validadas del agente** (inspector / radiografía SQLite): lo que el agente
   YA ejecutó contra el MCP real con éxito (los probes + los turns de /chat).
3. **db-metadata** (`sigma-dab/projects/joya/db-metadata/db-metadata-intelisis5000.json`):
   13,143 objetos → mapeo de entidades/vistas reales.
4. **Reuniones / minutas**: intención de negocio que el trace no muestra solo.

F1 usa (2)+(3) como materia prima (los use cases YA validados son "traces de operación");
F2 conecta (1) con captura real.

## 5. Implementación — F1 (este commit)

`scripts/trace2skill-draft.ts` (script de FÁBRICA, nunca referenciado por el runtime):

- **Input**: `TRACES` — operaciones reales validadas (dominio, intent, example_questions,
  operaciones con entidad/filtro/groupby/select, ¿escritura?).
- **Compila** por dominio → 3 artefactos:
  - `SKILL.md` (frontmatter + procedimiento con patrones exactos),
  - `wiki.md` (humana),
  - `dab-entities.md` (borrador de entities DAB para el fábrica sigma-dab).
- **Emite** a `tesis/work/trace2skill-output/<dominio>/` para revisión de la fábrica.
- **Imprime** un resumen (dominios, artefactos, siguientes pasos: revisar → promote →
  validar con `npm run lint:knowledge` + evals).

### Cómo correrlo
```
nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
  --experimental-strip-types scripts/trace2skill-draft.ts
```

## 6. Roadmap (hacia la mini-AGI)

| Fase | Qué | Entregable |
|---|---|---|
| **F1** | Compilador con traces validados (use cases reales) → skill+wiki+dab | `trace2skill-draft.ts` (este commit) |
| **F2** | Captura real: Extended Events/Query Store de `sv5-sqlserver` → `raw/traces/*.json` + pipeline 1-5 automatizado | scripts de captura + normalización |
| **F3** | Publicación automática: promote a skill-library + twin + propuesta de dab-config; evals por dominio | integración con promote-learnings + check-knowledge |
| **F4** | Cross-client patterns (el moat): comparar traces entre tenants → patrones universales al kernel | `inteligencia-consultora.md` Pattern Engine |
| **F5** | El loop completo: runtime opera → trazas → fábrica compila → evals → nueva autonomía | el ciclo de la tesis cerrado |

**Definición de "hecho" para F1:** un dominio completo (control-compras) compilado con
sus 3 artefactos coherentes entre sí y con el kernel/twin, revisado por la fábrica.
