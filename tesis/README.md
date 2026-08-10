# Tesis Sigma — guía de lectura

Documentación de la tesis **Sigma AGI** (implementación: sk-eve). Cada documento
responde una pregunta distinta; este README ordena la lectura.

## Orden recomendado

1. `arquitectura.md` — las **3 abstracciones** (Meta-fábrica, Agente, Company Twin)
   + Governance transversal. *La primera lente con la que se entra a todo lo demás.*
2. `tesis.md` — El Agente: modelo de ejecución por **loops persistentes** + §12
   **estado de implementación** (qué es real y qué es aspiración).
3. `context-stack.md` — qué contexto compone Sigma: stack de 5 capas, regla
   ontológica, jerarquía de autoridad.
4. `constitucion.md` — **norma**: dueño de cada capa, hogar canónico de cada hecho,
   separación Runtime/Fábrica.
5. `decisiones.md` — ADRs (append-only; las decisiones no se editan, se superseden).
6. `protocolo-pruebas.md` — cómo evaluar cambios (herramienta de la fábrica).
7. `produccion.md` — camino a producción (decisión E pendiente).

## Complementos

- `mercado.md` — tesis de mercado y posicionamiento (Vertical AI > SaaS).
- `inteligencia-consultora.md` — nivel meta: cross-client learning (scope futuro).
- `glosario.md` — vocabulario de referencia (Agentic Process Intelligence).

## Legado (historia preservada, no leer primero)

- `legacy/tesis-v0.md` — formulación original (request/response). Linaje de `tesis.md`.
- `legacy/old-prd.md` — PRD original del proyecto previo (flujo.ai/Sigma Intelisis).

---

*El estado real del código se verifica en la tabla §12 de `tesis.md` y en
`.github/copilot-instructions.md` (runbook operativo).*
