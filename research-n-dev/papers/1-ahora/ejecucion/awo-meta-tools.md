---
type: paper
area: ejecucion
fase: F1
arxiv_id: "2601.22037"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Optimizing Agentic Workflows using Meta-tools (AWO)

**Autores:** Sami Abuzakuk, Anne-Marie Kermarrec, Rishi Sharma, Rasmus Moorits Veski, Martijn de Vos
**arXiv:** [2601.22037](https://arxiv.org/abs/2601.22037) · PDF: https://arxiv.org/pdf/2601.22037

## Resumen

Los workflows agentic requieren muchos pasos de razonamiento e invocaciones de
tools → costo, latencia y fallos por alucinación. **AWO (Agent Workflow
Optimization)** analiza trazas de workflows existentes, descubre **secuencias
recurrentes de tool calls** y las convierte en **meta-tools**: tools
deterministas y compuestos que agrupan varias acciones en una sola invocación,
saltándose pasos intermedios de razonamiento del LLM. Resultados: hasta 11.9%
menos llamadas LLM y +4.2 puntos de tasa de éxito.

## Por qué importa para Sigma — LA LAGUNA

Es la **formalización científica de lo que la meta-fábrica ya hace a mano**: los
skills de `agent/skill-library/` (patrones con joins manuales, multi-aggregate)
son meta-tools construidos por humanos con evidencia empírica. AWO demuestra que
esto se puede **hacer de forma automática y medible**:

- La meta-fábrica podría pasar de "compilar trazas → skill" (manual, con juicio)
  a "descubrir automáticamente secuencias repetidas en la radiografía → meta-tool".
- La métrica de éxito (menos calls, más éxito) es exactamente la que ya medimos
  en `/api/audit/turns` — el bucle de mejora del proyecto (919k→78.7k tokens)
  ES una optimización de meta-tools sin nombrarlo así.

## Takeaways accionables

- Prospectar la radiografía (`turn_summaries.tools`, `events`) con el patrón de
  AWO: buscar secuencias de 2-4 tool calls repetidas entre sesiones → candidatas
  a convertirse en un patrón de skill nuevo o un endpoint DAB dedicado (como ya
  pasó con `faltante_insumos`/`faltante_materia_prima` del backend).
- Al evaluar un skill nuevo, usar el criterio de AWO: si el modelo repite la
  misma secuencia en >N turnos, el skill no está "resolviendo" el patrón — hay
  que compilarlo más (meta-tool).
- Conecta con P-1 (mission spec): un meta-tool es la unidad atómica que una
  misión declarativa podría emitir.

## Enlaces

- Abs: https://arxiv.org/abs/2601.22037 · PDF: https://arxiv.org/pdf/2601.22037
