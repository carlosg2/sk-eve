---
type: paper
area: benchmarks
fase: F5
arxiv_id: "2604.21229"
citado_en_tesis: false
verificado: "2026-08-13"
---

# EngramaBench: Evaluating Long-Term Conversational Memory with Structured Graph Retrieval

**Autores:** Julian Acuna
**arXiv:** [2604.21229](https://arxiv.org/abs/2604.21229) · PDF: https://arxiv.org/pdf/2604.21229

## Resumen

Benchmark de memoria conversacional de largo plazo con 5 personas, 100
conversaciones multi-sesión y 150 queries que cubren: recall factual, integración
cross-space, **razonamiento temporal, abstention adversarial y síntesis
emergente**. Aísla el efecto de la arquitectura de memoria usando el mismo modelo
respondedor (GPT-4o): full-context alcanza el composite más alto (0.6186),
Engrama (memoria en grafo) 0.5367 global pero es el ÚNICO que supera a
full-context en **cross-space reasoning** (0.6532 vs 0.6291), y Mem0 (vector) es
el más barato pero sustancialmente más débil (0.4809). Los ablations revelan una
**tensión de sistemas**: la especialización estructurada (grafo) tradea contra el
composite global.

## Por qué importa para Sigma

- Evidencia empírica del trade-off que la tesis §3.4 discute: el **vector-RAG
  puro pierde** en razonamiento relacional/cross-space, y el grafo gana donde
  importa (relaciones entre entidades del negocio — proveedor→facturas→pagos).
- La conclusión "la arquitectura de memoria importa más que el modelo" refuerza
  el posicionamiento de Sigma (el LLM es commodity; la memoria es el activo).
- La tensión global-vs-especialización es una advertencia de diseño para F5: no
  buscar un TKG que gane todo; diseñar por tipo de query.

## Takeaways accionables

- Diseñar el memory graph de F5 por tipo de query del ERP: relaciones
  (cross-space → grafo), temporalidad (supersession → grafo temporal),
  búsqueda abierta (vector/RAG híbrido). Ninguna arquitectura gana todo.
- Para el Pattern Engine (F7), el cross-space reasoning del grafo es el
  argumento de por qué los patrones entre clientes necesitan grafo, no solo
  vectores.

## Enlaces

- Abs: https://arxiv.org/abs/2604.21229 · PDF: https://arxiv.org/pdf/2604.21229
