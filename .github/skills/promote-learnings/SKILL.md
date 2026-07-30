---
name: promote-learnings
description: >
  Meta-fábrica: compila conocimiento crudo (buffer state/learnings.md, trazas,
  descripciones de tools) en capas de capacidad del stack Sigma — conocimiento
  declarativo (Company Twin + ERP Kernel en formato OKF), capacidad procedural
  (skills), capacidad de ejecución (dab-config / descripciones de MCP tools) e
  identidad/ruteo (instructions) — y luego vacía el buffer. Úsalo cuando haya que
  promover/compilar aprendizajes, curar el Company Twin, o convertir una observación
  cruda en capacidad reutilizable. Operado por VS Code Copilot (la fábrica), NUNCA
  por el agente Sigma en runtime.
---

# Skill: promote-learnings — Compilador de conocimiento (meta-fábrica)

Eres la **Meta-fábrica** de Sigma (3ª abstracción de [arquitectura.md](../../../tesis/arquitectura.md):
"cómo aprende a hacer = produce capacidad"). Tu función es el paso **Trace2Skill /
Knowledge Factory**: tomar conocimiento **crudo** y **compilarlo** en las capas de
capacidad del stack, donde queda como activo reutilizable del Company Twin.

Respeta la [Constitución del stack](../../../tesis/constitucion.md): cada hecho tiene un
**hogar canónico único**. Tu trabajo es colocarlo ahí, no duplicarlo.

> **Separación de poderes.** El runtime (Eve) solo *observa y anexa* al buffer efímero.
> La compilación del buffer a capacidad la haces **solo tú** (fábrica + humano en el loop).
> El agente Sigma nunca ejecuta este skill.

---

## 1. Modelo de compilación: raw → capas de capacidad

El conocimiento crudo entra por varias fuentes y se compila a **una** de cuatro capas de
capacidad. Elegir la capa correcta ES el trabajo.

| Fuente cruda (entrada) | | Capa de capacidad compilada (salida) | Artefacto |
|---|---|---|---|
| Buffer de aprendizajes `state/learnings.md` (errores capturados por el hook) | → | **Declarativa (conocimiento)** — "qué es verdad" | OKF en `company-twin/erp-kernel/` (universal) o `companies/<tenant>/` (local) |
| Trazas de ejecución, patrones repetidos de tool-calls | → | **Procedural (cómo hacer)** — secuencias reutilizables | `agent/skills/<x>/SKILL.md` |
| Fricciones del modelo con las tools (llama `describe_entities` de más, malinterpreta un filtro) | → | **Ejecución (qué puede la máquina + cómo se le describe)** | `dab/dab-config.json` (`object-description`) o descripciones de tools del DAB (C#) |
| Confusión de ruteo ("no supe a qué fuente ir") | → | **Identidad/ruteo (thin)** | `agent/instructions.md` |

**Regla de compilación (ley ontológica):** una observación de **un** tenant compila a la
capa **local** (`companies/<tenant>/`). Solo asciende a **universal** (`erp-kernel/`) con
evidencia de que aplica a todos. En la duda → local. *Nunca conviertas una observación
local en conocimiento universal sin validación.*

**Regla transversal:** lo que aplica a todos los módulos (p. ej. capacidades OData) compila
al **root del kernel** (`erp-kernel/index.md`), no a un módulo. Los módulos solo apuntan.

---

## 2. Inventario de destinos (todos los elementos que participan)

Antes de compilar, ten presente el stack completo y quién posee qué (Constitución §1):

- **ERP Kernel** `company-twin/erp-kernel/` — bundle **OKF**, `tenant: null`. Entidades,
  campos, ciclo de vida, capacidades del motor. Universal, cambia lento.
- **Company Twin** `company-twin/companies/<tenant>/` — bundle **OKF** del tenant. Catálogos
  reales, políticas (`policies/`), overrides. Restringe al kernel, no lo amplía.
- **Skills** `agent/skills/<x>/SKILL.md` — procedural. Cero schema (referencia al Twin).
- **Instructions** `agent/instructions.md` — identidad + ruteo. Cero schema, cero procedural.
- **dab-config** `dab/dab-config.json` — `object-description` que el modelo lee para
  planificar sin `describe_entities`. Cambios requieren **rebuild + restart** del DAB.
- **Descripciones de MCP tools** — texto de cada tool (read/aggregate/create…) en el source
  C# del DAB custom. Es *capacidad de ejecución descrita al modelo*.
- **Runtime cableado** `agent/hooks/*`, `agent/instructions/*.ts`, `agent/tools/*` — captura,
  overlays, tools custom. TypeScript.

Si un aprendizaje encaja en varias, elige por **dueño de la verdad** (Constitución §2), no
por conveniencia. Cada hecho termina en **uno** solo.

---

## 3. Autoría OKF (para escribir en Company Twin / ERP Kernel)

El Company Twin y el ERP Kernel son bundles **Open Knowledge Format (OKF)**. Al compilar
conocimiento declarativo, produce documentos conformes. Referencias canónicas:

- Spec: <https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md>
- Guía de enrichment agent: <https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/src/reference_agent/prompts/reference_instruction.md>

Reglas OKF que debes cumplir (resumen operativo de la spec):

- **Concepto = 1 archivo markdown.** Concept ID = ruta sin `.md`.
- **Frontmatter:** `type` es **lo único REQUERIDO**. Recomendados: `title`, `description`
  (una sola frase — se usa verbatim en `index.md`), `resource` (URI del asset, ej. `dbo.CXP`),
  `tags`, `timestamp` (ISO 8601). Extensión Sigma: `layer` (`erp-kernel|vertical|company|skill`)
  y `tenant` (`null` = universal). Preserva claves desconocidas; no rechaces por campos extra.
- **Body:** favorece estructura (headings, tablas, code fences) sobre prosa. Headings
  convencionales: `# Schema`, `# Examples`, `# Citations`. Sin preámbulo ni narración.
- **Cross-linking:** enlaces markdown **bundle-relativos** empezando con `/`
  (ej. `[Prov](/erp-kernel/prov.md)`) — estables al mover archivos. Un link = una relación
  (el tipo lo da la prosa). Los links rotos se toleran (conocimiento aún no escrito).
- **`index.md`:** sin frontmatter (salvo el root, que lleva `okf_version`). Enumera el
  directorio para **progressive disclosure** (título + descripción por entrada). Mantenlo al
  día si añades/renombras conceptos.
- **`log.md`:** historial por scope, más nuevo primero, headings `## YYYY-MM-DD`, entradas
  con palabra en negrita (`**Update**`, `**Creation**`, `**Deprecation**`). Registra aquí la
  promoción cuando toques el bundle del Twin/Kernel.
- **`# Citations`:** cita la fuente (el `resource`, la traza, o el learning original). **No
  inventes** campos, valores, URIs ni fuentes — compila solo lo que la evidencia respalda.
- **Consumo permisivo:** el consumidor tolera types desconocidos y campos faltantes; no
  sobre-estructures.

Para conocimiento **procedural** (skills) no se usa OKF: es un `SKILL.md` con frontmatter
`name`/`description` y cuerpo de patrones. Cero schema (eso va al Twin en OKF).

---

## 4. Protocolo (workflow de una corrida)

Inspirado en el enrichment workflow OKF (read-existing → refine → write-once). No pidas
confirmación por cada entrada; resume al final y pide aprobación antes de vaciar el buffer
si algún destino quedó ambiguo.

1. **Lee** el buffer `company-twin/companies/<tenant>/state/learnings.md`
   (default `joyarock-300326`). Si solo tiene encabezado → termina: "buffer vacío".
2. **Inventaría** el destino: revisa `index.md` del kernel/twin y el archivo destino
   probable **antes** de escribir, para refinar en vez de reescribir y evitar duplicados.
3. Para **cada** entrada `- [key] texto`:
   a. **Clasifica** la capa de capacidad (§1) y el **dueño** (§2 + Constitución §2).
   b. **Decide alcance** (ley ontológica): universal → kernel; específico → tenant; duda → tenant.
   c. **Compila**: escribe el hogar canónico. OKF si es Twin/Kernel (§3). Si el hecho ya
      existe, **refina/corrige** — no dupliques. Transversal → root del kernel.
   d. Si compila a `dab-config` o descripción de MCP tool, **advierte** que requiere
      rebuild + restart del DAB (no aplica en caliente).
4. **Actualiza `index.md`** del directorio afectado si añadiste/renombraste un concepto.
5. **Registra en `log.md`** del bundle del Twin/Kernel la promoción (fecha, qué se compiló).
6. **Valida:** `npm run check`.
7. **ADR:** si el cambio fue **estructural** (nueva entidad, nueva capa, cambio de dueño),
   añade un ADR breve en [tesis/decisiones.md](../../../tesis/decisiones.md).
8. **Vacía el buffer:** reescribe `learnings.md` dejando **solo su encabezado**. Las entradas
   sin evidencia suficiente para ubicarse quedan como `- [pendiente] ... (razón)`.

---

## 5. Reglas duras (invariantes)

- **Single source of truth:** cada hecho en **un** lugar (Constitución, principio raíz).
- **No** metas schema en instructions ni en skills. **No** copies capacidades OData a un módulo.
- **No** asciendas una observación de un tenant al kernel universal sin evidencia.
- **No inventes** (regla OKF): campos, valores, URIs ni fuentes que la evidencia no respalde.
- **Cero acción de runtime:** este skill es de fábrica; el agente Sigma nunca lo ejecuta.
- **Invariante final:** tras una corrida limpia, `learnings.md` solo tiene encabezado o
  entradas `[pendiente]` justificadas.

---

## 6. Alineación con la tesis

Este skill **es** la Meta-fábrica en su forma mínima operable: el bucle
`Fábrica produce capacidad → Company Twin (activo) → Agente opera → emite trazas → Fábrica`
([arquitectura.md](../../../tesis/arquitectura.md)). El Twin es el sustrato compartido; los
learnings crudos son trazas; la compilación a OKF/skills/config es "producir capacidad". Cada
corrida hace al Twin más capaz sin tocar el runtime — *recursive self-improvement operado por
la fábrica, no por el agente*.

## Salida

Al terminar, muestra una tabla `key → capa → destino (archivo) → acción (nuevo/refinado/pendiente)`
y el resultado de `npm run check`.
