# Arquitectura de conocimiento — dónde vive cada tipo de conocimiento (genérico + multi-tenant)

> Documento de la fábrica (2026-08-11). Resuelve el balance: **qué va en instrucciones, qué
> en skills, qué en kernel, qué en company twin**, y cómo extrapolar a más tenants sin
> duplicar. Se apoya en (a) la doctrina canónica de **Eve** (`docs/instructions.mdx` y
> `docs/concepts/context-control.md`), (b) el modelo de conocimiento de **Copilot**
> (prompt núcleo estable + `SKILL.md` on-demand + AGENTS.md), (c) la constitución de la
> tesis (`tesis/constitucion.md` § hogar canónico) y (d) la reunión ICF 2026-08-05.

---

## 1. La doctrina (verificada en fuentes)

### 1.1 Eve — `docs/instructions.mdx` · "Instructions vs skills" (verbatim del resumen)

| | Cargada | Úsala para |
|---|---|---|
| `instructions.md` / `.ts` | Siempre, cada turno | **Identidad permanente y reglas fijas** |
| `agent/skills/*` | Bajo demanda (via `load_skill`) | **Procedimientos opcionales** que no deben engordar cada turno |

> "Keep instructions short and stable. Long or situational procedures belong in skills,
> where they only enter context when the request calls for them. Instructions never run
> code."

### 1.2 Eve — `docs/concepts/context-control.md` · "Recommended context layout"

- `instructions.md` → identidad permanente. **Corta y estable.**
- `skills/` → procedimientos opcionales. **Mueve aquí los procedimientos largos** en vez
  del prompt.
- `tools/` → integraciones tipadas.
- `subagent/` → solo cuando el task necesita una superficie especialista real.
- **`defineDynamic`** (en `agent/instructions/` Y `agent/skills/`) → **el lever
  multi-tenant**: resuelve el prompt/skills por sesión según `ctx.session.auth`, tenant,
  plan. *"A caller on the billing team gets the billing instructions and playbook while
  no one else sees them."*

### 1.3 Copilot — el modelo de conocimiento del agente

- El **system prompt es un núcleo estable y genérico**: identidad + reglas + `<ask_user>`
  (cuándo/cómo preguntar, GENÉRICO) + `<tools>` + `<skills_instructions>` (carga on-demand
  de SKILL.md cuando el request matchea su description).
- **Todo el conocimiento de dominio vive en `SKILL.md`** (frontmatter `description` →
  ruteo), no en el prompt.
- **AGENTS.md** = reglas del repo/tenant (lo específico por contexto), inyectado como
  `<custom_instruction>`.
- Las skills se LISTAN con su description (menú de ruteo) pero su body entra SOLO al
  activarse (`load_skill`).

### 1.4 La constitución de la tesis (hogar canónico)

| Tipo de conocimiento | Hogar | Prohibido en |
|---|---|---|
| Capacidades del motor (OData, UPPERCASE, fechas) | `erp-kernel/index.md` | skills, instructions |
| Schema de entidad | `erp-kernel/<entidad>.md` | skills, instructions |
| Hecho/política del tenant (módulos, límites, aprobadores) | `companies/<tenant>/` (OKF) | kernel, skills |
| Cómo ejecutar un flujo | `agent/skill-library/<x>/SKILL.md` (cero schema) | instructions, twin |
| Ruteo "para X usa fuente Y" | `agent/instructions.md` | skills, twin |

---

## 2. Regla de oro del balance (una frase)

> **El prompt (instructions) es el "qué soy y cómo me comporto" — corto y genérico.
> Las skills son el "cómo hago X" — procedural, por use case, cargado on-demand.
> El twin es el "qué es verdad para ESTE cliente" — declarativo por tenant.
> El kernel es el "qué puede el motor" — universal.**

Si un contenido es:
- **Regla de comportamiento que aplica a TODO turno y TODO tenant** → instructions
  (ej. "nunca preguntes en texto plano", "razona en español", "un error no es cero").
- **Procedimiento de un use case** (cuántos pasos, qué tablas, qué opciones darle al
  usuario) → skill del módulo (`control-compras`, `gap-abasto`, `mrp-*`).
- **Hecho de un cliente** (qué módulos publica, quién aprueba, topes, días de cobertura) →
  company twin del tenant.
- **Capacidad del motor** (cómo filtra OData, casing, qué vistas existen) → erp-kernel.
- **Ejemplo concreto de un tenant** dentro de una regla genérica → NO va en instructions;
  va como nota en la skill o en el twin.

### El anti-patrón que estamos corrigiendo

`agent/instructions.md` es el system prompt: hoy tiene **reglas genéricas** (bien) pero se
le colaron **ejemplos específicos de ICF** (ej. "enfoque de revisión: solo críticos /
causa raíz / por proveedor" como ejemplo de cuándo preguntar). Eso es conocimiento del
use case `control-compras` de ICF — debe vivir en la skill, no en el prompt global. Con 3
tenants, ese ejemplo contaminaría a los otros dos.

---

## 3. Mapa de los use cases de la reunión ICF → hogar canónico

Leyenda: **INST** = `agent/instructions.md` · **SK** = `agent/skill-library/<módulo>`
· **TW** = `company-twin/companies/icf/` · **K** = `erp-kernel/` · **TOOL** = tool MCP.

| Use case (reunión 2026-08-05) | Hogar | Qué vive ahí |
|---|---|---|
| Estilo de comunicación (sin narrar, español, formato) | **INST** | regla estable (ya está) |
| Cuándo preguntar / nunca en texto / cómo formular | **INST** | regla GENÉRICA (sin ejemplos de tenant) |
| Enfoque de la revisión de desviaciones (3 opciones + recomendada) | **SK** `control-compras` | el procedimiento y LAS OPCIONES concretas de la gate |
| Proveedor por historial (RG/LETICIA/VACA + freeform) | **SK** `control-compras` | opciones de la gate por use case |
| Tope de presupuesto → autorización extraordinaria de finanzas | **TW** `icf/presupuesto-compras` | política del tenant (quién autoriza, tope) |
| Semanas de cobertura por familia (hoy 4, rango 1-8) | **TW** `icf/rotacion` + **SK** `mrp-cf` | valor actual del tenant + cómo se consulta |
| Plan a 3 meses / liberar 2 meses | **TW** `icf/plan-compras` | política del tenant (horizonte, liberación) |
| OData (fechas sin comillas, casing, groupby array) | **K** `erp-kernel/index.md` | capacidad del motor |
| Schema de `Compra`/`CompraD`/`UV_QV_PPTOCOMPRA` | **K** `erp-kernel/*.md` | schema |
| ICF no publica CXP/tesorería | **TW** `icf/modulos.md` | hecho del tenant (ya está) |

### Regla de implementación (la que nos faltaba)

Cuando un use case requiere una **decisión del usuario con opciones**, la skill del módulo
declara:
1. **Cuándo preguntar** (qué condición del flujo dispara la gate).
2. **Las opciones** (máx 4, la recomendada primero con "(Recomendado)").
3. **Si hay freeform** y en qué campo.
4. **Qué hacer con la respuesta** (qué patrón de query ejecutar por opción).
El prompt global solo aporta la regla: "si un skill define una gate, usa `ask_question`
con esas opciones; nunca la escribas en texto".

---

## 4. Multi-tenant: cómo se extrapola sin duplicar

El lever es el **`defineDynamic`** (que sk-eve ya usa en `agent/instructions/agent-active.ts`
y en `agent/skills/library.ts`):

| Capa | Por tenant | Mecanismo |
|---|---|---|
| Instrucciones base | NO (genéricas) | `agent/instructions.md` (1 sola copia) |
| Instrucciones del agente | SÍ | `company-twin/companies/<t>/agents/<a>/instructions.md` (inyectada por `agent-active.ts`) |
| Skills | SÍ (visibilidad por tenant) | frontmatter `tenant` en `skill-library/<x>/SKILL.md` + `library.ts` (membresía por agente) |
| Hechos/políticas | SÍ | `company-twin/companies/<t>/` (OKF) |
| Kernel | NO (universal) | `erp-kernel/` (1 sola copia) |
| Gate HITL UI | NO (universal) | componentes `input-request`/`atlas-gate`/`questionnaire` (1 sola copia) |
| Directivas HITL de negocio | SÍ | dentro de CADA skill del módulo (su use case) + políticas en el twin |

**El contrato para un tenant nuevo (ej. joyarock):** copiar `company-twin/companies/joyarock/`
(twin + agent instructions) → activar las skills que ese tenant publica (frontmatter) →
el kernel y el prompt base NO se tocan. Las gates de cada use case viajan con su skill.

---

## 5. Pendientes concretos de este documento (implementación)

1. **Recortar `agent/instructions.md`**: dejar la sección HITL GENÉRICA (regla + mecánica)
   y quitar los ejemplos específicos de ICF (moverlos al skill `control-compras`).
2. **Skill `control-compras`**: añadir "Decisiones del usuario (HITL)" con las gates del
   use case (enfoque de desviaciones, proveedor, confirmación) — opciones exactas +
   recommended + qué ejecutar por opción.
3. **Twin ICF**: verificar que las políticas de autorización (tope, finanzas) están
   documentadas en `companies/icf/` (si no, añadirlas).
4. **UI unificada**: `/chat` debe renderizar la gate con el MISMO componente visual que
   el Atlas (card + header + badge + opciones/radios + collapse "Respondido:").
