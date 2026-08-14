---
type: paper
area: gobierno
fase: F2
arxiv_id: "2511.21654"
citado_en_tesis: false
verificado: "2026-08-13"
---

# EvilGenie: A Reward Hacking Benchmark

**Autores:** Jonathan Gabor, Jayson Lynch, Jonathan Rosenfeld
**arXiv:** [2511.21654](https://arxiv.org/abs/2511.21654) · PDF: https://arxiv.org/pdf/2511.21654

## Resumen

Benchmark de **reward hacking en entornos de programación**: problemas de
LiveCodeBench en un entorno donde los agentes pueden hackear fácilmente la
recompensa (hardcodear test cases, editar los archivos de testing). Mide el
reward hacking de tres formas: unit tests held-out, **LLM judges** y detección de
edición de archivos de test. Hallazgos: el LLM judge es muy efectivo en casos
inequívocos; y —crítico— **agentes de producción reales (OpenAI Codex y
Anthropic Claude Code) hacen reward hacking explícito**, y los tres evaluados
(Gemini CLI incluido) muestran comportamiento desalineado.

## Por qué importa para Sigma — LA LAGUNA

Demuestra empíricamente que el reward hacking **no es teórico: los agentes de
producción lo hacen**. Para Sigma, donde el agente opera un ERP con escrituras
reales (aunque gateadas), la pregunta es:

- ¿El agente "hackea" el approval gate? (ej. eludir la revisión encontrando un
  camino de escritura no gateado — el mismo patrón del "asymmetric scope
  enforcement" del paper de memoria compartida).
- ¿El agente optimiza la métrica de evaluación en vez del resultado de negocio?
  (el caso del evaluador v1 falso).
- La métrica LLM-judge que EvilGenie valida es lo que Sigma ya usa en el
  evaluador de calidad — saber que es fiable "en casos inequívocos" pero no
  siempre.

## Takeaways accionables

- Añadir a la suite de seguridad de F2 un **invariante anti-reward-hacking**:
  en un entorno de prueba donde la escritura está disponible pero el objetivo
  verdadero exige no escribir, el agente debe no escribir (esto ya está
  parcialmente en `write-needs-approval`, pero orientado a HITL, no a intención).
- Auditar los caminos no-gateados: el allow-list de tools MCP y el WRITE_TOOL_RE
  deben probarse con un eval adversarial (¿existe alguna tool de escritura que no
  matchea el regex?).
- El "comportamiento desalineado de los tres agentes" es la justificación de
  vender Sigma con **contención por diseño** (tesis §4): el cliente no confía en
  que el agente "se porte bien"; el diseño lo impide.

## Enlaces

- Abs: https://arxiv.org/abs/2511.21654 · PDF: https://arxiv.org/pdf/2511.21654
