---
type: analisis-herramientas
fecha: "2026-08-13"
scope: fabrica
verificado: "2026-08-13"
---

# Veredicto de herramientas: Mem0, Semantica, gbrain (2026-08-13)

> **Fábrica (Copilot) · 2026-08-13.** Análisis de los 3 repos propuestos por el
> usuario, cruzado contra la tesis (tesis/), las desviaciones ya documentadas
> (`DESVIACIONES-TESIS.md`) y la síntesis accionable (`SINTESIS-ACCIONABLE.md`).
> Veredicto por herramienta: **NO al runtime / SÍ como referencia de diseño o
> herramienta de fábrica**.

---

## Resumen ejecutivo (3 veredictos)

| Herramienta | Stars/Lic | ¿Al runtime? | ¿A la fábrica? | Verdicto |
|---|---|---|---|---|
| **Mem0** | 63.2k · Apache-2.0 | ❌ NO | ⚠️ Referencia (B-consolidación) | Confirmar lo ya decidido en `papers/1-ahora/memoria-episodica/mem0.md` + patrones nuevos (ADD-only, entity linking) |
| **Semantica** | 6.6k · MIT | ❌ NO (lib Python) | ✅ **SÍ — la mejor referencia para ADR-013 (CARE)** | Robar el data model de decisiones causales + PROV-O; NO adoptar la lib |
| **gbrain** | 28.4k · MIT | ❌ NO (ya tienes tu twin OKF) | ✅ **SÍ — memoria institucional de la fábrica + referencias** | Ya instalado (v0.45.2.0, brain 73 págs); usarlo como cerebro de la fábrica + validar evals (longmemeval/brainbench) y scoping OAuth |

---

## 1. Mem0 — memoria para agentes (63.2k ⭐)

**Qué es:** capa de memoria LLM-driven (extracción → consolidación → recuperación)
con multi-nivel (user/session/agent), SDK Python + **TS** (`mem0ai` npm), server
self-hosted, plataforma managed, CLI. Algoritmo nuevo (abril 2026):
**extracción ADD-only single-pass** (nada se sobreescribe), **entity linking**,
**retrieval multi-señal** (semántico + BM25 + entidad), **temporal reasoning**.
Benchmarks managed: LoCoMo 92.5 / LongMemEval 94.4 / BEAM(1M) 64.1.

**Cruce con la tesis:**
- Ya está fichado: `papers/1-ahora/memoria-episodica/mem0.md` (verdicto: la
  consolidación es valor → pero nuestra separación de poderes la hace la fábrica).
- El **algoritmo ADD-only 2026 valida nuestro patrón append-only**: el buffer
  `state/learnings.md` anexa y la fábrica promueve; Mem0 llegó a la misma
  conclusión (no sobreescribir, acumular y consolidar).
- Entity linking + temporal reasoning = **patrones a robar para F5 (memory graph)**
  sin adoptar la lib.
- LongMemEval 94.4 es el **target de referencia para A1** (nuestros evals de
  memoria + abstention), con la salvedad de que es la plataforma managed (OSS es
  menor).

**Veredicto:** ❌ runtime (nuestra memoria vive en OKF + radiografía SQLite, no en
una vector DB; adoptarlo violaría la constitución). ✅ como **referencia de diseño**
para `scripts/probe-consolidacion.ts` (B-consolidación) y para F5. Sin acción
adicional: ya está en el plan.

---

## 2. Semantica — "Palantir open source para agentes" (6.6k ⭐)

**Qué es:** infraestructura **determinista** (sin LLM requerido) de grafo de
contexto + **Decision Intelligence** + provenance W3C PROV-O + detección de
conflictos + razonamiento (Rete/Datalog/SPARQL) + temporal (bi-temporal,
point-in-time snapshots). Python, MCP server, REST, CLI, Explorer (React+Sigma.js).
Incluye DeepSeek vía LiteLLM. v0.6.5 = release de seguridad (SSRF, inyección
Cypher/SPARQL — lección para nuestro canal MCP).

**Cruce con la tesis (esto SÍ nos interesa):**
- **DESVIACIÓN 1 — CARE / causalidad atestiguada (candidato ADR-013):** Semantica
  es la implementación concreta de "cómputos atestiguados". El API
  `record_decision()` + `add_causal_relationship(CAUSED | INFLUENCED |
  PRECEDENT_FOR)` + `trace_decision_chain()` + `check_decision_rules()` define
  **exactamente** el vocabulario causal que proponemos: decisión como nodo de
  primera clase, relaciones causales tipadas (no "el LLM las descubre": se
  registran atestiguadas), y policy gates.
- **DESVIACIÓN 7 — interpretabilidad:** exportar pistas de auditoría en **W3C
  PROV-O** (formato que aceptan reguladores) = lo que un cliente ERP regulado
  pediría. Nuestra radiografía SQLite captura lo mismo, pero PROV-O es el formato
  estándar de salida.
- **A5 — conflictos:** `semantica.conflicts` detecta y marca en vez de
  sobreescribir silenciosamente = exactamente ADR-010/supersession.
- **F5 — memory graph temporal:** point-in-time snapshots + bi-temporal facts.

**Veredicto:** ❌ adoptar la lib Python en el runtime (stack TS, arquitectura
OKF/radiografía ya definida; sería un mini-Palantir completo). ✅ **SÍ como
especificación de diseño para ADR-013 (CARE)**: robar el data model (decisión
causal tipada + provenance + policy gates) y traducirlo a nuestra radiografía /
Event Ledger. Acción concreta: al redactar ADR-013, citar este data model como
referencia; evaluar si el producto final necesita exportación PROV-O para
clientes.

---

## 3. gbrain — cerebro personal/empresa (28.4k ⭐, Garry Tan / YC)

**Qué es:** brain layer (síntesis + grafo + gap analysis) sobre PGLite/Postgres
con MCP server. Busca híbrido (vector+BM25+RRF+reranker), **grafo auto-cableado con
edges tipados sin LLM**, **capa de síntesis con gap analysis** ("lo que el brain
aún no sabe"), **dream cycle** (consolidación nocturna: dedup, arreglar citas,
**encontrar contradicciones**), **company-brain** multi-usuario con scoping por
login, **evals** (longmemeval, BrainBench cross-harness, suspected-contradictions),
**MEMORY_VERBS v1** (recall/remember/entity/synthesize/forget + context_pack/delta),
Minions (job queue durable), skillopt (auto-mejora de skills), OAuth 2.1 + scopes
read/write/admin en el MCP HTTP.

**Estado local (verificado hoy):** instalado v0.45.2.0 (GitHub ya va en
v0.45.11.0), brain de **73 páginas** (concept 41, resolver 16, note 14...),
217 chunks, 89 checks de doctor OK. **Actualizable.**

**Cruce con la tesis:**
- **Company-brain multi-tenant con scoping por login + 0 leaks** = validación
  industrial de nuestro **Company Twin multi-tenant** (F6). Es lo mismo que
  proponemos con OKF por tenant, pero gbrain lo hace con scopes de login.
- **Gap analysis** ("lo que el brain no sabe") = nuestro patrón **"Dato no
  disponible"** (ICF/CXP) hecho producto.
- **Dream cycle** (consolidación + contradicciones automática) = la **fábrica
  automatizada** — pero ojo: automatiza con LLM lo que la constitución reserva a
  la fábrica. Mismo debate que Mem0/CraniMem (ya en DESVIACIONES §4).
- **Evals**: `gbrain eval longmemeval` + `brainbench` + `suspected-contradictions`
  = candidatos directos para **A1** (evals memoria+abstention) y **A5**
  (contradicciones). Son harnesses ya hechos, con metodología documentada.
- **MCP HTTP con OAuth 2.1 + scopes read/write/admin** = implementación concreta
  de la **DESVIACIÓN 2 — Authenticated Delegation (ADR-014)**: RBAC a
  infraestructura, tokens, least-privilege. Patrón a citar al redactar ADR-014.
- **Minions** (subagentes durables two-phase) = referente para **A8** (contrato de
  durable execution, P-5).
- **Skillopt** (skills como parámetro entrenable con benchmark) = referente para
  el **stack-mastery** de la meta-fábrica (nuestra skill de mejora continua).
- FTS en **español** (GBRAIN_FTS_LANGUAGE=spanish) — nuestro dominio es español.

**Veredicto:** ❌ runtime (el agente ya tiene Company Twin OKF + radiografía
SQLite; meter gbrain al runtime sería duplicar memoria y romper la separación de
poderes). ✅ **SÍ como cerebro de la FÁBRICA**:
1. **Memoria institucional de la fábrica**: indexar `research-n-dev/`, `tesis/`,
   ADRs y decisiones en gbrain → "¿qué decidimos sobre X y qué NO sabemos?" con
   síntesis + gap analysis. Resuelve el problema real: la fábrica pierde contexto
   entre sesiones.
2. **Referencia de diseño**: company-brain scoping (F6), OAuth MCP (ADR-014),
   evals de memoria/contradicciones (A1/A5), durable execution (A8).
3. Acción inmediata de bajo costo: **upgrade a v0.45.11.0** + `gbrain import
   research-n-dev tesis docs` y probar `gbrain think "¿cuál es nuestra desviación
   más importante y qué no sabemos aún?"`.

---

## Conclusiones / acciones concretas

1. **Nada de esto va al runtime.** El agente ya tiene su memoria (Company Twin
   OKF + Event Ledger SQLite + P1.5 episódica); adoptar cualquiera de las tres en
   runtime viola la constitución (separación de poderes) y agrega dependencia
   pesada sin ganancia.
2. **Semantica** → fuente de diseño para **ADR-013 (CARE)**: data model de
   decisión causal tipada + provenance + policy gates. Traducir a radiografía.
3. **gbrain** → cerebro de la fábrica + referencias para **ADR-014** (OAuth MCP
   scoped), **A1/A5** (harnesses de evals de memoria/contradicciones ya hechos) y
   **A8** (Minions/durable execution). Acción: upgrade + import + probe.
4. **Mem0** → sin acción nueva: ya está en el plan (B-consolidación como
   referencia); el ADD-only 2026 confirma nuestro patrón append-only.
5. Registrar estos veredictos en el ADR correspondiente cuando se redacte
   (ADR-013/ADR-014), citando Semantica y gbrain como referencias externas.

## Enlaces

- Mem0: https://github.com/mem0ai/mem0 · ficha: `papers/1-ahora/memoria-episodica/mem0.md`
- Semantica: https://github.com/semantica-agi/semantica · docs: docs.getsemantica.ai
- gbrain: https://github.com/garrytan/gbrain · local: `~/.bun/bin/gbrain` (v0.45.2.0, brain 73 págs)
