---
type: paper
area: memoria
fase: F5
arxiv_id: "2501.13956"
citado_en_tesis: true
verificado: "2026-08-13"
---

# Zep: A Temporal Knowledge Graph Architecture for Agent Memory

**Autores:** Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, Daniel Chalef
**arXiv:** [2501.13956](https://arxiv.org/abs/2501.13956) · PDF: https://arxiv.org/pdf/2501.13956
**Citado en tesis §3.4** (memory graph temporal, temporal supersession, Zep/Graphiti).

## Resumen

Zep es un servicio de capa de memoria para agentes. Su componente central,
**Graphiti**, es un motor de knowledge graph **temporalmente consciente** que
sintetiza datos conversacionales no estructurados y datos de negocio
estructurados **manteniendo relaciones históricas** (intervalos de validez por
arista, supersession). Supera a MemGPT en DMR (94.8% vs 93.4%) y mejora hasta
18.5% en LongMemEval con **90% menos latencia** que baselines, con mejoras
pronunciadas en síntesis cross-session y mantenimiento de contexto largo.

## Por qué importa para Sigma

- Es el **paper de cabecera de F5** (memory graph temporal): la tesis cita
  explícitamente que "el memory graph temporal gana al vector-RAG puro" y que la
  operación de mayor valor es la **temporal supersession** (el hecho nuevo
  inactiva al viejo) — exactamente lo que implementa Graphiti.
- La tesis §3.4 ya mapea los componentes de Sigma al TKG: el espejo `events` es
  el episodio, el Twin OKF (frontmatter `verified`/`status`/`stale_after`) es la
  capa semántica consolidada con temporalidad y proveniencia.
- Zep demuestra que el TKG también funciona para **datos de negocio
  estructurados** (no solo conversación) — el caso de Sigma sobre ERP.

## Takeaways accionables

- Al implementar la **supersession en file system** (ADR-010: "append + marca de
  superseded"), el modelo de Graphiti es la referencia: cada hecho lleva su
  ventana de validez y la contradicción inactiva al anterior con proveniencia.
- La latencia (90% menor) es el argumento para que el retrieval del TKG no
  supere el presupuesto de contexto del planner (trigger #2 del ADR-010).
- LongMemEval (ver `benchmarks/longmemeval.md`) es el benchmark que Zep usa para
  casos enterprise con temporal reasoning — alinear ahí los evals de memoria de
  Sigma (tesis §8).

## Enlaces

- Abs: https://arxiv.org/abs/2501.13956 · PDF: https://arxiv.org/pdf/2501.13956
