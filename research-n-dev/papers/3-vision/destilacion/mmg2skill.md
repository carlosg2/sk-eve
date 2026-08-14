---
type: paper
area: mejora
fase: meta-fabrica
arxiv_id: "2606.01993"
citado_en_tesis: false
verificado: "2026-08-13"
---

# MMG2Skill: Can Agents Distill In-the-Wild Guides into Self-Evolving Skills?

**Autores:** Xinyu Che, Junqi Xiong, Yunfei Ge, Xinping Lei, Shihao Li, Hang Yan, Han Li, Yuanxing Zhang, Zhiqi Bai, Jinhua Hao, Ming Sun, Han Li, Jiaheng Liu
**arXiv:** [2606.01993](https://arxiv.org/abs/2606.01993) · PDF: https://arxiv.org/pdf/2606.01993

## Resumen

El conocimiento procedural de la Web (guías) tiene potencial para agentes de
larga duración, pero es multimodal, ruidoso y asume ejecutores humanos.
Formaliza el problema **guide-to-skill learning**: convertir guías del mundo
real en skills ejecutables y **mejorarlas continuamente desde trayectorias
observables**. Introduce MMG2Skill-Bench (primer benchmark del problema) y
**MMG2Skill**: un framework de ciclo cerrado que (1) compila guías en skills
editables, (2) condiciona un agente VLM fijo sobre esas skills durante la
ejecución, y (3) **revisa las skills desde feedback de causa raíz a nivel de
trayectoria**. Gana +12.8 a +25.3 puntos en seis backbones; promptear con las
guías crudas degrada; la construcción estructurada + revisión por trayectoria son
necesarias.

## Por qué importa para Sigma — LA LAGUNA

Es la **formalización académica de Trace2Skill** (la 3ª abstracción de la
arquitectura) con evidencia de por qué funciona:

- El hallazgo "**promptear con las guías crudas degrada**" valida la decisión de
  Sigma de NO meter las wikis/documentación Intelisis crudas al prompt, sino
  compilarlas en skills curados (el ERP Kernel + skills).
- El ciclo cerrado **compilar → ejecutar → revisar desde trayectorias** es
  exactamente el loop fábrica→runtime→radiografía→promote-learnings: la fábrica
  revisa el skill cuando la trayectoria muestra fallos (el "feedback de causa
  raíz").
- El benchmark MMG2Skill-Bench es una referencia si se quiere medir la calidad de
  compilación de las skills del catálogo.

## Takeaways accionables

- El skill de fábrica `promote-learnings` ya implementa el "revisar desde
  trayectorias" — este paper confirma que la **revisión por causa raíz** (no solo
  por métricas) es lo que hace que las skills mejoren; formalizar ese paso en la
  fábrica.
- Para el catálogo de skills: tratar cada SKILL.md como un artefacto de
  "guide-to-skill" — las guías son los docs de negocio de Dani/el twin; el skill
  es la compilación ejecutable; la revisión viene de la radiografía.
- La "early stopping por éxito inferible" (ahorrar 25-53% de intentos) conecta
  con el watchdog: no gastar en lo que ya está resuelto.

## Enlaces

- Abs: https://arxiv.org/abs/2606.01993 · PDF: https://arxiv.org/pdf/2606.01993
