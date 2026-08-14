---
type: paper
area: mejora
fase: meta-fabrica
arxiv_id: "2506.14728"
citado_en_tesis: false
verificado: "2026-08-13"
---

# AgentDistill: Training-Free Agent Distillation with Generalizable MCP Boxes

**Autores:** Jiahao Qiu, Xinzhe Juan, Yimin Wang, Ling Yang, Xuan Qi, Tongcheng Zhang, Jiacheng Guo, Yifu Lu, Zixin Yao, Hongru Wang, Shilong Liu, Xun Jiang, Liu Leqi, Mengdi Wang
**arXiv:** [2506.14728](https://arxiv.org/abs/2506.14728) · PDF: https://arxiv.org/pdf/2506.14728

## Resumen

La destilación de agentes (que implican planning, memoria y tool use) está poco
explorada; los métodos existentes replayan trayectorias del teacher o imitan su
uso de tools pero no logran que el estudiante **planee y actúe en entornos
nuevos**. **AgentDistill** es destilación **sin entrenamiento**: transfiere
conocimiento **reutilizando MCPs** — módulos estructurados de resolución de
tareas generados autónomamente por los agentes teacher. El estudiante (modelo
pequeño) generaliza entre dominios y resuelve problemas nuevos con mínima
supervisión, alcanzando rendimiento comparable a sistemas con LLMs grandes como
OctoTools (GPT-4o).

## Por qué importa para Sigma — LA LAGUNA

Es el puente entre **lo que la meta-fábrica produce hoy (skills = texto)** y la
destilación pesada (fine-tuning): las **skills de Sigma son "MCP boxes"** —
módulos reutilizables de resolución de tareas. Este paper muestra que:

- Los skills del catálogo (procedurales, con pasos y tools) son el mismo
  artefacto que estos MCP boxes: un estudiante pequeño podría ejecutarlos sin
  LLM grande.
- La **generalización entre dominios** (skills que funcionan en otro tenant) es
  la propiedad que valida la composabilidad que persigue el ERP Kernel
  universal.
- Es "training-free" → la meta-fábrica podría implementar la reutilización de
  skills como "ensamblar un agente pequeño con las skills del catálogo" sin
  entrenar nada.

## Takeaways accionables

- Verificar si las skills actuales del catálogo son suficientemente
  **estructuradas y ejecutables por un runtime determinista** (pasos, tools,
  condiciones) para ser reutilizadas fuera del LLM — hoy son "instrucciones
  para LLM", no programas.
- La dirección "skills como programas reutilizables" es una candidata para el
  formato de skill v2 (más cerca del meta-tool de AWO que del texto de prompt).
- Antes de adoptarla, leer `mejora/subliminal-distillation.md`.

## Enlaces

- Abs: https://arxiv.org/abs/2506.14728 · PDF: https://arxiv.org/pdf/2506.14728
