# papers/ — Base científica de Sigma AGI (TRIAGE · ¿vale la pena?)

> **Fábrica (Copilot) · 2026-08-13.** Fusión de `papers/` (lo que la tesis ya
> sabía) + `papers2/` (las lagunas) en **una sola estructura orientada a
> decisión**. Ya no se organiza por tema: se organiza por **momento de decisión
> del roadmap** (tesis §10), y cada ficha tiene un veredicto de inversión.
>
> **Material de la fábrica** — NO va al Company Twin ni a skills. Todo verificado
> contra arXiv (2026-08-13).

---

## 0. Cómo decidir rápido (3 pasos)

1. **Abre la carpeta de TU fase actual** (`1-ahora/` hoy) y lee las fichas con
   veredicto **✅ AHORA** — son las que desbloquean decisiones inminentes.
2. Para cada paper, decide con **4 números** que ya están en el triage:
   **Veredicto · Fase · Esfuerzo de implementar · Impacto**.
3. **No leas todo**: solo el `abstract` de los ⏳/🚫; ficha completa solo para los
   ✅ que vayas a accionar.

**Leyenda de veredictos**

| Símbolo | Significado | Qué hago |
|---|---|---|
| ✅ **AHORA** | Desbloquea la fase en curso (F1/F2) | Leer completo y decidir implementación |
| ⏳ **CUANDO F-x** | Útil cuando llegues a esa fase | Leer el abstract ahora; ficha completa al entrar a la fase |
| 🚫 **ARCHIVO** | Interesante pero no justifica inversión hoy | Registrar como referencia; no invertir |

---

## 1. ✅ AHORA — desbloquea F1/F2 (leer y decidir ya)

### `1-ahora/memoria-episodica/` — F1 (memoria episódica + evals)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [mem0](1-ahora/memoria-episodica/mem0.md) | 2504.19413 | ✅ | Evolución de la P1.5: extracción/consolidación/recuperación | medio | alto |
| [memgpt](1-ahora/memoria-episodica/memgpt.md) | 2310.08560 | ✅ | Fundamentar la capa de memoria (el agente gestiona su memoria) | bajo | alto |
| [longmemeval](1-ahora/memoria-episodica/longmemeval.md) | 2410.10813 | ✅ | Evals de memoria del dominio (5 habilidades) — §8 | bajo | alto |
| [self-consistency](1-ahora/memoria-episodica/self-consistency.md) | 2203.11171 | ✅ | Mejorar el evaluador de calidad (congruencia con base teórica) | bajo | alto |
| [locomo](1-ahora/memoria-episodica/locomo.md) | 2402.17753 | ✅ | Benchmark de referencia de memoria | bajo | medio |
| [synthius-mem](1-ahora/memoria-episodica/synthius-mem.md) | 2604.11563 | ✅ | Evals de abstention ("Dato no disponible" sin inventar) | bajo | medio |

### `1-ahora/ejecucion/` — F1 + P-5 (watchdog, tareas durables, costo)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [durable-execution](1-ahora/ejecucion/durable-execution.md) | 2412.13314 | ✅ | Qué es una tarea durable de verdad (F1/P-5) | bajo | alto |
| [awo-meta-tools](1-ahora/ejecucion/awo-meta-tools.md) | 2601.22037 | ✅ | Automatizar la meta-fábrica: secuencias→meta-tools (P-1) | medio | alto |
| [frugalgpt](1-ahora/ejecucion/frugalgpt.md) | 2305.05176 | ✅ | Cascadas de modelos para el costo del runtime | medio | alto |

### `1-ahora/seguridad/` — F2 (el pilar §4)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [indirect-prompt-injection](1-ahora/seguridad/indirect-prompt-injection.md) | 2302.12173 | ✅ | Threat model ERP (vector #1) — §4 | bajo | crítico |
| [asb](1-ahora/seguridad/asb.md) | 2410.02644 | ✅ | Suite de evals de red-team en CI — §4.2/§8 | medio | alto |
| [reward-hacking](1-ahora/seguridad/reward-hacking.md) | 2209.13085 | ✅ | Auditar las métricas de la radiografía (SLOs §7) | bajo | alto |
| [evilgenie](1-ahora/seguridad/evilgenie.md) | 2511.21654 | ✅ | Evidencia: los agentes de producción hackean la métrica | bajo | medio |
| [smcp](1-ahora/seguridad/smcp.md) | 2602.01129 | ✅ | Hardenear el canal MCP/DAB (identidad, audit) | medio | alto |
| [mcp-mpma](1-ahora/seguridad/mcp-mpma.md) | 2505.11154 | ✅ | Tool poisoning vía descripciones (ASI04) | bajo | medio |
| [mcp-ecosystem](1-ahora/seguridad/mcp-ecosystem.md) | 2509.25292 | ✅ | Conciencia de infraestructura (la mitad del MCP es basura) | bajo | medio |
| [authenticated-delegation](1-ahora/seguridad/authenticated-delegation.md) | 2501.09674 | ✅ | Agent Card formal + RBAC hard-gate (F2) | medio | alto |
| [subliminal-distillation](1-ahora/seguridad/subliminal-distillation.md) | 2604.15559 | ⏳ (leer abstract ya) | Gate de riesgo ANTES de destilar desde trazas | — | alto |

### `1-ahora/fundamentos/` — ya implementados (referencia activa)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [react](1-ahora/fundamentos/react.md) | 2210.03629 | ✅ | El patrón de ejecución que ya usa Eve | bajo | medio |
| [reflexion](1-ahora/fundamentos/reflexion.md) | 2303.11366 | ✅ | El ciclo de mejora = reflexión verbal (buffer→promoción) | bajo | medio |
| [voyager](1-ahora/fundamentos/voyager.md) | 2305.16291 | ✅ | Trace2Skill / skill library eterna (meta-fábrica) | bajo | medio |
| [lost-in-the-middle](1-ahora/fundamentos/lost-in-the-middle.md) | 2307.03172 | ✅ | Validar el diseño del contexto (plan al inicio del prompt) | bajo | medio |

### `1-ahora/datos/` — el agente sobre el ERP
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [text2sql-survey](1-ahora/datos/text2sql-survey.md) | 2407.15186 | ✅ | La literatura NL2SQL aplicada a nuestro OData (schema linking) | medio | alto |
| [text2sql-rag](1-ahora/datos/text2sql-rag.md) | 2410.01066 | ⏳ CUANDO F5 | Schema linking con graph-RAG + privacidad | medio | medio |

---

## 2. ⏳ CUANDO F4/F5/F6 (leer abstract ahora; ficha completa al entrar)

### `2-siguiente/memory-graph/` — F5 (memory graph temporal)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [zep-graphiti](2-siguiente/memory-graph/zep-graphiti.md) | 2501.13956 | ⏳ F5 | TKG + temporal supersession (el corazón de F5) | alto | alto |
| [governed-shared-memory](2-siguiente/memory-graph/governed-shared-memory.md) | 2606.24535 | ⏳ F4/F5 | 4 modos de fallo de memoria compartida (ADR-010) | medio | alto |
| [raster](2-siguiente/memory-graph/raster.md) | 2406.19538 | ⏳ F5 | TKG operativo + descartar contexto stale | medio | alto |
| [graph-agent-memory-survey](2-siguiente/memory-graph/graph-agent-memory-survey.md) | 2602.05665 | ⏳ F5 | Mapa completo extracción/almacenamiento/recuperación/evolución | bajo | medio |
| [memorywire](2-siguiente/memory-graph/memorywire.md) | 2606.01138 | ⏳ F5 | Formato de memoria + governance HITL | medio | medio |
| [memory-as-ontology](2-siguiente/memory-graph/memory-as-ontology.md) | 2603.04740 | ⏳ F5 | Constitución de la memoria (gobernanza primero) | bajo | medio |
| [cranimem](2-siguiente/memory-graph/cranimem.md) | 2603.15642 | ⏳ F6 | Consolidación episódica→semántica (la fábrica automatizada) | medio | medio |
| [tempreason](2-siguiente/memory-graph/tempreason.md) | 2306.08952 | ⏳ F5 | Evals de razonamiento temporal del Twin | bajo | medio |

### `2-siguiente/multi-agente/` — F4/F6 (enjambre gobernado, Agent Inbox)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [mast](2-siguiente/multi-agente/mast.md) | 2503.13657 | ⏳ F4 | 14 modos de fallo de MAS (checklist anti-enjambre-roto) | bajo | alto |
| [intelligent-delegation](2-siguiente/multi-agente/intelligent-delegation.md) | 2602.11865 | ⏳ F6 | Diseño del Agent Inbox y la delegación con accountability | medio | alto |
| [generative-agents](2-siguiente/multi-agente/generative-agents.md) | 2304.03442 | ⏳ F4 | Memoria + reflexión + planning (base conceptual) | bajo | medio |
| [mixture-of-agents](2-siguiente/multi-agente/mixture-of-agents.md) | 2406.04692 | 🚫 ARCHIVO | Solo referencia de topología (no es el patrón Sigma) | — | bajo |
| [cognitive-delegation](2-siguiente/multi-agente/cognitive-delegation.md) | 2204.02889 | 🚫 ARCHIVO | Delegación dinámica (referencia) | — | bajo |

### `2-siguiente/proceso/` — Process Graph (F5)
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [ocpm-survey](2-siguiente/proceso/ocpm-survey.md) | 2311.08795 | ⏳ F5 | Process Graph object-centric (objetos multi-caso) | bajo | alto |
| [graphrag](2-siguiente/proceso/graphrag.md) | 2404.16130 | ⏳ F5 | Grafo vs vector (soporta el memory graph) | bajo | medio |

### `2-siguiente/forecasting/` — dominio del cliente ICF
| Paper | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|
| [chronos](2-siguiente/forecasting/chronos.md) | 2403.07815 | ⏳ F3 | TSFM zero-shot para el forecast 12 semanas de ICF | medio | medio |
| [hnam](2-siguiente/forecasting/hnam.md) | 2404.04070 | ⏳ F3 | Forecast interpretable (aceptación del negocio) | medio | bajo |

---

## 3. ⏳ CUANDO F7 / meta-fábrica avanzada (visión)

### `3-vision/`
| Paper | Carpeta | arXiv | ¿Vale la pena? | Decisión que desbloquea | Esfuerzo | Impacto |
|---|---|---|---|---|---|---|
| [mmg2skill](3-vision/destilacion/mmg2skill.md) | destilacion | 2606.01993 | ⏳ | Trace2Skill formal (guías→skills auto-evolutivas) | medio | alto |
| [care](3-vision/causal/care.md) | causal | 2511.16016 | ⏳ F7 | Coordinación computable: LLM NO infiere causalidad (usa algoritmos) | medio | alto |
| [bootstrapped-monitoring](3-vision/gobierno/bootstrapped-monitoring.md) | gobierno | 2606.11998 | ⏳ F7 | Guardian agents: auditar el reasoning del espejo | medio | alto |
| [constitutional-ai](3-vision/gobierno/constitutional-ai.md) | gobierno | 2212.08073 | ⏳ F2+ | Jerarquía de instrucciones avanzada / RLAIF | bajo | medio |
| [topaz-routing](3-vision/gobierno/topaz-routing.md) | gobierno | 2604.03527 | ⏳ F4 | Routing de modelos auditable (costo vs calidad) | medio | medio |
| [structured-agent-distillation](3-vision/destilacion/structured-agent-distillation.md) | destilacion | 2505.13820 | 🚫 ARCHIVO | El horizonte (destilar trazas→modelo) — NO es roadmap | alto | alto* |
| [agentdistill](3-vision/destilacion/agentdistill.md) | destilacion | 2506.14728 | 🚫 ARCHIVO | Idem (training-free, skills como MCP boxes) | alto | alto* |

\* alto impacto SI algún día se decide destilar; hoy es inversión prematura.

---

## 4. 🚫 ARCHIVO — diferido (no invertir por ahora)

`4-archivo/`: [emem](4-archivo/emem.md) · [memt](4-archivo/memt.md) ·
[locomo-plus](4-archivo/locomo-plus.md) · [engramabench](4-archivo/engramabench.md).
Benchmarks y arquitecturas de memoria avanzadas (ICML/2026) — interesantes, pero
no desbloquean ninguna decisión del roadmap actual. Revisitar si F5/F6 lo piden.

---

## 5. Acción recomendada por fase (la síntesis para decidir)

| Decisión | Lee esto primero | Resultado |
|---|---|---|
| **¿Mejoro la P1.5 (memoria episódica)?** | `1-ahora/memoria-episodica/mem0.md` + `longmemeval.md` + `self-consistency.md` | Definir extracción/consolidación y evals de memoria con base |
| **¿Escribo el primer loop (F1)?** | `1-ahora/ejecucion/durable-execution.md` + `awo-meta-tools.md` | Saber qué es durabilidad real y qué compilar como meta-tool |
| **¿Abarato el runtime?** | `1-ahora/ejecucion/frugalgpt.md` | Diseñar cascadas de modelos por misión |
| **¿Arranco F2 (seguridad)?** | `1-ahora/seguridad/indirect-prompt-injection.md` + `asb.md` + `smcp.md` + `reward-hacking.md` | Threat model, red-team, harden del canal MCP, auditar métricas |
| **¿Diseño el Agent Inbox (F6)?** | `2-siguiente/multi-agente/intelligent-delegation.md` + `1-ahora/seguridad/authenticated-delegation.md` | Delegación con accountability y autorización formal |
| **¿Diseño el memory graph (F5)?** | `2-siguiente/memory-graph/zep-graphiti.md` + `governed-shared-memory.md` + `raster.md` | TKG + supersession + descartar contexto stale |
| **¿Construyo el enjambre (F4)?** | `2-siguiente/multi-agente/mast.md` | Checklist de 14 modos de fallo antes de escribir contratos |
| **¿Qué sigue de la meta-fábrica?** | `1-ahora/ejecucion/awo-meta-tools.md` + `3-vision/destilacion/mmg2skill.md` | Automatizar meta-tools ahora; destilar solo como visión (con el gate de `subliminal-distillation.md`) |

---

## Convención de ficha

Frontmatter tipo OKF (`type: paper`, `area`, `fase`, `arxiv_id`,
`citado_en_tesis`, `verificado`) + cuerpo (Título · Autores · Resumen · Por qué
importa para Sigma · Takeaways accionables · Enlaces). La `fase` del frontmatter
indica la fase de la tesis; la **carpeta** indica el momento de decisión.
