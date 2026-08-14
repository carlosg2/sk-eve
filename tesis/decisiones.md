# Sigma AGI — Registro de decisiones arquitectónicas (ADR)

Decisiones de diseño con su contexto y justificación. Cada decisión es inmutable una vez tomada; si cambia, se añade una nueva que la supersede (no se edita la anterior). Complementa [`tesis.md`](./tesis.md).

> **Formato:** Cada decisión tiene estado (Aceptada / Supersedida), contexto, decisión y consecuencias. El objetivo es que nadie reabra una discusión ya cerrada sin entender por qué se cerró.

---

## ADR-001 — Eve es el runtime único de durabilidad. No construimos un DSL+runner+WDK propio.

**Estado:** Aceptada (2026-06-23)

### Contexto
Exploraciones previas (proyecto flujo.ai) propusieron construir:
- Un **DSL YAML propio** para flujos empresariales (steps, parallel, transaction, wait.human, compensation).
- Un **runner** que interpreta ese YAML.
- **Vercel Workflow DevKit (WDK)** como capa de durabilidad (`"use workflow"` / `"use step"`, hooks para HITL).

En paralelo, el proyecto ya adoptó **Eve** como framework de agentes. Eve **ya provee** durabilidad por pasos, reanudación tras crash/redeploy, `schedules` (cron), HITL via `needsApproval`/hooks, subagents y evals.

### Problema
Construir DSL + runner + WDK encima de Eve significa **dos motores de durabilidad y orquestación compitiendo**. Es exactamente el tipo de sobre-ingeniería que volvió complejo y se abandonó el proyecto anterior (Sigma Intelisis). Mantener dos capas de ejecución duplica estado, observabilidad, idempotencia y modos de fallo.

### Decisión
**Eve es el único runtime de ejecución y durabilidad.** No se construye un runner propio ni se integra WDK como capa paralela.

- Loops → `agent/schedules/` de Eve.
- Pasos durables, retries, reanudación → primitivas de Eve.
- HITL / aprobaciones → `needsApproval` + hooks de Eve.
- Orquestación multi-paso → subagents + `Workflow` (experimental) de Eve.

### Qué SÍ se rescata de flujo.ai
1. **La idea del flujo declarativo versionable** como *capa de autoría*, no de ejecución. Si una UI permite al usuario componer misiones/loops, ese artefacto declarativo **compila a subagents/schedules de Eve** — no se ejecuta en un runner paralelo.
2. **Los patrones concretos de flujos ERP** (oro como contenido de skills/loops): 3-way match (OC vs Recepción vs Factura), compensación/rollback, tolerancias de monto/cantidad, `dry_run`, idempotency keys, aprobaciones escalonadas por monto/rol.

### Consecuencias
- (+) Una sola fuente de verdad de ejecución; menos superficie de bug.
- (+) Aprovechamos durabilidad, evals y HITL ya probados de Eve.
- (+) Evitamos el patrón de sobre-ingeniería que hundió el proyecto previo.
- (−) Quedamos acoplados a las capacidades de Eve; si Eve no soporta algo, se resuelve dentro de su modelo (tools/subagents), no con un motor paralelo.
- (−) Un eventual DSL de autoría requiere un compilador DSL→Eve, no un intérprete propio.

---

## ADR-002 — El Company Twin vive fuera del runtime (store externo), no en `defineState`.

**Estado:** Aceptada (2026-06-23)

### Contexto
El Company Twin es el activo estratégico: memoria persistente por empresa que debe sobrevivir entre corridas, sesiones y usuarios. Borradores previos lo trataron como memoria del agente.

### Problema
`defineState` de Eve es **memoria de sesión**: muere con la corrida. La propia doc de Eve indica que todo lo que deba sobrevivir entre sesiones o ser consultado independientemente pertenece a un **store externo**.

### Decisión
- **Company Twin / ERP Kernel / Process Graph (capas 1–4 del context stack)** → store externo.
- **Runtime/Situation context (capa 5)** → `defineState`.
- **Por ahora:** el store externo es **file system hardcodeado** (`company-twin/` con markdown/YAML). Migra a DB (Postgres) cuando un eval demuestre que el file system no alcanza.

### Consecuencias
- (+) El activo es consultable, versionable y auditable independiente del modelo.
- (+) Simplicidad inicial: empezamos con archivos, no con DB.
- (−) Al migrar a DB cambia el adaptador de lectura (pero no la arquitectura de loops ni overlays).

---

## ADR-003 — Todo loop nace en Shadow. La escritura se gana con evals.

**Estado:** Aceptada (2026-06-23)

### Contexto
Los loops persistentes pueden, en teoría, escribir al ERP sin supervisión. Eso es lo más peligroso de construir.

### Decisión
Todo loop arranca en **L0/L1** (observe/recommend, sin `act` al ERP). Solo sube en el ladder de autonomía (L0→L4) cuando su suite de **evals** lo respalda de forma consistente. Los evals con `.gate()` son el mecanismo técnico de promoción.

### Consecuencias
- (+) Riesgo controlado; confianza construida con evidencia.
- (+) Alineado con el GTM (shadow primero) de [`mercado.md`](./mercado.md).
- (−) Más lento llegar a escritura autónoma — intencional.

---

## ADR-004 — Adoptamos conceptos del context stack, no su implementación pesada.

**Estado:** Aceptada (2026-06-23)

### Contexto
La fuente del context stack (ver [`context-stack.md`](./context-stack.md)) proponía neo4j, múltiples microservicios y YAML masivo.

### Decisión
Se adoptan los **conceptos** (5 capas, regla ontológica, jerarquía de autoridad, overlays), pero la **implementación** arranca como carpetas de markdown/YAML en file system, en shadow, con evals. Bases de datos y servicios solo cuando un eval lo justifique.

### Consecuencias
- (+) Evita la "sopa de infraestructura" que hundió el proyecto previo.
- (+) Itera rápido sobre archivos versionados en git.
- (−) Algunas capacidades (consultas cross-client complejas) esperan a la fase de DB.

---

## ADR-005 — Dynamic surface generation es north-star, no MVP.

**Estado:** Aceptada (2026-06-24)

### Contexto
La visión de "apps son temporales" (ver [`tesis.md`](./tesis.md) §10bis) propone que Sigma detecte un gap → genere una mini-app/dashboard/flujo → la inserte en el flujo → la app desaparezca cuando el problema se va. Es un diferenciador de categoría (Enterprise AGI Infrastructure vs Company Brain).

### Problema
Generar superficies dinámicas completas es enormemente ambicioso y es **el primo de flujo.ai+WDK** ya descartado en ADR-001. Perseguirlo temprano reintroduce el riesgo de sobre-ingeniería que hundió el proyecto previo. Pero ignorarlo pierde el norte estratégico.

### Decisión
**Dynamic surface generation se mantiene como north-star explícito (fase 5+), no como objetivo del MVP.**
- Se documenta en la visión para preservar la dirección.
- **No** se construye hasta que: (a) los loops en shadow funcionen con evals, y (b) la plataforma de composición de misiones (`defineDynamic`) esté probada.
- Técnicamente se apoyará en `defineDynamic` de Eve (resolver superficies/capacidades en runtime), no en un generador de UI propio paralelo.

### Consecuencias
- (+) Preserva el diferenciador de categoría sin comprometer la disciplina del MVP.
- (+) Coherente con ADR-001 (un solo runtime) y ADR-004 (conceptos, no implementación pesada).
- (−) La promesa más vistosa (apps que se autogeneran) no se demuestra hasta fases tardías — intencional.

---

## ADR-006 — Adoptamos OKF v0.2 en el Company Twin y el ERP Kernel.

**Estado:** Aceptada (2026-08-05)

### Contexto
La spec OKF subió a **v0.2** (GoogleCloudPlatform/knowledge-catalog, commit 3fcbb9f,
~2026-07). Introduce dos breaking changes con fallback explícito (`timestamp` →
`generated: { by, at }`; body `# Citations` → frontmatter `sources`) y familias aditivas de
provenance/trust/lifecycle (`verified`, `status`, `stale_after`, `usage_window`) más el tipo
`Attested Computation` (cómputo sancionado con `runtime`/`parameters`/`executor`/`attester`).

### Decisión
- El Company Twin y el ERP Kernel declaran `okf_version: "0.2"` (index raíz).
- Migración de metadata legacy: `timestamp` → `generated` con actor `copilot/sigma-meta-fabrica`
  en los 38 conceptos que lo usaban; `# Citations` → `sources` en los 3 conceptos que lo usaban.
- El consumidor runtime (`agent/tools/query_company_twin.ts`) expone `status`/`stale`/`trust`
  derivados de `verified` — el agente prefiere conceptos no-stale y human-reviewed.
- `Attested Computation` se adopta como mecanismo de Governance para cómputos sancionados
  (primer caso: `spPlanArt` en `erp-kernel/sp-planart.md`).

### Consecuencias
- (+) Provenance/trust/freshness son metadata legible: la separación Fábrica/Runtime de la
  constitución se expresa como trust tiers (`human:` ⇒ human-reviewed).
- (+) El gate de Governance del `act` ("¿este número se produjo como se dijo?") tiene
  representación formal (attestation).
- (−) Los parsers planos deben tolerar YAML anidado (flow mappings, secuencias de mappings).
  OKF §11 exige no rechazar claves desconocidas; los consumidores que necesiten las familias
  nuevas las parsean explícitamente.
- v0.1 sigue siendo consumible por consumidores v0.2 (fallbacks de la spec §13).

---

## ADR-007 — El runtime se llama Eve en toda la documentación. "Harness" queda descartado.

**Estado:** Aceptada (2026-08-10)

### Contexto
`tesis/tesis-7ago.md` renombró "Eve" → "Harness" (13 reemplazos) sin base en el
código. La evidencia es unánime: el paquete instalado es `eve` (`node_modules/eve`,
imports `from "eve"`, `eve/hooks`, `eve/skills`), ADR-001 dice "Eve es el runtime
único" y la constitución §1 lo llama "Eve (agent framework)". El término "Harness"
solo existe en un archivo huérfano que ningún documento referencia.

### Decisión
**El runtime se llama `Eve` en toda la documentación del proyecto.** "Harness" queda
descartado como nombre del framework. Cualquier documento futuro que use otro nombre
es un error de la fábrica y debe corregirse. Consecuencia inmediata: se elimina
`tesis/tesis-7ago.md` (duplicado con rename a medias; el canónico es `tesis.md`).

### Consecuencias
- (+) Un solo nombre para el framework en docs, código y ADRs.
- (+) Se elimina el archivo huérfano que confundía el linaje documental.
- (−) Ninguna (es un rename documental; el código nunca usó "Harness").

---

## ADR-008 — El loop v2 es watchdog determinista + tarea durable + LLM bajo demanda. No "cron + LLM cada tick".

**Estado:** Aceptada (2026-08-10)

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

**Estado:** Aceptada (2026-08-10)

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

**Estado:** Aceptada (2026-08-10)

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

**Estado:** Aceptada (2026-08-10)

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

**Estado:** Aceptada (2026-08-10)

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

## ADR-013 — La causalidad es conocimiento atestiguado (CARE); el LLM no la descubre en datos crudos.

**Estado:** Aceptada (2026-08-13)

### Contexto
La visión "coordinación computable" (ventas→descuentos→margen→liquidez) y el
Process Graph del TKG modelan cadenas causales del negocio, y la tesis v1 daba
por hecho que el LLM participa de esa inteligencia. La evidencia (CARE,
arXiv:2511.16016) muestra lo contrario: los LLM **no hacen causal discovery** —
se apoyan en el significado de los **nombres de campos** e ignoran los datos
observacionales; incluso promptearlos con salidas de algoritmos clásicos los
**degrada**. El patrón ya ocurrió en este repo: el subagente que alucinó el join
VentaD/Venta (2026-07-30) leyendo nombres de campos. Referencia externa de
diseño: **semantica-agi/semantica** define el vocabulario causal atestiguado
(`record_decision()` + `add_causal_relationship(CAUSED | INFLUENCED |
PRECEDENT_FOR)` + `trace_decision_chain()`, con provenance W3C PROV-O) — las
relaciones causales **se registran**, no se descubren (ver
`research-n-dev/VEREDICTO-HERRAMIENTAS-2026-08-13.md` §2).

### Decisión
La causalidad ("qué causa qué" del Process Graph y de la coordinación
computable) **solo puede venir de algoritmos deterministas de discovery o de
reglas verificadas/atestiguadas** — modeladas como `Attested Computation` (OKF,
primer caso: `spPlanArt` en `erp-kernel/sp-planart.md`). El LLM **presenta e
interpreta**; **nunca descubre causalidad en datos crudos ni la infiere de
nombres de campos**. Sin fuente atestiguada, ante un "¿por qué?", el agente
describe la correlación observada o responde que el dato no está disponible.

### Consecuencias
- (+) El Process Graph y el Company Twin nacen libres de causalidad ficticia
  (caro de des-aprender si se contamina).
- (+) Las relaciones causales quedan con provenance (quién/cómo las registró),
  auditable y coherente con PROV-O si un cliente lo pide.
- (−) La coordinación computable queda acotada a lo atestiguado hasta que se
  instrumenten algoritmos deterministas de discovery.
- (−) El agente no responde "por qué" causal sin fuente: responde correlación o
  "dato no disponible".
- Implementación: ley en `tesis/constitucion.md` (§2), directiva en
  `agent/instructions.md` y gate `evals/causalidad-atestiguada.eval.ts`.

---

## Decisiones pendientes (por resolver)

| # | Pregunta abierta | Bloquea |
|---|---|---|
| P-1 | ¿Esquema mínimo de "mission spec" que la UI emite y compila a Eve? | Plataforma de composición de agentes |
| P-2 | ~~¿File system → qué DB exactamente (Postgres/pgvector)? ¿Cuándo?~~ — **Respondida por ADR-010** (trigger medible; DB concreta se elige al cruzar el trigger) | ~~Escala del Company Twin~~ |
| P-3 | ¿El Pattern Engine cross-client ([`inteligencia-consultora.md`](./inteligencia-consultora.md)) es producto aparte o módulo? | Scope del roadmap |
| P-4 | ¿Primer loop concreto: financiero nocturno (CXP) confirmado como MVP? | Inicio de construcción (F1) |
| P-5 | Camino a producción: ¿Vercel (Workflow hosted + DB gestionada) o self-host (workflow world montado + Postgres)? Ver [`produccion.md`](./produccion.md). | Despliegue real |

---

*Registro de decisiones — iniciado 2026-06-23. Append-only: las decisiones no se editan, se superseden.*
