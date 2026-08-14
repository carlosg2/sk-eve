---
type: paper
area: delegacion
fase: F6
arxiv_id: "2204.02889"
citado_en_tesis: false
verificado: "2026-08-13"
---

# A Cognitive Framework for Delegation Between Error-Prone AI and Human Agents

**Autores:** Andrew Fuchs, Andrea Passarella, Marco Conti
**arXiv:** [2204.02889](https://arxiv.org/abs/2204.02889) · PDF: https://arxiv.org/pdf/2204.02889

## Resumen

Cuando humanos y agentes IA operan en el mismo entorno, es clave **comprender y
responder a las capacidades del otro** y delegar decisiones a quien sea más
adecuado en cada momento. Usa **modelos cognitivos de comportamiento** para
predecir el comportamiento de humanos y agentes, y la **delegación se decide con
una entidad intermediaria** en base a la predicción de desempeño respecto a un
objetivo. Permite superar las limitaciones de cada parte.

## Por qué importa para Sigma — LA LAGUNA

El ladder de autonomía L0-L4 (context-stack §7) decide cuándo el agente puede
actuar solo — pero la decisión de "a quién delegar" hoy es una regla fija
(escritura → HITL). Este paper propone **delegación dinámica basada en predicción
de desempeño**: el sistema decide si el humano o el agente es más adecuado para
esta tarea en este momento.

- Aplica al diseño del **watchdog + escalamiento** (F1): no solo "si el hash
  cambia, despierta al LLM" sino "si el LLM predice bajo desempeño, escala al
  humano".
- La "entidad intermediaria" que decide es conceptualmente el **orquestador de
  misión** (ADR-011) y el **guardian agent** (§7).

## Takeaways accionables

- Para el evaluador de calidad: la confianza del modelo (calibración) puede ser
  la señal para delegar — si el agente está inseguro (abstention de Synthius-Mem
  o poca self-consistency), escalar a humano en vez de responder.
- Diseñar el HITL del Agent Inbox como **delegación dinámica** (decidir cuándo
  pedir aprobación según riesgo Y confianza), no solo estática por tipo de tool.

## Enlaces

- Abs: https://arxiv.org/abs/2204.02889 · PDF: https://arxiv.org/pdf/2204.02889
