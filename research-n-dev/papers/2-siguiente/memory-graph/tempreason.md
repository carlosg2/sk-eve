---
type: paper
area: razonamiento
fase: F5
arxiv_id: "2306.08952"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Towards Benchmarking and Improving the Temporal Reasoning Capability of Large Language Models

**Autores:** Qingyu Tan, Hwee Tou Ng, Lidong Bing
**arXiv:** [2306.08952](https://arxiv.org/abs/2306.08952) · PDF: https://arxiv.org/pdf/2306.08952
**ACL 2023.** Código/datos: https://github.com/DAMO-NLP-SG/TempReason

## Resumen

Muchos hechos dependen del tiempo. Introduce **TempReason**, dataset de probing
de razonamiento temporal con tres niveles de complejidad, y un framework de
aprendizaje para mejorarlo basado en **extracción de spans temporales y
reinforcement learning sensible al tiempo**. Evaluado en QA closed-book,
open-book y reasoning: demuestra la efectividad del enfoque y cuantifica dónde
fallan los LLM con el tiempo.

## Por qué importa para Sigma — LA LAGUNA

El memory graph temporal (F5) y la supersession (ADR-010) asumen que el agente
razona sobre cuándo las cosas fueron verdad — **pero el razonamiento temporal de
los LLM es un punto débil conocido**, no un detalle. Este paper lo cuantifica y
da el framework de mejora:

- La pregunta canónica de Sigma "¿cuál era la política de aprobación vigente en
  junio?" es razonamiento temporal de nivel alto (exige saber cuándo se
  supersedió).
- La **extracción de spans temporales** (cuándo un hecho fue válido) es
  exactamente lo que el TKG de F5 debe almacenar — y lo que el OKF ya modela con
  `stale_after`.
- Los niveles de complejidad de TempReason son la plantilla para los invariantes
  de los evals de memoria temporal del dominio.

## Takeaways accionables

- Al implementar supersession en file system (ADR-010), evaluar la capacidad del
  modelo con preguntas TempReason-like sobre el Twin: "¿cuándo cambió X?".
- La técnica de RL sensible al tiempo es una dirección futura para entrenar el
  agente a leer correctamente las fechas de validez del Twin (fechas OData sin
  comillas ya es una micro-batalla de este tipo).

## Enlaces

- Abs: https://arxiv.org/abs/2306.08952 · PDF: https://arxiv.org/pdf/2306.08952
