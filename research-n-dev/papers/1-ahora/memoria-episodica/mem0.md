---
type: paper
area: memoria
fase: F1
arxiv_id: "2504.19413"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory

**Autores:** Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, Deshraj Yadav
**arXiv:** [2504.19413](https://arxiv.org/abs/2504.19413) · PDF: https://arxiv.org/pdf/2504.19413

## Resumen

Mem0 es una arquitectura de memoria centrada en el ciclo completo
**extracción → consolidación → recuperación** de información saliente en
conversaciones multi-sesión. Incluye una variante con **memoria basada en grafo**
para capturar relaciones entre entidades. En LoCoMo supera a todos los sistemas
comparados (RAG con varios chunk sizes, full-context, OpenAI, plataformas
propietarias) en single-hop, temporal, multi-hop y open-domain, con **91% menos
latencia p95 y >90% de ahorro de tokens** vs full-context.

## Por qué importa para Sigma

- Es la validación industrial de que **"la memoria es el cuello de botella, no el
  prompt"** (tesis v2 §0 y §2): un sistema de memoria estructurado gana a RAG puro
  y a full-context.
- El flujo extracción→consolidación→recuperación es exactamente el que la tesis
  asigna a la capa de datos del Company Twin (F5): la consolidación
  episódica→semántica que la tesis llama "la etapa más impactante y menos
  implementada" es el componente central de Mem0.
- La variante graph memory es evidencia directa para la decisión ADR-010 (migrar
  a memory graph cuando el trigger se cruce).

## Takeaways accionables

- La **consolidación** (no solo recuperación) es donde está el valor: nuestra
  radiografía (Event Ledger → fábrica consolida al Twin OKF) ya implementa esta
  separación de poderes; Mem0 automatiza lo que nosotros hacemos con la fábrica.
- **Métrica de referencia**: 91% menos latencia / 90% menos tokens que
  full-context. Es el orden de magnitud que justifica nuestra capa de memoria
  episódica (P1.5) y el lóbulo frontal.
- Para evals de memoria del dominio: usar las categorías de pregunta de Mem0
  (single-hop, temporal, multi-hop, open-domain) como plantilla de invariantes
  del evaluador de calidad (§8 tesis).

## Enlaces

- Abs: https://arxiv.org/abs/2504.19413 · PDF: https://arxiv.org/pdf/2504.19413
