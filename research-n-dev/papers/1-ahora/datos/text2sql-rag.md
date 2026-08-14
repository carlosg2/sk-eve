---
type: paper
area: datos
fase: F5
arxiv_id: "2410.01066"
citado_en_tesis: false
verificado: "2026-08-13"
---

# From Natural Language to SQL: Review of LLM-based Text-to-SQL Systems

**Autores:** Ali Mohammadjafari, Anthony S. Maida, Raju Gottumukkala
**arXiv:** [2410.01066](https://arxiv.org/abs/2410.01066) · PDF: https://arxiv.org/pdf/2410.01066

## Resumen

Estudio de la evolución de los sistemas text-to-SQL basados en LLM, de modelos
basados en reglas a enfoques avanzados con **RAG**. Se enfoca en cómo el RAG
mejora la traducción, discute benchmarks y métricas, y estudia de forma única el
uso de **Graph RAG para mayor exactitud contextual y schema linking**. Destaca
retos clave: **eficiencia computacional, robustez del modelo y privacidad de
datos**.

## Por qué importa para Sigma — LA LAGUNA

Complementa el survey anterior con el ángulo que más aplica a Sigma: **usar
conocimiento estructurado (grafo) para mejorar el schema linking**. El Company
Twin OKF + el ERP Kernel son exactamente la fuente de conocimiento para el
schema linking de las consultas OData:

- Nuestro `query_company_twin` y las skills son schema linking vía knowledge
  base curada — Graph RAG formaliza por qué esto gana sobre recuperar schemas
  sueltos.
- Los retos que lista (eficiencia, robustez, **privacidad de datos**) son los
  que la tesis §4 (aislamiento multi-tenant) y §11 (producción) tienen que
  resolver: el agente que consulta el ERP expone datos del cliente.

## Takeaways accionables

- El schema linking del Twin debería enriquecerse con **relaciones entre
  entidades** (los object-description del dab-config + las relaciones del
  kernel) como un mini Graph RAG: el modelo vincula la pregunta a la entidad
  correcta con menos llamadas de descubrimiento.
- La privacidad es un criterio de diseño del text-to-SQL en Sigma: las consultas
  y sus resultados son datos del cliente — el aislamiento multi-tenant debe
  cubrir el camino completo pregunta→consulta→respuesta.

## Enlaces

- Abs: https://arxiv.org/abs/2410.01066 · PDF: https://arxiv.org/pdf/2410.01066
