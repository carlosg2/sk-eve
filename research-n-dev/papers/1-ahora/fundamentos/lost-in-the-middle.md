---
type: paper
area: contexto
fase: F3
arxiv_id: "2307.03172"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Lost in the Middle: How Language Models Use Long Contexts

**Autores:** Nelson F. Liu, Kevin Lin, John Hewitt, Ashwin Paranjape, Michele Bevilacqua, Fabio Petroni, Percy Liang
**arXiv:** [2307.03172](https://arxiv.org/abs/2307.03172) · PDF: https://arxiv.org/pdf/2307.03172
**TACL 2023.**

## Resumen

Analiza cómo los LLM usan contextos largos en QA multi-documento y key-value
retrieval: el rendimiento **cae significativamente cuando la información
relevante está en el medio** del contexto, y es más alto al inicio o al final —
incluso para modelos de contexto largo. Establece el problema de la "curva en U"
del uso de contexto y protocolos de evaluación para contextos largos.

## Por qué importa para Sigma

- Es la base empírica de la tesis v2 §3.3 (y de Anthropic): el contexto es un
  **attention budget finito** y la curaduría es el trabajo #1. Nuestro lóbulo
  frontal inyecta el plan de contexto al INICIO del prompt — donde los modelos
  atienden mejor — y el middleware trunca resultados grandes para que no
  ahoguen la señal en el medio.
- La curva en U justifica el diseño del Context Stack (5 capas por velocidad) y
  la jerarquía de autoridad: no todo el contexto es igual; hay que controlar
  qué entra, dónde y cuánto.
- Las inyecciones del middleware (plan + memoria episódica) se ponen al inicio
  del prompt — alineado con la posición de máxima atención.

## Takeaways accionables

- Mantener el plan de contexto y la memoria episódica al **inicio** del prompt
  (ya implementado en `injectContextPlan`/`injectEpisodicMemory`), nunca en el
  medio.
- Al evaluar el lóbulo frontal (F1), medir si el ahorro de tokens no degrada la
  respuesta por "lost in the middle" — nuestro protocolo de pruebas ya compara
  calidad antes/después.
- La lección aplica también a los results de tools: un resultado MCP gigante
  re-enviado en cada step se "pierde en el medio" — por eso el dedupe/truncado
  del context-budget.

## Enlaces

- Abs: https://arxiv.org/abs/2307.03172 · PDF: https://arxiv.org/pdf/2307.03172
