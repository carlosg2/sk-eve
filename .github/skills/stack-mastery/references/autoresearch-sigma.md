# autoresearch-sigma — el patrón de Karpathy aplicado a sk-eve

> Traducción del patrón autoresearch de Karpathy
> (https://github.com/karpathy/autoresearch) al dominio de un sistema de agentes
> sobre ERP. No es una analogía suelta: cada pieza del original tiene un
> equivalente funcional en sk-eve, y el contrato de propiedad de archivos es el
> mismo.

## El contrato de tres archivos (mapeo exacto)

| Archivo original (autoresearch) | Rol | Equivalente en sk-eve | Propiedad |
|---|---|---|---|
| `prepare.py` | Juez inmutable: datos, tokenizer, evaluación. NO se modifica | **Evals + radiografía + linter**: `evals/*.eval.ts`, `.data/sessions.sqlite3` (turn_summaries/llm_inputs/evaluaciones), `scripts/check-knowledge.ts`, `scripts/eval-calidad.ts`, `npm run check` | Nadie lo modifica "para ganar" |
| `train.py` | Sandbox: el agente modifica código arbitrariamente | **Todo el stack**: `agent/` (tools, hooks, instructions, lib), `company-twin/` (OKF), `dab/dab-config.json`, `src/` (UI), vistas/SPs del ERP | El agente de la fábrica |
| `program.md` | Dirección: qué investigar, qué evitar | **`.github/skills/stack-mastery/program.md`** | El humano |

## El ratchet loop (traducción a sk-eve)

1. La fábrica lee `program.md` + el estado git + `docs/experimentos.tsv`.
2. Propone hipótesis explícita: *"cambio X en capa Y → espero Z (métrica de la
   radiografía)"*.
3. Implementa en rama `autoresearch/<tag>` (un cambio por experimento).
4. Corre los jueces: evals (gates), E2E del turno afectado, radiografía
   antes/después.
5. **¿Mejoró?** conserva el commit y avanza. **¿Igual o peor?** `git reset`
   revierte. **¿Crash?** arregla si es tonto; si la idea está rota, descarta.
6. Registra en `docs/experimentos.tsv` (untracked).
7. **NEVER STOP** hasta que el humano detenga o `program.md` cambie.

## Qué es "mejorar" en este dominio (la métrica)

El `val_bpb` de Karpathy (métrica única inmutable) no existe aquí: el sistema
tiene **métricas múltiples y trade-offs**. La regla de decisión:

| Métrica | Dirección buena | Quién la mide |
|---|---|---|
| `tokIn` por turno | ↓ | `turn_summaries` |
| `turnMs` | ↓ (sin perder calidad) | `turn_summaries` |
| tool calls por turno | ↓ (sin paginar/duplicar) | `turn_summaries` |
| errores por turno | ↓ (0 es la meta) | `turn_summaries` |
| exactitud vs verdad de runtime | ↑ (→1.0) | `eval-calidad.ts` (probes MCP) |
| congruencia entre corridas | ↑ (→1.0) | `eval-calidad.ts` |
| críticos de `check-knowledge` | 0 | `check-knowledge.ts` |
| gates de evals | todos verdes | `eve eval` |
| costo $ por tarea/loop | ↓ | radiografía + watchdog |

**Regla de trade-off:** un cambio que mejora una métrica pero empeora otra se
documenta explícitamente y decide el humano. **Nunca** se sacrifica un gate de
seguridad (HITL) ni la exactitud por tokens.

## La evolución natural (visión Karpathy: de PhD student a comunidad)

Karpathy: *"el objetivo no es emular un PhD student, sino una comunidad de
investigación"*. La progresión en sk-eve:

1. **Fase actual**: un agente de fábrica (Copilot) ejecuta el loop secuencial.
2. **Fase enjambre (F4 de la tesis v2)**: especialistas con contrato —
   `investigador` (propone hipótesis leyendo radiografía), `implementador`
   (edita el stack), `validador` (corre los jueces), `reviewer` (comprueba que
   no rompió el flujo). El "chief scientist" de Karpathy: un agente planificador
   que mira qué funcionó, busca papers/docs relacionados y genera lista de
   experimentos para los implementadores.
3. **Fase meta (más allá)**: el propio `program.md` se optimiza con
   auto-autoresearch (buscar el "research org code" que maximiza la tasa de
   mejora) — la frontera especulativa, no el MVP.

## Ejemplos de hipótesis legítimas (del program.md vigente)

- **Memoria episódica (P1)**: tool `recordar_sesiones` (FTS5 sobre el espejo
  `events`) → hipótesis: reduce tokens en turnos recurrentes sin perder
  exactitud.
- **Watchdog (P2)**: schedule con `run()` + store de estado → hipótesis: loop
  financiero nocturno cuesta < $1/noche en shadow.
- **Eficiencia cola larga (P3)**: atacar los turnos de 200-430k tokens →
  hipótesis: rediscovery/paginación evitable.
- **Seguridad (P4)**: evals de inyección directa/indirecta → hipótesis: el
  threat model detecta vectores que hoy pasarían.
- **OData sin instrucciones**: completar `experiment/odata-sin-instrucciones` →
  hipótesis: el modelo con ruteo al kernel no pierde eficiencia y gana robustez.

## Anti-patrones (lo que NO es autoresearch)

- **No es un cron que refactoriza solo en main**: cada experimento va en rama
  `autoresearch/<tag>` y requiere revisión humana antes de mergear.
- **No es "ganar al juez"**: modificar evals para que pasen es trampa.
- **No es tocar lo que funciona sin hipótesis**: un cambio sin métrica prevista
  no es experimento, es vandalismo.
- **No es romper la separación Fábrica/Runtime** (constitución §3): la fábrica
  mejora el stack; el agente Sigma runtime sigue sin auto-editarse.

---

*Referencia del patrón autoresearch-sigma — 2026-08-10. Complementa SKILL.md y
program.md del skill stack-mastery.*
