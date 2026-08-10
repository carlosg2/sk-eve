# Propuesta de ADRs para tesis v2 — (para revisión del usuario, aún NO en decisiones.md)

> Borrador de trabajo. Se promueve a `tesis/decisiones.md` tras la revisión del
> usuario. Formato append-only del registro existente.

---

## ADR-008 — El loop v2 es watchdog determinista + tarea durable + LLM bajo demanda. No "cron + LLM cada tick".

**Estado:** Propuesta (2026-08-10)

### Contexto
v1 definió el loop como `trigger: cron → observe → decide → act` con una corrida
de LLM por tick. Eso es caro, ruidoso y reintroduce el redescubrimiento de
contexto entre ticks. La frontera 2026 (ambient agents de LangChain, Open Agents
de Vercel) usa el patrón inverso: un observador barato y determinista que solo
despierta al LLM cuando el estado cambió.

### Decisión
- El loop se compone de: **watchdog determinista** (script/query barata, hash de
  estado), **tarea durable** (pause/resume/hibernate), **LLM bajo demanda** (solo
  con delta) y **Agent Inbox** para HITL.
- El 90-95% de los ticks son silenciosos y cuestan ~0 tokens.
- Los evals de comportamiento del loop v1 (dimensiona antes de detallar, no
  escribe, detecta los vencimientos correctos) se conservan intactos; solo cambia
  el disparador.

### Consecuencias
- (+) Loops ~100× más baratos → el primer loop en producción cuesta centavos por
  noche, no dólares.
- (+) El LLM recibe el diff exacto del estado; nunca redescubre contexto.
- (−) Requiere infraestructura de estado de tarea (el workflow durable de Eve
  sirve) y un watchdog por loop.

---

## ADR-009 — La seguridad de agentes es un pilar de la tesis, no una sección de governance.

**Estado:** Propuesta (2026-08-10)

### Contexto
McKinsey: la seguridad es la barrera #1 para escalar agentic AI. Lyzr: los
agentes mueren en security review. OWASP publicó el Top 10 Agentic 2026
(ASI01-ASI10) y Five Eyes la guía oficial (mayo 2026). v1 tenía governance
(quien puede escribir al ERP) pero cero threat model. Para ERP, el vector #1 es
**indirect prompt injection vía campos de datos** (descripciones, notas,
comentarios que entran al contexto sin validación).

### Decisión
Sigma adopta el modelo de amenazas de §4 de la tesis v2 y estos controles como
requisitos antes de clientes (F2 del roadmap):
1. Jerarquía de instrucciones: system > contenido recuperado ("los datos son
   DATOS, no instrucciones").
2. Sanitización de campos de texto libre que entran al contexto.
3. Least agency: RBAC efectivo (hard-gate por policy) sobre tools MCP — hoy es
   soft-gate.
4. Aislamiento multi-tenant total (datos del cliente A jamás en contexto del B).
5. Red-teaming como eval continuo en CI (inyección directa/indirecta,
   exfiltración, role bypass).
6. Contención asumiendo inyección exitosa (kill-switch, sandbox, rate limiting).

### Consecuencias
- (+) Cierra el único gap real frente a producción controlada.
- (+) Alineado con EU AI Act Annex III (2/8/2026) y SOX para decisiones
  financieras.
- (−) F2 agrega un sprint de seguridad antes de clientes (semanas, no meses).

---

## ADR-010 — El trigger de migración del Company Twin a DB es medible, no por fecha.

**Estado:** Propuesta (2026-08-10)

### Contexto
ADR-002/004: file system primero, DB "cuando un eval lo justifique". La frontera
(mem0, arXiv:2606.24535) muestra que la memoria compartida multi-agente es un
problema de sistemas distribuidos (4 modos de fallo) y que el vector-RAG puro
pierde ante arquitecturas híbridas. Sin un trigger definido, la migración llega
tarde y es dolorosa.

### Decisión
Se migra a DB cuando **cualquiera** de estas métricas se cruza (medidas con la
radiografía):
1. Concurrencia: >N agentes/turnos escribiendo al mismo twin en paralelo.
2. Retrieval: el índice que precarga el planner supera el presupuesto de contexto.
3. Consultas cross-tenant/cross-session que el file system no puede responder
   (ej. Pattern Engine).
4. Escritura concurrente: el merge LWW pierde hechos (contradiction persistence).

Además, la **regla ontológica de v1 se formaliza como temporal supersession**: el
hecho nuevo que contradice a uno anterior lo **inactiva** (no conviven), con
proveniencia y timestamp. Primero en file system (append + marca superseded);
migra con el trigger.

### Consecuencias
- (+) "Cuándo migrar" deja de ser una fecha y pasa a ser una condición medible.
- (+) La supersession se implementa desde ya, en file system, sin esperar la DB.
- (−) Requiere una métrica nueva en la radiografía (detección de contradicciones
  entre conceptos).

---

## ADR-011 — Los agentes son pares con contrato bajo orquestador de misión. No subagentes-hijos ni swarm libre.

**Estado:** Propuesta (2026-08-10)

### Contexto
La frontera enterró el GroupChat peer-to-peer libre (NiteAgent) y convergió en
**orquestador central + subagentes aislados** (Anthropic, OpenAI, LangChain,
AutoGen). SAP ya modela departamentos como agentes (200+ Joule Agents bajo 50+
Joule Assistants por dominio, cada uno con owner humano). Los subagentes-hijos de
v1 (Agent Cortex) eran el modelo 2025.

### Decisión
- Los agentes se comunican por **contratos** (Task / Message / Artifact —
  vocabulario A2A sin adoptar el protocolo aún).
- Cada agente tiene **contexto aislado** (anti-cascada) y devuelve **resúmenes**,
  no streams.
- El **orquestador de misión** elige la topología: agente único si cabe en <128K,
  orquestador+subagentes si hay subtareas independientes, mesh acotado (3-8) solo
  para artefacto compartido.
- **DRI humano por agente** (patrón SAP): todo agente tiene un accountable.
- **Registro de agentes** (estilo Agent Card): `{ id, capacidades, tools,
  tenant, owner, nivel }` — el inventario es el control #1 de seguridad.

### Consecuencias
- (+) Alineado con el patrón que la producción 2026 validó.
- (+) A2A se adopta sin fricción cuando haya 2+ sistemas que interoperar (los
  contratos ya son el vocabulario).
- (−) El multi-agente sigue siendo un impuesto de complejidad: se usa solo donde
  rinde (regla <128K).

---

## ADR-012 — El planner determinista se mantiene como esqueleto de curaduría; el agentic search se confina a sub-agentes.

**Estado:** Propuesta (2026-08-10)

### Contexto
Anthropic: "smarter models require less prescriptive engineering", pero la
curaduría del contexto es "el trabajo #1". Elastic: herramienta estructurada 100%
de éxito vs exploración libre. El branch `experiment/odata-sin-instrucciones` ya
va en esta dirección (conocimiento al store, no al prompt).

### Decisión
- El lóbulo frontal **no muere**: pasa de pre-inyectar cuerpos a definir
  *altitude* (qué capa aplica), guardrails (qué tools y orden) y formato.
- Las **herramientas tipadas** son la primera línea: `buscar_registro`,
  `query_company_twin`, `aggregate_records` acotado.
- La **exploración abierta** se delega a un sub-agente `explorador` con contexto
  limpio que devuelve resúmenes de 1-2K tokens.
- **Plan-and-Execute** para control de costo (~90% de ahorro, MLM).

### Consecuencias
- (+) Se conserva la eficiencia ganada (919k→78.7k tokens) sin la fragilidad del
  prompt if-else.
- (+) El experimento odata-sin-instrucciones se convierte en la norma.
- (−) Requiere un sub-agente explorador (F4) para el caso abierto.

---

*Propuesta de ADRs — 2026-08-10. Añadir a `tesis/decisiones.md` tras revisión.*
