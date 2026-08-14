---
type: paper
area: gobierno
fase: F2
arxiv_id: "2212.08073"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Constitutional AI: Harmlessness from AI Feedback

**Autores:** Yuntao Bai, Saurav Kadavath, Sandipan Kundu, Amanda Askell, Jackson Kernion, Andy Jones, Anna Chen, Anna Goldie, Azalia Mirhoseini, et al. (Anthropic)
**arXiv:** [2212.08073](https://arxiv.org/abs/2212.08073) · PDF: https://arxiv.org/pdf/2212.08073

## Resumen

Método para entrenar un asistente inofensivo **sin labels humanos de salidas
dañinas**: la única supervisión humana es una **lista de reglas/principios**
(la "constitución"). Proceso en dos fases: (1) supervisada — el modelo genera
auto-críticas y revisiones sobre sus propias respuestas y se fine-tunea sobre las
revisadas; (2) RL — usa un modelo para juzgar qué respuesta es mejor (RLAIF) y
entrena con RL usando ese juicio como recompensa. Permite controlar el
comportamiento con muchas menos labels humanas y con CoT para transparencia.

## Por qué importa para Sigma — LA LAGUNA

Sigma tiene una **constitución** (`tesis/constitucion.md`) y una jerarquía de
autoridad, pero **no hay base formal de cómo se entrena/gobierna el
comportamiento del agente con principios**. Constitutional AI aporta:

- El concepto de **entrenar con principios en vez de labels**: la jerarquía de
  instrucciones (system > datos recuperados) es una "constitución" en runtime; la
  versión de entrenamiento sería RLAIF con los principios de la constitución
  Sigma (governance, no-duplicación, jerarquía de autoridad).
- La **auto-crítica y revisión** es exactamente el mecanismo de la meta-fábrica:
  el agente critica su propia salida contra los principios y la fábrica revisa.
- Da el vocabulario para que "constitución" pase de metáfora a mecanismo
  (RLAIF, principios como reward).

## Takeaways accionables

- En F2, la **jerarquía de instrucciones** (control barato, pendiente según
  tesis §4.2) es el primer paso; Constitutional AI muestra el camino completo si
  algún día se entrena el modelo con los principios.
- El evaluador de calidad puede usar los principios de la constitución como
  **checklist de auto-crítica** (el modelo explica por qué su respuesta respeta
  la jerarquía de autoridad) — es una forma de eval cualitativo además de los
  invariantes numéricos.
- La separación Fábrica/Runtime se lee en este marco: la fábrica es quien
  "escribe la constitución"; el runtime la obedece.

## Enlaces

- Abs: https://arxiv.org/abs/2212.08073 · PDF: https://arxiv.org/pdf/2212.08073
