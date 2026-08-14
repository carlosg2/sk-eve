---
type: paper
area: memoria
fase: F5
arxiv_id: "2606.24535"
citado_en_tesis: true
verificado: "2026-08-13"
---

# Governed Shared Memory for Multi-Agent LLM Systems

**Autores:** Yanki Margalit, Nurit Cohen-Inger, Erni Avram, Ran Taig, Oded Margalit
**arXiv:** [2606.24535](https://arxiv.org/abs/2606.24535) · PDF: https://arxiv.org/pdf/2606.24535
**Citado en tesis §3.4** (memoria compartida multi-agente: 4 modos de fallo, 4 primitivas).

## Resumen

Formaliza el **fleet-memory problem** (memoria compartida en entornos
multi-agente) e identifica cuatro modos de fallo fundamentales:

1. **Unauthorized leakage** — fuga entre agentes/tenants.
2. **Stale propagation** — un hecho viejo se propaga sin actualizarse.
3. **Contradiction persistence** — dos hechos contradictorios conviven.
4. **Provenance collapse** — se pierde quién/cuándo escribió qué.

Define cuatro primitivas de sistemas: **scoped retrieval, temporal supersession,
provenance tracking y propagación gobernada por políticas**, implementadas en
MemClaw (servicio de memoria multi-tenant en producción) y evaluadas con
ArgusFleet (harness de 4 dimensiones de gobernanza). Resultados: proveniencia
reconstruida al 100% en cadenas de derivación de profundidad 4; propagación con
visibilidad intra-fleet y **cero fuga cross-fleet**. Reporta además dos fallos
arquitectónicos reales descubiertos en producción (asymmetric scope enforcement y
pipeline ordering conflict).

## Por qué importa para Sigma

- Es la **justificación formal del enjambre gobernado** de la tesis v2: la
  memoria compartida NO es un detalle de implementación, es un problema de
  sistemas distribuidos con 4 modos de fallo explícitos.
- La tesis §3.4 lo cita como base para definir el trigger de migración a DB
  (ADR-010): el modo de fallo "contradiction persistence" es el trigger #4
  ("el merge LWW pierde hechos").
- La **temporal supersession** como primitiva coincide con la regla ontológica de
  v1 formalizada ("lo temporal no se guarda como verdad" → el hecho nuevo
  inactiva al viejo).
- La **provenance** conecta con OKF v0.2 (`generated`/`verified`/`sources`) y con
  la separación Fábrica/Runtime de la constitución.

## Takeaways accionables

- Cuando el runtime pase de single-agent a multi-agente (F4), revisar los 4 modos
  de fallo como checklist de diseño de la capa de memoria compartida.
- El hallazgo "**asymmetric scope enforcement**" (tenant aislado pero sub-tenant
  vulnerable en GET-by-id) es una advertencia directa para el aislamiento
  multi-tenant de la tesis §4.2: el filtro por tenant debe cubrir TODOS los
  caminos de lectura, no solo el buscador.
- La **evaluación en producción** (no solo diseño) es el método: nuestro
  protocolo de pruebas con radiografía durable es el equivalente en Sigma.

## Enlaces

- Abs: https://arxiv.org/abs/2606.24535 · PDF: https://arxiv.org/pdf/2606.24535
