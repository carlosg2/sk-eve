---
type: paper
area: benchmarks
fase: F1
arxiv_id: "2410.10813"
citado_en_tesis: true
verificado: "2026-08-13"
---

# LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory

**Autores:** Di Wu, Hongwei Wang, Wenhao Yu, Yuwei Zhang, Kai-Wei Chang, Dong Yu
**arXiv:** [2410.10813](https://arxiv.org/abs/2410.10813) · PDF: https://arxiv.org/pdf/2410.10813
**ICLR 2025.** Código: https://github.com/xiaowu0162/LongMemEval

## Resumen

Benchmark de 500 preguntas (incrustadas en historiales escalables) que evalúa
**cinco habilidades de memoria a largo plazo**:

1. **Information extraction** — extraer información factual.
2. **Multi-session reasoning** — razonar integrando múltiples sesiones.
3. **Temporal reasoning** — razonar sobre el cuándo.
4. **Knowledge updates** — actualizar conocimiento cuando cambia.
5. **Abstention** — saber NO responder cuando no se sabe.

Propone un framework de diseño en 3 etapas (indexing, retrieval, reading) y
optimizaciones (session decomposition, fact-augmented key expansion,
time-aware query expansion). Los asistentes comerciales caen ~30% en
información de interacciones sostenidas.

## Por qué importa para Sigma

- Es el benchmark que la tesis §8 pide para evals de memoria: las categorías
  **temporal reasoning, knowledge updates y abstention** son exactamente las que
  la tesis v2 marca como la diferencia del memory graph temporal (supersession) y
  de la seguridad (no alucinar "Dato no disponible" cuando no se sabe).
- Zep/Graphiti usa LongMemEval como benchmark enterprise (18.5% de mejora) — es
  la métrica de referencia de la frontera para memoria de negocio.
- El framework indexing/retrieval/reading es una guía directa para el diseño de
  la capa de datos del Twin (F5).

## Takeaways accionables

- Convertir las **5 habilidades en invariantes de los evals de memoria** del
  dominio Sigma: ej. "knowledge update: la política de aprobación cambió; ¿el
  agente usa la nueva?" y "abstention: dato no disponible sin inventar".
- La **time-aware query expansion** valida nuestro lóbulo frontal con
  temporalidad (el plan de contexto ya inyecta el snapshot del periodo).
- Usar LongMemEval como benchmark de referencia al evaluar la capa de memoria de
  F5 (no construir benchmark propio desde cero).

## Enlaces

- Abs: https://arxiv.org/abs/2410.10813 · PDF: https://arxiv.org/pdf/2410.10813
