---
type: paper
area: ejecucion
fase: meta-fabrica
arxiv_id: "2305.05176"
citado_en_tesis: false
verificado: "2026-08-13"
---

# FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance

**Autores:** Lingjiao Chen, Matei Zaharia, James Zou (Stanford)
**arXiv:** [2305.05176](https://arxiv.org/abs/2305.05176) · PDF: https://arxiv.org/pdf/2305.05176

## Resumen

Los precios de las APIs LLM difieren hasta en dos órdenes de magnitud. Analiza
tres estrategias para reducir el costo de inferencia: (1) **prompt adaptation**,
(2) **LLM approximation** (modelos más baratos) y (3) **LLM cascade** (encadenar
modelos: barato primero, escalar solo si falla). Propone **FrugalGPT**, una
instancia de cascade que aprende qué combinación de LLMs usar por query:
iguala el rendimiento del mejor modelo individual (GPT-4) con hasta **98% de
reducción de costo**, o mejora la exactitud 4% al mismo costo.

## Por qué importa para Sigma — LA LAGUNA

El proyecto es extremadamente consciente del costo (DeepSeek barato, watchdog
con ticks silenciosos, compactación de contexto, cache) pero **no tiene la
ciencia de cascadas/routing**. Este paper la da:

- La estrategia "barato primero, escalar si falla" es la generalización del
  watchdog de ADR-008: el LLM es el último recurso, y cuando corre, un modelo
  barato debería ser el primero.
- El proyecto ya tiene la infraestructura: `agent.md` con `model` por agente y el
  AI Gateway de Vercel permiten routing dinámico — pero hoy el modelo es estático
  por agente.
- Plan-and-Execute (tesis §3.3, "-90% costo") es una cascada: plan con modelo de
  razonamiento, ejecuta con baratos.

## Takeaways accionables

- Diseñar el **cascade por misión**: modelo barato (deepseek-v4-flash) primero
  con verificación determinista (aggregate/read MCP), escalar a un modelo de
  razonamiento solo si la verificación falla o el caso es ambiguo.
- La **prompt adaptation** (acortar/estructurar prompts para reducir costo) es lo
  que ya hace el context-budget; FrugalGPT da el marco teórico y las métricas.
- Para la propuesta comercial (pago por tarea, tesis §9): el costo por tarea de
  una cascada bien diseñada es el dato que valida el pricing.

## Enlaces

- Abs: https://arxiv.org/abs/2305.05176 · PDF: https://arxiv.org/pdf/2305.05176
