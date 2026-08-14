---
type: paper
area: aprendizaje
fase: F7
arxiv_id: "2305.16291"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Voyager: An Open-Ended Embodied Agent with Large Language Models

**Autores:** Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, Anima Anandkumar
**arXiv:** [2305.16291](https://arxiv.org/abs/2305.16291) · PDF: https://arxiv.org/pdf/2305.16291

## Resumen

El primer agente LLM de **aprendizaje permanente** (lifelong learning) en
Minecraft que explora, adquiere habilidades y descubre sin intervención humana.
Tres componentes: (1) un **curriculum automático** que maximiza la exploración,
(2) una **skill library en crecimiento continuo** de código ejecutable (la
memoria procedimental), y (3) un **mecanismo de prompting iterativo** que
incorpora feedback del entorno, errores de ejecución y auto-verificación para
mejorar el programa. Obtiene 3.3x más items únicos, viaja 2.3x más y desbloquea
el tech tree hasta 15.3x más rápido. Las skills son **temporales, interpretables
y componibles**, y generalizan a mundos nuevos.

## Por qué importa para Sigma

- Es el **patrón canónico de Trace2Skill / la Meta-fábrica** (arquitectura §1.3):
  la skill library de Voyager es la versión embodied de nuestro catálogo
  `agent/skill-library/`; el "prompting iterativo con feedback y auto-verificación"
  es nuestra fábrica que compila trazas en skills versionadas.
- La propiedad de que las skills son **componibles y generalizables** es
  exactamente el objetivo del ERP Kernel universal + overlays por tenant
  (context-stack): una skill escrita en joyarock debe generalizar a otro tenant.
- El curriculum automático es el precedente del watchdog (ADR-008): el agente
  decide QUÉ explorar/observar, no solo responde.

## Takeaways accionables

- Para F7 (Pattern Engine cross-client): el ciclo de Voyager
  (explorar → skill → nueva habilidad → generalizar) es la plantilla del
  aprendizaje entre implementaciones de la consultora.
- Para la meta-fábrica: formalizar que un skill "verificado" debe demostrar
  generalización (probarlo en >1 tenant o documentar su alcance) — consistente
  con la regla ontológica ("nunca conviertas una observación local en
  conocimiento universal sin validación").

## Enlaces

- Abs: https://arxiv.org/abs/2305.16291 · PDF: https://arxiv.org/pdf/2305.16291
