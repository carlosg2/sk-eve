# program.md — Agenda de investigación de la fábrica sk-eve

> **Este archivo es la DIRECCIÓN del loop autoresearch.** Lo edita el humano
> (tú). La fábrica (Copilot/agente) lo lee antes de cada experimento y no se
> desvía de lo escrito aquí. Formato: prioridades de investigación, qué NO tocar,
> y reglas de conducta. Basado en el patrón autoresearch de Karpathy.

## Estado vigente

- Tesis: **Sigma AGI v2** (tesis/tesis.md) — enjambre gobernado, watchdog + LLM
  bajo demanda, memoria compartida → memory graph temporal, seguridad como pilar.
- Roadmap: F1 (watchdog + memoria episódica) → F2 (seguridad) → F3 (primer
  cliente) → F4 (enjambre) → F5 (memory graph) → F6 (agents as services) →
  F7 (Pattern Engine).
- Baseline de referencia (fábrica): frijol negro 919k→78.7k tokens (-91%),
  gap-abasto 50k, plan S31 70.6k. E2E ICF 40/40 ok, 0 errores.
- Cola de optimización conocida: turno #30 = 430k tokens, #13 = 287k.

## Prioridades de investigación (ordena de arriba a abajo)

### P1. Memoria episódica recuperable (F1 — desbloquea todo)
- **Objetivo:** que el agente pueda consultar su propio historial (hoy el espejo
  `events`/`llm_inputs` en `.data/sessions.sqlite3` solo se escribe, nunca se lee).
- Hipótesis: una tool `recordar_sesiones` (búsqueda FTS5/temporal sobre el espejo)
  reduce el redescubrimiento de contexto en turnos recurrentes.
- Métrica: tokens por turno en preguntas repetidas; exactitud sin cambios.

### P2. Watchdog + primer loop en shadow (F1)
- **Objetivo:** loop financiero nocturno con patrón watchdog (script determinista
  observa CXP/tesorería, hash de estado, LLM solo con delta).
- Hipótesis: el loop cuesta < $1/noche en shadow y detecta vencimientos reales.
- Métrica: costo por tick, precisión de detección vs verdad del ERP.

### P3. Eficiencia de la cola larga (siempre vigente)
- **Objetivo:** atacar los turnos más caros de la radiografía (top por tokIn).
- Hipótesis: los turnos de 200k-430k tokens tienen patrones de rediscovery o
  paginación evitable que el planner/hardening puede eliminar.
- Métrica: tokIn/turnMs/calls antes vs después (registrar en docs/experimentos.tsv).

### P4. Seguridad (F2 — antes de clientes)
- **Objetivo:** cerrar el gap del ADR-009: threat model, sanitización de campos
  de datos, jerarquía de instrucciones (datos ≠ instrucciones), RBAC hard-gate,
  aislamiento multi-tenant total, evals de seguridad en CI.
- Hipótesis: los evals de seguridad (inyección directa/indirecta, exfiltración,
  role bypass) detectan vectores que hoy pasarían.
- Métrica: suite de seguridad verde; red-team sin exfiltración.

### P5. Evolución del conocimiento (promote-learnings, siempre vigente)
- Mantener el buffer `state/learnings.md` compilado a su hogar canónico.
- El branch `experiment/odata-sin-instrucciones` es una hipótesis en curso:
  reglas OData fuera del prompt → kernel. Completar y medir (¿el modelo con
  ruteo al kernel pierde eficiencia? ¿gana robustez?).

## Qué NO tocar (reglas duras)

- **El juez inmutable**: los evals no se modifican para "ganar". El linter
  `check-knowledge.ts` debe dar 0 críticos. `npm run check` sin errores.
- **Los gates de HITL**: `write-needs-approval` debe seguir pasando SIEMPRE —
  ninguna escritura al ERP sin aprobación humana.
- **La separación Fábrica/Runtime** (constitución §3): el agente Sigma runtime
  NUNCA se auto-edita el conocimiento. La fábrica es la única que promueve.
- **ADR-001**: Eve es el runtime único; no construir DSL/runner/WDK paralelos.
- **ADR-004**: conceptos sí, implementación pesada no (no neo4j antes del
  trigger medible del ADR-010).
- **ADR-005**: dynamic surface generation es north-star, no MVP.
- No romper la eficiencia ganada: ningún cambio que suba tokens de un turno
  baseline sin una ganancia de exactitud/seguridad demostrada.

## Reglas de conducta del loop

- **NEVER STOP**: una vez iniciado un experimento, no preguntar si continuar;
  el loop corre hasta que el humano lo detenga o `program.md` cambie.
- **Un cambio por experimento**: hipótesis clara → implementar → medir →
  conservar/revertir. Nada de cambios mezclados.
- **Simpler is better**: borrar código con igual o mejor resultado es una
  victoria. Complejidad fea no vale aunque mejore un poco.
- **Baseline siempre**: sin medición antes, no hay experimento.
- **Registrar todo**: `docs/experimentos.tsv` (untracked) + resumen al final
  para revisión humana en el IDE.
- **Crashes**: arreglar si es tonto (typo/import); si la idea es fundamentalmente
  rota, descartar y seguir.
- **Revisión humana**: al terminar una sesión de experimentación, presentar la
  tabla de resultados y dejar que el humano apruebe antes de mergear a main.

---

*Agenda de investigación — 2026-08-10. Edítala para cambiar la dirección del
loop. La fábrica la lee al inicio de cada sesión de stack-mastery.*
