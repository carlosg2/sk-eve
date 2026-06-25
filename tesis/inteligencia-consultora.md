# Sigma AGI — Capa de inteligencia de la consultora

Nivel meta-estratégico. Aplica el modelo "From Hierarchy to Intelligence" (Block) **a nuestra propia empresa de implementación ERP**, no al cliente. Complemento de [`tesis.md`](./tesis.md), marcado como **scope distinto y futuro**.

> **Advertencia de scope:** La tesis técnica (loops) opera el ERP de **una empresa cliente**. Este documento describe operar **el negocio de implementar muchas empresas**. Son productos distintos que comparten arquitectura. No mezclar en la misma fase de construcción. Es la visión que justifica el moat, no el MVP.

---

## 0. El insight

Hoy la empresa hace: levantamiento de requerimientos → configuración de módulos Intelisis → desarrollo de gaps → implementación por área → capacitación → soporte y mejora continua.

Eso parece "servicios de implementación ERP". Pero visto con el lente de Block, es otra cosa:

> No vendemos implementación. Vendemos **la capacidad de modelar, reconstruir y operar una empresa como sistema**. Cada implementación genera procesos reales, decisiones, excepciones y datos: el material para un **modelo universal de cómo operan las empresas**.

Redefinición:

```
De:  Empresa de implementación ERP
A:   Plataforma de inteligencia organizacional basada en ERP
```

---

## 1. Los cuatro bloques de Block, aplicados a la consultora

| Bloque (Block) | En nuestra empresa |
|---|---|
| **Capabilities** | Primitivas organizacionales reutilizables: `procure_to_pay`, `order_to_cash`, `mrp_execution`, `expense_control`, `financial_closing` — no "servicios", sino building blocks |
| **World Model** | Dos modelos (ver §2): interno (estado de implementaciones) + externo (modelo vivo de cada cliente) |
| **Intelligence Layer** | El sistema *sugiere* qué implementar, en qué orden, qué gaps anticipar — elimina dependencia del "consultor estrella" |
| **Interfaces** | De juntas/Excel/minutas → dashboards operativos, copilots, sistemas guiados de implementación |

---

## 2. Los dos World Models

### 2.1 Company World Model (interno)
El estado vivo de **nuestra operación de consultoría**, en tiempo real:
- En qué fase está cada cliente.
- Qué procesos ya están estabilizados.
- Dónde hay bloqueos.
- Qué gaps aparecen recurrentemente.
- Qué áreas siempre fallan (CXP, inventarios).

Reemplaza: project managers tradicionales, seguimiento manual, juntas de estatus. (En Block: el world model carga la información que antes movía la jerarquía.)

### 2.2 Customer World Model (externo)
Cada cliente implementado se convierte en un **modelo vivo de su operación** (procesos, roles, flujos, datos). Lo poderoso: poder **comparar clientes entre sí**.

> "Empresas retail con inventario <80% de exactitud → fallan en go-live de inventarios."
> "Manufactureras con BOM mal definidos → colapsan en producción."

Eso es **inteligencia compuesta**: el moat.

---

## 3. El Pattern Engine cross-client (el moat exponencial)

El activo defendible no es operar un ERP; es **aprender de todas las implementaciones**:

```
Cliente nuevo
   ↓
Modelas estructura (Company Operational Model)
   ↓
Observas ejecución (Process Execution Graph)
   ↓
Detectas problemas (Issues)
   ↓
Aprendes patrones (Patterns)
   ↓
Mejoras el siguiente cliente
```

Cada cliente mejora el modelo, reduce fricción futura, aumenta precisión y permite automatizar más. Es el loop compuesto de Block: **más datos → mejor modelo → mejores decisiones → más datos.**

---

## 4. Schemas del world model (base conceptual)

No para construir aún — para fijar la forma del dato. Tres modelos:

### 4.1 Company Operational Model — cómo está estructurada la empresa *realmente*
```sql
CompanyNode(id, company_id, name, type[department|role|system|external], parent_id, metadata)
CompanyRelationship(id, from_node_id, to_node_id, type[reports_to|approves|generates|consumes|uses])
```
Permite detectar: "Compras depende de Excel → riesgo alto"; "CXP no conecta directo a Intelisis → retrasos seguros". Reemplaza entrevistas largas.

### 4.2 Process Execution Graph — cómo fluye *realmente* el trabajo
```sql
ProcessInstance(id, company_id, process_type, status, started_at, completed_at)
ProcessStepExecution(id, process_instance_id, step_name, actor, input_entity, output_entity, duration_minutes, status, timestamp)
```
Detecta cuellos de botella reales (aprobación tarda 24h, factura tarda 12h).

### 4.3 Implementation Intelligence — lo que aprendemos en cada implementación (el moat)
```sql
ImplementationCase(id, company_id, industry, size, implementation_phase, success_score)
ImplementationIssue(id, case_id, process_type, issue_type[data|training|system_gap|process], severity, description, resolution, resolved_by)
ImplementationPattern(id, name, trigger_conditions[json], recommended_solution[json], occurrences, success_rate)
```

Ejemplo de patrón aprendido:
```json
{
  "name": "Inventario roto en go-live",
  "trigger_conditions": { "industry": "retail", "inventory_accuracy": "<80%" },
  "recommended_solution": ["Conteo físico completo", "Bloquear movimientos durante ajuste", "Validar contra ventas históricas"],
  "success_rate": 0.92
}
```

---

## 5. El DRI artificial

Inspirado en los **Directly Responsible Individuals** de Block: agentes que "poseen un problema", no un área.

- **Agent CXP** — dueño de "reducir días de CXP pendiente".
- **Agent Inventarios** — dueño de "eliminar errores de inventario en retail".
- **Implementation Optimizer** — detecta qué hacer después en una implementación y evita errores comunes.

Esto se alinea con la tesis técnica: un DRI artificial **es un loop** con un goal de negocio, observando el world model y recomendando/actuando con governance.

---

## 6. Relación con la tesis técnica

| Esta capa (consultora) | Tesis técnica (cliente) |
|---|---|
| Opera el negocio de implementar | Opera el ERP de un cliente |
| Company/Customer World Model + Patterns | Company Twin + loops |
| DRI artificial = agente que posee un problema cross-client | Loop = agente que persigue un goal operativo |
| Moat: aprendizaje entre clientes | Valor: automatización dentro de un cliente |

**Comparten:** Eve como runtime, world model como estado externo, governance, eval-driven, ladder de autonomía. Por eso es el mismo sistema en dos niveles — pero se construye el nivel cliente primero.

---

## 7. Por qué esto importa (y por qué no ahora)

**Importa** porque define el activo defendible: una "máquina que aprende a implementar empresas mejor cada vez", imposible de copiar sin el volumen de implementaciones que ya tenemos.

**No ahora** porque requiere primero: (a) que el nivel cliente funcione (loops en shadow con evals), y (b) estructurar las implementaciones como datos. Es la fase 5+ del roadmap, no el MVP. Documentado aquí para no perderlo y para que las decisiones de hoy no lo cierren.

---

## Documentos relacionados
- [`tesis.md`](./tesis.md) — Tesis técnica (loops, nivel cliente).
- [`mercado.md`](./mercado.md) — Posicionamiento de mercado.
- [`decisiones.md`](./decisiones.md) — P-3: ¿Pattern Engine producto aparte o módulo?

---

*Capa de inteligencia de la consultora — 2026-06-23. Scope meta-estratégico, futuro. Basado en "From Hierarchy to Intelligence" (Block) aplicado a la operación de implementación.*
