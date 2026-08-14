---
type: paper
area: benchmarks
fase: F1
arxiv_id: "2402.17753"
citado_en_tesis: true
verificado: "2026-08-13"
---

# LoCoMo: Evaluating Very Long-Term Conversational Memory of LLM Agents

**Autores:** Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, Mohit Bansal, Francesco Barbieri, Yuwei Fang
**arXiv:** [2402.17753](https://arxiv.org/abs/2402.17753) · PDF: https://arxiv.org/pdf/2402.17753
**ACL 2024.** Proyecto: https://snap-research.github.io/locomo/

## Resumen

Introduce LoCoMo, dataset de conversaciones **muy largas** (300 turnos, 9K
tokens promedio, hasta 35 sesiones) generadas con una pipeline
machine-human anclada en **personas y event graphs temporales**. Benchmark de
memoria a largo plazo con tres tareas: question answering, resumen de eventos y
diálogo multimodal. Hallazgos: los LLM tienen dificultades con dinámicas
temporales/causales largas; long-context y RAG ayudan pero quedan lejos del
rendimiento humano.

## Por qué importa para Sigma

- Es el **benchmark estándar de memoria conversacional** que la tesis §8
  necesita para sus evals de memoria ("BEAM/AMB como referencia, no dogma" —
  ver README §Correcciones sobre BEAM). Mem0, E-mem, Synthius-Mem y V-Mem se
  evalúan contra LoCoMo, lo que lo hace el punto de comparación común.
- La metodología de anclaje en **event graphs temporales** es directamente
  relevante para el Process Graph de Sigma: las preguntas "¿qué pasó cuándo?"
  sobre la operación del ERP.

## Takeaways accionables

- Para evals de memoria del dominio (F5): derivar de LoCoMo la categoría de
  preguntas **temporales y causales** y aplicarlas al workload ERP (ej. "¿cuándo
  cambió la política de aprobación?").
- La métrica de comparación con humanos (87.9 F1) es la referencia de techo.
- ⚠️ Corregir en la tesis: LoCoMo es el benchmark de memoria de referencia; la
  tesis §8 menciona BEAM (no localizado en arXiv) — LongMemEval + LoCoMo cubren
  las categorías que la tesis atribuye a BEAM.

## Enlaces

- Abs: https://arxiv.org/abs/2402.17753 · PDF: https://arxiv.org/pdf/2402.17753
