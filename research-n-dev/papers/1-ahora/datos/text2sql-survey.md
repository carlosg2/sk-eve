---
type: paper
area: datos
fase: F3
arxiv_id: "2407.15186"
citado_en_tesis: false
verificado: "2026-08-13"
---

# A Survey on Employing Large Language Models for Text-to-SQL Tasks

**Autores:** Liang Shi, Zhengju Tang, Nan Zhang, Xiaotong Zhang, Zhi Yang
**arXiv:** [2407.15186](https://arxiv.org/abs/2407.15186) · PDF: https://arxiv.org/pdf/2407.15186
**ACM Computing Surveys (CSUR).**

## Resumen

Revisión comprehensiva de Text2SQL basado en LLM: enumera benchmarks y métricas
clásicas, y para los dos métodos mainstream — **prompt engineering y
fine-tuning** — introduce una taxonomía completa con insights prácticos por
subcategoría. Analiza modelos sobre datasets conocidos, extrae características y
discute retos y direcciones futuras. Es el survey de referencia de la literatura
NL2SQL.

## Por qué importa para Sigma — LA LAGUNA

Sigma opera el ERP traduciendo preguntas de negocio a **consultas OData sobre
DAB** — funcionalmente es text-to-SQL con un dialecto distinto. **Nadie en el
proyecto ha leído la literatura NL2SQL**, que lleva años resolviendo exactamente
nuestros problemas:

- **Schema linking** (cómo sabe el modelo qué tablas/campos existen): nuestro
  Company Twin y object-description del dab-config son schema linking manual.
- **Prompt engineering vs fine-tuning**: nuestra meta-fábrica decide hoy entre
  escribir skills (prompt) o, algún día, destilar/fine-tunear un modelo — este
  survey es el mapa de esa decisión.
- Los **agentes** como categoría de método (decomposición, reflexión,
  verificación) son lo que ya hacemos.

## Takeaways accionables

- Leer la taxonomía de métodos antes de decidir "¿mejoro el skill o el modelo?": 
  el survey da las condiciones en las que cada uno gana.
- El **error de feedback/verificación de SQL** (ejecutar la consulta y validar
  contra el resultado) es la práctica estándar que ya aplicamos con probes MCP —
  el survey la fundamenta.
- Para los evals de calidad del agente ERP, los benchmarks NL2SQL (BIRD, Spider)
  y sus métricas de exactitud de ejecución son la referencia para un futuro
  benchmark propio del dominio Intelisis.

## Enlaces

- Abs: https://arxiv.org/abs/2407.15186 · PDF: https://arxiv.org/pdf/2407.15186
