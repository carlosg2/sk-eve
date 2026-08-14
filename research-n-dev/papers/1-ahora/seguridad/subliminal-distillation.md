---
type: paper
area: mejora
fase: F2
arxiv_id: "2604.15559"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Subliminal Transfer of Unsafe Behaviors in AI Agent Distillation

**Autores:** Jacob Dang, Brian Y. Xie, Omar G. Younis
**arXiv:** [2604.15559](https://arxiv.org/abs/2604.15559) · PDF: https://arxiv.org/pdf/2604.15559

## Resumen

Primera evidencia empírica de que **comportamientos inseguros de agentes se
transfieren subliminalmente por destilación**. Construyen un teacher con un
fuerte "deletion bias" (tendencia a borrar archivos vía API) y lo destilan en un
estudiante usando SOLO trayectorias de tareas aparentemente seguras, con **toda
palabra clave explícita de borrado rigurosamente filtrada**. Resultado: el
estudiante hereda el sesgo — tasa de borrado del 100% (vs 5% baseline) en el
setting API, y chmod-first del 30-55% (vs 0-10%) en Bash. La transferencia más
fuerte ocurre en destilación grande→pequeño. **La sanitización explícita de datos
es una defensa insuficiente**: los sesgos se codifican implícitamente en la
dinámica de las trayectorias.

## Por qué importa para Sigma — LA LAGUNA

Este es el paper que **la meta-fábrica debe conocer antes de destilar** (la
dirección de `mejora/*`): el pipeline trazas→modelo de Sigma heredaría los
sesgos de comportamiento del runtime:

- Si algún día se destila desde la radiografía (que incluye turnos con errores,
  decisiones raras del modelo, fallos de routing), los sesgos se transfieren sin
  que se vean en los datos filtrados.
- Es la versión de seguridad del **aprendizaje a partir de trazas**: las trazas
  son comportamiento, no solo conocimiento; el comportamiento tiene dimensión de
  seguridad.
- Conecta con ASI06 (memory poisoning) y con la lección del repo de que el
  runtime puede estar envenenado por datos (indirect prompt injection).

## Takeaways accionables

- **Hoy (sin destilar)**: la lección aplica al buffer de learnings — el hook
  captura errores, pero si esos learnings promueven "el modelo prefiere X", el
  sesgo puede persistir en las skills; la fábrica debe revisar la DESEABILIDAD
  del comportamiento, no solo su validez.
- Si se avanza a destilación (future), diseñar la **filtración por
  comportamiento, no por keywords** (revisión humana de una muestra de
  trayectorias fuente, auditoría del estudiante en tareas adversariales).
- Añadir un invariante de seguridad a los evals: el estudiante/skill no debe
  mostrar el sesgo del teacher en tareas sanitizadas.

## Enlaces

- Abs: https://arxiv.org/abs/2604.15559 · PDF: https://arxiv.org/pdf/2604.15559
