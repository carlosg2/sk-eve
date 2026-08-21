---
name: knowledge-hygiene
description: >
  Meta-fábrica: higiene del conocimiento del runtime en sus DOS modos: (1)
  escribir/promover conocimiento (Company Twin, ERP Kernel, skills,
  instructions, learnings buffer) SIEMPRE sanitizado — sin jerga de proceso de
  la fábrica, sin fechas de validación, sin métricas de corridas, sin
  referencias a archivos fuente internos; y (2) auditar el conocimiento
  existente (canonicidad: cada hecho en su hogar, sin duplicados,
  contradicciones, jerga ni stale) generando un reporte priorizado.
  Úsalo antes de crear/editar/promover CUALQUIER archivo de conocimiento, o
  para "auditar el conocimiento", "detectar duplicados/contradicciones" o antes
  de una promoción masiva. Operado por VS Code Copilot (la fábrica), NUNCA por
  el agente Sigma en runtime.
---

# Skill: knowledge-hygiene — Higiene del conocimiento del runtime (escribir + auditar)

La **fábrica** escribe y mantiene el conocimiento que el agente Sigma lee en
runtime. El agente **no tiene contexto de la fábrica**: no sabe qué es un probe,
un E2E, un linter, `sp-mrp.sql`, una corrida, un timestamp ni una sesión
`wrun_`. Si ese ruido entra en un skill/twin/kernel, **contamina** al modelo (lo
repite en sus respuestas, intenta "explorar" archivos que no puede abrir, o
confunde proceso con negocio).

Este skill es la **regla de oro transversal** de la meta-fábrica con **dos
modos** de uso (mismo criterio, dos momentos):

- **Modo ESCRIBIR** (§§1-8, la norma): al crear/editar/promover cualquier
  archivo de conocimiento, aplicar la regla de oro + el checklist (§5). Complementa
  a `promote-learnings` (compila el buffer al hogar canónico) y a `stack-mastery`
  (mejora E2E): ningún cambio se promueve sin pasar por este checklist.
- **Modo AUDITAR** (§9, verificación): al revisar el conocimiento existente,
  detectar qué hechos NO están en su hogar canónico, duplicados, contradicciones,
  jerga y stale, y generar un reporte priorizado (🔴/🟡/⚪). Usar antes de
  promociones masivas o bajo sospecha de duplicados/contradicciones.

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

0. **Verificar contra lo real ANTES de editar** (la fábrica tiene acceso
   privilegiado): la meta-fábrica puede corroborar y fundamentar con la BD full
   y el MCP del tenant. Nunca afirmes "existe/no existe" por el buffer o por
   grep del twin — corrobóralo:
   - **Superficie que ve el runtime** → `read_records(<Ent>, first:1)` contra el
     MCP del tenant (el DAB normaliza nombres, ej. la columna BD `AÑO` se
     expone como `Anio`).
   - **Existencia en la BD** → `INFORMATION_SCHEMA` vía MCP-ICF (SQL directo a
     `Intelisis5000`) para distinguir "existe en BD pero no publicada" de "no
     existe en absoluto".
   - Ejemplo verificado (2026-08-19): `SaldoInv`/`InvSerieLote`/`InvDisp` NO
     existen ni en BD ni en MCP (invenciones del modelo), mientras que `InvD`
     SÍ existe en BD pero no está publicada en el MCP — son hechos distintos
     que se documentan distinto.
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

---

## 7. El buffer `state/learnings.md` — canal de la fábrica, NO conocimiento del runtime

> **REDISEÑO (2026-08-19): el runtime YA NO inyecta `learnings.md` al prompt.**
> El buffer es un canal **runtime→fábrica**: el hook anexa errores crudos, la
> fábrica los promueve al hogar canónico y vacía. El agente **nunca lo lee**.

Mecanismo de coordinación (2026-08-19) — el runtime y la fábrica comparten el
mismo mapa de conocimiento:

- **Guard de canonicidad en el hook**: antes de anexar una entrada, el runtime
  consulta el hogar canónico (`isLearningCanonical`: casing.md, modulos.md,
  kernel, twin del tenant). Si el hecho **ya está canónico, NO escribe** — un
  error que persiste a pesar de estar canónico es señal de **RUTEO** (el modelo
  no consulta el twin), no de falta de conocimiento.
- **Formato de bandeja**: `- [key] texto (sesión wrun_...) [×N]`. `[×N]` es la
  recurrencia (el hook la incrementa en vez de duplicar la línea) y es la señal
  de prioridad para la fábrica. **No hay timestamps ISO** (jerga): la
  trazabilidad es la sesión + la radiografía `.data/sessions.sqlite3`.
- **Tablero de la fábrica**: `scripts/check-cycle.ts` agrega el estado del ciclo
  (pendientes del buffer + recurrencias reales del espejo + cruce con canónico).
  Úsalo ANTES de promover para separar **RUTEO** (no promover más conocimiento:
  arreglar ruteo/instrucciones) de **pendientes reales** (promover).

Consecuencias para la fábrica:

- **La promoción debe ser rápida**: el runtime ya no "aprende" del buffer; el
  aprendizaje llega cuando la fábrica promueve al hogar canónico (twin/kernel/
  skill) que el agente SÍ consulta (`query_company_twin` + `context-planner`).
- **No promover desde el buffer hacia un destino que ya lo tiene**: antes de
  promover, verificar que el hecho no exista ya en su hogar canónico (grep o
  `check-cycle.ts`).
- **El invariante "buffer vacío tras promover" sigue aplicando**: un buffer que
  crece sin promoverse es deuda acumulada que el runtime ya no mitiga.

## 8. No-redundancia entre capas (single source of truth operativa)

Antes de **crear** un hecho en skills/twin/kernel, verificar que **no exista ya
en su hogar canónico** (constitución §2). La duplicación es la fuente de las
contradicciones que contaminan al agente (ej. `UtLogEjcProMrp` documentado en
8+ lugares con estados distintos).

Checklist rápido antes de escribir un hecho:

1. ¿Este hecho tiene hogar declarado en la constitución §2? → ir ahí.
2. ¿Ya existe en ese hogar? → **refinar/corregir, no duplicar** (grep del
   término/entidad en el archivo destino).
3. ¿Existe en OTRA capa? → es deuda: eliminar de la capa equivocada o
   consolidar en el hogar (decisión de fábrica).
4. ¿Es un dato de verificación de la fábrica (valores de ejemplo, fechas,
   métricas)? → NO va al runtime; va a `log.md`/memoria del repo.

**Patrón de consolidación (ej. validado)**: el snapshot MASERP P8 (90 filas,
S32=3,978,128...) estaba copiado en 4 archivos → se dejó el detalle completo en
un solo hogar (mrp-plan-produccion.md) y los demás referencian con
`query_company_twin`/concepto, sin repetir los números.

---

## 9. Auditoría de canonicidad (modo VERIFICAR — el conocimiento ya escrito)

Este modo audita el estado actual del conocimiento que el runtime consume: que
**cada hecho viva en UN solo lugar** (constitución §0), **sanitizado** (§§1-3),
**sin contradicciones** y **sin stale**. No escribe nuevo: verifica y reporta.
La norma que verifica ES la de este mismo skill (§§1-8) — por eso vive aquí, no
en un skill aparte.

> El criterio de cada hallazgo lo define la norma de arriba: jerga → §2,
> capa equivocada → constitución §2/§1, duplicados → §8, buffer → §7.

### 9.1 Alcance de la auditoría

| Capa | Ruta | Qué se audita |
|---|---|---|
| ERP Kernel | `company-twin/erp-kernel/*.md` | entidades/campos/estatus, capacidades OData en el root, contradicciones de contrato |
| Company Twin | `company-twin/companies/<tenant>/*.md` (incl. `mrp/`, `policies/`) | hechos del tenant, no-duplicación con el kernel, no-duplicación entre archivos del twin |
| Skills | `agent/skill-library/*/SKILL.md` | procedural, cero schema, sin jerga de proceso, referencias por slug |
| Instructions | `agent/instructions.md` + `agent/instructions/*.ts` | ruteo thin, sin schema, sin procedural |
| Buffer | `company-twin/companies/<tenant>/state/learnings.md` | ¿está vacío tras promover? (deuda acumulada) |
| Config | `company-twin/companies/<tenant>/agents/<agente>/agent.md` | allow-list tools, membresía de skills, lista YAML flow sana |

### 9.2 Tipos de hallazgo (priorizados)

#### 🔴 CRÍTICO (corrige el comportamiento del agente)
- **Contradicción**: el mismo hecho en 2+ capas con estados distintos
  (ej. "`DimTiempoSemana` SÍ existe" en un archivo y "NO existe" en otro).
- **Hecho en la capa equivocada**: schema de entidad en un skill, capacidad
  OData en un módulo, ruteo en el twin, política de tenant en el kernel.
- **Referencia a entidad inexistente** (si el linter `check-knowledge.ts` marca
  CRÍTICO): skills/twin que usan una entidad que el MCP real no publica.
- **Allow-list rota** (frontmatter YAML flow roto en `agent.md`) → expone TODOS
  los tools del MCP.

#### 🟡 ALTO (contaminación del runtime)
- **Jerga de proceso** en skills/twin/kernel: fechas de validación, E2E, linter,
  probe, `sp-mrp.sql`, métricas de corridas, sesiones `wrun_`, "la fábrica".
  → Regla completa en §2.
- **Referencias a archivos de la fábrica**: rutas absolutas `/agent/...`,
  `docs/icf/...`, `scripts/...`, `Dani/...`.
- **Enlaces a schema rotos**: en skills, enlaces a rutas de archivo del twin que
  el modelo no puede navegar (usar `query_company_twin({ concept: 'mcp-tools' })`).
- **Dato de verificación en el twin**: "verificado: CRIBACF → 629.6/1,359,936"
  (el agente los repite SIN ejecutar). Los valores de prueba no son canónicos.

#### ⚪ MEDIO (deuda de mantenimiento)
- **Duplicado de regla/política** en N skills/twin (ej. ">20 filas", "snapshot
  por usuario", "`UtLogEjcProMrp` NO existe") → consolidar en un hogar + referenciar.
- **Snapshot de datos de corrida** copiado en varios archivos → dejar el detalle
  en UN hogar y los demás referencian.
- **Frontmatter `tenant` inconsistente** (cxp `null`, gap-abasto `[icf, marmoles]`,
  sugerido-compra `marmoles`) → verificar que sea intencional (multi-tenant).
- **Nombre de sección inconsistente** (ej. "Formato de pantalla" vs "Output
  Format" vs "Formato de respuesta") → estandarizar.
- **Contador desactualizado** ("12 skills" cuando hay 13+).
- **Buffer `learnings.md` con entradas sin promover** → deuda: correr
  `promote-learnings` (antes, `scripts/check-cycle.ts` para separar RUTEO).

### 9.3 Método de auditoría (checklist ejecutable)

#### Inventario de hechos → hogar canónico
Para cada capa, listar los HECHOS (entidades, campos, estatus, políticas,
reglas de eficiencia, ruteo) y cruzarlos con la matriz de la constitución §2:

| Tipo de conocimiento | Hogar correcto |
|---|---|
| Capacidades del motor (OData, UPPERCASE, fechas) | `erp-kernel/index.md` |
| Schema de entidad (campos, tipos, estatus) | `erp-kernel/<entidad>.md` |
| Hecho/política del tenant | `companies/<tenant>/` (OKF) |
| Cómo ejecutar un flujo | `agent/skill-library/<x>/SKILL.md` (cero schema) |
| Ruteo "para X usa fuente Y" | `agent/instructions.md` |

#### Greps de detección

```bash
# 1. Jerga de proceso (debe dar 0 fuera de log.md/frontmatter generated)
grep -rnE "verificado 2026|validado 2026|publicad.*2026|E2E|linter|probe|meta-fábrica|sp-mrp\.sql|costó|calls /|tok /|wrun_|/agent/skill-library/|la fábrica|promoverse" \
  agent/skill-library company-twin 2>/dev/null | grep -v "/.eve/" | grep -v "log.md" | grep -vE "generated:|provenance|last_modified|Vencimiento|FechaEmision ge|Fecha ge|eq 2026|ge 2026|le 2026"

# 2. Hechos duplicados (misma entidad en N archivos de capas distintas)
grep -rln "UtLogEjcProMrp\|DimTiempoSemana\|ResumenPlaneacionCF\|web_fcfaltante_concentrado" \
  agent/skill-library company-twin 2>/dev/null | grep -v "/.eve/" | grep -v "log.md"

# 3. Schema en skills (debe dar 0 tablas de campos tipo "Campo | Tipo |" en SKILL.md)
grep -rnE "^\|.*[Cc]ampo.*\|.*[Tt]ipo.*\|" agent/skill-library/*/SKILL.md 2>/dev/null

# 4. Enlaces rotos en skills (backticks malformados / rutas de archivo)
grep -rnE "\(/agent/|\[.*\]\(\.\./\.\./\.\./.*\`" agent/skill-library/*/SKILL.md 2>/dev/null

# 5. Buffer sin promover (deuda)
grep -cE "^- \[" company-twin/companies/icf/state/learnings.md 2>/dev/null
```

#### Verificación contra la verdad de runtime
- **Entidades**: `node scripts/check-knowledge.ts` → 0 críticos (valida contra el
  MCP real con `read_records(first:1)`).
- **Contradicciones de casing**: verificar con probe
  (`scripts/probe-*.ts` con `mcpCallTool`) si un skill dice un casing y otro dice
  otro para la MISMA entidad.
- **Nombres reales de entidades**: para entidades dudosas, probar
  `read_records(entity, first:1)` contra el MCP del tenant (la verdad de runtime,
  NO `describe_entities` que es catálogo incompleto).
- **Recurrencia y ruteo** (señal de coordinación runtime↔fábrica): correr
  `scripts/check-cycle.ts` — separa **RUTEO** (hecho canónico pero el error sigue
  ocurriendo → el modelo no consulta el twin: arreglar ruteo/instructions, NO
  promover más conocimiento) de **pendientes reales** (promover).

### 9.4 Nombres de entidad verificados (evitar falsos positivos)
```bash
# Nombres reales en el MCP ICF (verificado 2026-08-19):
#   DIM_TIEMPO_SEMANA y DIM_TIEMPO_SEMANA_ISO (NO "DimTiempoSemana")
#   CalendarioFC, ResumenPlaneacionCF, ForecastPlanProduccion, ExplocionMatCF
# NO existen en el MCP: UtLogEjcProMrp, DimTiempoSemana (casing mal),
#   ProgramaTraspaso, TraspasoSemanal, MRPAlmArribos, EmpresaCfg2, ArtVarFC
```

### 9.5 Reporte y remediación

Generar un reporte de hallazgos priorizado (🔴/🟡/⚪), cada uno con:
- **Ubicación** (archivo:línea) y cita del texto.
- **Por qué es un problema** (contradice al agente / contamina / deuda).
- **Remediación sugerida** (hogar correcto + acción: mover/consolidar/eliminar/sanear).

Reglas de remediación:
- Todo cambio de conocimiento pasa por el checklist §5 de este skill.
- Los hallazgos 🔴 y 🟡 se corrigen en la misma corrida de auditoría (son pocos).
- Los ⚪ se priorizan: consolidar duplicados a UN hogar; lo demás puede quedar
  como deuda documentada (no bloquea).
- Tras corregir: `node scripts/check-knowledge.ts` (0 críticos) + `get_errors`
  en los archivos tocados + (si cambió comportamiento) evals y E2E de humo.

### Salida del modo auditar

Tabla resumen: `hallazgo → tipo → capa → archivo:línea → remediación → estado`.
Al final: `node scripts/check-knowledge.ts` y `get_errors` limpios.
