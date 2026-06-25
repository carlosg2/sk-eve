Sigma AGI
Tesis de investigacion para un mini-AGI empresarial sobre Intelisis ERP
Documento consolidado: vision, fundamentos, arquitectura, PRD, seguridad, metodologia y roadmap




Formulacion central: Sigma AGI no es un chatbot, no es un dashboard ERP y no es RPA tradicional. Es una capa de inteligencia operativa sobre Intelisis que aprende de trazas reales, formaliza procesos como skills ejecutables y permite que agentes operen trabajo empresarial con control humano, trazabilidad y gobierno.
Resumen
Este documento consolida el proyecto Sigma AGI como una tesis tecnica y estrategica para construir un mini-AGI empresarial vertical sobre Intelisis ERP. La hipotesis es que la siguiente etapa del software empresarial no sera una pantalla mas bonita encima del ERP, sino una capa de inteligencia operativa capaz de entender como trabaja realmente una empresa, compilar ese conocimiento en capacidades reutilizables y ejecutar acciones de negocio de forma segura, auditable y gobernada.
Sigma AGI nace de una observacion simple: las empresas ya tienen una enorme cantidad de inteligencia operacional, pero esta distribuida en lugares que normalmente no se conectan entre si. Parte vive en Intelisis: tablas, formularios, modulos, movimientos, procedimientos almacenados, vistas, validaciones y permisos. Parte vive en la operacion real: trazas SQL, acciones de usuarios, errores, aprobaciones, excepciones, reportes, hojas de Excel, documentos, tickets de soporte y conocimiento tacito de consultores. Parte vive en cada empresa: politicas, roles, prioridades, calendarios, configuraciones, gaps, costumbres y criterios de decision. Sigma propone convertir todo eso en un sistema vivo.
La tesis final puede expresarse asi: Sigma AGI es la inteligencia empresarial que convierte operacion en conocimiento, conocimiento en capacidad y capacidad en ejecucion autonoma gobernada. Su forma de producto no debe reducirse a un copiloto ni a un chatbot para consultar el ERP. Su verdadero valor esta en un nucleo de arquitectura compuesto por ERP Kernel, Company Twin, Process Graph, Trace2Skill, Skill Registry, Context Assembly, Agent Cortex, Execution Gateway y Governance Layer.
El documento integra los aprendizajes acumulados del proyecto: la necesidad de separar contexto universal de Intelisis y contexto especifico de cada empresa; la idea de que las trazas SQL son el genome operativo; el enfoque de ActiveGraph donde el log no es un subproducto sino el sustrato del agente; el modelo de Block de capabilities + world model + intelligence layer; la utilidad de MCP y Data API Builder como interfaces controladas; y la prioridad de gobierno, aprobaciones, simulacion, idempotencia y auditoria para cualquier agente con capacidad de escritura.
Palabras clave
Sigma AGI; Intelisis ERP; mini-AGI empresarial; Agentic Process Intelligence; Trace2Skill; ERP Kernel; Company Twin; Process Graph; Skill Compiler; Agent Cortex; Execution Gateway; Governance Layer; SQL Server; MCP; Data API Builder; process mining; event-sourced agents.
Indice estructural
1. Tesis ejecutiva
2. Problema de investigacion
3. Argumento desde first principles
4. Fundamentos externos verificados
5. Definicion de Sigma AGI
6. Arquitectura por capas
7. Separacion de contextos
8. Metodologia Trace2Skill
9. Caso de estudio: GAS / Abono Bancario
10. Modelo de ejecucion agentica
11. Datos, memoria y conocimiento
12. Gobierno, seguridad y control
13. PRD de Sigma AGI Core
14. Blueprint tecnico de implementacion
15. Aplicaciones verticales y aprendizajes del proyecto
16. Metodologia de evaluacion
17. Roadmap
18. Riesgos y preguntas abiertas
19. Conclusion
Apendices y bibliografia
1. Tesis ejecutiva
Sigma AGI debe presentarse como un mini-AGI empresarial vertical para organizaciones que operan sobre Intelisis ERP. La palabra clave no es "chatbot" sino "inteligencia operativa". La tesis no consiste en que un modelo de lenguaje pueda conversar con usuarios sobre datos del ERP; eso es util pero no diferencial. La tesis consiste en que un sistema puede observar la operacion real, entender las reglas implicitas y explicitas del negocio, convertirlas en capacidades ejecutables y coordinar trabajo a traves del ERP con seguridad.
El ERP ya contiene una parte enorme del mapa operativo de la empresa: catalogos, documentos, movimientos, estatus, procedimientos, afectaciones, permisos y transacciones. Pero el ERP por si solo no sabe por que los usuarios hacen lo que hacen, que excepciones importan, cuales pasos son historicos, cuales son politicos, cuales son controles de riesgo y cuales son habitos locales de una empresa. Esa diferencia entre lo que el sistema permite y como la empresa realmente opera es precisamente el espacio donde Sigma puede crear valor.
Sigma no debe competir contra Intelisis. Sigma debe vivir encima de Intelisis como una capa de inteligencia, memoria y ejecucion. Intelisis conserva su funcion como sistema transaccional y fuente de verdad. Sigma agrega el modelo operacional, la capacidad agentica y la gobernanza necesaria para operar trabajo empresarial sin perder control.
1.1 Formulacion final de la tesis
La formulacion mas fuerte es la siguiente: Sigma AGI es una capa de inteligencia operativa sobre Intelisis ERP que aprende de la operacion real, convierte trazas y procesos en skills gobernados, y permite a agentes ejecutar trabajo empresarial con evidencia, aprobacion, trazabilidad y aprendizaje continuo.
En una frase mas comercial: Sigma AGI es el cerebro operativo para empresas que usan Intelisis.
En una frase mas tecnica: Sigma AGI es un runtime agentico, event-sourced y gobernado, construido sobre un ERP Kernel de Intelisis, un Company Twin por cliente, un Process Graph por flujo y un Skill Registry de capacidades ejecutables.
1.2 Diferenciacion estrategica
La mayoria de productos de IA empresarial empiezan por la interfaz: un chat, un copiloto, un dashboard, un voice assistant o una pantalla generada. Sigma debe empezar por el sustrato. Las interfaces son superficies. El valor defendible esta en el modelo que entiende la operacion: que entidades existen, que movimientos son validos, que secuencia produce un resultado, que permisos aplican, que excepciones bloquean, que aprobaciones se requieren y que evidencia confirma que una accion fue correcta.
El producto sera fuerte si cada implementacion alimenta el sistema. Cada traza SQL, cada gap, cada procedimiento, cada bug, cada training, cada release y cada soporte debe incrementar la memoria operacional. Con el tiempo, Sigma deja de ser una herramienta y se convierte en una capa compuesta de conocimiento procedural acumulado.
1.3 Tres leyes del producto
El ERP es el sustrato de capacidad. Define que se puede hacer, con que entidades, bajo que movimientos, estatus, reglas y procedimientos.
La traza es el genome operativo. Revela como se ejecuta realmente el trabajo, no solo como esta documentado.
La autonomia solo existe dentro de gobierno. Un agente que ejecuta sin permisos, evidencia, aprobacion, idempotencia y auditoria no es producto; es riesgo.
1.4 Resultado esperado
Si se ejecuta correctamente, Sigma produce un nuevo tipo de activo empresarial: skills operativos versionados. Un skill no es un prompt. Un skill es una capacidad procedural con intencion, contexto requerido, herramientas permitidas, precondiciones, reglas de negocio, politicas, aprobaciones, simulacion, ejecucion, verificacion y auditoria. La empresa deja de depender exclusivamente de conocimiento tacito y empieza a construir una biblioteca viva de capacidades operables por agentes.
2. Problema de investigacion
El problema central es que la operacion empresarial es rica, contextual y procedural, pero sus representaciones digitales estan fragmentadas. El ERP guarda transacciones, pero no siempre captura el razonamiento humano que las produjo. Los consultores conocen procesos, pero ese conocimiento suele quedarse en notas, tickets, conversaciones o experiencia personal. Los usuarios dominan excepciones, pero no las documentan como reglas formales. Los desarrolladores entienden stored procedures y gaps, pero no necesariamente documentan el significado de negocio de cada secuencia.
El resultado es que cada proyecto redescubre gran parte de su contexto. Cada soporte requiere reconstruir que paso. Cada implementacion vuelve a levantar conocimiento similar. Cada automatizacion necesita reentender el proceso. Cada nuevo agente sin memoria operacional vuelve a preguntar o inferir lo que el sistema ya debio haber aprendido.
2.1 Fragmentacion del conocimiento operativo
En la practica, la inteligencia operativa de una empresa esta distribuida en al menos siete capas:
Metadata ERP: tablas, formularios, modulos, movimientos, estatus, vistas, stored procedures, funciones y validaciones.
Ejecucion real: trazas SQL, logs, eventos de UI, acciones de usuarios, errores, tiempos, bloqueos y resultados.
Procedimiento humano: capacitaciones, manuales, habitos de usuarios, reglas no escritas y criterios de excepcion.
Juicio gerencial: aprobaciones, prioridades, escalaciones, limites, politica comercial y tolerancia al riesgo.
Artefactos externos: Excel, PDFs, correos, WhatsApp, carpetas, ordenes, documentos de cliente o proveedor.
Gaps y customizaciones: codigo, reportes, stored procedures, pantallas, integraciones y reglas especificas del cliente.
Evidencia de resultado: si el proceso funciono, si genero retrabajo, si afecto contabilidad, inventario, tesoreria, produccion o servicio.
2.2 El cuello de botella de implementacion
La practica de implementacion descrita en el proyecto ya contiene las piezas de un sistema de inteligencia: levantamiento de requerimientos, configuracion de modulos Intelisis, implementacion por departamento, desarrollo de gaps, capacitacion, liberacion y mejora continua. Cada una de esas actividades produce informacion reusable. El problema es que hoy esa informacion no se transforma automaticamente en una capa operativa ejecutable.
Sigma debe convertir la consultoria ERP en una fabrica de inteligencia procedural. Cada levantamiento debe alimentar el Company Twin. Cada traza debe alimentar el Process Graph. Cada gap debe alimentar el ERP Kernel y la biblioteca de capacidades. Cada soporte debe alimentar la memoria episodica. Cada correccion debe mejorar los skills.
2.3 Por que no basta un chatbot ERP
Un chatbot sobre tablas puede contestar preguntas. Un mini-AGI empresarial debe poder entender consecuencias. La diferencia es profunda. Preguntar "cuanto se debe a este proveedor" es una consulta. Preparar un abono, validar su saldo pendiente, simular su afectacion, pedir autorizacion, ejecutar spAfectar, verificar contabilidad y generar un recibo auditable es operacion. Sigma debe enfocarse en la segunda categoria.
Un producto verdaderamente defensible no se limita a buscar informacion. Debe modelar procesos, capacidades, riesgo, contexto y accion.
3. Argumento desde first principles
Desde first principles, una empresa no es un organigrama ni una coleccion de pantallas. Es un sistema de restricciones, recursos, roles, compromisos y cambios de estado. Una venta modifica inventario, cuentas por cobrar, impuestos, promesas de entrega y demanda futura. Una compra modifica proveedores, inventario, flujo de efectivo y aprobaciones. Una orden de produccion modifica materiales, capacidad, calidad y costo. Un abono bancario modifica saldos, bancos, contabilidad y conciliacion.
Por lo tanto, la IA empresarial no debe pensarse primero como conversacion sino como razonamiento sobre cambios de estado. La pregunta principal no es "que contesto", sino "que va a cambiar, con que autorizacion, con que evidencia, con que impacto y con que posibilidad de verificacion".
3.1 Operacion es cambio de estado
Las interfaces de lenguaje natural son utiles porque reducen friccion, pero la empresa se gobierna por transacciones. Un agente puede hablar, pero debe actuar como planificador de transacciones gobernadas. Esto exige que cada accion tenga contrato, permisos, precondiciones, politica, evidencia, resultado esperado y verificacion posterior.
3.2 El ERP es frontera de accion
Si Intelisis es el sistema de registro, Sigma no debe crear una realidad paralela. Debe usar Intelisis como frontera de accion. Las escrituras deben pasar por caminos aprobados: procedimientos, APIs, SDK, DAB, MCP controlado o wrappers de servicio. Nunca por escrituras libres directas en tablas de produccion. El agente no debe inventar atajos que los humanos no pueden auditar.
3.3 La operacion real es el mejor dataset
Los manuales describen como deberia funcionar un proceso. Las trazas muestran como funciona. En un ERP, la traza revela tablas consultadas, vistas usadas, funciones invocadas, stored procedures ejecutados, parametros, errores, tiempos y secuencia real. Esa informacion, conectada al SDK y al conocimiento humano, permite reconstruir el procedimiento operativo.
3.4 El valor esta en el world model
Un agente sin modelo del mundo solo improvisa con contexto temporal. Un agente con Company Twin entiende la empresa. Para Sigma, el world model tiene dos dimensiones: el mundo del ERP y el mundo de la empresa. El mundo del ERP responde que capacidades existen en Intelisis. El mundo de la empresa responde como esa organizacion usa esas capacidades, con que politicas, excepciones y criterios.
3.5 Autonomia progresiva
La autonomia no debe activarse de golpe. Debe ganarse. Primero el sistema observa. Luego explica. Luego recomienda. Luego prepara borradores. Luego simula. Luego solicita aprobacion. Luego ejecuta con aprobacion. Finalmente, en procesos maduros y de bajo riesgo, puede operar dentro de limites. Este ladder reduce riesgo y crea confianza.
4. Fundamentos externos verificados
La tesis de Sigma se fortalece al conectarse con movimientos externos relevantes: organizaciones como inteligencia, event-sourced agents, process mining, MCP, Data API Builder, observabilidad y seguridad SQL Server. Estas referencias no sustituyen la vision de Sigma; sirven para darle vocabulario, evidencia arquitectonica y limites de produccion.
4.1 From Hierarchy to Intelligence
El articulo de Block propone que las empresas pueden dejar de depender de jerarquias humanas como mecanismo principal de ruteo de informacion y pasar a operar como una inteligencia. La estructura conceptual es capabilities, world model e intelligence layer. Adaptado a Sigma, las capabilities no son pagos o lending como en Block, sino primitivas ERP: movimientos, afectaciones, aprobaciones, compras, gastos, inventarios, produccion, ventas, contabilidad y reportes. El world model no es solo cliente/mercado; es la combinacion ERP Kernel + Company Twin. La intelligence layer es Agent Cortex + Governance + Execution Gateway.
La leccion mas importante es que la ventaja no esta en tener agentes aislados, sino en acumular un entendimiento propietario que se profundiza cada vez que el sistema opera.
4.2 The Log is the Agent y ActiveGraph
ActiveGraph plantea una idea clave: el log append-only no debe ser un artefacto secundario de debugging, sino el sustrato del agente. La grafica de trabajo se reconstruye como proyeccion deterministica del log, y los comportamientos reaccionan a cambios en esa grafica. Para Sigma, esto se traduce en una decision arquitectonica: cada corrida, herramienta, aprobacion, simulacion, error, salida de modelo y ejecucion debe quedar registrada en un Enterprise Event Ledger.
Esto permite replay, fork, lineage, auditoria, debugging, simulacion contrafactual y mejora controlada. En ambientes ERP, donde un error puede afectar dinero, inventario o contabilidad, esta propiedad es esencial.
4.3 Process mining
Process mining parte de event logs para descubrir como se ejecutan los procesos. Sigma debe absorber esa disciplina, pero ir mas lejos. La mayoria de process mining se orienta a visualizar, diagnosticar y optimizar. Sigma debe convertir descubrimiento en capacidad ejecutable. En otras palabras: process mining descubre el mapa; Trace2Skill compila rutas operables para agentes.
4.4 MCP como interoperabilidad, no como gobierno completo
MCP estandariza la conexion entre aplicaciones de IA y herramientas, datos o workflows. Para Sigma es util porque puede normalizar acceso a fuentes y herramientas. Pero MCP no debe considerarse suficiente para seguridad empresarial. Sigma necesita un Execution Gateway propio que controle identidad, permisos, presupuesto de herramientas, errores estructurados, aprobaciones, idempotencia, politicas y auditoria. MCP puede ser el cable; no debe ser el sistema de frenos.
4.5 Data API Builder
Data API Builder es relevante porque puede generar endpoints REST y GraphQL sobre SQL Server y tambien contempla integracion con MCP para agentes. En Sigma, DAB puede exponer entidades y stored procedures de forma controlada, pero nunca como acceso generico e irrestricto. Debe usarse para construir herramientas estrechas, tipadas y role-scoped.
4.6 Observabilidad y seguridad SQL
OpenTelemetry popularizo la recoleccion de traces, metrics y logs para observabilidad tecnica. Sigma necesita una observabilidad operacional equivalente: tiempo por paso, latencia de aprobacion, errores de herramienta, denegaciones de politica, retrabajo, excepciones, confianza del agente, reversiones y valor generado. En SQL Server, patrones como row-level security, roles, permisos minimos y separacion de lectura/escritura son obligatorios para entornos multiempresa o multidepartamento.
5. Definicion de Sigma AGI
Sigma AGI es un sistema de inteligencia empresarial vertical que entiende, modela y ejecuta procesos dentro de organizaciones que usan Intelisis ERP. Es AGI solo en sentido empresarial acotado: generaliza entre muchas tareas operativas dentro de un dominio delimitado, no entre todas las tareas humanas. Por eso el termino correcto es mini-AGI empresarial o vertical AGI.
Su inteligencia no viene de un modelo de lenguaje aislado, sino de la combinacion de seis activos: ERP Kernel, Company Twin, Process Graph, Skill Compiler, Agent Cortex y Governance Layer. Una arquitectura completa agrega Enterprise Event Ledger, Skill Registry, Context Assembly, Execution Gateway y Surface Layer.
5.1 Que es Sigma
Una capa de inteligencia operativa sobre Intelisis.
Un sistema de memoria procedural para implementaciones ERP.
Un compilador trace-to-skill para procesos empresariales.
Un runtime de agentes con gobierno y auditoria.
Un Company Twin que entiende como una empresa especifica usa Intelisis.
Una plataforma de capacidades reutilizables que se acumulan por cliente, vertical y modulo.
5.2 Que no es Sigma
No es un chatbot generico sobre tablas.
No es solo BI o dashboards.
No es RPA tradicional, aunque puede automatizar trabajo procedural.
No reemplaza Intelisis.
No es un asistente SQL libre.
No es autonomia sin control humano; la autonomia se gana con evidencia y gobierno.
5.3 Promesa por usuario


6. Arquitectura por capas
La arquitectura de Sigma debe ser modular. Un agente monolitico que lee todo, decide todo y escribe directo al ERP seria inseguro e imposible de auditar. Cada capa debe tener responsabilidad clara, artefactos versionados y contratos de entrada/salida.


6.1 Enterprise Event Ledger
Esta capa registra todo lo importante. No es un log tecnico desechable. Es la memoria verificable del agente. Debe capturar intencion de usuario, contexto usado, plan, decisiones de politica, herramientas llamadas, respuestas, evidencia, aprobaciones, simulaciones, ejecuciones, verificaciones y resultado final. Con esto Sigma puede reconstruir que paso y por que.
La idea se conecta con ActiveGraph: el sistema debe poder reconstruirse desde el log. Para Sigma, esto significa que cualquier accion de negocio debe tener lineage completo desde la intencion hasta el cambio de estado en ERP.
6.2 ERP Kernel
El ERP Kernel representa lo que Intelisis permite hacer. Es el mapa universal compartido por todos los clientes. Debe construirse desde SDK, metadata, forms, tablas, vistas, stored procedures, movimientos, modulos, permisos y patrones conocidos. La funcion del ERP Kernel es responder: que entidad es esta, que movimiento aplica, que procedimiento afecta, que tablas participan, que side effects existen y que restricciones son universales.
6.3 Company Twin
El Company Twin representa como opera una empresa especifica. Dos clientes pueden usar Intelisis, pero tener flujos, politicas y gaps completamente distintos. El Company Twin incluye departamentos, roles, aprobadores, sucursales, calendarios, KPIs, preferencias, configuracion, customizaciones, excepciones, usuarios clave, training, releases y soporte recurrente.
6.4 Process Graph
El Process Graph no debe ser solo un diagrama bonito. Debe ser una representacion ejecutable del trabajo: pasos, condiciones, variantes, roles, herramientas, datos, evidencias, excepciones y efectos. Debe saber que pasa antes, durante y despues de cada accion. Debe saber que significa fallar y como verificar exito.
6.5 Trace2Skill Compiler
Trace2Skill convierte evidencia operacional en capacidades. Lee trazas SQL, SDK, formularios y anotaciones humanas. Produce secuencias, process cards, skill manifests, contratos de herramientas, pruebas, reglas de politica y documentacion. Es el mecanismo que transforma consultoria ERP en software reusable.
6.6 Skill Registry
El Skill Registry es el catalogo de capacidades. Cada skill debe tener version, owner, riesgo, madurez, autonomia, herramientas permitidas, pruebas, politica y evidencia requerida. Un agente solo debe poder invocar skills aprobados para acciones productivas. Los nuevos skills empiezan en draft o shadow.
6.7 Context Assembly
El Context Assembly evita que el agente redescubra 85% de su contexto en cada corrida. En lugar de enviarle documentacion masiva, construye un bundle especifico: ERP Kernel relevante, Company Twin, Process Graph, skill, permisos del usuario, estado actual, evidencia y restricciones. Esta capa vuelve la inteligencia mas precisa, barata y auditable.
6.8 Agent Cortex
El Agent Cortex razona y coordina. No debe tocar directamente SQL Server. Debe recibir contexto, seleccionar skill, planear, solicitar evidencia, pedir aprobacion, llamar herramientas controladas, explicar resultados y escalar cuando no hay confianza suficiente. Puede estar compuesto por agentes especializados: Trace Analyst, ERP Semantic Analyst, Process Architect, Skill Compiler, Policy Agent, Execution Agent, Verification Agent y Documentation Agent.
6.9 Execution Gateway
El Execution Gateway es la frontera de seguridad. Todas las escrituras o acciones de alto impacto pasan por aqui. Valida identidad, permisos, contexto, schema, politica, aprobacion, idempotencia, simulacion, ejecucion y verificacion. Sin esta capa, cualquier demo agentica se vuelve peligrosa en produccion.
7. Separacion de contextos
La pregunta existencial del proyecto fue: si todos los clientes usan Intelisis, debo tener un contexto del ERP y otro contexto especifico de la empresa? La respuesta es si. La separacion no es un detalle tecnico; es el mecanismo que permite escalar sin perder precision.
El modelo correcto es: mapa universal + territorio local + ruta activa + posicion actual.


7.1 Por que importa
Si todo se mezcla, el sistema no escala. Si solo hay contexto universal, el agente ignora la realidad local del cliente. Si todo es local, cada proyecto empieza de cero. La separacion permite que el ERP Kernel componga conocimiento global, mientras el Company Twin captura la especificidad de cada empresa. Un skill puede ser universal en estructura y local en politica.
7.2 Contrato de context bundle
Cada corrida agentica debe usar un context bundle explicito. Este bundle debe incluir intencion, usuario, empresa, permisos, ERP slice, Company Twin slice, Process Graph, skill version, herramientas permitidas, herramientas prohibidas, evidencia requerida, politica, riesgo y formato esperado de salida.
context_bundle:
  task_id: sigma-run-001
  company: campo_fresco
  erp: intelisis
  erp_version: intelisis_17
  user:
    role: cuentas_por_pagar
    permissions: [read_gasto, draft_abono, request_approval]
  process:
    id: gas_abono_bancario
    skill_version: 0.3.0-shadow
    risk_class: financial_write
    autonomy_level: approval_required
  allowed_tools:
    - dab.query.gasto_pendiente
    - dab.query.proveedor
    - erp.simulate.spAfectar
  forbidden:
    - freeform_sql_write
    - direct_table_update
  evidence_required:
    - proveedor_valido
    - saldo_pendiente
    - autorizacion_tesoreria
    - cuenta_bancaria_confirmada
8. Metodologia Trace2Skill
Trace2Skill es la metodologia central de Sigma. Su objetivo es convertir evidencia real en capacidades operables. Parte de trazas SQL y SDK Intelisis, pero no termina en documentacion. Termina en artifacts versionados: sequence.yaml, process-card.md, skill.yaml, dab-config.json, governance.yaml, pruebas y politicas.
8.1 Inputs
Folders del SDK de Intelisis: forms, metadata, entidades, procedimientos y documentacion tecnica.
Folders de traces SQL: ejecuciones reales con queries, stored procedures, parametros, tiempos y errores.
Configuracion ERP: movimientos, estatus, modulos, catalogos, roles y permisos.
Anotaciones humanas: notas de consultor, entrevistas, reglas, excepciones y criterios de negocio.
Evidencia operacional: tickets, capturas, training, reportes, documentos, resultados y retrabajo.
8.2 Pipeline de compilacion
Inventario: listar SDK, traces, forms, procedimientos, tablas y artefactos.
Normalizacion: convertir trazas crudas a eventos canonicos.
Mapeo de entidades: vincular objetos tecnicos a conceptos de negocio.
Extraccion de secuencia: detectar orden, fases, ramas, loops y dependencias.
Interpretacion de negocio: nombrar acciones como validar proveedor, consultar saldo pendiente, afectar movimiento.
Clasificacion de riesgo: lectura, borrador, escritura, impacto financiero, contable o inventario.
Generacion de skill: producir skill.yaml, process-card.md, sequence.yaml, contratos y pruebas.
Revision humana: validar significado, riesgo, variantes y excepciones.
Shadow mode: usar el skill para explicar y recomendar sin escribir.
Assisted mode: preparar acciones y pedir aprobacion.
Controlled autonomy: ejecutar solo procesos maduros y de bajo riesgo bajo limites estrictos.
8.3 Artefactos generados


8.4 Schema minimo de trace event
trace_event:
  event_id: uuid
  trace_id: string
  timestamp: datetime
  source: sql_trace | erp_log | ui_event | user_annotation
  actor: user | system | unknown
  company: string
  module: string
  form: string
  event_type: query | stored_procedure | validation | error | ui_action | approval
  object_name: string
  operation: read | write_candidate | execute | validate | navigate
  parameters_redacted: object
  result_summary: object
  duration_ms: number
  inferred_business_meaning: string
  confidence: number
  risk_flags: [financial, accounting, inventory, irreversible]
  evidence_refs: [string]
8.5 Schema minimo de skill
skill:
  id: gas_abono_bancario
  name: Preparar o registrar abono bancario de gasto
  domain: cuentas_por_pagar
  erp: intelisis
  maturity: shadow | assisted | approved | autonomous_limited
  risk_class: financial_write
  intent_schema:
    proveedor: string
    gasto_id: string
    importe: money
    cuenta_bancaria: string
    fecha: date
  context_requirements:
    - erp_kernel.gasto
    - company.policy.tesoreria
    - process.gas_abono_bancario
  allowed_tools:
    - read_proveedor
    - read_gasto_pendiente
    - simulate_afectar_gasto
    - execute_afectar_gasto_approval_required
  preconditions:
    - proveedor_existe
    - gasto_pendiente_existe
    - importe_no_excede_saldo
    - usuario_autorizado
  approval:
    required: true
    approver_role: tesoreria
  verification:
    - movimiento_afectado
    - saldo_actualizado
    - asiento_contable_generado_si_aplica
9. Caso de estudio: GAS / Abono Bancario
El caso GAS / Abono Bancario es un excelente primer MVP porque combina proceso real, riesgo financiero, secuencia ERP y necesidad de gobierno. En el contexto del proyecto ya aparecen artefactos y trazas relacionados con Gasto.frm, Gasto, GastoD, GastoAplica, GastoPendiente y spAfectar. La traza real menciona objetos como MovTipo, Prov, GastoA.vis, SysBase, SubModulo, fnDesplegarAsociarCompOtros, spAfectar y ContX, con referencia a Intelisis 17 y una observacion del 25 de marzo de 2026.
9.1 Por que este proceso es ideal
Es un proceso real de ERP, no un demo artificial.
Tiene escritura financiera, obligando a disenar bien el Execution Gateway.
Involucra entidades claras: proveedor, gasto, pendiente, aplicacion, cuenta bancaria, contabilidad.
Puede iniciar en shadow mode sin riesgo productivo.
Permite validar la hipotesis de convertir trazas en process cards y skills.
9.2 Fases posibles del proceso


9.3 Objetivo en shadow mode
El primer objetivo no es ejecutar pagos. Es observar la ejecucion normal del usuario, reconstruir la secuencia, clasificar objetos tecnicos, proponer significado de negocio, detectar riesgos, generar process-card.md y skill.yaml en estado draft/shadow. El sistema debe demostrar que puede explicar lo ocurrido y donde hay incertidumbre.
9.4 Objetivo en assisted mode
Despues de validacion humana, el skill puede preparar una propuesta de abono bancario: proveedor, gasto pendiente, importe, cuenta bancaria, evidencia, validaciones y resultado simulado. Un humano aprueba o rechaza. Solo con aprobacion, el Execution Gateway ejecuta el camino aprobado.
9.5 Criterios de exito
Clasificar correctamente la mayoria de eventos de trace.
Mapear pasos tecnicos a fases entendibles por negocio.
Identificar todo evento de riesgo de escritura o afectacion.
Generar process-card.md revisable por consultor y dueno de proceso.
Generar skill.yaml valido y bloqueado por politica hasta aprobacion.
Crear recibo aun en simulacion o denegacion.
No permitir ninguna escritura sin policy check y aprobacion.
10. Modelo de ejecucion agentica
Sigma debe ejecutar tareas como maquina de estados gobernada. La secuencia base es: entender, contextualizar, planear, validar, simular, pedir aprobacion, ejecutar, verificar, documentar y aprender.
10.1 Loop de ejecucion
Recibir intencion o trigger.
Armar context bundle.
Clasificar la tarea: pregunta, analisis, recomendacion, borrador, simulacion, ejecucion o excepcion.
Seleccionar skill aprobado o entrar en discovery mode.
Generar plan estructurado.
Hacer policy pre-check.
Recolectar evidencia con herramientas aprobadas.
Simular o dry-run si aplica.
Solicitar aprobacion humana cuando el riesgo lo exige.
Ejecutar mediante Execution Gateway.
Verificar resultado en ERP.
Registrar recibo y lineage.
Aprender o abrir revision si hubo desviacion.
10.2 Ladder de autonomia


10.3 Roles de agentes


11. Datos, memoria y conocimiento
Sigma necesita varios tipos de memoria. Una base vectorial no alcanza. La inteligencia empresarial requiere exactitud, procesos, politica, episodios, eventos y replay. El diseno correcto es memoria poliglota con contratos explicitos.


11.1 Entidades minimas del world model


11.2 Relaciones del grafo
El grafo debe modelar relaciones como: form usa tabla, movimiento invoca procedimiento, procedimiento afecta tabla, proceso requiere rol, skill usa herramienta, politica gobierna skill, evento pertenece a trace, trace soporta paso, paso produce artifact y artifact verifica outcome. Este grafo debe ser consultable por humanos y agentes.
12. Gobierno, seguridad y control
Gobierno no es un modulo posterior. Es la condicion de posibilidad para un agente empresarial. Mientras mas capaz sea Sigma, mas importantes son identidad, permisos, evidencia, aprobaciones, auditoria y limitacion de herramientas.
12.1 Principios no negociables
No hay escrituras SQL libres en produccion.
No hay ejecucion productiva sin skill registrado o tool contract aprobado.
No hay tool call sin identidad, empresa, rol y contexto.
No hay accion financiera, contable, inventario, nomina o irreversible sin policy check.
No hay accion de alto impacto sin evidencia y aprobacion, salvo whitelist explicita.
Cada corrida debe ser replayable.
Cada ejecucion debe producir receipt.
Cada skill debe tener owner, version, riesgo, pruebas y madurez.
Cada excepcion debe escalarse o convertirse en aprendizaje controlado.
12.2 Dimensiones de politica


12.3 Execution receipt
El recibo de ejecucion debe incluir solicitud original, plan del agente, hash del context bundle, version del skill, herramientas usadas, aprobacion, decisiones de politica, payload, idempotency key, simulacion, resultado, verificaciones, errores y evidencia final. El usuario no debe aprobar una frase vaga; debe aprobar un cambio de estado estructurado.
12.4 Prompt injection y riesgo de herramientas
Cualquier sistema que lea documentos, correos o herramientas externas esta expuesto a instrucciones maliciosas dentro de datos. Sigma debe separar datos de instrucciones. La politica no puede depender solo del modelo. El Execution Gateway debe bloquear acciones aunque el modelo intente ejecutarlas. Las herramientas deben estar allowlisted, versionadas y con alcance minimo.
13. PRD de Sigma AGI Core
Nombre de producto: Sigma AGI Core - Enterprise Intelligence Layer for Intelisis ERP.
Vision: permitir que empresas sobre Intelisis conviertan operacion real en inteligencia ejecutable y gobernada.
13.1 MVP recomendado
El MVP debe enfocarse en una familia de procesos y demostrar el loop completo en pequeno: trace ingestion -> proceso reconstruido -> skill generado -> shadow reasoning -> blueprint de ejecucion aprobada. El dominio recomendado es Gastos / Cuentas por Pagar, con GAS / Abono Bancario como primer proceso.
13.2 Modulos MVP


13.3 Requerimientos funcionales
Ingerir folders de traces y SDK.
Preservar archivos originales sin modificarlos.
Normalizar eventos a trace-normalized.jsonl.
Detectar tablas, vistas, forms, procedimientos y funciones.
Mapear objetos tecnicos a entidades de negocio con confidence.
Generar process-card.md y sequence.yaml.
Generar skill.yaml y validar schema.
Permitir revision humana y anotaciones.
Versionar cada artifact.
Ejecutar shadow mode sin escrituras.
Clasificar riesgos por accion.
Bloquear ejecuciones sin policy check.
Crear receipt para simulacion, denegacion o ejecucion.
Exponer solo tools aprobadas.
Evitar SQL libre de escritura.
13.4 Requerimientos no funcionales


14. Blueprint tecnico de implementacion
El stack preferido del proyecto se mantiene: SvelteKit + Tailwind para UI, Node.js/TypeScript para servicios, SQL Server como base primaria, Data API Builder para endpoints controlados donde aplique, MCP como protocolo de integracion cuando convenga, Vercel AI SDK o equivalente para tool calling, y una capa propia de governance y execution gateway.
14.1 Estructura de repositorio
sigma-agi/
  apps/
    web/                         # SvelteKit Workbench y superficies de usuario
    worker/                      # ingestion, compilacion y eventos
  packages/
    erp-kernel/                  # modelo universal de Intelisis
    company-twin/                # overlays por empresa
    trace2skill/                 # parsers y compiler
    process-graph/               # modelo de procesos
    skill-registry/              # skills, versionado, validacion
    context-assembly/            # context bundles
    agent-cortex/                # razonamiento y orquestacion
    execution-gateway/           # politica, aprobacion, receipts
    governance/                  # reglas, roles, autonomia
    telemetry/                   # eventos, metricas, logs
  data/
    sdk/                         # snapshots SDK Intelisis
    traces/                      # traces crudos
    generated/                   # artifacts generados
  infra/
    dab/                         # configs Data API Builder
    sql/                         # schema, views, wrappers
    docker/                      # dev local
  docs/
    research/
    architecture/
    prd/
    runbooks/
14.2 Servicios principales


14.3 Estrategia API
Read APIs: views y endpoints con scope de rol, sin SQL libre.
Simulation APIs: dry-run o validacion sin commit.
Execution APIs: operaciones idempotentes, aprobadas y auditadas.
MCP servers: solo para herramientas estrechas, con broker/gateway y seguridad adicional.
DAB: util para REST/GraphQL controlado y exposicion de stored procedures donde sea seguro.
14.4 UI inicial
La primera interfaz debe ser un Workbench, no un chat. Los usuarios iniciales necesitan inspeccionar trazas, revisar artifacts, validar procesos, aprobar skills y auditar corridas. La UI puede incluir: Trace Explorer, Process Builder, Process Card Review, Skill Editor, Company Twin, Agent Run Viewer, Approval Cockpit y Governance Console.
15. Aplicaciones verticales y aprendizajes del proyecto
El contexto acumulado del proyecto no se limita a un proceso financiero. Existen aprendizajes de POS, MRP, WMS, planeacion, hardware, forecasting, dashboards y operaciones de planta. Estos casos son importantes porque muestran que Sigma no debe ser un agente de un solo modulo, sino una arquitectura capaz de convertirse en inteligencia operativa para multiples verticales sobre Intelisis y sistemas relacionados.
15.1 Campo Fresco: MRP, planeacion y produccion
El trabajo con Campo Fresco revela una segunda linea de valor: planeacion inteligente. El flujo de forecast, ventas, produccion, capacidades, insumos, centros de trabajo, ocupacion, horas extra y maquila es un ejemplo perfecto de Company Twin + Process Graph. El sistema necesita entender no solo tablas, sino ritmos de operacion: servicio al cliente prepara forecast, ventas valida contratos, planeacion y produccion liberan planes, y el ERP recibe cargas que antes viven en Excel.
Los KPIs de dias de inventario, cumplimiento de plan de produccion y forecast vs ventas pueden convertirse en skills analiticos y operativos: detectar sobrecapacidad, recomendar maquila, explicar desviaciones, preparar ordenes de trabajo, validar materia prima, anticipar faltantes y generar escenarios. Esto demuestra que Sigma no se limita a cuentas por pagar; puede evolucionar hacia un cerebro operativo de manufactura.
15.2 POS y operacion retail
El trabajo previo en POS, hardware, basculas, impresoras, WebUSB/WebSerial, cortes X/Z, apertura y cierre de caja, factura global, lealtad y dashboards muestra otra categoria de capacidades: ejecucion de piso. En retail, el agente puede aprender de eventos de caja, errores de hardware, escaneos, ventas, promociones, inventario y cierre. Esto alimenta vertical packs para retail y restaurantes.
La leccion tecnica es que Sigma debe poder trabajar con eventos de dispositivos y no solo con SQL Server. La operacion real incluye basculas, scanners, impresoras termicas, terminales bancarias y PWAs. Ese mundo requiere un Surface Layer robusto, pero el centro sigue siendo el mismo: evento, proceso, skill, politica y verificacion.
15.3 Agente ERP por voz / Alexa+
La investigacion sobre Alexa+ y MCP sugiere una superficie futura: voz. Pero la conclusion correcta es que voz no debe conectarse directo a SQL Server ni al ERP. Debe pasar por un gateway de Sigma. Alexa, chat o cualquier interfaz solo deberia enviar intencion. Sigma arma contexto, aplica politica y ejecuta con control. Esta distincion evita que la interfaz dicte la arquitectura.
15.4 Dynamic app generation
La generacion de pantallas a partir de metadata Intelisis tambien encaja con Sigma, pero como Surface Layer. El parser de metadata y forms puede producir interfaces SvelteKit, pero la pantalla no es el objetivo final. La misma metadata debe alimentar ERP Kernel, Company Twin, Process Graph y Skill Compiler. Generar UI es una consecuencia de entender el sistema, no la tesis central.
16. Metodologia de evaluacion
Sigma debe medirse con rigor. No basta con demos impresionantes. Debe demostrar entendimiento de procesos, seguridad, replay, calidad de skills, confianza del usuario y valor operacional.
16.1 Metricas de entendimiento
Precision de clasificacion de eventos de trace.
Precision de mapeo de entidades tecnicas a negocio.
Exactitud de deteccion de fases.
Recall de variantes y excepciones.
Utilidad del process-card segun consultor y dueno de proceso.
Calibracion de confidence.
16.2 Metricas de seguridad y ejecucion
Porcentaje de acciones riesgosas correctamente bloqueadas.
Tasa de aprobaciones aceptadas/rechazadas.
Errores de herramienta y recuperacion.
Verificacion exitosa de estado final.
Retrabajo o reversas posteriores.
Completitud de audit trail y receipts.
16.3 Metricas de negocio
Reduccion de tiempo de discovery en implementaciones.
Reduccion de tiempo de soporte y diagnostico.
Reduccion de errores repetitivos de usuario.
Incremento en cobertura documental de procesos.
Tiempo desde trace capturado hasta process card.
Tiempo desde process card hasta skill asistido.
Valor de automatizaciones seguras identificadas.
17. Roadmap
El roadmap debe avanzar por evidencia. El objetivo no es lanzar autonomia rapidamente, sino construir el loop completo y ganar confianza.
Fase 0 - Corpus y fundamento
Organizar folders SDK Intelisis y traces SQL.
Definir schema canonico de trace event.
Crear ERP Kernel inicial.
Seleccionar proceso GAS / Abono Bancario.
Definir convenciones de artifacts y repositorio.
Fase 1 - Workbench Trace2Skill
Parser de traces.
Clasificador de eventos.
Generacion de sdk-index.md.
Generacion de process-card.md y sequence.yaml.
UI SvelteKit para revision y anotacion.
Versionado de artifacts.
Fase 2 - Shadow Agent
Context Assembly para un proceso.
skill.yaml draft validado.
Agente read-only que explica y recomienda.
Agent Run Viewer con plan, tools, evidencia y politica.
Comparacion de recomendaciones vs acciones reales.
Fase 3 - Assisted execution blueprint
Execution Gateway skeleton.
Read tools controladas via DAB o servicios.
Policy engine para riesgo y aprobaciones.
Approval packet UI.
Simulation/dry-run donde aplique.
Receipts para simulacion y denegacion.
Fase 4 - Ejecucion con aprobacion
Un write path aprobado en test/staging.
Aprobacion humana obligatoria para financial writes.
Idempotency keys y verification checks.
Event ledger completo.
Piloto limitado y review de incidentes.
Fase 5 - Autonomia controlada y expansion
Promover low-risk skills a autonomia limitada.
Expandir a procesos AP, compras, inventario, produccion y soporte.
Crear vertical packs: manufactura, retail, logistica, alimentos.
Dashboard ejecutivo de process intelligence.
Aprendizaje continuo desde outcomes.
18. Riesgos y preguntas abiertas


18.1 Preguntas abiertas
Cuanta estructura procedural puede inferirse solo de traces SQL?
Que modulos Intelisis dan los mejores primeros skills?
Cual es la minima anotacion humana para promover un skill?
Como representar gaps custom sin perder reusabilidad?
Que formalismo conviene para Process Graph: BPMN, state machine, event graph o hibrido?
Como simular side effects complejos de Intelisis?
Que metricas predicen que un skill esta listo para autonomia limitada?
Como aprender entre clientes sin filtrar conocimiento propietario?
19. Conclusion
Sigma AGI es una idea fuerte porque no intenta resolver inteligencia general desde cero. Ataca un dominio vertical donde ya existe un sustrato operacional rico: Intelisis ERP, SQL Server, SDK, traces, stored procedures, configuraciones, gaps, usuarios, aprobaciones y practica de implementacion. Esto hace que el problema sea lo suficientemente acotado para produccion y lo suficientemente valioso para justificar una plataforma nueva.
El movimiento central es dejar de tratar las trazas como residuos tecnicos y empezar a tratarlas como genome operativo. Una vez normalizadas y conectadas a la semantica del ERP, las trazas generan Process Graphs. Los Process Graphs revisados generan skills. Los skills gobernados pueden ser invocados por agentes. Las ejecuciones auditadas generan outcomes. Los outcomes actualizan el Company Twin y mejoran el sistema.
La interfaz ganadora no sera necesariamente el mejor chat. El producto ganador sera el que tenga el modelo operativo mas profundo, el camino de ejecucion mas seguro, el audit trail mas claro y el loop de aprendizaje mas acumulativo. Sigma debe convertirse en la capa que hace operables a las empresas con agentes sin sacrificar control humano, confianza ni gobierno.
Tesis final: Sigma AGI es el cerebro operativo gobernado para empresas basadas en Intelisis: un mini-AGI empresarial que convierte el comportamiento real de la empresa en capacidad reusable, auditable y ejecutable.
Apendice A - Process card skeleton
# Process Card: GAS / Abono Bancario

## Objetivo
Preparar, validar, simular y opcionalmente ejecutar un abono bancario de gasto en Intelisis.

## Dominio
Cuentas por Pagar / Tesoreria / Gastos

## Objetos ERP
- Form: Gasto.frm
- Entidades: Gasto, GastoD, GastoAplica, GastoPendiente
- Referencias: Prov, MovTipo, SysBase, SubModulo
- Procedimientos / funciones: spAfectar, fnDesplegarAsociarCompOtros
- Downstream posible: ContX / impacto contable

## Preconditions
- Usuario autenticado y autorizado.
- Proveedor existe y esta activo.
- Movimiento de gasto existe y tiene saldo pendiente.
- Importe no excede saldo.
- Documentos y cuenta bancaria estan presentes.
- Politica de aprobacion satisfecha.

## Riesgos
- Escritura financiera.
- Posible efecto contable.
- Posible afectacion dificil de revertir.

## Autonomia
Default: shadow o approval-required.

## Verification
- Movimiento afectado como se esperaba.
- Saldo pendiente actualizado.
- Impacto contable verificado si aplica.
- Execution receipt generado.
Apendice B - Execution Gateway contract
execution_request:
  request_id: uuid
  idempotency_key: string
  company: string
  user_id: string
  skill_id: string
  skill_version: string
  action: execute_afectar_gasto
  risk_class: financial_write
  payload:
    gasto_id: string
    proveedor: string
    importe: decimal
    fecha: date
    cuenta_bancaria: string
  evidence_packet_id: string
  approval_id: string
  policy_decision_id: string

execution_response:
  status: accepted | denied | executed | failed | requires_approval
  receipt_id: string
  erp_result_ref: string
  verification:
    status_checked: true
    pending_balance_checked: true
    accounting_checked: true
  errors: []
Apendice C - Bibliografia y notas de fuente
Las referencias externas se usan como soporte arquitectonico. El contenido especifico de Sigma proviene del contexto del proyecto, conversaciones, artefactos y definiciones acumuladas.
[S1] Jack Dorsey y Roelof Botha, "From Hierarchy to Intelligence", Block, 31 Mar 2026. https://block.xyz/inside/from-hierarchy-to-intelligence
[S2] Yohei Nakajima, "The Log is the Agent: Event-Sourced Reactive Graphs for Auditable, Forkable Agentic Systems", arXiv:2605.21997, 2026. https://arxiv.org/html/2605.21997v1
[S3] Model Context Protocol documentation, "What is the Model Context Protocol?" https://modelcontextprotocol.io/docs/getting-started/intro
[S4] Microsoft Learn, "Data API builder documentation". https://learn.microsoft.com/en-us/azure/data-api-builder/
[S5] ProcessMining.org, "Event Data". https://www.processmining.org/event-data.html
[S6] OpenTelemetry documentation. https://opentelemetry.io/docs/
[S7] Microsoft Learn, "Row-Level Security - SQL Server". https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security?view=sql-server-ver17
[S8] Narek Maloyan y Dmitry Namiot, "Breaking the Protocol", arXiv:2601.17549, 2026. https://arxiv.org/abs/2601.17549
[S9] Vasundra Srinivasan, "Bridging Protocol and Production", arXiv:2603.13417, 2026. https://arxiv.org/abs/2603.13417
Apendice D - Glosario

