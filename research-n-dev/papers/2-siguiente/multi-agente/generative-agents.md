---
type: paper
area: multi-agente
fase: F4
arxiv_id: "2304.03442"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Generative Agents: Interactive Simulacra of Human Behavior

**Autores:** Joon Sung Park, Joseph C. O'Brien, Carrie J. Cai, Meredith Ringel Morris, Percy Liang, Michael S. Bernstein
**arXiv:** [2304.03442](https://arxiv.org/abs/2304.03442) · PDF: https://arxiv.org/pdf/2304.03442

## Resumen

Paper fundacional de agentes con memoria y comportamiento creíble: una
arquitectura que extiende un LLM para **almacenar un registro completo de
experiencias en lenguaje natural, sintetizarlas con el tiempo en reflexiones de
nivel superior, y recuperarlas dinámicamente para planificar**. Los 25 agentes
de un pueblo simulado (Smallville) forman opiniones, inician conversaciones,
recuerdan y reflejan días pasados y planean el siguiente. Los ablations muestran
que observación, planificación y **reflexión** contribuyen críticamente.

## Por qué importa para Sigma

- Es el origen conceptual de la **memoria episódica + consolidación a reflexiones
  + planificación** — la tripleta que Sigma implementa de forma distribuida
  (Event Ledger = registro completo; fábrica = consolidación a reflexiones/Twin;
  lóbulo frontal = planificación con memoria).
- La **memoria dinámica con scoring de recuperación** (recencia, importancia,
  relevancia) es la referencia del diseño de recuperación del memory graph.
- El patrón de agentes que "forman opiniones y coordinan" es el predecesor del
  enjambre gobernado (la tesis lo supera con contratos en vez de simulación
  libre).

## Takeaways accionables

- Para F5, el **scoring de memoria** (recencia × importancia × relevancia) es una
  alternativa concreta al scoring por similitud pura para el retrieval del
  Twin/memoria episódica.
- La reflexión como consolidación (resúmenes de nivel superior de un conjunto de
  eventos) es la definición operativa de "consolidación episódica→semántica"
  que la fábrica puede aplicar al Event Ledger (paralelo a CraniMem).

## Enlaces

- Abs: https://arxiv.org/abs/2304.03442 · PDF: https://arxiv.org/pdf/2304.03442
