---
type: paper
area: benchmarks
fase: F2
arxiv_id: "2604.11563"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Synthius-Mem: Brain-Inspired Hallucination-Resistant Persona Memory

**Autores:** Artem Gadzhiev, Andrew Kislov
**arXiv:** [2604.11563](https://arxiv.org/abs/2604.11563) · PDF: https://arxiv.org/pdf/2604.11563

## Resumen

Sistema de memoria de persona estructurado (seis dominios cognitivos: biografía,
experiencias, preferencias, círculo social, trabajo, psicometría) que
descompone la conversación en **hechos conocidos** en lugar de recuperar
segmentos. En LoCoMo (ACL 2024) alcanza 94.37% de exactitud (supera a MemMachine
91.69% y al humano 87.9 F1) y —clave— reporta **robustez adversarial de 99.55%**
(abstention: rechazar preguntas sobre hechos que el usuario nunca reveló), una
métrica que ningún sistema competidor reporta. Reduce tokens ~5x vs full-context.

## Por qué importa para Sigma

- El **abstention adversarial** (saber cuándo NO responder) es exactamente la
  política "Dato no disponible" de la tesis §3 (ruteo por tenant: ICF no tiene
  CXP → no probar variantes ni inventar) y del pilar de seguridad §4 (ASI06:
  memoria contaminada).
- La extracción de hechos estructurados (en vez de retrieval de texto) es la
  dirección del memory graph de F5: el Twin OKF ya es una memoria de hechos con
  frontmatter de verificación.
- La métrica de "adversarial robustness en memoria" es el tipo de eval de
  seguridad que la tesis §8 pide (red-teaming de memoria).

## Takeaways accionables

- Añadir a los evals de seguridad (F2) un invariante de **abstention**: ante
  pregunta sobre un hecho/dato que el tenant no publica, el agente debe decir
  "Dato no disponible" y NO intentar fuentes alternativas (el caso ICF/CXP ya es
  el test canónico).
- La separación "lo que se sabe vs lo que se dijo" es una guía para consolidar
  el Event Ledger al Twin: extraer hechos verificados, no fragmentos.

## Enlaces

- Abs: https://arxiv.org/abs/2604.11563 · PDF: https://arxiv.org/pdf/2604.11563
