---
type: paper
area: aprendizaje
fase: meta-fabrica
arxiv_id: "2210.03629"
citado_en_tesis: false
verificado: "2026-08-13"
---

# ReAct: Synergizing Reasoning and Acting in Language Models

**Autores:** Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, Yuan Cao
**arXiv:** [2210.03629](https://arxiv.org/abs/2210.03629) · PDF: https://arxiv.org/pdf/2210.03629
**ICLR 2023.**

## Resumen

El patrón que definió a los agentes LLM modernos: intercalar **traces de
razonamiento** y **acciones específicas de la tarea**, de modo que el
razonamiento ayuda al modelo a inducir, rastrear y actualizar planes y manejar
excepciones, y las acciones le permiten interfazar con fuentes externas (KB,
entornos) para recolectar información. En QA (HotpotQA) y verificación de hechos
(FEVER) supera el chain-of-thought puro reduciendo alucinación; en ALFWorld y
WebShop supera a métodos de imitación y RL en 34% y 10% de tasa de éxito.

## Por qué importa para Sigma

- Es el **motor de ejecución implícito** del agente Sigma (Eve implementa el
  loop razonamiento→tool→resultado; el inspector del `/chat` muestra
  exactamente el patrón ReAct). El reasoning en español que se muestra en la UI
  es el trace de ReAct.
- La lección "el razonamiento reduce alucinación y error de propagación" valida
  que mostrar/auditar el razonamiento (página /audit, razonamiento por step) es
  la base del diagnóstico de la meta-fábrica.

## Takeaways accionables

- Al diseñar la interacción entre el lóbulo frontal y el modelo: ReAct confirma
  que el razonamiento del agente debe quedar en el trace (llm-io + espejo) como
  evidencia para evaluar "qué pensó el agente y en qué se equivocó".
- El "handling of exceptions" de ReAct es lo que nuestros skills enseñan
  (reintento con `first:1` tras BadRequest, responder limitación) — el patrón
  base de robustez.

## Enlaces

- Abs: https://arxiv.org/abs/2210.03629 · PDF: https://arxiv.org/pdf/2210.03629
