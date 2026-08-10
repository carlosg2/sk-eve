# Tesis Sigma — guía de lectura

Documentación de la tesis **Sigma AGI v2** (implementación: sk-eve). Cada
documento responde una pregunta distinta; este README ordena la lectura.

## Orden recomendado

1. `arquitectura.md` — las **3 abstracciones** (Meta-fábrica, Los Agentes, Memoria
   compartida) + Governance y Seguridad transversales. *La primera lente con la
   que se entra a todo lo demás.*
2. `tesis.md` — **v2 (2026-08-10)**: el enjambre gobernado, watchdog+LLM bajo
   demanda, memoria compartida (memory graph temporal), seguridad de agentes como
   pilar, agents as services, proyección 2027-2028, y **§13 estado de
   implementación** (qué es real y qué es aspiración).
3. `context-stack.md` — qué contexto compone Sigma: stack de 5 capas, regla
   ontológica, jerarquía de autoridad.
4. `constitucion.md` — **norma**: dueño de cada capa, hogar canónico de cada hecho,
   separación Runtime/Fábrica.
5. `decisiones.md` — ADRs (append-only; las decisiones no se editan, se superseden).
   v2 añade **ADR-008..012** (watchdog, seguridad, trigger de DB, enjambre con
   contratos, curaduría determinista).
6. `protocolo-pruebas.md` — cómo evaluar cambios (herramienta de la fábrica).
7. `produccion.md` — camino a producción (decisión E pendiente; **F2 seguridad
   antes de clientes**).

## Complementos

- `mercado.md` — tesis de mercado y posicionamiento (Vertical AI > SaaS).
- `inteligencia-consultora.md` — nivel meta: cross-client learning (scope futuro,
  F7 del roadmap v2).
- `glosario.md` — vocabulario de referencia (incluye términos v2: enjambre,
  watchdog, memory graph, agent card, guardian agent).

## Legado (historia preservada, no leer primero)

- `legacy/tesis-v0.md` — formulación original (request/response).
- `legacy/tesis-v1.md` — loops persistentes (2026-06-23). Linaje de `tesis.md`.
- `legacy/old-prd.md` — PRD original del proyecto previo (flujo.ai/Sigma Intelisis).

---

*El estado real del código se verifica en la tabla §13 de `tesis.md` y en
`.github/copilot-instructions.md` (runbook operativo).*
