# Tesis Sigma AGI — v2 · ESQUELETO DE TRABAJO (borrador en construcción)

> ⚠️ ARCHIVO DE TRABAJO — no es la tesis v2 final. Se redacta con los informes de
> investigación de la frontera 2026 (memoria de agentes, multi-agente/seguridad,
> context engineering/producción/proyecciones). Después de la revisión del usuario
> se promueve a `tesis/tesis.md` (v2) y la v1 pasa a `legacy/`.

---

## Lo que se mantiene de v1 (validado por la frontera — no se toca)

1. **Company Twin como activo estratégico fuera del runtime** (memoria compartida)
2. **Context stack de 5 capas por velocidad de cambio** + regla ontológica + jerarquía de autoridad
3. **Governance como ley transversal**: ladder de autonomía L0-L4, evals como gates, HITL
4. **Separación Fábrica/Runtime** (constitución): el runtime anexa al buffer, la fábrica promueve
5. **Eval-first**: evals con probes de verdad en vivo (no substring)
6. **Vertical/domain-bounded** como categoría
7. **ADR-001**: Eve runtime único; **ADR-004**: conceptos sí, implementación pesada no

## Lo que se reescribe (obsoleto según la frontera 2026)

| Sección v1 | Problema | Dirección v2 |
|---|---|---|
| §1 Loop Engineering: `cron → observe → decide → act` cada tick | Cada tick = corrida completa de LLM; caro y ruidoso | **Loop = watchdog determinista + LLM bajo demanda** (hash de estado → despierta solo con delta) |
| §2 "El Agente" (singular) | La frontera: "la era del agente monolítico se apaga" → swarms | **"Los Agentes" (plural)**: swarm de especialistas con contratos de comunicación (Task/Message/Artifact) |
| §3 Planner determinista pre-inyección (lóbulo frontal) | Muleta de modelo débil; con modelos de razonamiento nativo → agentic search | **Agentic search**: el agente decide qué recuperar; el contexto se cura, no se pre-inyecta |
| §3.3 Company Twin como file system indefinido | "Easy to start, brutal to scale" — falta el "cuándo" medible | **Trigger medible de migración a DB** (métricas tipo BEAM: retrieval perf, concurrencia, consultas cross-tenant) |
| §4-§7 Governance (sin threat model) | La frontera: seguridad = razón #1 de fracaso en producción | **NUEVO § Seguridad de agentes**: prompt injection, RBAC, aislamiento multi-tenant, red-teaming, agent identity |
| §6 Loops de referencia | Catálogo fijo | Catálogo + **misión compuesta por usuario** (spec → runtime) |

## Lo que se AÑADE (la extrapolación hacia adelante)

### A. Memoria como capa de datos (no archivos curados)
- Event Ledger + Process Graph → **memory graph temporal** (la frontera converge ahí)
- Escritura concurrente de múltiples agentes: conflict resolution, atomic writes, versionado
- El radiografía SQLite (events/llm_inputs/turn_summaries) es la semilla del memory graph
- Benchmark para medir el "cuándo migrar" (no fechas, métricas)

### B. El Agente → Los Agentes (swarm con contratos)
- Subagentes (hijos del orquestador) → **pares con contrato** (Task/Message/Artifact, estilo A2A sin adoptar el protocolo aún)
- DRI artificiales = agentes que poseen problemas (ya en inteligencia-consultora.md)
- "Departamentos son agentes" se vuelve arquitectura, no visión

### C. Seguridad de agentes (nuevo pilar, no governance)
- Threat model del canal de chat (prompt injection → tools)
- Aislamiento por tenant (datos del cliente A nunca visibles al B)
- RBAC efectivo sobre tools MCP (hoy soft-gate)
- Red-teaming como eval (no como evento)

### D. Contexto: agentic search sobre contexto curado
- query_company_twin como herramienta de búsqueda del agente (ya existe)
- El branch `experiment/odata-sin-instrucciones` es la dirección: conocimiento al store, no al prompt
- Re-evaluar el lóbulo frontal con modelo de razonamiento moderno (¿sigue haciendo falta?)

### E. Proyección 2027-2028 (la visión "años adelante")
- Agents as services / background agents (el loop watchdog ES un background agent)
- Modelos con memoria nativa en la arquitectura → el twin se vuelve el "sistema de archivos" del modelo
- Coordinación computable (cadenas causales ventas→descuentos→margen→liquidez)
- Dynamic surfaces (ADR-005, north-star se mantiene)
- El moat: cross-client Pattern Engine (inteligencia-consultora.md)

## Documentos acoplados a actualizar
- [ ] `tesis/decisiones.md`: ADR-008 (loop watchdog), ADR-009 (seguridad de agentes), ADR-010 (migración DB medible), ADR-011 (swarm con contratos), ADR-012 (agentic search sobre planner)
- [ ] `tesis/glosario.md`: swarm, memory graph, agentic search, watchdog, agent contract
- [ ] `tesis/context-stack.md`: capa 4 → runtime compone vía agentic search; §8 nota file system → trigger medible
- [ ] `tesis/produccion.md`: sprint de seguridad antes de clientes
- [ ] `tesis/README.md`: orden de lectura v2
- [ ] `tesis/legacy/tesis-v1.md`: mover la v1 actual

## Evidencia del estado real (para §12)
- 40/40 E2E "ok" 0 errores (docs/icf/e2e-resultados-demo-2026-08-06.md) — pero cola de tokens: #30 = 430k, #13 = 287k
- Evaluaciones calidad: 2 casos, 3 corridas c/u, exactitud 1.0 congruencia 1.0 (probe MCP en vivo)
- Radiografía: 174 sesiones, 5,258 eventos, 32 turn_summaries, 642 llm_inputs, 48MB SQLite
- 19 skills en catálogo scopeado por tenant; 4 tenants; runtime.json multi-tenant
- 4 evals (schema, eficiencia, HITL, no-entity-inexistente)
- Branch `experiment/odata-sin-instrucciones`: reglas OData fuera del prompt → kernel
