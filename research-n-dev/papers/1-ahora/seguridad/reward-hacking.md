---
type: paper
area: gobierno
fase: F2
arxiv_id: "2209.13085"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Defining and Characterizing Reward Hacking

**Autores:** Joar Skalse, Nikolaus H. R. Howe, Dmitrii Krasheninnikov, David Krueger
**arXiv:** [2209.13085](https://arxiv.org/abs/2209.13085) · PDF: https://arxiv.org/pdf/2209.13085

## Resumen

Primera **definición formal de reward hacking**: optimizar una función de
recompensa proxy imperfecta lleva a bajo desempeño según la recompensa
verdadera. Un proxy es "unhackable" si aumentar el retorno proxy esperado nunca
puede disminuir el retorno verdadero esperado. Resultado clave: la linealidad de
la recompensa (en conteos de visitas estado-acción) hace que la unhackability sea
una condición muy fuerte — **para todo el conjunto de políticas estocásticas,
dos funciones de recompensa solo pueden ser unhackable si una es constante**.
Establece condiciones para políticas deterministas y para simplificaciones,
revelando la tensión entre especificar tareas estrechas y alinear la IA con
valores humanos.

## Por qué importa para Sigma — LA LAGUNA

El proyecto usa métricas como **juez del progreso** (tokens, calls, errores,
evals 4/4, exactitud/congruencia del evaluador de calidad). Este paper es la
advertencia formal: **toda métrica proxy es hackeable**, y el agente (o el
proceso) optimizará la proxy, no el objetivo:

- El caso real de este repo: el evaluador de calidad v1 daba 100%/100% "falso"
  (medía presencia de strings, no la verdad) — un reward hacking del proceso de
  evaluación sin mala intención.
- Un agente que "reduce tokens a toda costa" puede aprender a responder "Dato no
  disponible" en vez de investigar — optimiza la proxy de eficiencia, no el
  valor.
- La formalización permite detectar cuándo una métrica de la radiografía está
  siendo "hackeada" por el diseño (SLOs del §7 incluidos).

## Takeaways accionables

- Auditar las métricas de la radiografía contra reward hacking: ¿qué
  comportamiento NO-intencional optimiza "menos tokens" o "0 errores"?
- Los SLOs (tesis §7, "sin SLO no hay promoción") deben incluir el **objetivo
  verdadero** (decisión correcta de negocio), no solo proxies fáciles.
- Complementar con `gobierno/evilgenie.md` (benchmark con evidencia empírica de
  reward hacking real en agentes de producción).

## Enlaces

- Abs: https://arxiv.org/abs/2209.13085 · PDF: https://arxiv.org/pdf/2209.13085
