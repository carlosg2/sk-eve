---
type: paper
area: seguridad
fase: F2
arxiv_id: "2410.02644"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Agent Security Bench (ASB): Formalizing and Benchmarking Attacks and Defenses in LLM-based Agents

**Autores:** Hanrong Zhang, Jingyuan Huang, Kai Mei, Yifei Yao, Zhenting Wang, Chenlu Zhan, Hongwei Wang, Yongfeng Zhang
**arXiv:** [2410.02644](https://arxiv.org/abs/2410.02644) · PDF: https://arxiv.org/pdf/2410.02644
**ICLR 2025.** Código: https://github.com/agiresearch/ASB

## Resumen

Framework completo para formalizar, benchmarkear y evaluar **ataques y defensas
de agentes LLM**: 10 escenarios (e-commerce, conducción autónoma, finanzas…),
10 agentes, >400 tools, 27 métodos de ataque/defensa y 7 métricas. Evalúa 10
ataques de prompt injection, un **ataque de memory poisoning**, un backdoor
novedoso (Plan-of-Thought), 4 ataques mixtos y 11 defensas sobre 13 backbones.
Resultados: vulnerabilidades críticas en system prompt, manejo de user prompt,
**uso de tools** y **recuperación de memoria**, con hasta 84.30% de éxito de
ataque y defensas de eficacia limitada. Introduce una métrica de balance
utilidad-seguridad.

## Por qué importa para Sigma

- Es el banco de pruebas que la tesis §4.2 pide para el red-teaming como eval
  continuo en CI: inyección directa/indirecta, exfiltración, role bypass y
  **memory poisoning** (ASI06 — el vector de memoria contaminada).
- La cobertura de **ataques sobre la recuperación de memoria** conecta
  directamente con el memory graph de F5 y con el hallazgo del paper
  governed-shared-memory (provenance como defensa).
- El hallazgo "las defensas actuales son limitadas" refuerza la postura de la
  tesis: contención asumiendo inyección exitosa, no solo prevención.

## Takeaways accionables

- Diseñar la **suite de evals de seguridad** (F2) a partir de los 4 vectores de
  ASB que aplican a Sigma: system prompt, user prompt, tool misuse, memory
  retrieval.
- El **memory poisoning** es el caso específico para el Company Twin/learnings:
  un learning envenenado inyectado al prompt. La defensa es la separación
  Fábrica/Runtime (un humano revisa el buffer antes de promover) + provenance.
- La métrica utilidad-seguridad es la plantilla para evaluar que la sanitización
  no degrade la respuesta útil.

## Enlaces

- Abs: https://arxiv.org/abs/2410.02644 · PDF: https://arxiv.org/pdf/2410.02644
