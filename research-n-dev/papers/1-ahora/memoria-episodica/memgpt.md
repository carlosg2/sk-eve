---
type: paper
area: memoria
fase: F1
arxiv_id: "2310.08560"
citado_en_tesis: false
verificado: "2026-08-13"
---

# MemGPT: Towards LLMs as Operating Systems

**Autores:** Charles Packer, Sarah Wooders, Kevin Lin, Vivian Fang, Shishir G. Patil, Ion Stoica, Joseph E. Gonzalez
**arXiv:** [2310.08560](https://arxiv.org/abs/2310.08560) · PDF: https://arxiv.org/pdf/2310.08560

## Resumen

MemGPT propone **gestión de contexto virtual** inspirada en los sistemas de
memoria jerárquica de los SO: el LLM "mueve datos" entre una memoria rápida (la
ventana de contexto) y una lenta (storage externo), usando funciones que el
propio modelo invoca (como un SO mueve páginas entre RAM y disco). Introduce
interrupciones para el control de flujo con el usuario y evalúa en análisis de
documentos largos y chat multi-sesión.

## Por qué importa para Sigma

- Es la **base conceptual** de la capa de memoria de agentes: el LLM decide
  explícitamente qué guardar/recuperar en vez de depender solo de RAG pasivo.
- La tesis v2 (§3.4) y la P1.5 implementada (memoria episódica vía FTS5 +
  inyección) son una versión mínima de esta idea: el agente gestiona su propia
  memoria con herramientas, no con pesos.
- La lección "el contexto es un attention budget finito" (que usa la tesis §2)
  viene de esta línea de trabajo.

## Takeaways accionables

- Para F1 (memoria episódica): MemGPT valida el patrón "el agente es dueño de su
  memoria" — nuestra `recordar_sesiones`/inyección episódica apunta en esa
  dirección; la diferencia es que MemGPT hace que el modelo llame a las
  operaciones de memoria de forma explícita.
- El concepto de **interrupciones** (el agente pausa y pide input) es el germen
  del Agent Inbox de la tesis §9.
- Benchmark de referencia del paper: DMR (Deep Memory Retrieval) — que Zep
  supera; no reinventar, usar LoCoMo/LongMemEval (ver `benchmarks/`).

## Enlaces

- Abs: https://arxiv.org/abs/2310.08560 · PDF: https://arxiv.org/pdf/2310.08560
