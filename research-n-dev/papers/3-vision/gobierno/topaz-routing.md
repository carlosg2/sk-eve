---
type: paper
area: ejecucion
fase: meta-fabrica
arxiv_id: "2604.03527"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Explainable Model Routing for Agentic Workflows (Topaz)

**Autores:** Mika Okamoto, Ansel Kaplan Erol, Mark Riedl
**arXiv:** [2604.03527](https://arxiv.org/abs/2604.03527) · PDF: https://arxiv.org/pdf/2604.03527
**ACM CHI 2026 HCXAI Workshop (Spotlight).**

## Resumen

Los workflows agentic rutearn subtareas a distintos modelos para minimizar costo
sin sacrificar calidad, pero los routers actuales solo optimizan rendimiento y
**no registran los trade-offs costo-capacidad**: el desarrollador no puede
distinguir "eficiencia inteligente" (modelo especializado para la tarea) de
"fallos latentes por selección movida por el presupuesto". **Topaz** introduce
auditabilidad formal al routing: (i) perfiles de capacidad por skill, (ii)
algoritmos de routing trazables con optimización multi-objetivo presupuestada, y
(iii) explicaciones en lenguaje natural que permiten auditar y ajustar el
trade-off costo-calidad.

## Por qué importa para Sigma — LA LAGUNA

Sigma tiene multi-modelo (agent.md por agente, AI Gateway, DeepSeek vs modelos
de razonamiento) y una obsesión de costo, **pero sin trazabilidad del porqué se
usó cada modelo**. Topaz es el diseño para:

- Hacer auditable la selección de modelo (importante para SOX/auditoría del
  pilar de seguridad §4 y para el gobierno §7: "sin SLO no hay promoción").
- El mismo problema aplica al routing de TOOLS (no solo de modelos): cuando el
  agente elige `buscar_registro` vs `aggregate_records` vs una vista, el porqué
  no se registra — Topaz aplica igual.

## Takeaways accionables

- Añadir a la radiografía el **registro de la decisión de routing**: qué modelo
  se eligió, con qué perfil de capacidad y a qué costo — hoy `llm_inputs` guarda
  el input pero no el "porqué este modelo".
- Al diseñar el enjambre (F4), cada subagente con un modelo distinto debería
  poder justificar su selección — el "skill-based profiling" de Topaz es la
  plantilla para el registro de agentes (Agent Card, tesis §7).
- La distinción "eficiencia inteligente vs fallo por presupuesto" es un
  invariante candidato para el evaluador de calidad: un turno que degrada calidad
  por elegir el modelo barato debe marcarse como hallazgo, no como ahorro.

## Enlaces

- Abs: https://arxiv.org/abs/2604.03527 · PDF: https://arxiv.org/pdf/2604.03527
