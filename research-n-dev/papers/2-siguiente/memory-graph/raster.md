---
type: paper
area: razonamiento
fase: F5
arxiv_id: "2406.19538"
citado_en_tesis: false
verificado: "2026-08-13"
---

# RASTeR: Robust, Agentic, and Structured Temporal Reasoning

**Autores:** Dan Schumacher, Fatemeh Haji, Tara Grey, Niharika Bandlamudi, Nupoor Karnik, Gagana Uday Kumar, Jason Cho-Yu Chiang, Paul Rad, Nishant Vishwamitra, Anthony Rios
**arXiv:** [2406.19538](https://arxiv.org/abs/2406.19538) · PDF: https://arxiv.org/pdf/2406.19538
**AACL 2025.**

## Resumen

El QA temporal sigue siendo difícil para los LLM, sobre todo cuando el contenido
recuperado es **irrelevante, desactualizado o temporalmente inconsistente**
(orden de eventos clínicos, seguimiento de políticas). **RASTeR** es un framework
de prompting que **separa la evaluación del contexto de la generación de la
respuesta**: primero evalúa la relevancia y coherencia temporal del contexto
recuperado, luego **construye un temporal knowledge graph (TKG)** para facilitar
el razonamiento, y cuando detecta inconsistencias **corrige o descarta el
contexto** antes de responder. En el estudio needle-in-a-haystack con 40
distractores alcanza 75% de exactitud, +12% sobre el siguiente mejor.

## Por qué importa para Sigma — LA LAGUNA

Es el **patrón operativo del memory graph temporal de F5**: no basta almacenar
hechos temporales; el agente debe (1) evaluar si el contexto que recupera del
Twin es coherente con el momento de la pregunta y (2) **descartar contexto
desactualizado** — exactamente la temporal supersession en acción.

- El TKG de RASTeR (construido ad-hoc para razonar) es la misma estructura que
  el Process Graph + Event Ledger de Sigma: hechos con validez temporal.
- La defensa contra "contenido desactualizado" es el caso real del Twin: una
  política supersedida que sigue en el prompt (el bug ABIERTO→PENDIENTE de este
  repo es un ejemplo histórico de contexto desactualizado).
- El needle-in-a-haystack con distractores es el escenario de los resultados
  MCP gigantes re-enviados en cada step (context-budget).

## Takeaways accionables

- En F5, el flujo de lectura del Twin debería incluir la evaluación de
  coherencia temporal: antes de responder con un hecho del kernel/twin, validar
  que no fue supersedido (campo `status`/`stale_after` del OKF ya existe).
- El "descartar contexto inconsistente" es una mejora directa del lóbulo frontal
  (ADR-012): el plan de contexto debería filtrar conceptos stale antes de
  inyectarlos.
- Los invariantes de los evals de memoria deben incluir el caso "contexto
  desactualizado presente en el historial → el agente lo descarta".

## Enlaces

- Abs: https://arxiv.org/abs/2406.19538 · PDF: https://arxiv.org/pdf/2406.19538
