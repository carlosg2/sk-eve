---
type: paper
area: multi-agente
fase: F4
arxiv_id: "2406.04692"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Mixture-of-Agents Enhances Large Language Model Capabilities

**Autores:** Junlin Wang, Jue Wang, Ben Athiwaratkun, Ce Zhang, James Zou
**arXiv:** [2406.04692](https://arxiv.org/abs/2406.04692) · PDF: https://arxiv.org/pdf/2406.04692

## Resumen

Propone **Mixture-of-Agents (MoA)**: una arquitectura en capas donde cada capa
tiene múltiples agentes LLM y cada agente usa las salidas de la capa anterior
como información auxiliar. Con solo LLMs open-source, MoA lidera AlpacaEval 2.0
(65.1% vs 57.5% de GPT-4 Omni), superando a GPT-4 Omni en AlpacaEval 2.0,
MT-Bench y FLASK. El mecanismo central es la **agregación progresiva**:
incorporar respuestas parciales de múltiples agentes mejora la calidad.

## Por qué importa para Sigma

- Es una referencia de **topología de colaboración en capas** para el enjambre
  gobernado (tesis §3.2): no es el patrón que Sigma usará (el nuestro es
  orquestador + especialistas con contrato, no colaboración por síntesis de
  respuestas), pero define el límite superior del "swarm por agregación".
- La **regla práctica** de la tesis (usar un solo agente si cabe en contexto;
  el multi-agente es un impuesto) se apoya en evidencia: MoA gana pero a un
  costo de tokens muy alto (N respuestas por query).
- Útil como benchmark de referencia para el evaluador de calidad cuando F4 mida
  si la colaboración entre agentes mejora la respuesta.

## Takeaways accionables

- No adoptar MoA como patrón para Sigma (el ERP requiere determinismo y
  governance, no síntesis de votos), pero usar sus resultados como contraste
  cuando se evalúe la utilidad de la colaboración multi-agente en F4.
- La agregación progresiva es conceptualmente el "multi-reader para
  verificación": útil para el agente validador (contrato de salida = veredicto
  con discrepancias).

## Enlaces

- Abs: https://arxiv.org/abs/2406.04692 · PDF: https://arxiv.org/pdf/2406.04692
