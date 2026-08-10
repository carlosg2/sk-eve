# Conclusión final

La mejor arquitectura para Sigma no es “un chatbot conectado a Intelisis”. Tampoco es “NLP2SQL”, “RAG sobre manuales”, ni “agentes con herramientas”.

La conclusión más fuerte de todo lo investigado es esta:

> **Una empresa no es un conjunto de apps. Es un sistema vivo de estados, transiciones, reglas, permisos, excepciones y decisiones. Sigma debe convertir ese sistema en una inteligencia operacional gobernada por agentes.**

El ERP es el sistema de registro.
Los traces son el genoma operacional.
Los skills son capacidades compiladas.
Los agentes son unidades operativas.
Las apps son superficies.
La gobernanza es el sistema inmunológico.
El Context Assembly es el cerebro que evita que el agente improvise.

La tesis final:

> **Sigma AGI es una plataforma de inteligencia operacional que aprende cómo opera una empresa observando su ERP, compila ese conocimiento en skills gobernados y permite que agentes especializados ejecuten procesos reales con contexto, permisos, evidencia y trazabilidad.**

Esto conecta con tres hallazgos clave: los agentes empresariales no deben limitarse a responder preguntas, sino planear y ejecutar tareas multi-paso; la IA empresarial solo escala cuando incorpora el contexto específico, herramientas, estándares y conocimiento institucional de la organización; y el problema técnico central ya no es buscar “chunks” relevantes, sino ensamblar el paquete correcto de contexto operativo antes de actuar.  

---

# PRD de producción

# Sigma AGI — Operational Intelligence Platform

## 1. Nombre del producto

**Sigma AGI Core**

Submódulos principales:

```text
Sigma Trace2Skill
Sigma ERP Kernel
Sigma Company Twin
Sigma Process Graph
Sigma Context Assembly
Sigma Skill Registry
Sigma Agent Runtime
Sigma Governance
Sigma Workbench
```

Nombre comercial recomendado:

> **Sigma AGI: la capa de inteligencia operacional para empresas que operan sobre ERP.**

---

# 2. Visión del producto

Sigma AGI permite que una empresa sea operable por agentes.

En vez de que los usuarios naveguen pantallas, reportes y procesos manuales, Sigma convierte la operación real del ERP en capacidades ejecutables por agentes especializados.

```text
Antes:
Usuario → App → ERP → Reporte → Decisión manual

Después:
Objetivo → Agente → Context Bundle → Skill → ERP → Acción → Evidencia
```

El objetivo no es reemplazar Intelisis.
El objetivo es **hacer que Intelisis sea operable por agentes**.

---

# 3. Problema

Las empresas tienen conocimiento operativo disperso:

```text
ERP
SQL Server
Stored procedures
Vistas
Tablas
Formas .frm
Usuarios expertos
Consultores
Políticas internas
Correos
Excel
Reportes
Flujos no documentados
Excepciones históricas
```

Ese conocimiento vive en tres lugares:

```text
1. En el ERP como datos y transacciones.
2. En los usuarios expertos como conocimiento tribal.
3. En los procesos reales como secuencias invisibles.
```

Los agentes actuales fallan porque cada vez que trabajan tienen que redescubrir contexto: qué tabla consultar, qué política aplica, qué permiso tiene el usuario, qué fuente es confiable, qué acción está permitida y qué evidencia debe dejar. El enfoque correcto es definir primero el “bundle” que el agente necesita y luego elegir las primitivas que lo entregan: SQL, grafos, documentos, memoria, policies o herramientas. 

---

# 4. Oportunidad

Intelisis tiene una ventaja extraordinaria para Sigma:

```text
Muchos clientes usan el mismo ERP base,
pero cada empresa opera distinto.
```

Eso permite separar:

```text
ERP Kernel:
lo común de Intelisis.

Company Twin:
lo específico de cada empresa.
```

Esta separación crea una ventaja vertical acumulativa.

Cada trace procesado mejora el ERP Kernel.
Cada cliente alimenta su Company Twin.
Cada proceso validado crea un skill reutilizable.
Cada ejecución deja evidencia.
Cada corrección humana mejora el sistema.

---

# 5. Usuarios objetivo

## 5.1 Usuario final operativo

Ejemplos:

```text
Analista de gastos
Cuentas por pagar
Compras
Ventas
Inventario
Producción
Finanzas
Auditoría
```

Necesita:

```text
Consultar
Validar
Clasificar
Ejecutar
Aprobar
Explicar
Dar seguimiento
```

---

## 5.2 Consultor técnico Intelisis

Es una figura clave.

No construye agentes desde cero.
Ayuda a convertir operación real en skills.

Responsabilidades:

```text
Capturar traces
Identificar proceso
Mapear SDK
Validar entidades
Confirmar secuencia
Definir permisos
Aprobar skill
```

---

## 5.3 Administrador / CIO / Dirección

Necesita:

```text
Controlar qué agentes existen
Qué pueden hacer
Quién puede usarlos
Qué datos pueden consultar
Qué acciones requieren aprobación
Qué evidencia se genera
Qué valor producen
```

El documento de Claude insiste en que gobierno, seguridad, auditabilidad, integración y continuidad del workflow son fundamentos para despliegues empresariales, no extras posteriores. 

---

# 6. Principios de producto

## Principio 1: El agente nunca improvisa

Todo agente debe operar sobre un **Operational Context Bundle**.

No debe buscar libremente hasta “entender”.
Debe recibir contexto ensamblado por Sigma.

---

## Principio 2: El trace es el genoma operacional

Un SQL Trace no es solo un log técnico.
Es una grabación de cómo una tarea real ocurre dentro del ERP.

El proceso Trace2Skill ya define la captura de `TextData`, `EventClass`, `Duration`, `Reads`, `Writes`, `CPU`, `StartTime`, `EndTime`, `SPID`, `ApplicationName` y otros campos para reconstruir la operación real. 

---

## Principio 3: El SDK es el mapa; el trace es el camino

```text
SDK Intelisis:
lo que puede pasar.

SQL Trace:
lo que realmente pasó.

Process Graph:
la interpretación operacional.

Skill:
la capacidad reutilizable.
```

En el caso GAS / Abono Bancario, el análisis ya demostró que el proceso no es una simple llamada a `spAfectar`; pasa por `Gasto.frm`, `Gasto`, `GastoD`, `GastoAplica`, `GastoPendiente`, validaciones previas y luego afectación formal. 

---

## Principio 4: No SQL libre en producción

Los agentes no deben escribir SQL arbitrario contra Intelisis.

Deben usar herramientas gobernadas:

```text
DAB endpoints
MCP tools
Stored procedures permitidos
Vistas aprobadas
Contratos de lectura/escritura
Permisos por rol
```

El pipeline Trace2Skill ya contempla generar `dab-config.json` como contrato DAB/MCP para exponer herramientas seguras. 

---

## Principio 5: Autonomía gradual

Ningún skill nace autónomo.

Debe subir por niveles:

```text
Level 0: documentación
Level 1: responde dudas
Level 2: recomienda acciones
Level 3: shadow mode
Level 4: ejecuta con aprobación
Level 5: ejecuta bajo límites
Level 6: autonomía supervisada
```

---

# 7. Alcance del producto

## MVP de producción

El primer producto no debe intentar cubrir todo Intelisis.

Debe cubrir un dominio medible:

> **Gastos y Cuentas por Pagar**

Primer caso recomendado:

> **GAS / Abono Bancario**

Ya existe evidencia real para este proceso: el trace contiene 2,449 filas, 2,069 eventos significativos y llamadas observadas a `spAfectar 'GAS', 2517, 'AFECTAR', 'Todo'`. 

---

# 8. Jobs to be done

## JTBD 1 — Convertir operación real en skill

Cuando un consultor capture un proceso real en Intelisis, quiere subir el trace y el SDK relacionado para que Sigma genere una secuencia funcional, un process card, un skill y un contrato DAB/MCP.

Resultado esperado:

```text
trace-events.normalized.json
sdk-index.json
process-model.json
sequence.yaml
skill.yaml
process-card.md
dab-config.json
```

Esto ya está alineado con el pipeline actual de Trace2Skill. 

---

## JTBD 2 — Operar con contexto

Cuando un usuario pida revisar o afectar movimientos, el agente debe ensamblar el contexto correcto antes de recomendar o ejecutar.

Ejemplo:

```text
“Revisa los abonos bancarios pendientes y dime cuáles puedo afectar.”
```

Sigma debe:

```text
1. Identificar usuario y permisos.
2. Consultar movimientos GAS pendientes.
3. Validar acreedor/proveedor.
4. Validar aplicaciones y saldos.
5. Validar cuenta de dinero.
6. Revisar reglas previas.
7. Clasificar listos / bloqueados.
8. Explicar cada decisión.
9. Pedir autorización si aplica.
10. Ejecutar solo vía herramienta gobernada.
11. Guardar evidencia.
```

---

## JTBD 3 — Ejecutar sin romper el ERP

Cuando un agente ejecute una acción, debe hacerlo solo por herramientas permitidas, con snapshot antes/después y bitácora.

Ejemplo:

```text
Afectar movimiento GAS
→ validar bundle
→ pedir aprobación
→ ejecutar MCP/DAB tool
→ capturar respuesta
→ comparar before/after
→ guardar evidencia
```

---

# 9. Arquitectura funcional

```text
Sigma AGI Core
│
├─ 1. Operational Capture Layer
│  └─ Captura traces, eventos, acciones humanas y cambios reales.
│
├─ 2. ERP Kernel
│  └─ Modelo común de Intelisis: módulos, movimientos, tablas, vistas, SPs.
│
├─ 3. Runtime Trace Intelligence
│  └─ Convierte SQL traces en eventos, fases, entidades y transiciones.
│
├─ 4. SDK Intelligence
│  └─ Indexa .frm, .tbl, .vis, .sql y documentación técnica.
│
├─ 5. Process Graph
│  └─ Grafo vivo de procesos, estados, reglas, acciones y dependencias.
│
├─ 6. Company Twin
│  └─ Políticas, roles, sucursales, límites, departamentos y excepciones.
│
├─ 7. Context Assembly Layer
│  └─ Ensambla Operational Context Bundles.
│
├─ 8. Skill Compiler
│  └─ Genera skills operativos desde traces + SDK + interpretación.
│
├─ 9. Tool Contract Layer
│  └─ Genera DAB/MCP tools seguros.
│
├─ 10. Agent Runtime
│  └─ Ejecuta agentes especializados por departamento.
│
├─ 11. Governance & Evidence
│  └─ Permisos, auditoría, aprobaciones, bitácoras, snapshots.
│
└─ 12. Learning Loop
   └─ Correcciones humanas que mejoran bundles, skills y reglas.
```

---

# 10. Componentes principales

## 10.1 Sigma Trace2Skill

Convierte operación real en artefactos.

Input:

```text
SQL Trace
SDK Intelisis
Manifest del proceso
Interpretación del consultor
Política de autonomía
```

Output:

```text
Process Model
Sequence YAML
Skill YAML
Process Card
DAB/MCP Contract
Context Bundle Template
Test Cases
```

Requisito clave:

> El sistema debe producir conocimiento operativo, no documentación técnica para usuarios finales.

---

## 10.2 ERP Kernel

Modelo canónico de Intelisis.

Contiene:

```text
Módulos
Movimientos
Tablas
Vistas
Formas
Procedimientos
Afectaciones
Estatus
Relaciones
Hooks
Bitácoras
```

Ejemplo derivado del análisis:

```text
spAfectar:
gateway universal de afectación.

spGasto:
transition engine específico de GAS.

Gasto.frm:
orquestador visual y de validaciones.

AfectarBitacora:
evidencia de intento y resultado.
```

En el análisis v5, `spAfectar` quedó modelado como gateway universal que valida, ejecuta hooks, enruta y traduce resultado; `spGasto` quedó como transition engine específico de GAS, aunque su cuerpo está encriptado. 

---

## 10.3 Company Twin

Modelo vivo de cómo opera cada cliente.

Incluye:

```text
Empresas
Sucursales
Usuarios
Roles
Departamentos
Centros de costo
Límites de autorización
Políticas internas
Excepciones
Preferencias operativas
```

Ejemplo:

```yaml
company_policy:
  gastos:
    requiere_xml: true
    limite_aprobacion_director: 150000
    gastos_sin_presupuesto: bloquear
    gastos_sin_acreedor_valido: revision
```

---

## 10.4 Process Graph

Representa workflows como grafos vivos.

Nodo:

```text
Estado
Validación
Acción
Entidad
Documento
Usuario
Política
Stored procedure
Evidencia
```

Arista:

```text
depende_de
valida
genera
afecta
bloquea
requiere_aprobacion
produce_evidencia
```

Ejemplo:

```text
Gasto pendiente
→ validar acreedor
→ validar aplicaciones
→ validar cuenta dinero
→ pre-afectación
→ spAfectar
→ spGasto
→ bitácora
→ refresco de forma
```

---

## 10.5 Context Assembly Layer

Capa más importante del producto.

Genera el **Operational Context Bundle**.

Ejemplo:

```yaml
bundle:
  id: gas_abono_bancario_afectacion
  task: afectar_abono_bancario

identity:
  user_id: current_user
  role: cuentas_por_pagar
  permissions:
    - gastos.read
    - gastos.validate
    - gastos.affect.request

erp_state:
  module: GAS
  movement: Abono Bancario
  main_entity: Gasto
  detail_entity: GastoD
  application_entity: GastoAplica
  pending_view: GastoPendiente

required_validations:
  - estatus_movimiento
  - acreedor
  - saldo_pendiente
  - vencimiento
  - cuenta_dinero
  - impuestos
  - retenciones
  - efos
  - permisos_usuario

transition:
  gateway: spAfectar
  module_engine: spGasto
  action: AFECTAR
  base: Todo

evidence:
  - before_snapshot
  - sql_sources
  - validation_results
  - user_approval
  - execution_result
  - after_snapshot

allowed_actions:
  - recomendar
  - bloquear
  - pedir_autorizacion
  - ejecutar_con_aprobacion

forbidden_actions:
  - update_directo_estatus
  - sql_libre
  - afectar_sin_snapshot
  - afectar_sin_permiso
```

---

## 10.6 Skill Registry

Catálogo gobernado de skills.

Cada skill debe tener:

```yaml
skill_id: gastos.gas_abono_bancario.validar_afectacion
version: 1.0.0
domain: gastos
erp: Intelisis
module: GAS
movement: Abono Bancario
autonomy_level: shadow
status: draft | validated | production | deprecated
required_tools: []
required_permissions: []
context_bundle_template: {}
test_cases: []
owner: consultor_tecnico
approver: admin_operaciones
```

---

## 10.7 Agent Runtime

Ejecuta agentes especializados.

Primeros agentes:

```text
Agente de Gastos
Agente de Cuentas por Pagar
Agente de Auditoría Operativa
Agente de Consultor Intelisis
```

El agente no debe contener toda la lógica.
Debe consumir bundles, skills y tools.

---

## 10.8 Governance & Evidence

Cada acción debe registrar:

```text
Usuario
Agente
Skill usado
Versión del skill
Bundle usado
Datos consultados
Permisos evaluados
Validaciones realizadas
Recomendación
Aprobación humana
Tool ejecutado
Resultado
Before snapshot
After snapshot
Errores
Timestamp
```

---

# 11. Requerimientos funcionales

## F1. Carga de traces

El usuario técnico puede cargar archivos `.csv` de SQL Trace.

Debe soportar:

```text
Un trace
Múltiples traces
Batch por carpeta
Clasificación por proceso
Detección de módulo y movimiento
```

Prioridad: P0.

---

## F2. Carga de SDK Intelisis

El sistema puede indexar:

```text
.frm
.tbl
.vis
.sql
.md
```

Prioridad: P0.

---

## F3. Manifest del proceso

El consultor puede crear/editar un manifest:

```json
{
  "processId": "GAS_ABONO_BANCARIO",
  "name": "GAS / Abono Bancario",
  "department": "gastos",
  "erp": "Intelisis",
  "module": "GAS",
  "movement": "Abono Bancario",
  "capturedFrom": {
    "userRole": "usuario_final",
    "scenario": "Afectación de abono bancario",
    "result": "success"
  },
  "autonomy": {
    "level": "shadow",
    "requiresApprovalForExecute": true
  }
}
```

Prioridad: P0.

---

## F4. Normalización del trace

El sistema debe convertir eventos SQL en eventos normalizados:

```text
query
stored_procedure
table_read
table_write
form_load
prepared_statement
execute_statement
update
insert
delete
affectation_call
```

Prioridad: P0.

---

## F5. Detección de fases

El sistema debe generar fases funcionales:

```text
abrir_forma
cargar_encabezado
cargar_detalle
cargar_aplicaciones
validar_acreedor
validar_cuenta_dinero
validaciones_previas
afectacion
verificacion_posterior
```

Prioridad: P0.

---

## F6. Generación de Process Card

Debe producir un documento entendible por consultor:

```text
Hipótesis funcional
Secuencia
Entidades
Procedimientos
Validaciones
Riesgos
Evidencia
Limitaciones
```

Prioridad: P0.

---

## F7. Generación de skill.yaml

Debe producir un skill operativo para agente.

Debe incluir:

```text
Propósito
Cuándo usar
Cuándo no usar
Contexto requerido
Validaciones
Herramientas
Nivel de autonomía
Formato de respuesta
Criterios de bloqueo
```

Prioridad: P0.

---

## F8. Generación de DAB/MCP contract

Debe producir `dab-config.json` base.

Debe incluir:

```text
Entidades de lectura
Stored procedures permitidos
Permisos por rol
Variables de conexión
Operaciones bloqueadas
```

Prioridad: P0.

---

## F9. Shadow Mode

El agente debe poder operar sin ejecutar acciones reales.

Debe:

```text
Clasificar movimientos
Recomendar acciones
Detectar bloqueos
Explicar razones
Comparar contra decisión humana
Generar métricas
```

Prioridad: P0.

---

## F10. Ejecución con aprobación

Después de validación, el agente puede ejecutar solo con aprobación explícita.

Debe:

```text
Mostrar resumen
Mostrar riesgos
Pedir confirmación
Ejecutar tool gobernada
Guardar evidencia
Comparar before/after
```

Prioridad: P1.

---

## F11. Observabilidad

Debe registrar:

```text
Tiempo de ensamblaje de contexto
Número de tools llamadas
Costo por ejecución
Errores
Validaciones fallidas
Acciones bloqueadas
Porcentaje de coincidencia con humano
```

Prioridad: P0.

---

# 12. Requerimientos no funcionales

## Seguridad

```text
Cifrado en tránsito
Cifrado en reposo
Variables de entorno para conexiones
API key interna
RBAC
Separación por tenant
No SQL libre
No credenciales en prompts
Logs sin secretos
```

---

## Confiabilidad

```text
Reintentos controlados
Timeouts por tool
Circuit breaker
Fallback a humano
Idempotencia en ejecución
Snapshots antes/después
Rollback lógico cuando aplique
```

---

## Auditoría

```text
Toda recomendación debe ser auditable.
Toda ejecución debe tener evidencia.
Toda excepción debe quedar registrada.
Toda versión de skill debe ser rastreable.
```

---

## Performance

Objetivos iniciales:

```text
Context bundle: < 2 segundos para casos simples
Clasificación de movimientos: < 5 segundos para lote pequeño
Ejecución tool: según ERP, con timeout configurable
UI interactiva: < 500 ms para navegación principal
```

---

# 13. UX del producto

## 13.1 Sigma Workbench

Interfaz para consultores y admins.

Secciones:

```text
Procesos
Traces
SDK Index
Process Graph
Skills
Agents
Governance
Evidence
Metrics
```

---

## 13.2 Vista de proceso

Debe mostrar:

```text
Nombre del proceso
Módulo
Movimiento
Trace source
SDK source
Fases detectadas
Entidades
Procedimientos
Riesgos
Estado del skill
Nivel de autonomía
```

---

## 13.3 Vista de agente

Ejemplo para usuario final:

```text
Agente de Gastos

“Encontré 18 abonos bancarios pendientes:
- 11 listos para revisión
- 5 bloqueados por saldo/documento
- 2 requieren validación de cuenta de dinero

Puedo preparar la afectación de los 11 listos.
Requiere aprobación antes de ejecutar.”
```

---

## 13.4 Vista de evidencia

Por cada acción:

```text
Qué se hizo
Por qué se recomendó
Qué datos se usaron
Qué validaciones pasaron
Qué validaciones fallaron
Quién aprobó
Qué tool se ejecutó
Qué cambió después
```

---

# 14. Modelo de datos conceptual

```text
Tenant
User
Role
Permission
ERPConnection
Trace
SDKArtifact
Process
ProcessPhase
ProcessGraphNode
ProcessGraphEdge
Skill
SkillVersion
ContextBundleTemplate
ContextBundleInstance
Agent
ToolContract
ExecutionRun
EvidenceRecord
HumanReview
Policy
Approval
```

---

# 15. API conceptual

## Procesar manifest

```http
POST /process
```

Input:

```json
{
  "manifest": "manifests/gas-abono-bancario.json",
  "out": "data/out"
}
```

Output:

```json
{
  "ok": true,
  "processId": "GAS_ABONO_BANCARIO",
  "artifacts": [
    "sequence.yaml",
    "skill.yaml",
    "process-card.md",
    "dab-config.json"
  ]
}
```

El servidor actual de Trace2Skill ya contempla endpoints `/health`, `/process` y `/batch` protegidos por API key. 

---

## Crear context bundle

```http
POST /context/assemble
```

Input:

```json
{
  "skillId": "gastos.gas_abono_bancario.validar_afectacion",
  "userId": "u_123",
  "params": {
    "movementId": 2517
  }
}
```

Output:

```json
{
  "bundleId": "bundle_abc",
  "status": "ready",
  "validations": [],
  "allowedActions": ["recommend", "request_approval"]
}
```

---

## Ejecutar skill

```http
POST /agent/run
```

Input:

```json
{
  "agentId": "agent_gastos",
  "skillId": "gastos.gas_abono_bancario.validar_afectacion",
  "bundleId": "bundle_abc",
  "mode": "shadow"
}
```

---

## Aprobar ejecución

```http
POST /approvals/{approvalId}/approve
```

---

# 16. Stack técnico recomendado

## Backend

```text
Node.js
TypeScript
Express / Fastify
PostgreSQL para metadata de Sigma
SQL Server para Intelisis
Microsoft DAB para contratos de datos
MCP para herramientas de agentes
Redis para jobs/caché
BullMQ para procesamiento batch
OpenTelemetry para observabilidad
```

## Frontend

```text
SvelteKit
shadcn-svelte
Tailwind
TanStack Table
Graph visualization para Process Graph
```

## AI Layer

```text
Model-agnostic
OpenAI / Claude / local según cliente
Tool calling
Structured outputs
Eval harness
Prompt/version registry
```

## Deployment

```text
Docker Compose inicial
PM2 opcional para servidor Node
IIS reverse proxy si cliente Windows
On-prem o private cloud
Separación por tenant
```

---

# 17. Roadmap de producción

## Fase 0 — Foundation

Duración: 2 a 3 semanas.

Entregables:

```text
Repositorio monorepo
Auth básica
Tenancy básico
Trace upload
SDK upload
Manifest editor
Job runner
Storage de artefactos
```

---

## Fase 1 — Trace2Skill Production

Duración: 4 a 6 semanas.

Entregables:

```text
Parser robusto de traces
SDK indexer
Sequence detector
Process card generator
Skill YAML generator
DAB/MCP generator
Batch processing
```

Criterio de éxito:

```text
Procesar 10 traces reales y generar artefactos revisables por consultor.
```

---

## Fase 2 — Context Assembly + Shadow Agent

Duración: 4 a 6 semanas.

Entregables:

```text
Context Bundle Template
Context Bundle Runtime
Agente de Gastos en shadow mode
Clasificación listo/bloqueado
Explicación con evidencia
Comparación contra humano
```

Criterio de éxito:

```text
≥ 85% coincidencia con decisión humana en casos conocidos.
0 ejecuciones reales.
100% acciones explicadas con evidencia.
```

---

## Fase 3 — Ejecución con aprobación

Duración: 4 a 8 semanas.

Entregables:

```text
Approval workflow
Before snapshot
DAB/MCP execution
After snapshot
Evidence ledger
Rollback lógico cuando aplique
```

Criterio de éxito:

```text
Ejecutar movimientos de bajo riesgo con aprobación humana y evidencia completa.
```

---

## Fase 4 — Skill Marketplace interno

Duración: 6 a 8 semanas.

Entregables:

```text
Catálogo de skills
Versionado
Estados draft/validated/production
Owner/aprobador
Permisos por rol
Métricas de uso
```

---

# 18. Métricas de éxito

## Métricas técnicas

```text
% de traces procesados correctamente
% de entidades detectadas
% de fases clasificadas
Tiempo de generación de skill
Errores por proceso
Cobertura de evidencia
```

## Métricas operativas

```text
Tiempo de revisión de gastos
Tiempo de afectación
Movimientos clasificados por hora
% movimientos bloqueados correctamente
% decisiones coincidentes con humano
Reducción de consultas manuales
```

## Métricas de negocio

```text
Horas ahorradas
Errores evitados
Procesos automatizados
Skills reutilizados
Departamentos activados
Usuarios activos
```

---

# 19. Riesgos y mitigaciones

## Riesgo 1: Interpretar mal un trace

Mitigación:

```text
Shadow mode obligatorio
Human review
Confidence score
Versionado de skills
```

---

## Riesgo 2: Ejecutar acción incorrecta en ERP

Mitigación:

```text
No SQL libre
Aprobación humana
Snapshots
Límites de monto/riesgo
Tools gobernadas
```

---

## Riesgo 3: sp encriptados

Mitigación:

```text
Modelar como transition nodes
Inferir por trace
Usar before/after diff
Usar AfectarBitacora
Validar con consultor
```

El caso `spGasto` confirma este patrón: aunque el cuerpo está encriptado, la firma, posición en la ruta y comportamiento del trace permiten modelarlo como nodo de transición específico de GAS. 

---

## Riesgo 4: Sobrearquitectura

Mitigación:

```text
Empezar por Gastos/CxP
Un proceso
Un agente
Un set de tools
Métricas claras
Expandir solo después de validar
```

---

# 20. Definición de “production ready”

Un skill está listo para producción cuando cumple:

```text
Tiene process card aprobado.
Tiene skill.yaml versionado.
Tiene DAB/MCP contract.
Tiene Context Bundle Template.
Tiene permisos definidos.
Tiene pruebas con traces reales.
Tiene shadow mode validado.
Tiene confidence score aceptable.
Tiene owner y aprobador.
Tiene evidencia de comparación contra humano.
Tiene plan de rollback o bloqueo.
```

---

# 21. Primer caso de uso exacto

## Skill inicial

```text
gastos.gas_abono_bancario.validar_y_preparar_afectacion
```

## Usuario

```text
Analista de Cuentas por Pagar
```

## Pregunta

```text
“Revisa los abonos bancarios pendientes y dime cuáles puedo afectar.”
```

## Respuesta esperada

```text
Encontré 12 abonos bancarios pendientes.

Listos para revisión:
- 7 movimientos cumplen validaciones principales.

Bloqueados:
- 3 tienen diferencias en saldo o aplicación.
- 1 requiere validar cuenta de dinero.
- 1 requiere revisión de acreedor.

No ejecuté ninguna afectación porque este skill está en shadow mode.
Puedo generar el reporte de evidencia o preparar la solicitud de aprobación.
```

---

# 22. La versión extraordinaria

La versión extraordinaria no es que Sigma responda preguntas.

La versión extraordinaria es esta:

```text
Sigma observa cómo opera un usuario experto.
Entiende la secuencia real.
La cruza con el SDK.
Construye un grafo del proceso.
Genera un skill.
Lo ejecuta primero en sombra.
Aprende de la revisión humana.
Luego opera bajo límites.
Y deja evidencia de cada decisión.
```

Eso convierte a Sigma en algo distinto:

> **Un compilador de operación empresarial.**

No solo automatiza procesos.
**Compila procesos reales en capacidades agentic.**

---

# 23. Producto final en una frase

> **Sigma AGI convierte la operación real de Intelisis en una red de agentes gobernados que entienden procesos, ensamblan contexto, ejecutan skills y dejan evidencia.**

O más comercial:

> **Sigma transforma el ERP de sistema de registro a sistema de inteligencia operacional.**

O más ambicioso:

> **Sigma hace que la empresa sea operable por agentes.**

---

# 24. La decisión estratégica

La mejor ruta no es construir “todo Sigma” de una vez.

La ruta correcta es:

```text
1. Construir Trace2Skill Production.
2. Validarlo con GAS / Abono Bancario.
3. Crear Agente de Gastos en shadow mode.
4. Medir contra usuario humano.
5. Activar ejecución con aprobación.
6. Convertirlo en Department Pack.
7. Repetir en CxP, Compras, Ventas, Inventario y Producción.
```

El primer producto vendible puede ser:

> **Sigma Gastos Agent Pack para Intelisis**

Incluye:

```text
Agente de Gastos
Trace2Skill
Skills de GAS
DAB/MCP contracts
Shadow mode
Evidence ledger
Approval workflow
Dashboard operativo
```

Ese es el wedge perfecto: pequeño para construir, serio para vender, profundo para diferenciarse y poderoso para demostrar la tesis completa.
