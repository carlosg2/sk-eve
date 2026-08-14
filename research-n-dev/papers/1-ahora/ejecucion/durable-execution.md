---
type: paper
area: ejecucion
fase: F1
arxiv_id: "2412.13314"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Distributed Speculative Execution for Resilient Cloud Applications

**Autores:** Tianyu Li, Badrish Chandramouli, Philip A. Bernstein, Samuel Madden (Microsoft)
**arXiv:** [2412.13314](https://arxiv.org/abs/2412.13314) · PDF: https://arxiv.org/pdf/2412.13314

## Resumen

Formaliza el patrón de **durable execution**: sistemas (Temporal, Azure Durable
Functions, Beldi, DBOS) que **persisten el estado de ejecución y reanudan desde
el estado persistido tras un fallo**, ocultando la complejidad de
fault-tolerance. El costo: la persistencia frecuente y síncrona añade latencia.
Propone **ejecución especulativa distribuida (DSE)**: el runtime omite
transparentemente la persistencia y repara el estado reactivamente en caso de
fallo (libDSE, basado en message-passing, bloques atómicos y threads ligeros).
Reduce la latencia hasta un orden de magnitud frente a sistemas de durable
execution actuales.

## Por qué importa para Sigma — LA LAGUNA

La tesis v2 (ADR-008, F1/F6) asume "tareas durables con pause/resume/hibernate"
(patrón Vercel Open Agents) y el plan de producción (`tesis/produccion.md`) dice
que "Vercel Workflow reemplaza `.data/eve-workflow`". **Nadie en el proyecto tiene
la base de sistemas detrás de eso.** Este paper la da:

- Durable execution NO es un feature: es un **patrón de sistemas distribuidos**
  con un costo conocido (persistencia síncrona → latencia) y una solución
  conocida (especulación + reparación).
- Nombra el estado del arte (Temporal, Azure Durable Functions, DBOS) — la
  infraestructura que Eve/Vercel usan por debajo — y su tension central
  (fiabilidad vs latencia).

## Takeaways accionables

- Para F1 (primer loop nocturno) y la decisión P-5 (Vercel vs self-host):
  entender que la durabilidad del loop no es "guardar un JSON" sino **reanudar
  desde el último paso atómico persistido**; diseñar los watchdogs como
  operaciones idempotentes que puedan re-ejecutarse sin doble efecto.
- El patrón DSE sugiere que, si el costo de persistencia duele, la alternativa es
  **ejecución especulativa + reparación** — relevante cuando los loops escaleen a
  decenas de ticks por hora.
- La lección operativa: los errores del dev-runtime de Eve (runs huérfanos,
  "Queue message failed") son fallos del sistema de durabilidad subyacente — este
  paper explica por qué existen y cómo se diseñan las colas/reanudación.

## Enlaces

- Abs: https://arxiv.org/abs/2412.13314 · PDF: https://arxiv.org/pdf/2412.13314
