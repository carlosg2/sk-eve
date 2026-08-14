---
type: paper
area: memoria
fase: F5
arxiv_id: "2603.04740"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Memory as Ontology: A Constitutional Memory Architecture for Persistent Digital Citizens

**Autores:** Zhenghui Li
**arXiv:** [2603.04740](https://arxiv.org/abs/2603.04740) · PDF: https://arxiv.org/pdf/2603.04740

## Resumen

Argumenta que cuando la vida de un agente se extiende a meses/años y el modelo
subyacente puede reemplazarse mientras el "yo" persiste, la memoria no es un
problema técnico de "cómo almacenar" sino el **fundamento ontológico de la
existencia digital**. Propone **Animesis**: una Constitutional Memory Architecture
(CMA) con **jerarquía de gobernanza de 4 capas** y almacenamiento semántico
multinivel, más un framework de ciclo de vida (Digital Citizen Lifecycle). La
tesis central: **la gobernanza va antes que la funcionalidad** y la continuidad
de identidad por encima de la métrica de recuperación.

## Por qué importa para Sigma

- Es el paralelo conceptual más cercano a la **constitución Sigma** y a la frase
  de la tesis v2: "La memoria compartida gobernada es la organización" / "el
  modelo es un recipiente reemplazable". Refuerza la decisión de que el Company
  Twin (memoria) es el activo y el LLM es commodity (mercado.md §1.2).
- La "gobernanza antes que funcionalidad" es exactamente ADR-009/ADR-010: la
  seguridad y el gobierno de la memoria son pilar, no post-proceso.
- La **continuidad de identidad entre reemplazos de modelo** es un caso real de
  Sigma: los tenants (agent.md cambia de modelo) y la memoria (Twin) persiste.

## Takeaways accionables

- Al diseñar el memory graph de F5, modelar la **capa de gobernanza de la
  memoria** como parte de la arquitectura (quién puede escribir, con qué
  autoridad, cómo se supersede) — no como añadido.
- El "Digital Citizen Lifecycle" es una plantilla para el ciclo de vida del
  conocimiento del Twin: creación, verificación (trust tiers OKF), stale,
  supersession, eviction.

## Enlaces

- Abs: https://arxiv.org/abs/2603.04740 · PDF: https://arxiv.org/pdf/2603.04740
