---
type: paper
area: benchmarks
fase: F5
arxiv_id: "2602.10715"
citado_en_tesis: false
verificado: "2026-08-13"
---

# LoCoMo-Plus: Beyond-Factual Cognitive Memory Evaluation Framework for LLM Agents

**Autores:** Yifei Li, Weidong Guo, Lingling Zhang, Rongman Xu, Muye Huang, Hui Liu, Lijiao Xu, Yu Xu, Jun Liu
**arXiv:** [2602.10715](https://arxiv.org/abs/2602.10715) · PDF: https://arxiv.org/pdf/2602.10715
**Código:** https://github.com/xjtuleeyf/Locomo-Plus

## Resumen

Extiende LoCoMo hacia la **memoria cognitiva**: las respuestas correctas
dependen de restricciones implícitas (estado, objetivos, valores del usuario)
que no se consultan explícitamente después — el escenario *cue–trigger semantic
disconnect*. Muestra que los string-matching convencionales y el prompting por
tipo de tarea están mal alineados con estos casos, y propone un **framework de
evaluación unificado basado en constraint consistency**. Los experimentos
(backbones, retrieval, memoria) revelan fallos que los benchmarks existentes no
capturan.

## Por qué importa para Sigma

- La **constraint consistency** es la versión rigurosa de lo que Sigma quiere
  medir en calidad de respuestas: no solo "¿el dato está?" sino "¿la respuesta
  respeta la política/restricción latente del tenant?" (context stack, jerarquía
  de autoridad).
- Nuestro evaluador de calidad (`scripts/eval-calidad.ts`) usa exactitud vs
  verdad MCP; LoCoMo-Plus añade la dimensión de restricciones implícitas (el
  "Dato no disponible" correcto, el límite de aprobación, el estatus correcto).

## Takeaways accionables

- Añadir invariantes de **constraint consistency** a los evals: cuando una
  política del Company Twin restringe (jerarquía de autoridad), la respuesta debe
  respetarla aunque la pregunta no la mencione.
- Validar con LoCoMo-Plus la alineación de nuestros prompts de evaluación (el
  mismo aviso que eval-calidad v2: no medir presencia de strings).

## Enlaces

- Abs: https://arxiv.org/abs/2602.10715 · PDF: https://arxiv.org/pdf/2602.10715
