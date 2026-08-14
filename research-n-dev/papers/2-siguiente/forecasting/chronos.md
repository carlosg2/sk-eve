---
type: paper
area: forecasting
fase: F3
arxiv_id: "2403.07815"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Chronos: Learning the Language of Time Series

**Autores:** Abdul Fatir Ansari, Lorenzo Stella, Caner Turkmen, Xiyuan Zhang, Pedro Mercado, Huibin Shen, Oleksandr Shchur, Syama Sundar Rangapuram, et al. (Amazon)
**arXiv:** [2403.07815](https://arxiv.org/abs/2403.07815) · PDF: https://arxiv.org/pdf/2403.07815

## Resumen

**Chronos** es el framework canónico de **foundation models para series
temporales**: tokeniza valores de series (escalado + cuantización) en un
vocabulario fijo y entrena arquitecturas transformer (T5, 20M-710M params) con
cross-entropy — el modelo "habla el lenguaje del tiempo". Pre-entrenado en 42
datasets públicos + datos sintéticos de procesos Gaussianos. Resultados: supera
significativamente a métodos clásicos en datasets del corpus de entrenamiento y
tiene rendimiento zero-shot comparable (a veces superior) a métodos entrenados
específicamente en cada dataset. Simplifica el pipeline de forecasting.

## Por qué importa para Sigma — LA LAGUNA

El negocio del primer cliente (ICF) gira alrededor del **módulo Forecast CF: 12
semanas de demanda por familia/artículo** (Arribos12, ForecastArtFam12,
ResumenPlaneacionCF). Hoy ese forecast lo genera el ERP con SPs propietarios —
**no existe conocimiento de la literatura de forecasting** en el proyecto:

- Chronos (y los TSFM en general) abren la pregunta: ¿el forecast del ERP es
  mejorable? ¿qué significa "el agente que analiza el forecast" cuando hay
  foundation models?
- Los TSFM podrían validar/cuestionar los números del ERP (un segundo criterio
  independiente), o servir como tool del agente para "proyectar demanda".
- La lección clave: el pronóstico del negocio es un dato de entrada del agente,
  no una salida del LLM — y hay ciencia de cómo producirlo mejor.

## Takeaways accionables

- No integrar un TSFM en el stack todavía (ADR-004: conceptos sí, pesado no),
  pero **registrar el horizonte**: si un cliente pregunta "¿qué tan bueno es tu
  forecast?", el agente debe poder comparar contra un baseline científico
  (Chronos) en vez de solo reportar el número del ERP.
- El patrón "tokenizar la serie y tratar el forecasting como language modeling"
  es la misma idea que nuestro espejo de eventos como corpus — una pista de cómo
  modelar series de negocio (ventas semanales) como datos de lenguaje.
- El zero-shot es la propiedad que importa para nuevos tenants sin historial.

## Enlaces

- Abs: https://arxiv.org/abs/2403.07815 · PDF: https://arxiv.org/pdf/2403.07815
