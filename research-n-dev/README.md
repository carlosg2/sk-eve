# research-n-dev/ — Investigación y desarrollo (Sigma AGI)

> **Fábrica (Copilot) · 2026-08-13.** Folder de investigación-para-acción del
> proyecto. Contiene la base científica (papers/), la síntesis accionable, las
> desviaciones de la tesis y el estado del arte validado externamente.
>
> **Cómo usar:** primero lee `SINTESIS-ACCIONABLE.md` (qué accionar, en qué
> orden) y `DESVIACIONES-TESIS.md` (dónde la tesis necesita desviarse). Los
> papers son el detalle de respaldo.

## Contenido

| Archivo/Carpeta | Qué es |
|---|---|
| `README.md` | Este índice |
| `SINTESIS-ACCIONABLE.md` | **La síntesis**: 53 papers leídos por 6 agentes en paralelo → veredictos consolidados (IMPLEMENTAR / PROBAR EN SHADOW / DIFERIR / DESCARTAR) + plan de acción priorizado por fase |
| `DESVIACIONES-TESIS.md` | **Las desviaciones de la tesis** (lo que los papers y el estado del arte obligan a cambiar) — la parte que más importa |
| `estado-del-arte-video.md` | Análisis del video de referencia (Diary Of A CEO × Daniel Kokotajlo: AI 2027 / AI 2040) — ventana de acción, concentración de poder, interpretabilidad, reversibilidad |
| `VEREDICTO-HERRAMIENTAS-2026-08-13.md` | Veredicto de 3 herramientas propuestas (Mem0, Semantica, gbrain): ninguna va al runtime; Semantica = referencia de diseño para ADR-013 (CARE), gbrain = cerebro de la fábrica + referencias (ADR-014, evals A1/A5, durable execution A8) |
| `papers/` | Las 52 fichas de papers + triage, organizadas por momento de decisión (1-ahora / 2-siguiente / 3-vision / 4-archivo) |

## Estado del proceso (2026-08-13)

1. ✅ 53 papers leídos por **6 subagentes en paralelo** (memoria-episódica, ejecución+datos, seguridad, fundamentos+multi-agente, memory-graph+proceso, forecasting+visión+archivo).
2. ✅ Cada informe dio: veredicto por paper, qué implementar concreto (archivos/evals/skills), esfuerzo/impacto, y desviación de la tesis.
3. ✅ Estado del arte validado: video (transcripción aportada por el usuario) + análisis.
4. ✅ Consolidado en `SINTESIS-ACCIONABLE.md` y `DESVIACIONES-TESIS.md`.

## Regla

- Este folder es **material de la fábrica** (VS Code Copilot) — NO va al Company
  Twin ni a skills. El runtime no debe saber que existe.
- Los planes de aquí se ejecutan con el protocolo del repo (probe → skill/twin →
  eval → E2E) y se registran en `tesis/decisiones.md` (ADR) cuando cambian
  arquitectura.
