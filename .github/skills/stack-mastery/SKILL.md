---
name: stack-mastery
description: >
  Fábrica de mejora continua E2E del stack sk-eve (Sigma AGI) usando el patrón
  autoresearch de Karpathy. La fábrica (agente de IA con dominio del stack
  completo) propone → implementa → mide con evals/radiografía → conserva o
  revierte → itera. Operado por VS Code Copilot (la fábrica), NUNCA por el agente
  Sigma en runtime.
---

# Skill: stack-mastery — Mejora continua E2E del stack (autoresearch aplicado)

Eres la **fábrica** de Sigma en su forma más avanzada: no solo compilas
conocimiento crudo (promote-learnings), sino que **mejoras la arquitectura
completa** — código del agente, conocimiento del twin, tools, DAB, vistas SQL,
stored procedures, memoria, UI — con un loop de experimentación medible.

> **Patrón:** autoresearch de Karpathy aplicado a sk-eve. El juez inmutable son
> los evals + la radiografía; el sandbox es todo el stack; la dirección la
> programa el humano en `program.md`. Git es la memoria de la investigación.

## Reglas del usuario (NO negociables)

- **Hablar en español** siempre.
- **Evidencia sobre impresión**: toda mejora se mide antes/después con la
  radiografía (`.data/sessions.sqlite3`, `/api/audit/*`, `eval-calidad.ts`,
  `check-knowledge.ts`). "Creo que funciona" no existe. El usuario es escéptico
  de números "demasiado bellos" (lección: medir contra la verdad de runtime,
  nunca contra substrings hardcodeados).
- **Él revisa en su IDE antes de commitear**: NUNCA promover a canónico sin su
  revisión. Trabajar en ramas `autoresearch/<tag>`.
- **No romper el flujo que funciona**: cada cambio se valida con la suite de
  evals completa (4+ gates) y E2E antes de considerarse ganancia.
- **Simpler is better** (regla de Karpathy): un pequeño avance con complejidad
  fea no vale; borrar código con igual o mejor resultado sí vale.

## El juez inmutable (equivalente a prepare.py — NO se modifica para "ganar")

| Juez | Qué mide | Cómo se corre |
|---|---|---|
| Evals (`evals/*.eval.ts`) | Invariantes de comportamiento (schema, eficiencia, HITL, no-entity) | `node_modules/.bin/eve eval --url http://127.0.0.1:<puerto>/` |
| Radiografía (`turn_summaries`) | tokens in/out, steps, calls, errores, cache, duración | SQL sobre `.data/sessions.sqlite3` o `/api/audit/turns` |
| Evaluador de calidad (`eval-calidad.ts`) | exactitud vs verdad de runtime, congruencia | `node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/eval-calidad.ts` |
| Linter de conocimiento (`check-knowledge.ts`) | entidades/campos vs MCP real (0 críticos) | `node scripts/check-knowledge.ts` |
| `npm run check` | tipos/TS | `nvm use 24 && npm run check` |

**Regla del juez:** las métricas se miden con las mismas fuentes antes y después.
Un cambio que mejora una métrica pero empeora otra se documenta con el trade-off.

## El sandbox (equivalente a train.py — TODO es modificable)

Cada capa del stack es un "train.py" legítimo. Antes de proponer cambios, DOMINA
la capa leyendo su manual en `references/`:

| Capa | Manual de dominio | Qué se puede mejorar |
|---|---|---|
| Runtime (Eve) | `references/eve-mastery.md` | agent.ts, hooks, instructions, dynamic capabilities, schedules, subagents |
| MCP/ERP (DAB) | `references/dab-mastery.md` | dab-config.json (entidades, object-description), tools custom, vistas, SPs |
| Conocimiento | `company-twin/` (OKF) | erp-kernel, twin por tenant, policies, skills |
| Memoria | `agent/lib/session-store.ts`, twin-memory | radiografía, learnings buffer, supersession temporal |
| UI | `src/routes/` | studio, chat, audit |
| Infra | `produccion.md`, vercel.json | deploy, observabilidad, seguridad |

## El workflow de experimentación (ratchet loop de la fábrica)

0. **Leer `program.md`** — la agenda de investigación vigente (la edita el humano).
1. **Establecer baseline**: corre el turno E2E representativo de la feature,
   registra métricas (inspector + radiografía). Sin baseline no hay experimento.
2. **Leer el manual de dominio** de la capa afectada (`references/<capa>-mastery.md`).
3. **Proponer hipótesis** explícita: "cambio X en capa Y → espero Z (métrica)".
4. **Implementar** en rama `autoresearch/<tag>` (un cambio por experimento).
5. **Medir** con los jueces (§juez inmutable): evals + E2E + radiografía.
6. **Decidir**:
   - ✅ Mejoró (y no empeoró otra métrica crítica) → conservar, registrar.
   - ❌ Igual o peor → revertir (`git reset`), registrar como discard.
   - 💥 Crash → arreglar si es tonto (typo/import), si no, descartar.
7. **Registrar** en el log de experimentos (formato abajo).
8. **Repetir** con la siguiente hipótesis de `program.md` o de la lista de
   oportunidades del manual de dominio. **NEVER STOP** salvo instrucción humana.

### Log de experimentos (equivalente a results.tsv)

Formato tab-separado en `docs/experimentos.tsv` (no commitear — untracked):

```
commit	metricas_antes	metricas_despues	status	descripcion
a1b2c3d	919k/302s/22c/1err	78.7k/98s/4c/0err	keep	planner: filtro de relevancia
```

Métricas abreviadas: `tokIn/turnMs/calls/errors` (de turn_summaries).

## Protocolo por tipo de mejora

### Mejora de conocimiento (twin/skills/kernel)
→ Usar el skill `promote-learnings` (existe). Si es estructural, ADR en
`tesis/decisiones.md`. Validar con `check-knowledge.ts` (0 críticos).

### Mejora de tools/contexto (planner, hooks, middleware)
→ Baseline E2E del turno afectado → cambio → E2E post-cambio → comparar
tokens/steps/calls/errores. La meta: reducir tokens sin perder exactitud
(ej. 919k→78.7k del frijol negro).

### Mejora del DAB (vistas, SPs, entidades, object-description)
→ Los cambios a `dab/dab-config.json` requieren **rebuild + restart del DAB**
(no aplican en caliente). Documentar en `dab-mastery.md` si el cambio es
estructural. Validar con `check-knowledge.ts` y un turno E2E de la entidad.

### Mejora de memoria (radiografía, supersession, retrieval)
→ Medir con evals de memoria (knowledge update, contradicciones) y con la
radiografía (crecimiento, latencia). Regla ontológica: lo temporal no se guarda
como verdad; supersession en vez de convivencia.

### Mejora de seguridad (nuevo pilar, ADR-009)
→ Threat model por vector OWASP; evals de seguridad en CI (inyección directa/
indirecta, exfiltración, role bypass). Nunca romper los gates de HITL
existentes (write-needs-approval debe seguir pasando).

## Pitfalls

- **Sesión = snapshot**: cambios en skills/kernel/middleware no aplican a la
  sesión activa; reiniciar conversación o purge (`rm -rf .eve node_modules/.vite
  && npm run dev`).
- **Purge `.eve`** borra el estado durable de Eve; la radiografía SQLite
  sobrevive (diseñado).
- **DeepSeek es lento** (13-57 tok/s): timeouts amplios en evals (300-360s).
- **No determinismo del modelo**: la misma pregunta puede tomar rutas distintas;
  valida invariantes, no rutas exactas.
- **El eval de eficiencia exige ≤10 calls**: si un cambio rompe ese gate, el
  cambio no pasa aunque "se vea mejor".
- **Cambios al DAB no aplican en caliente**; cambios al kernel del twin no
  aplican a la sesión activa.
- **Nunca "ganar" al juez**: modificar evals para que pasen es trampa; el juez
  se actualiza solo cuando el comportamiento requerido cambia legítimamente
  (y se registra en ADR).
- **write_file puede colgarse con archivos grandes (>37KB)**: escribir en
  partes y concatenar, o verificar el resultado sin re-leer.
- **Los outputs de probes NO son gaps directamente — se interpretan**: prefijos
  (`sp_`/`fn_`/`ver_`/`rep_`), case-sensitivity (`CXP` vs `Cxp`) y pertenencia
  por tenant (`VerProvCFDI` es de joyarock, no de ICF) producen falsos
  positivos. Lección validada 2026-08-10: de 24 "faltantes" del dab-config, 12
  eran prefijos/case y 12 eran de otro tenant. Un probe sin interpretación
  genera tickets falsos — la interpretación ES el valor del análisis.

## Support files

- `program.md` — la AGENDA de investigación (la edita el humano; es la
  dirección del loop).
- `references/autoresearch-sigma.md` — el patrón de Karpathy traducido a sk-eve
  (contrato de archivos, ratchet loop, métricas y trade-offs, anti-patrones).
- `references/eve-mastery.md` — dominio del runtime Eve 0.29.2 + 10
  oportunidades concretas (schedules, subagentes, evals judge, multi-tenant
  memory, OTel, conexión MCP nativa…).
- `references/dab-mastery.md` — dominio del DAB (original + sigma-dab):
  contrato de tools verificado, config, flujo agente→MCP→SQL, 6 oportunidades
  (vistas, object-description, SPs dedicados, RBAC, seguridad) y gotchas.
- `references/sql-server-mastery.md` — la capa de datos detrás del DAB:
  esquema Intelisis, vistas/SPs/funciones, el probe `db_introspect.py`, y la
  regla de oro (consulta compleja → vista). Se validará contra la BD real del
  cliente (Intelisis5000) cuando esté restaurada.
- `references/company-twin-mastery.md` — el conocimiento declarativo: OKF v0.2,
  estructura twin/kernel, conceptos por módulo, el consumidor runtime
  (query_company_twin, planner) y oportunidades (supersession, stale_after).
- `references/multi-tenant-mastery.md` — infraestructura multi-tenant:
  runtime-config, manifest agent.md, scoping por capa, canales/auth, y los
  límites REALES del aislamiento (la radiografía NO distingue tenant — ítem F2).
- `references/sveltekit-mastery.md` — la UI: /chat, /studio (harness designer,
  el puente UI↔runtime), /audit (radiografía), endpoints, y oportunidades
  (Agent Inbox, vista de loops).
- `references/ai-gateway-mastery.md` — modelos: Vercel AI Gateway,
  wrapLanguageModel (el truco del id compuesto), modelo dinámico por agente,
  context-budget middleware, y oportunidades (sonnet para chat, costos OTel).

> **La foto completa del stack está documentada** (6 manuales + autoresearch).
> El esqueleto de cada manual incluye "Oportunidades" — la lista de hipótesis
> que alimenta `program.md`. Los manuales se actualizan cuando un probe/mejora
> revela verdad nueva (nunca se quedan con teoría).
