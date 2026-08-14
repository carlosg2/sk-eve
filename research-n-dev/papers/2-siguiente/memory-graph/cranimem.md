---
type: paper
area: memoria
fase: F6
arxiv_id: "2603.15642"
citado_en_tesis: false
verificado: "2026-08-13"
---

# CraniMem: Cranial Inspired Gated and Bounded Memory for Agentic Systems

**Autores:** Pearl Mody, Mihir Panchal, Rishit Kar, Kiran Bhowmick, Ruhina Karani
**arXiv:** [2603.15642](https://arxiv.org/abs/2603.15642) · PDF: https://arxiv.org/pdf/2603.15642
**ICLR 2026 Workshop on Memory for LLM-Based Agentic Systems (MemAgents).**

## Resumen

Diseño de memoria **gated y acotada** para agentes de largo recorrido, motivado
por neurocognición: combina un **buffer episódico acotado** (continuidad a corto
plazo) con un **knowledge graph estructurado** (recall semántico durable). Un
**loop de consolidación programado** reproduce las trazas de alta utilidad hacia
el grafo y poda las de baja utilidad, manteniendo el crecimiento bajo control y
reduciendo interferencia. En benchmarks long-horizon con ruido inyectado, es más
robusto que Vanilla RAG y Mem0, con menores caídas de rendimiento ante
distractores.

## Por qué importa para Sigma

- La **consolidación episódica→semántica programada con gating por utilidad** es
  literalmente el modelo de la meta-fábrica Sigma (constitución §3): el runtime
  acumula episodios (espejo `events`), y la fábrica consolida lo de alto valor al
  Twin OKF. CraniMem automatiza ese loop con una política de utilidad.
- El **buffer acotado** valida nuestra decisión de podar deltas de streaming del
  espejo (compactación 1GB→83MB): la memoria episódica no puede crecer sin
  límite; hace falta eviction gobernada.
- La robustez ante **ruido/distractores** conecta con el pilar de seguridad §4
  (memoria contaminada por datos).

## Takeaways accionables

- Para F5/F6: diseñar la **política de consolidación** (qué sube del Event Ledger
  al Twin y qué se evicta) como un loop explícito con criterios de utilidad —
  hoy ese criterio es juicio humano de la fábrica; un score de utilidad (frecuencia
  de uso, contradicciones, edad) haría el proceso semi-automático y auditable.
- El "gated" (rutas rápidas/lentas según la señal) es la evolución del watchdog
  (ADR-008): solo lo relevante activa la consolidación costosa.

## Enlaces

- Abs: https://arxiv.org/abs/2603.15642 · PDF: https://arxiv.org/pdf/2603.15642
