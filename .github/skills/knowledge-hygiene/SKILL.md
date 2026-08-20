---
name: knowledge-hygiene
description: >
  Meta-fábrica: reglas y checklist para escribir conocimiento del runtime
  (Company Twin, ERP Kernel, skills, instructions, learnings buffer) SIEMPRE
  sanitizado — sin jerga de proceso de la fábrica, sin fechas de validación,
  sin métricas de corridas, sin referencias a archivos fuente internos, sin
  comentarios fuera de lugar que el agente en runtime leería. Úsalo antes de
  crear/editar/promover CUALQUIER archivo de conocimiento del agente. Operado
  por VS Code Copilot (la fábrica), NUNCA por el agente Sigma en runtime.
---

# Skill: knowledge-hygiene — Escribir conocimiento limpio para el runtime

La **fábrica** escribe el conocimiento que el agente Sigma lee en runtime. El
agente **no tiene contexto de la fábrica**: no sabe qué es un probe, un E2E,
un linter, `sp-mrp.sql`, una corrida, un timestamp ni una sesión `wrun_`. Si
ese ruido entra en un skill/twin/kernel, **contamina** al modelo (lo repite en
sus respuestas, intenta "explorar" archivos que no puede abrir, o confunde
proceso con negocio).

Este skill es la **regla de oro transversal** de la meta-fábrica: se aplica a
todo lo que se escribe en `agent/skill-library/`, `company-twin/` (twin del
tenant + erp-kernel) y al buffer `state/learnings.md`. Complementa a
`promote-learnings` (compila el buffer al hogar canónico) y a `stack-mastery`
(mejora E2E): **ningún cambio se promueve sin pasar por este checklist**.

> **Separación de poderes.** La fábrica SÍ lleva bitácoras de su proceso
> (`log.md`, `docs/`, memoria del repo) — pero esas son de la fábrica. El
> conocimiento que el runtime lee es otra cosa: hechos de negocio y reglas
> operativas, redactados como si el agente fuera el usuario.

---

## 1. Regla de oro

> **El conocimiento del runtime describe el DOMINIO (negocio + cómo consultar
> el ERP), nunca el PROCESO de la fábrica.**
>
> Si un hecho solo tiene sentido para quien curó/validó el conocimiento (no
> para quien consulta los datos), NO va en skills/twin/kernel: va a la
> memoria de la fábrica (`/memories/repo/`), a `docs/` o a `log.md`.

Pregunta para cada frase antes de escribir: **¿le sirve esta frase al agente
para responder mejor al usuario?** Si responde "no, es contexto de cómo se
hizo/validó esto", se quita o se reformula.

---

## 2. QUÉ NUNCA va en el conocimiento del runtime (eliminar)

| Categoría | Ejemplos a eliminar | Por qué contamina |
|---|---|---|
| **Fechas de validación** | `(verificado 2026-08-06)`, `validado 2026-08-19`, `publicada el 2026-08-19` | El agente no necesita cuándo se validó; es ruido y se vuelve stale |
| **Herramientas de la fábrica** | `probe`, `E2E`, `linter`, `evals`, `get_errors`, `check-knowledge`, `npm run lint:knowledge` | El agente no tiene esas herramientas; "explorar" es un anti-patrón |
| **Métricas de corridas** | `costó 187k tok / 14 calls`, `23 calls / ~316k tokens`, `(E2E 2026-08-06)` | Son evidencia interna de rendimiento, no conocimiento de negocio |
| **Archivos fuente internos** | `sp-mrp.sql`, `04_Procedure.sql`, `Dani/agente MRP/`, `(único archivo .sql del proyecto)` | Rutas/archivos de la fábrica; el agente no puede (ni debe) leerlos |
| **Menciones a la fábrica** | `la fábrica`, `meta-fábrica`, `promote-learnings`, `protocolo de la meta-fábrica`, `el DBA publicó...` | El agente no sabe que existe una fábrica |
| **IDs de sesión / timestamps** | `(sesión wrun_01M0...)`, `_(2026-08-17T08:11:42.422Z)_` | Ruido de telemetría del runtime |
| **Rutas absolutas a skills** | `/agent/skill-library/mrp-forecast/SKILL.md` | El modelo no navega archivos; se carga por slug con `load_skill` |
| **Comparaciones entre skills** | `al igual que mrp-articulos`, `como en mrp-forecast` | Solo tienen sentido para quien curó ambos |
| **Jerga "verificado/validado" suelta** | `(verificado)`, `Estado verificado`, `campos verificados en vivo` | Marca de proceso; preferir `confirmado`/`documentado` o directamente el hecho |
| **Frontmatter de proceso** | `generated: { by: copilot/sigma-meta-fabrica, at: ... }`, `provenance` con `resource: docs/...` | ⚠️ EXCEPCIÓN: se conserva (es metadato estructural OKF de la fábrica, no se muestra al agente). No añadir más, no promocionar contenido ahí |

## 3. QUÉ SÍ va en el conocimiento del runtime (conservar/reformular)

| Categoría | Ejemplos correctos |
|---|---|
| **Hechos de negocio** | `ResumenPlaneacionCF` es scratch por usuario; `Usuario eq 'MASERP'`; estatus `CONCLUIDO`; `S32=3,978,128` |
| **Evidencia de comportamiento del ERP** | "`Semana eq 31` → BadRequest; `SEMANA eq 31` → OK" (casing UPPERCASE); "`EntityNotFound` confirmado con `read_records(first:1)`" |
| **Estados de conocimiento (honestidad)** | "cobertura NO confirmada"; "lógica de negocio NO documentada"; "no prometas datos que no puedas respaldar" |
| **Reglas operativas / eficiencia** | "NUNCA hagas aggregate por columna semanal — lee una sola vez con `read_records`" (sin métricas) |
| **Referencias a otros skills** | `mrp-arribos` en backticks + nota `load_skill('mrp-arribos')` |
| **Referencias al twin/kernel** | `[VentaD](/erp-kernel/ventad.md)` se conserva tal cual (el runtime `twin-clean.ts` lo proyecta a `ventad` automáticamente) |
| **Ruteo** | "para X usa fuente Y" (en `agent/instructions.md`) |

**Regla de reformulación:** si la frase tiene un hecho valioso + una marca de
proceso, se conserva el hecho y se quita solo la marca.
Ejemplo: `(verificado 2026-08-06: \`Tipo\` da Invalid field)` →
"`Tipo` no está expuesto en `EstacionTFC` (da `Invalid field`)".
La evidencia queda; la fecha/fábrica se va.

---

## 4. Referencias entre capas (patrón correcto)

| Desde | Hacia | Formato | Notas |
|---|---|---|---|
| Skill | otra skill | `` `mrp-arribos` `` + "cargar con `load_skill('mrp-arribos')`" | El runtime expone skills por slug |
| Skill | twin/kernel | `[mrp-plan-produccion.md](`mrp-plan-produccion`)` | Slugs del twin (query_company_twin) |
| Skill | schema en twin | `[mrp-explosion.md](`mrp-explosion`)` | Mismo patrón de concepto |
| Twin/kernel | otra entidad | `[VentaD](/erp-kernel/ventad.md)` | ✅ Se conserva: `twin-clean.ts` lo proyecta a `ventad` |
| Cualquiera | archivo de la fábrica | ❌ NO | El agente no tiene filesystem |

> **Gotcha verificado:** los skills se sirven con `load_skill` TAL CUAL (sin
> saneamiento) → las rutas absolutas `/agent/skill-library/...` SÍ contaminan.
> El twin/kernel pasa por `cleanTwinBody()` → las rutas de capa se proyectan a
> nombre corto y no contaminan. Por eso el patrón de referencias difiere entre
> capas.

---

## 5. Checklist obligatorio ANTES de promover/crear/editar conocimiento

Correr en orden (todo debe quedar verde):

1. **Grep de marcas de proceso** sobre los archivos tocados:
   ```bash
   grep -rnE "verificado 2026|validado 2026|publicad.*2026|E2E|linter|probe|meta-fábrica|sp-mrp\.sql|costó|calls /|tok /|wrun_|T[0-9]{2}:|/agent/skill-library/" \
     agent/skill-library company-twin 2>/dev/null | grep -v "/.eve/" | grep -v "log.md" | grep -vE "generated:|provenance|last_modified|Vencimiento|FechaEmision ge|Fecha ge|FechaRequerida le|eq 2026|ge 2026|le 2026|SituacionFecha"
   # Debe devolver 0 líneas (o solo metadatos OKF legítimos)
   ```
2. **Sanitización automática** (si hay restos):
   ```bash
   python3 scripts/sanitize-knowledge.py --dry-run   # revisar
   python3 scripts/sanitize-knowledge.py             # aplicar
   ```
3. **Linter de conocimiento**:
   ```bash
   nvm use 24 >/dev/null 2>&1 && node scripts/check-knowledge.ts   # 0 críticos
   ```
4. **Evals** (si cambió comportamiento):
   ```bash
   node_modules/.bin/eve eval --url http://127.0.0.1:63219/ --timeout 360000  # 8/8
   ```
5. **E2E de humo** (si cambió una skill/twin que el agente consulta): un turno
   de la feature afectada, verificar que no repite jerga de fábrica en la
   respuesta.

---

## 6. Errores comunes de la fábrica (lecciones validadas)

1. **Escribir el proceso, no el dominio**: "validado contra el MCP real el
   2026-08-06" en vez de "`EntityNotFound` confirmado". → El agente repite la
   fecha/verbo como si fuera dato.
2. **Poner ejemplos con VALORES de verificación en el twin**: "verificado:
   CRIBACF → 629.6/1,359,936" → el agente los repite SIN ejecutar nada
   (contaminación). Los valores de prueba de la fábrica NUNCA son canónicos;
   el agente siempre debe ejecutar el SP/consulta.
3. **Rutas absolutas en skills**: `/agent/skill-library/x/SKILL.md` → el
   modelo no puede navegarlas y el validador da falsos positivos. Usar slug.
4. **Comentarios dentro de listas YAML flow en `agent.md`**: el parser de
   frontmatter es casero y solo soporta `[a, b, c]` en UNA línea; comentarios
   internos o formato block rompen la allow-list (o la dejan vacía → expone
   TODOS los tools). Comentarios fuera de la lista, en líneas aparte.
5. **Métricas de corridas en skills**: "costó 187k tok / 14 calls" → es
   evidencia de la fábrica; si la regla de eficiencia importa, se escribe sin
   números ("es un anti-patrón costoso").
6. **Frontmatter `generated`/`provenance`**: metadato OKF estructural de la
   fábrica — se conserva y NO se promueve contenido ahí. `twin-clean.ts` lo
   aísla del prompt.
