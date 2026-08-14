# DESVIACIONES DE LA TESIS — Dónde Sigma necesita desviarse

> **Fábrica · 2026-08-13.** Consolidación de las desviaciones/contradicciones
> detectadas al leer los 53 papers en paralelo + el estado del arte (video).
> Estas son las decisiones que la tesis NO previó y que conviene registrar como
> ADRs o corregir en el documento. Ordenadas por severidad.

---

## 1. ⚠️⚠️ La "coordinación computable" NO la descubre el LLM (CARE) — desvío estructural

**Tesis dice:** la visión "coordinación computable" (ventas→descuentos→margen→
liquidez, §10/§11) y el Process Graph del TKG (F5) se modelan con cadenas
causales del negocio, y el LLM participa de esa inteligencia.

**La evidencia (CARE, 2511.16016):** los LLM **no hacen causal discovery**: se
apoyan en el significado de los nombres de campos e ignoran los datos
observacionales; incluso promptearlos con salidas de algoritmos clásicos los
DEGRADA. El patrón ya ocurrió en este repo: el subagente que alucinó el join
VentaD/Venta (2026-07-30) leyendo nombres de campos.

**Desviación:** la causalidad en Sigma **solo puede venir de cómputos
atestiguados** (algoritmos deterministas de discovery o reglas verificadas) — el
mecanismo ya existe: `Attested Computation` en OKF (`sp-planart.md`). El LLM solo
presenta/interpreta. Sin esta regla, el Process Graph y el twin nacerían
contaminados con causalidad ficticia (caro de des-aprender).

**Acción:** ley de governance + eval (A6 en la síntesis). **Candidato a ADR-013.**

---

## 2. ⚠️ El RBAC debe moverse del runtime a la infraestructura (Authenticated Delegation)

**Tesis dice:** RBAC "efectivo" sobre tools MCP como **soft-gate** — allow-list +
approval HITL, todo en el runtime (Eve). El §4.2 lo marca pendiente para F2.

**La evidencia (2501.09674):** la autorización de agentes se resuelve mejor como
**delegación autenticada OAuth/OIDC-like** con credenciales por agente, scope
verificable y cadena de accountability **fuera del runtime** (el Agent Card
firmado del glosario v2). Adicionalmente, el paper de memoria compartida
(2606.24535) reporta un fallo real: "asymmetric scope enforcement" — tenant
aislado en el buscador pero vulnerable en GET-by-id. Y nuestro canal MCP remoto
(`api2.maserp.mx/<tenant>/mcp`) parece abierto por URL (sin auth) — hay que
auditarlo (SMCP).

**Desviación:** el control debe vivir **en el gateway/DAB** (verificación en el
servidor), no solo en el runtime. Esto cambia quién es dueño del control, qué
hace el backend y cómo se audita quién autorizó qué.

**Acción:** ADR antes de implementar; diseño del Agent Card como token con scope;
auditoría del canal con el backend. **Candidato a ADR-014.**

---

## 3. ⚠️ El modelo por agente es estático; el mercado y la evidencia piden cascadas (FrugalGPT)

**Tesis dice:** `agent.md` → un modelo por agente (hoy DeepSeek vía AI Gateway),
estático. El §3.3 menciona Plan-and-Execute ("modelo de razonamiento planea,
baratos ejecutan") como idea, sin diseño.

**La evidencia (2305.05176):** las cascadas de modelos reducen hasta 98% el
costo igualando calidad; y el patrón watchdog de ADR-008 (LLM = último recurso)
es la mitad de una cascada. Topaz (2604.03527) añade: el routing debe ser
**auditable** (costo vs calidad trazable) o no puedes distinguir "eficiencia
inteligente" de "fallo por presupuesto".

**Desviación:** diseñar **cascade por misión** (barato primero + verificación
determinista con aggregate/read MCP, escalar solo si falla o es ambiguo) y
registrar la **decisión de routing** en la radiografía. Probarlo en shadow antes
de tocar producción (los gotchas de Eve con modelo dinámico ya quemaron semanas).

**Acción:** experimento shadow (B-FrugalGPT) + nota de diseño en la tesis.

---

## 4. ⚠️ La consolidación episódica→semántica NO puede automatizarse en el runtime (Mem0/CraniMem/GraphRAG)

**Tesis dice:** la consolidación la hace **la fábrica** (constitución §3:
separación Fábrica/Runtime). La tesis llama a la consolidación "la etapa más
impactante y menos implementada".

**La evidencia (2504.19413, 2603.15642, 2404.16130):** los sistemas de memoria
automatizan la consolidación en el agente (Mem0) o con scores de utilidad
(CraniMem) o con resúmenes de comunidad (GraphRAG).

**Desviación:** la consolidación puede **semi-automatizarse pero SOLO del lado de
la fábrica**: un script (probe-consolidacion) propone hechos candidatos al Twin
desde la radiografía para **revisión humana**. Automatizarla en el runtime
rompería la constitución y reabriría el riesgo de conocimiento contaminado
(también el subliminal-distillation, 2604.15559, que muestra que los sesgos se
transfieren vía trayectorias aunque se filtren keywords).

**Acción:** B-consolidación (fábrica). Sin ADR, es una regla de constitución.

---

## 5. ⚠️ MAST frena F4: el multi-agente rinde poco en general (requiere evals por feature)

**Tesis dice:** F4 = "enjambre mínimo" con agentes pares por contrato; el
multi-agente es "un impuesto que se paga solo donde rinde" (§3.2).

**La evidencia (2503.13657):** MAST-Data (1600+ trazas de 7 frameworks) muestra
que los MAS fallan en 14 modos (3 categorías) y que las ganancias en benchmarks
son "a menudo mínimas". Se aplica YA a los subagentes de Eve que el proyecto usa
(ya fallaste en el modo iii: verificación).

**Desviación:** antes de CADA feature multi-agente (misiones, subagentes,
enjambre) → checklist MAST + evals anti-fallo. No es un cambio de arquitectura
(los contratos Task/Message/Artifact siguen siendo correctos), es **un freno
explícito y un gate**: el multi-agente no se promociona sin evidencia de que
rinde.

**Acción:** A4 (checklist + eval "no delegar joins tabulares"). Anotar en ADR-011.

---

## 6. ⚠️ La ventana de diferenciación es AHORA (2026-2029), no 2027-2028 (video)

**Tesis dice:** roadmap F1→F7 en orden, con F3 (primer cliente) en su lugar; la
proyección 2027-2028 asume que hay tiempo.

**La evidencia (video AI 2027/AI 2040):** los labs se automatizan a sí mismos
(recursive self-improvement) y el mercado YA consume agentes como empleados
(Claude Code, agentes en Slack/WhatsApp — "autonomous employee" llegó en
2025-2026). La regulación interviene más rápido de lo previsto (export controls,
DoW-Anthropic). La ventana para diferenciarse como proveedor de agentes de
negocio gobernados es **2026-2029**.

**Desviación:** **reordenar parcialmente el roadmap**: F2 (seguridad) →
F3 (primer cliente en shadow/recommend, Agent Inbox) antes de F5 (memory graph).
La profundidad del memory graph vale menos que llegar con un cliente real
gobernado y auditable.

**Acción:** decisión de roadmap; actualizar `tesis.md` §10.

---

## 7. ⚠️ "Reversibilidad" y "quién controla" como principios de PRODUCTO (video)

**Tesis dice:** §4.2 pide kill-switch por loop y contención; §9 agents as
services. La concentración de poder aparece como escenario global, no como
riesgo del producto.

**La evidencia (video):** el riesgo #2 es la **concentración de poder** ("ninguno
de estos CEOs debería ser confiable con ese poder"); el Plan A propone
**reversibilidad** (infraestructura diseñada para ser desmontable). Para Sigma
como vendor, el riesgo es que un cliente quede cautivo de Sigma como único
operador de su ERP.

**Desviación:** diseñar el producto para que **el cliente pueda matar al agente y
salir** (datos exportables, kill-switch por tenant, aprobaciones locales), y
documentar "quién controla" por tenant (dueño humano del DRI). La interpretabilidad
(la radiografía con reasoning por step) deja de ser un lujo: es la base de la
confianza y un argumento de venta.

**Acción:** nota de producto en `tesis/produccion.md` y `mercado.md`.

---

## 8. ⚠️ Correcciones documentales de la tesis (verificadas)

| Dónde | Error | Corrección |
|---|---|---|
| `tesis.md` §0/§8 | Cita "BEAM (ICLR 2026)" con arXiv:2602.05665 | Ese ID es el survey *Graph-based Agent Memory*; BEAM no se localizó en arXiv. Los benchmarks de memoria de referencia son **LoCoMo + LongMemEval** (y su variante cognitive LoCoMo-Plus). |
| `tesis.md` §4.2 | Regulación (EU AI Act Annex III, SOX) como "documentar" | Debe ser **requisito de diseño activo**: auditoría nativa (cada decisión trazable en la radiografía) — el video confirma que el gobierno interviene ya. |
| `tesis.md` §3.4 | "Graphiti gana" como si se adoptara el motor | Adoptar solo la **semántica de supersession temporal en file system** (ADR-010); el motor completo (Neo4j/Postgres) desviaría ADR-004/ADR-010. |

---

## 9. Desviaciones menores (registradas, sin acción)

- **Self-consistency vs costo**: muestreo múltiple siempre-on choca con la frugalidad (DeepSeek 13-22 tok/s); solo en operaciones críticas y en shadow.
- **Topaz**: el routing auditable no existe hoy; el insumo (registrar la decisión de modelo/tool por turno) se añade a la radiografía sin cambiar el runtime.
- **Constitutional AI**: la jerarquía de instrucciones actual es la "constitución en runtime"; RLAIF (entrenar con principios) queda fuera del roadmap (ADR-004).
- **MMG2Skill**: confirma la práctica de NO inyectar guías/wikis crudas al prompt (compilar a skills) — blindar como regla.

---

## Resumen — las desviaciones que importan

1. **Causalidad solo atestiguada** (CARE) — la única corrección estructural de conocimiento.
2. **Hard-gate en la infraestructura** (Authenticated Delegation + SMCP) — quién es dueño del control.
3. **Cascadas de modelos** (FrugalGPT) — el costo como decisión de diseño, no accidente.
4. **Consolidación solo de fábrica** (Mem0/CraniMem) — proteger la constitución.
5. **Freno a F4** (MAST) — multi-agente con evidencia, no por moda.
6. **Reordenar roadmap: F2→F3 antes de F5** (video) — la ventana es ahora.
7. **Reversibilidad + interpretabilidad como producto** (video) — el cliente debe poder salir y auditar.
