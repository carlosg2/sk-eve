---
type: paper
area: multi-agente
fase: F4
arxiv_id: "2503.13657"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Why Do Multi-Agent LLM Systems Fail?

**Autores:** Mert Cemri, Melissa Z. Pan, Shuyi Yang, Lakshya A. Agrawal, Bhavya Chopra, Rishabh Tiwari, Kurt Keutzer, Aditya Parameswaran, Dan Klein, Kannan Ramchandran, Matei Zaharia, Joseph E. Gonzalez, Ion Stoica
**arXiv:** [2503.13657](https://arxiv.org/abs/2503.13657) · PDF: https://arxiv.org/pdf/2503.13657

## Resumen

A pesar del entusiasmo por los sistemas multi-agente (MAS), sus ganancias en
benchmarks populares son a menudo mínimas. Introducen **MAST-Data** (1600+ trazas
anotadas de 7 frameworks MAS) y la **MAST** (Multi-Agent System Failure
Taxonomy): 14 modos de fallo en 3 categorías — (i) **problemas de diseño de
sistema**, (ii) **desalineación entre agentes**, (iii) **verificación de
tareas** — con kappa de 0.88 entre anotadores y una pipeline LLM-as-judge.
Analizan los patrones de fallo por modelo y tarea, mostrando headroom de mejora
por mejor diseño de MAS.

## Por qué importa para Sigma

- Es el **checklist anti-fracaso del enjambre gobernado** (tesis §3.2, ADR-011):
  antes de lanzar agentes pares con contrato, hay que diseñar contra los 14
  modos de fallo.
- La categoría "desalineación entre agentes" valida la decisión de contratos
  Task/Message/Artifact (vocabulario A2A): la alineación se resuelve con
  contratos explícitos, no con chat libre entre agentes.
- "Verificación de tareas" conecta con la lección del repo (2026-07-30): no
  delegar joins tabulares grandes a un subagente que alucina — la verificación
  debe ser determinista (vista/tool server-side).
- La lección "el multi-agente es un impuesto que se paga solo donde rinde"
  (regla <128K de la tesis) es la conclusión práctica de MAST.

## Takeaways accionables

- Antes de F4, convertir los 14 modos de fallo de MAST en **criterios de diseño y
  evals**: ej. "¿el orquestador verifica el artefacto del subagente?",
  "¿los contratos definen el formato de salida?".
- Registrar en el diseño de misiones el caso "agente único si cabe en <128K"
  como decisión explícita (la tesis ya lo pide).
- Usar MAST-Data como corpus de referencia para nuestro evaluador de calidad
  cuando haya subagentes espejados (nuestra radiografía ya espeja subagentes).

## Enlaces

- Abs: https://arxiv.org/abs/2503.13657 · PDF: https://arxiv.org/pdf/2503.13657
