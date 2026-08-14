---
type: paper
area: contexto
fase: F5
arxiv_id: "2404.16130"
citado_en_tesis: false
verificado: "2026-08-13"
---

# From Local to Global: A Graph RAG Approach to Query-Focused Summarization

**Autores:** Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Steven Larson
**arXiv:** [2404.16130](https://arxiv.org/abs/2404.16130) · PDF: https://arxiv.org/pdf/2404.16130
**(GraphRAG, Microsoft).**

## Resumen

Propone GraphRAG: construir con un LLM un **índice de grafo de entidades** a
partir de los documentos, pre-generar **resúmenes de comunidad** para grupos de
entidades relacionadas, y responder preguntas globales (sensemaking sobre todo
el corpus) combinando resúmenes parciales por comunidad. Supera al RAG
convencional en exhaustividad y diversidad para preguntas globales sobre datasets
de ~1M tokens (el RAG vectorial falla en preguntas globales porque son
query-focused summarization, no retrieval).

## Por qué importa para Sigma

- Es evidencia de que **grafo > vector puro** para preguntas relacionales/
  globales — soporta la decisión de F5 (memory graph temporal sobre RAG puro,
  tesis §3.4 y ADR-010).
- El concepto de **resúmenes de comunidad** es análogo a la consolidación del
  Company Twin por módulo (erp-kernel/<entidad>.md, companies/<tenant>/
  policies/) y al index.md de progressive disclosure: navegar por resúmenes de
  alto nivel antes que por nodos sueltos.
- La distinción local (retrieval puntual) vs global (sensemaking) es exactamente
  la diferencia entre nuestras tools tipadas (`buscar_registro`, agregados) y el
  conocimiento consolidado del Twin.

## Takeaways accionables

- Para F5: el TKG de Sigma no solo recupera hechos locales (un proveedor) sino
  que debe responder preguntas globales (¿cuál es la salud del proceso
  procure-to-pay?) — los resúmenes de comunidad del Twin OKF (index.md,
  policies) ya son la semilla.
- El pipeline "LLM construye el grafo → resúmenes → responder" es una guía para
  automatizar parcialmente la consolidación de la fábrica.

## Enlaces

- Abs: https://arxiv.org/abs/2404.16130 · PDF: https://arxiv.org/pdf/2404.16130
