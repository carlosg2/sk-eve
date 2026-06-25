# Sigma AGI — Context Stack

Documento complementario de [`tesis.md`](./tesis.md) (v1, loops persistentes).

> **Relación con la tesis de loops:** La tesis principal responde **cómo ejecuta** Sigma (loops persistentes con estado, schedules, ladder de autonomía). Este documento responde **qué contexto compone** Sigma para actuar correctamente. No compiten: se complementan. En su paso `decide`, un loop **compone el context stack**; en su paso `act`, lo gobierna la **jerarquía de autoridad** definida aquí.

> **Disciplina de implementación (importante):** Las ideas de este documento provienen de una exploración maximalista (que proponía neo4j, múltiples microservicios y montañas de YAML). **Adoptamos los conceptos, no esa implementación pesada** — ese exceso es justo lo que volvió complejo y se abandonó el proyecto anterior. Las capas se materializan primero como **carpetas de markdown/YAML hardcodeadas** (file system), en **shadow**, con **evals**. Solo migran a bases de datos o servicios cuando un eval demuestre que hace falta.

---

## 0. La idea central

Un AGI empresarial no puede actuar correctamente si no distingue entre **leyes del sistema**, **reglas de la empresa**, **hábitos observados** y **situaciones temporales**. Esa distinción no es un detalle arquitectónico: es el núcleo de la inteligencia.

Si todo vive en una sola masa de contexto, el agente se vuelve frágil y comete un error **ontológico**: confunde una regla local con una ley universal. Ejemplo:

- Cliente A aprueba gastos < $20,000 automáticamente.
- Cliente B exige autorización humana desde $5,000.
- Cliente C no aprueba nada sin XML.

Si todo eso vive junto, el agente puede aprender "los gastos menores se aprueban automáticamente" y aplicarlo donde no debe. El principio base que lo evita:

> **Separar lo que cambia a diferente velocidad.**

---

## 1. La metáfora: mapa, territorio, rutas y clima

| Elemento | Capa | Qué es |
|---|---|---|
| **Mapa base** | Intelisis Core | La geografía común: módulos, tablas, movimientos, SPs, reglas estructurales |
| **Territorio local** | Company Twin | Cómo esa empresa habita el mapa: sucursales, políticas, excepciones, KPIs |
| **Rutas** | Process Graph | Cómo fluye el trabajo: requisición → OC → recepción → factura → CxP → pago |
| **Clima y tráfico** | Runtime | Lo que pasa ahorita: facturas pendientes, órdenes atrasadas, pagos vencidos |

Sigma no debe ver la empresa como una línea (`paso 1 → paso 2 → paso 3`), sino como un **territorio navegable**: objetos, eventos, procesos, caminos, zonas de riesgo, atajos, bloqueos, variantes, reglas y actores.

La inteligencia aparece cuando el agente puede decir:

> "Sé qué es una factura en Intelisis (mapa), sé qué significa para esta empresa (territorio), sé en qué parte del proceso está (ruta), sé qué riesgo tiene ahora (clima) y sé qué acciones puedo o no puedo tomar (gobierno)."

---

## 2. El stack de 5 capas

La tesis v1 colapsó "ERP Kernel + Company Twin". Aquí se separan correctamente **por velocidad de cambio**, y se añaden dos capas que faltaban (Vertical y Runtime explícito):

```
SIGMA AGI CONTEXT STACK
1. Intelisis Core Context   ← universal, cambia lento     (el kernel del ERP)
2. Vertical / Industry      ← retail/manufactura, medio   (cómo opera el tipo de empresa)
3. Company Context          ← esta empresa, medio/rápido  (el Company Twin)
4. Process / Skill Context  ← cómo se ejecuta aquí, medio (la capacidad procedural)
5. Runtime / Situation      ← tiempo real, NO se guarda   (el estado del caso actual)
```

### 2.1 Intelisis Core Context (ERP Kernel)
Responde: *"¿Qué es Intelisis y cómo funciona estructuralmente?"* Universal, reutilizable entre todos los clientes. Módulos, tablas, relaciones, movimientos, estatus, SPs, reglas generales, glosario, acciones posibles, patrones de afectación, errores comunes.

**Restricciones del kernel:** `no_customer_specific_policy`, `no_tenant_data_allowed`, `no_runtime_state_allowed`. El kernel jamás contiene datos de un cliente.

> En Sigma Intelisis esto ya existe parcialmente: la wiki de 617 páginas + 390 reglas + dab-config universal de 187 entidades **son** el ERP Kernel.

### 2.2 Vertical / Industry Context
Responde: *"¿Cómo suele operar este tipo de empresa?"* No es lo mismo Intelisis para retail (POS, cortes de caja, merma, alta rotación) que para manufactura (BOM, órdenes de producción, lotes, capacidad). Evita que Sigma reaprenda cada cliente desde cero.

### 2.3 Company Context (Company Twin)
Responde: *"¿Cómo opera esta empresa específica?"* Estructura organizacional, sucursales, almacenes, usuarios, roles, políticas de aprobación, proveedores críticos, configuración fiscal, cuentas contables, centros de costo, personalizaciones (vistas/SPs propias), excepciones permitidas, tolerancias de riesgo.

**Nunca se mezcla con el core universal.** Lo cierto para un cliente puede ser falso para otro.

### 2.4 Process / Skill Context
Responde: *"¿Cómo se ejecuta este proceso en esta empresa?"* Aquí entra Trace2Skill: conocimiento **procedural**, no solo técnico. Un skill `inherits` del kernel + vertical + company, define inputs, steps, `human_approval`, outputs.

### 2.5 Runtime / Situation Context
Responde: *"¿Qué está pasando ahora?"* El caso activo: 128 gastos pendientes, 4 posibles duplicados, 11 sin XML, 6 de alto riesgo. **Esta capa no debe volverse memoria permanente automáticamente.** Es contexto temporal.

> En Eve: el Runtime Context es `defineState` (memoria de la corrida). Las capas 1–4 viven en el store externo (file system → DB). Esta es exactamente la frontera que Eve impone.

---

## 3. La regla ontológica (la más valiosa)

> **Nunca conviertas una observación local en conocimiento universal sin validación.**

Trace observado: *"el usuario canceló un gasto sin XML."* Eso **no** significa "los gastos sin XML se cancelan". Puede significar: era duplicado, era caja chica, el proveedor estaba mal, faltó autorización, fue error humano, o había una política local.

Por eso **Trace2Skill no copia acciones**: infiere hipótesis, pide validación y las convierte en reglas **versionadas**. El runtime es evidencia temporal, no verdad permanente.

El principio resumido en tres líneas:

> Lo universal se hereda. Lo específico se superpone. **Lo temporal no se guarda como verdad.**

---

## 4. La jerarquía de autoridad

La composición de capas obedece una jerarquía estricta de autoridad. No es el orden de carga; es **quién gana cuando hay conflicto**:

```
Governance > Company Twin > Skill > Process Graph > ERP Kernel > Runtime Intent
```

Por qué en ese orden:
- El usuario puede pedir algo incorrecto → *Runtime Intent* es lo más débil.
- El ERP Kernel puede permitir algo que la empresa prohíbe.
- El proceso puede tener excepciones.
- El skill puede estar incompleto.
- El gobierno siempre tiene la última palabra.

### 4.1 Regla fina: el Company Twin restringe, nunca amplía

> Si hay conflicto entre **Company Twin** y **ERP Kernel**, el Company Twin **restringe, no amplía**.

El kernel define el universo de lo *posible*. El Company Twin solo puede **recortar** ese universo (prohibir, exigir aprobación, bloquear), nunca habilitar algo que el kernel no permite. Esta es la regla de composición que protege al Execution Gateway de que una config de cliente abra una puerta que el ERP cerró.

### 4.2 Otras reglas de resolución de conflicto
- Si hay conflicto entre **Skill** y **Governance** → Governance gana.
- Toda recomendación debe incluir **evidencia**.
- El agente nunca inventa datos: consulta herramientas autorizadas.

---

## 5. Context overlays: composición, no aislamiento

Las capas no son carpetas aisladas que se eligen una u otra. Son **overlays que se superponen** para producir cada respuesta:

```
Respuesta del agente =
    Intelisis Core
  + Vertical Context
  + Company Overlay
  + Process Skill
  + Runtime State
  + User Intent
  + Governance Policy
```

Ejemplo — el usuario pregunta *"¿Puedo aprobar estos gastos?"*:

| Capa | Qué aporta |
|---|---|
| Intelisis Core | Un gasto puede consultarse, validarse, afectarse, cancelarse |
| Vertical Retail | Los gastos por sucursal se validan contra centro de costo |
| Company Overlay | Esta empresa exige XML para nacionales; > $50K requiere Dirección |
| Skill | Validar XML → UUID → duplicados → monto histórico → clasificar riesgo |
| Runtime | Hay 18 gastos: 2 duplicados, 3 sin XML, 1 proveedor nuevo |
| Governance | Puede recomendar, no aprobar; debe escalar duplicados |
| **Respuesta** | "Recomiendo aprobar 12, revisar 5, bloquear 1" |

> En Eve esto mapea a `defineDynamic`: las capas se resuelven en runtime (`session.started`) según empresa/usuario/misión y se componen como instrucciones/skills/tools del paso.

---

## 6. Ciclos de vida (cada capa evoluciona distinto)

La razón de separar es que cada capa tiene su propio ritmo y su propio dueño:

| Capa | Velocidad | Evoluciona por | Dueño | Riesgo si se mezcla |
|---|---|---|---|---|
| Intelisis Core | lento | investigación técnica | Sigma core | contaminar conocimiento universal |
| Vertical | medio | generalización por industria | Sigma + expertos | generalizar mal por industria |
| Company | medio/rápido | implementación del cliente | cliente | aplicar reglas de un cliente a otro |
| Skill | medio | traces validados | consultor + Sigma | automatizar procesos equivocados |
| Runtime | inmediato | operación diaria | operación | convertir casos temporales en reglas permanentes |
| Governance | por evento | riesgo / auditoría | seguridad | — |

---

## 7. Niveles de autonomía (L0–L4)

Refinamiento del ladder de la tesis principal, con nombres precisos para el Governance Engine:

| Nivel | Nombre | Escribe al ERP |
|---|---|---|
| **L0** | `observe_only` | ❌ |
| **L1** | `recommend_only` | ❌ |
| **L2** | `prepare_action` | ❌ (prepara para aprobación) |
| **L3** | `execute_low_risk` | ✅ acotado y pre-autorizado |
| **L4** | `execute_controlled` | ✅ con aprobación + auditoría reforzada |

En producción, el `default_autonomy_level` arranca en L1 y el `max_autonomy_level` se limita explícitamente por Company Twin. Coincide con la regla v1: **todo loop nace en shadow (L0/L1); la escritura se gana con evals.**

---

## 8. Mapeo a Eve y al file system (decisión de implementación)

Las 5 capas, materializadas como file system hardcodeado en esta iteración:

```
company-twin/                      # (y su contexto heredado)
├── erp-kernel/                    # capa 1 — universal (portado del proyecto previo)
│   ├── gastos.kernel.yaml
│   └── cxp.kernel.yaml
├── verticals/                     # capa 2
│   └── retail.yaml
├── companies/
│   └── joya/                      # capa 3 — Company Twin
│       ├── company.yaml
│       ├── policies/
│       └── kpis.yaml
├── process-graphs/                # capa 4
│   └── joya/gasto-to-payment.yaml
└── skills/                        # capa 4 — procedural
    └── joya/validar-gastos.skill.yaml
```

| Capa | Eve | Persistencia |
|---|---|---|
| 1–4 (Core/Vertical/Company/Skill) | `defineDynamic` lee y compone | Store externo (file system → DB) |
| 5 (Runtime) | `defineState` | Memoria de la corrida |
| Autoridad / gates | hooks + `needsApproval` | Runtime |
| Verificación | `defineEval` | CI |

Cuando una capa necesite consultas/escala que el file system no dé, migra a DB **sin tocar** la arquitectura de loops ni la composición de overlays. Solo cambia el adaptador de lectura.

---

## 9. Validación externa (Celonis Process Intelligence)

La separación coincide con la tesis de Process Intelligence de Celonis:
- 82% de líderes cree que la IA solo entrega ROI si **entiende cómo corre el negocio**; 89% dice que ese contexto es crucial.
- Los procesos son el *blueprint* de cómo corre una empresa: seguir cientos/miles de casos dibuja cómo opera el negocio.
- El Process Intelligence Graph **no sale solo de los sistemas**: se construye enriqueciendo datos con contexto único de negocio (reglas, KPIs, benchmarks, arquitectura). La IA no puede inferir eso solo de datos crudos.

Esto valida la separación: **Intelisis da los datos y la estructura; la empresa da el contexto que convierte esos datos en operación inteligente.**

---

## 10. Tesis del context stack

> Intelisis es el lenguaje común. La empresa es el significado local. El proceso es la ruta. El agente es el navegador. Governance pone las leyes de tránsito. Sigma AGI es la inteligencia que mantiene el mapa vivo y decide cómo moverse.

Y la regla maestra que esto impone sobre el sistema:

> Sigma AGI no solo necesita inteligencia. Necesita **autoridad controlada**.

---

*Complemento de [`tesis.md`](./tesis.md) (v1). Define el modelo de contexto; la tesis principal define el modelo de ejecución (loops). Linaje original en [`tesis-v0.md`](./tesis-v0.md).*
