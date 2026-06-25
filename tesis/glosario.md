# Sigma AGI — Glosario

Vocabulario de referencia para el proyecto. Define los términos del campo (Agentic Process Intelligence) con su significado preciso y cómo aplican a Sigma. Apéndice de [`tesis.md`](./tesis.md).

> **Para qué sirve:** Mantener consistencia conceptual entre documentos y usar términos ya reconocidos en el mercado (Celonis, IBM, Automation Anywhere) en vez de inventar vocabulario.

---

## El término paraguas

Sigma se ubica en la disciplina emergente de **Agentic Process Intelligence** (Inteligencia de Procesos Agéntica): la fusión de process mining, conocimiento procedural, capa semántica, agentes de IA, policy engine y human-in-the-loop, aplicada a la ejecución dentro de un ERP.

> **Inteligencia de Procesos Agéntica para ERP** es la disciplina de capturar cómo opera realmente una empresa, convertir ese conocimiento en skills procedurales, gobernarlo con reglas y políticas, y permitir que agentes de IA ejecuten procesos dentro del ERP de forma segura, auditable y semi-autónoma.

Términos comerciales equivalentes según audiencia:
- **Técnica:** Arquitectura de Inteligencia Operativa
- **IA:** Enterprise Cognitive Architecture
- **Negocio:** Agentic Operating Model
- **Producto:** Enterprise AI Operating System
- **Interno:** Procedural Knowledge Graph

### Domain-Bounded Enterprise AGI (la categoría de Sigma)

**Mini-AGI Organizacional** o, más preciso, **Domain-Bounded Enterprise AGI**: una inteligencia general **acotada a una empresa**, no universal.

- **AGI general** → razona y actúa en casi cualquier dominio humano (ciencia, medicina, derecho, arte…).
- **Mini-AGI empresarial** → razona, aprende y actúa **dentro de una organización específica** (compras, ventas, inventario, finanzas, gastos, pricing, aprobaciones, workflows de *este* ERP).

> Una **Mini-AGI Organizacional** es una IA acotada a una empresa, capaz de comprender su ADN operativo, coordinar procesos, (eventualmente) crear superficies dinámicas y automatizar trabajo empresarial con supervisión humana.

Se siente como AGI dentro del dominio porque no solo responde: entiende contexto, detecta problemas, razona causas, propone soluciones, coordina departamentos-agente, aprende de resultados, ajusta workflows, pide aprobación y ejecuta. **No** es AGI completa porque está acotada por dominio (la empresa), fuentes (ERP/docs/trazas), acciones (tools autorizadas) y límites (permisos, políticas, humanos) — y esa acotación es justo lo que la hace segura, vendible y construible.


---

## 1. Tipos de conocimiento

| Término | Es el… | Ejemplo en Intelisis |
|---|---|---|
| **Declarativo** | "qué es" | Un gasto tiene proveedor, fecha, moneda, importe, impuestos |
| **Procedural** | "cómo se hace" | Validar proveedor → capturar → calcular impuestos → afectar → confirmar folio |
| **Condicional** | "qué hacer si pasa X" | Si el gasto > $50,000, pedir autorización; si falta UUID, rechazar |
| **Causal** | "causa → efecto" | Si afecto un gasto, se genera póliza contable y se modifica el saldo |

El **conocimiento procedural** es el más importante para Sigma: es lo que convierte trazas SQL y operación humana en skills ejecutables.

---

## 2. Modelado de proceso y estado

- **Modelo de estado** — En qué estado está cada documento. Ej: `Borrador → Capturado → Validado → Autorizado → Afectado → Contabilizado → Pagado`.
- **Máquina de estados** — El modelo de estado llevado a lógica ejecutable (states + transitions + actions). Evita que el agente improvise.
- **Process Mining** — Descubrir procesos *reales* a partir de logs/trazas, no como se cree que corren. Base técnica de Trace2Skill.
- **Process Graph** — Representación object-centric del trabajo: objetos, eventos, variantes, desviaciones, riesgos. No una secuencia lineal, sino un territorio.
- **Ontología empresarial** — Mapa formal de conceptos del negocio y sus relaciones (Proveedor tiene facturas, pertenece a categoría, puede estar bloqueado).
- **Capa semántica** — Traduce lenguaje humano a conceptos técnicos del ERP ("lo que debo a proveedores" → CxpPendiente, Saldo, Vencimiento).

---

## 3. Capacidades y composición

- **Skill** — Capacidad procedural versionada (no un prompt): intención, inputs, steps, herramientas permitidas, precondiciones, aprobación, verificación.
- **Skill Graph** — Red de skills con dependencias (Consultar proveedor → Validar CFDI → Capturar gasto → Afectar → Generar póliza → Programar pago).
- **Skill Compiler / Trace2Skill** — Mecanismo que compila trazas + Process Graph + reglas del Company Twin + acciones del kernel en un skill versionado.
- **DSL operativo** — Lenguaje específico para describir procesos del ERP de forma declarativa (ver decisión sobre autoría vs runtime en [`decisiones.md`](./decisiones.md)).

---

## 4. Memoria

| Término | Qué es | En Eve |
|---|---|---|
| **Memoria operativa** | Lo que el agente recuerda *durante* una tarea | `defineState` (corrida) |
| **Memoria institucional / procedural memory** | Conocimiento acumulado de cómo opera *esta* empresa | Company Twin (store externo) |
| **Event Sourcing** | Todo lo que ocurre se guarda como evento append-only | Event Ledger |

---

## 5. Gobierno y seguridad

- **Policy Engine** — Reglas formales de autorización, seguridad y límites (`agent_can_affect_expense: max_amount 10000`).
- **Guardrails operativos** — Límites de comportamiento en ejecución (no afectar pagos > $100K sin humano). *Policy = reglas; guardrails = límites de conducta.*
- **Human-in-the-loop (HITL)** — Define cuándo entra una persona: el agente consulta/valida/prepara solo, pero requiere humano para afectar/cancelar/pagar.
- **Modelo de consecuencias** — Antes de ejecutar, estimar impacto (afectar este gasto → actualiza CxP + genera póliza + consume presupuesto).
- **Simulación / dry-run** — Mostrar el resultado antes de ejecutar lo real, para confianza.
- **Auditoría explicable** — El agente explica *por qué* hizo algo, de forma operativa y auditable (no filosófica).
- **Reversibilidad** — Cada acción tiene estrategia de deshacer/compensar. El agente no debe ejecutar algo si no sabe cómo se corrige.

---

## 6. Razonamiento y ejecución

- **Intención → acción** — Mapear lo que el usuario pide a una operación ERP concreta (`pay_overdue_supplier_invoices` → query, validate, prepare, request_approval).
- **Planificación** — El agente arma un plan estructurado antes de actuar, no improvisa paso a paso.
- **Agente como operador (no consultor)** — Cambio de mentalidad central: un consultor *explica* cómo capturar un gasto; un operador *ya validó, preparó y pide autorización para afectarlo*.

---

## 7. Términos propios de Sigma (definidos en otros docs)

| Término | Documento |
|---|---|
| ERP Kernel, Company Twin, Process Graph, Agent Cortex, Execution Gateway, Governance Layer | [`tesis.md`](./tesis.md), [`context-stack.md`](./context-stack.md) |
| Loop persistente, ladder de autonomía (L0–L4) | [`tesis.md`](./tesis.md) |
| Context overlays, jerarquía de autoridad, regla ontológica | [`context-stack.md`](./context-stack.md) |
| Cross-client Pattern Engine, DRI artificial | [`inteligencia-consultora.md`](./inteligencia-consultora.md) |

---

## Frase central

> Un agente ERP no debe ser solo un chatbot con acceso a SQL. Debe ser un **operador procedural** con memoria, políticas, estados, simulación, trazabilidad y conocimiento institucional.

---

*Glosario — 2026-06-23. Vocabulario de referencia del proyecto Sigma AGI.*
