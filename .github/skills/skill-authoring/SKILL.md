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

# Skill: skill-authoring — autoría de skills sk-eve

Lo opera VS Code Copilot (la fábrica); el agente Sigma NUNCA se auto-edita su
conocimiento. Un skill del **runtime** es para el AGENTE; uno de **fábrica**,
para Copilot. Este archivo es la decisión (qué hacer y en qué orden); el cómo
detallado vive en `references/skills-runtime.md` (frontmatter campo por campo,
cuerpo, subcarpetas, compilación) y `references/principios-escritura.md`
(levers de escritura para agentes). No dupliques lo que ya está ahí.

## 1. Decisiones antes de escribir

**¿Runtime o fábrica?**
- **Runtime** (`agent/skill-library/<slug>/SKILL.md`): el caso dominante.
  Procedural, en español, escrito para el agente.
- **Fábrica** (`.github/skills/<nombre>/SKILL.md`): proceso de Copilot; puede
  citar `tesis/`, `scripts/`, la radiografía.

**¿Es un router?** Si el contenido central serían punteros a hermanos ("para X
carga Y") y quedaría vacío sin ellos, NO lo escribas: el catálogo
(`agent-active.ts`) ya enruta. Solo escribe un índice si aporta reglas
transversales propias (ej. `mrp`).

**¿Dónde vive cada hecho?** (constitución §2): schema → `erp-kernel/`, hechos
del tenant → `companies/<tenant>/`, flujo → skill, ruteo → `instructions.md`.

## 2. Carga — lo que te obliga (no el mecanismo)

Mecanismo (resumen): `library.ts` (catálogo) → `loadScopedSkills`
(membresía∩visibilidad) → `skill-compiler.ts` compila `entities:`/`twin_concepts:`
en `session.started` → `defineSkill`. Consecuencias para el autor:

- **`description` = pointer de ruteo permanente**: español, `Use when …`,
  triggers front-loaded, uno por rama. Es lo que decide cuándo se carga.
- **`entities:`/`twin_concepts:` compilan schema/twin al prompt** (~4k
  chars/entidad): declara EXACTAMENTE lo que el flujo consulta y solo eso. El
  schema NUNCA va en el texto del cuerpo.
- **El skill compilado es la fuente del schema de su flujo** (anti-rediscovery):
  si trae su vista operativa, el cuerpo no instruye `query_company_twin`.
- **Subcarpetas** (`references/`, `scripts/`, `templates/`, `assets/`): solo
  son visibles si el SKILL.md las lista con path relativo + `read_skill_file`.
- **El slug es la identidad**; no hay `name:`/`version:`.
- El compilador es blindado y **salta en silencio** lo que no existe → verifica
  que cada `entities:` tenga página de kernel (o override `<skill>/kernel/`).

---

## 3. Reglas duras del cuerpo (runtime)

1. **Cero schema en texto** — declara (`entities:`/`twin_concepts:`) o apunta
   al twin; nunca defines.
2. **2+ lecturas independientes → UNA `read_parallel({ operations: [...] })`**
   con las operaciones EXACTAS y ejemplo JSON (máx 10 ops/lote; lotes si hay
   dependencia). Nunca "en paralelo cuando se pueda": el modelo no emite
   multi-acciones.
3. **Periodo determinista**: si el usuario no da periodo → el vigente (año/mes
   actuales) y prohíbe probar variantes (la exploración de periodos es la causa
   de los turnos más caros del runtime).
4. **Prescripción mecánica**: tool calls EXACTOS (entidad, filter, select,
   `first` SIEMPRE numérico), criterios de finalización comprobables,
   limitaciones honestas.
5. **Cero jerga de fábrica** — fechas de validación, E2E, probes, métricas,
   rutas absolutas, "la fábrica" (knowledge-hygiene §2).

Estructura del cuerpo: header "SOLO procedural" + referencias → Conexión/Tools →
Patrones (uno por rama) → Eficiencia → Formato → Limitaciones.

## 4. Proceso de autoría

1. **Estudia lo existente**: extiende un hermano antes de crear uno estrecho.
2. **Verifica contra lo real ANTES de redactar** — nada se escribe de memoria:
   - **MCP del tenant** (la verdad de runtime): `read_records(<Ent>, first:1..5)`
     por cada entidad/tool que usarás. ⚠️ `describe_entities` NO es fuente de
     verdad (en el catálogo ICF, 38/100 nombres listados no son consultables:
     29 son SPs/tools custom, 4 vistas con nombre normalizado incorrecto, 4
     entidades no usables; y omite vistas funcionales y SPs). Valida con
     `read_records(first:1)` + `tools/list`.
   - **Twin**: los conceptos que referenciarás existen y son consistentes; los
     hechos que el flujo necesita siempre están declarados.
   - **Kernel**: cada `entities:` tiene `erp-kernel/<ent>.md` (lowercase) o
     override local; campos/casing coinciden con el MCP (si difieren, corrige
     el kernel, no el skill).
   - **3 niveles de verdad**: (a) existe en BD, (b) publicada en el MCP,
     (c) documentada en twin/kernel. Nunca digas "no existe" sin verificar
     (a)+(b).
3. **Redacta** con §3 (detalle: `references/skills-runtime.md`).
4. **Valida**: checklist §6.
5. **Registra**: `log.md`/memoria del repo, o `promote-learnings` si es
   promoción del buffer.

---

## 5. Errores comunes (los que duelen)

1. **Schema en el texto** → contradicciones al cambiar el kernel.
2. **`entities:` infladas o sub-declaradas** → vista operativa de 25k+
   (varianza) o rediscovery por turno. Declara exactamente lo que consultas.
3. **`entities:`/`twin_concepts:` inexistentes** → el compilador las salta en
   silencio y el modelo rediscoverea.
4. **`query_company_twin` recurrente de un mismo concepto** (periodo,
   calendario) → muévelo a `twin_concepts:` (llega compilado, 0 consultas).
5. **Reglas vagas de mecanismo** ("en paralelo cuando se pueda") → el modelo no
   emite multi-acciones; prescribe `read_parallel` con JSON.
6. **Exploración de variantes de periodo** (probar 7, 12, ejercicios viejos)
   → turnos de ~1.4M tokens. Prescribe el vigente.
7. **Valores de verificación en el cuerpo** ("CRIBACF → 629.6/1,359,936") → el
   agente los repite SIN ejecutar. Los valores de prueba nunca son canónicos.
8. **Errores de formato**: jerga de fábrica, descripciones en inglés, rutas
   absolutas, comillas dobles en `description: >`, frontmatter sin `---` en
   byte 0, listas flow con comentarios internos, subcarpetas sin listar.

---

## 6. Checklist (antes de dar un skill por bueno)

- [ ] Frontmatter: `tenant` + `description: >` (español, triggers front-loaded),
      sin `name:`, `---` en byte 0
- [ ] `entities:`/`twin_concepts:` = exactamente lo que el flujo consulta, con
      archivo existente; `related_skills:` con hermanos reales
- [ ] Cero schema en texto; periodo determinista ("vigente, nunca variantes");
      2+ lecturas → `read_parallel` con JSON; tool calls exactos verificados
      contra el MCP real (`read_records first:1` por entidad + `tools/list`);
      `first` numérico; `describe_entities` NO es fuente de verdad
- [ ] Twin/kernel corroborados: conceptos referenciados existen; entidades con
      página de kernel (o override local); campos/casing coinciden con el MCP;
      los 3 niveles de verdad (BD/publicada/documentada) distinguidos
- [ ] Cero jerga de fábrica (grep knowledge-hygiene §5 = 0)
- [ ] Subcarpetas listadas con paths relativos + `read_skill_file`
- [ ] Compilador OK (ts-hook): vista operativa presente, peso ~10-18k chars
- [ ] Criterios de finalización comprobables; limitaciones honestas
- [ ] `npm run check` 0 · linter `check-knowledge.ts` 0 · (si cambia
      comportamiento) evals + E2E de humo
- [ ] El skill está en `agent.md → skills:` de su tenant/agente

Auditoría rápida (grep):

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

> `ponytail:` el mecanismo de carga está resumido a sus consecuencias — si el
> mecanismo cambia (nueva versión de Eve), actualiza `references/skills-runtime.md`
> §6, no este archivo.
> `ponytail:` la métrica de `describe_entities` (38/100) vive solo en este
> checklist — si el catálogo del MCP cambia, re-mide con un probe y actualiza.
