---
type: paper
area: forecasting
fase: F3
arxiv_id: "2404.04070"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Hierarchical Neural Additive Models for Interpretable Demand Forecasts (HNAM)

**Autores:** Leif Feddersen, Catherine Cleophas
**arXiv:** [2404.04070](https://arxiv.org/abs/2404.04070) · PDF: https://arxiv.org/pdf/2404.04070

## Resumen

Los forecast de demanda basan decisiones de negocio (inventario, planeación),
pero el ML gana exactitud a costa de **interpretabilidad y aceptación**. HNAM
extiende los Neural Additive Models (NAM) para series temporales: un modelo
aditivo con componente de nivel y de **covariables interactuando solo según una
jerarquía especificada por el usuario** (el efecto del día festivo depende del
día de semana; la promoción depende de ambos). Resultado: rendimiento competitivo
con explicaciones plausibles — el analista ve la contribución de cada covariable.
Evaluado en datos reales de retail.

## Por qué importa para Sigma — LA LAGUNA

Si Sigma va a involucrarse en forecasting (ver `chronos.md`), el negocio exige
**explicabilidad**: un Director de Compras no acepta "el modelo predice 100t de
frijol" sin saber por qué. HNAM es el patrón para forecast interpretable:

- La **jerarquía de interacciones de covariables** (festivo→semana→promoción) es
  la versión estadística del context stack: qué efecto depende de qué.
- La distinción exactitud-vs-interpretabilidad es la misma tensión que la tesis
  resuelve con evals + radiografía: el negocio necesita la evidencia, no solo el
  número.

## Takeaways accionables

- Si algún día el agente genera o explica forecasts, usar el patrón aditivo
  jerárquico para que la explicación sea "la semana 31 sube por festivo +30% y
  por promoción +15%" en vez de una caja negra.
- La aceptación del negocio (mercado.md §3.2, "probar con evidencia") depende de
  esta interpretabilidad — es un criterio de diseño, no un extra.

## Enlaces

- Abs: https://arxiv.org/abs/2404.04070 · PDF: https://arxiv.org/pdf/2404.04070
