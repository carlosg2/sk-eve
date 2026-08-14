# AI Futures Model aplicado a Sigma — timelines, takeoff y self-improvement

> Borrador de trabajo para la tesis (sección de visión/formalización).
> Lectura y traducción del [AI Futures Model](https://www.aifuturesmodel.com/)
> (Eli Lifland y Daniel Kokotajlo, autores de *AI 2027*; versión Dec 2025,
> parámetros actualizados Abr 2026) aplicado a Sigma AGI. Complementa
> [`reflexion-conexion.md`](./reflexion-conexion.md): ahí la conexión se formuló
> filosófica y en términos de ML; aquí se formaliza con el modelo cuantitativo de
> timelines/takeoff.

---

## 0. Qué es el modelo, en 30 segundos

El AI Futures Model predice cuándo la IA automatiza su propia investigación y a
qué velocidad despega ("takeoff"). Se divide en **3 etapas** con un **bucle de
feedback autocatalítico**:

1. **Stage 1 — Automatizar el código** → hito *Automated Coder* (AC): un sistema
   que reemplaza todo el staff de ingeniería de un proyecto de IA. Se extrapola el
   **time horizon** de METR (la duración de la tarea más larga que el modelo
   completa con 80% de éxito, medida en tiempo humano).
2. **Stage 2 — Automatizar el research taste** → hito *Superhuman AI Researcher*
   (SAR): el sistema es tan bueno como el mejor investigador humano eligiendo
   direcciones, seleccionando experimentos y aprendiendo de ellos.
3. **Stage 3 — La explosión de inteligencia** → de SAR a ASI. Depende de si hay
   una **singularidad "taste-only"** (el feedback se acelera solo) o si se apaga
   ("fizzle").

**Resultados de referencia (medianas de Daniel):** AC 06/2028 · ASI 05/2029.
El valor no está en esas fechas (especulación) sino en la **arquitectura del
modelo**: las variables y la condición de singularidad son el marco.

### Los mecanismos centrales

| Símbolo | Concepto | Fórmula / significado |
|---|---|---|
| $H(t)$ | **Time horizon** | Duración de la tarea más larga completada con 80% de éxito (METR-HRS). Creció ~exponencial (duplica cada ~7 meses) |
| $E(t)$ | **Effective compute** | $E = C_{train} \times S$: el cómputo que necesitarías hoy para entrenar modelos tan buenos como la frontera en $t$. Colapsa progreso de software y cómputo en un solo eje |
| $S(t)$ | **Software efficiency** | Cuánta capacidad obtienes por unidad de cómputo. Power law sobre el research stock: $\beta$ dobles de esfuerzo acumulado → 1 doble de $S$ |
| $X(t)$ | **Experiment throughput** | Capacidad de implementar/correr experimentos. CES de cómputo de experimentos y labor de coding (**complementarios**, no sustituibles) |
| $T(t)$ | **Research taste (agregado)** | Valor medio por experimento. $T = \mathbb{E}[\max(T_H, T_{AI})]$: los humanos por debajo del nivel de la IA **se elevan** a ese nivel; los mejores no se tocan |
| $RE(t)$ | **Research effort** | $RE = X \times T$: experimentos ponderados por calidad |
| $m > \beta$ | **Condición de singularidad (TOS)** | El taste mejora más rápido de lo que las ideas se vuelven difíciles de encontrar → el feedback se acelera; si $m \le \beta$, se apaga |

---

## 1. El mapa a Sigma

| Concepto AI Futures Model | Traducción a Sigma |
|---|---|
| **Time horizon** (METR) | La duración de la tarea más larga que el agente completa con 80% de éxito sin intervención. Hoy: ~1 turno. Mañana (F1/F6): tareas durables de días ("cerrar el mes"). **Es la métrica de madurez del agente** |
| **Research taste** (valor por experimento) | **Calidad de promoción de la Meta-fábrica**: cuánto vale cada learning del buffer bien clasificado a su hogar canónico |
| **Effective compute** $= C \times S$ | Tokens/LLM (runtime) × **conocimiento** (Twin + skills + kernel). El conocimiento es $S$: el activo **multiplicativo** |
| **Coding automation fraction** (logística en log E) | Procesos del ERP automatizables por etapas: reads → aggregates → tablas de decisión → writes con gates. Cada uno se "automatiza" en un punto distinto de la curva |
| **Aggregate taste = $\max$ (humanos, IA)** | Fábrica humana + runtime: el HITL **eleva** (no frena). El DRI humano mantiene el taste alto mientras el runtime ejecuta |
| **Research stock $= \int RE$** | Conocimiento acumulado en el Company Twin; la "velocidad" es la eficiencia por turno (tokens/calls/errores de la radiografía) |
| **TOS vs fizzle ($m > \beta$)** | ¿El recursive self-improvement acelera o se estanca? — **medible** con la radiografía (ver §3) |
| **Complementariedad CES ($\rho < 0$)** | Conocimiento y cómputo son complementarios: arrojar más tokens a un skill malo no ayuda (gap-abasto: 740k tokens con patrón malo vs 65k con el tool correcto) |

---

## 2. Las cinco conexiones profundas (para la tesis)

### 2.1 "Research taste" = la Meta-fábrica

El hallazgo contraintuitivo del modelo: **después de automatizar la ejecución, el
cuello de botella no es ir más rápido — es el taste** (qué elegir, qué aprender,
hacia dónde ir). En Sigma:

> **El taste de la fábrica es el valor por cada promoción del buffer.** Un
> learning bien clasificado (hogar canónico correcto, validado contra el MCP)
> vale más que mil tool calls más rápidas.

Evidencia en el repo: el ciclo CXP/ICF pasó de 608k → 22k tokens *solo* porque
la fábrica promovió "ICF no publica CXP" al lugar correcto. El modelo les da
nombre formal a lo que ya observamos: **la capacidad que distingue un sistema que
mejora de uno que solo ejecuta es la calidad de su investigación, no su
velocidad.**

### 2.2 La condición $m > \beta$ — ¿nuestro self-improvement acelera o se apaga?

Para Sigma:

- $\beta$ = qué tan difícil se vuelve encontrar conocimiento nuevo impactante
  (cada skill/twin nuevo añade menos que el anterior; el conocimiento se satura).
- $m$ = cuánto valor añade cada learning promovido (el taste de la fábrica).

**La tesis de la tesis queda cuantificable:** el recursive self-improvement de
Sigma es "superinteligente" (acelera) cuando $m > \beta$ y se apaga (fizzle)
cuando las ideas escasean más rápido de lo que mejora nuestra curaduría.

⚠️ **Advertencia directa para la fábrica:** los primeros ~20 skills dieron
ganancias enormes (919k → 78.7k tokens en frijol negro). El skill #50 dará
ganancia marginal. El linter (`scripts/check-knowledge.ts`) y los evals son los
guardarraíles contra *promover ruido* cuando $\beta$ sube.

### 2.3 Effective compute = conocimiento, no tokens

$$Capacidad\_efectiva = C_{runtime}(tokens) \times S_{conocimiento}(Twin + skills)$$

La mejora por **multiplicación del conocimiento** dio los saltos de 10× (frijol
negro, gap-abasto, CXP/ICF), mucho más grande que cualquier optimización de
tokens. La lección formal: **invertir en $S$ (la capa de conocimiento) es
apalancado multiplicativamente; invertir en $C$ (más tokens/modelo) es aditivo.**
Es la justificación formal de por qué el Company Twin es el activo estratégico y
no el LLM (ya en `tesis/arquitectura.md` — ahora con respaldo cuantitativo).

### 2.4 Time horizon = la ladder de autonomía L0-L4

El *time horizon* de METR es la variable que mide la madurez de un agente. Sigma
hoy opera en horizonte de ~1 turno. El **watchdog + tarea durable** de la tesis
v2 (ADR-008) *es* la extensión de horizonte: pasar de "responder preguntas" a
"cerrar el mes" (horizonte de días). 

**Métrica propuesta para la radiografía:** la tarea más larga que el agente
completa con 80% de éxito sin intervención, medida por turno/sesión. La
trayectoria de Sigma se mide igual que la de ellos: crecimiento del horizonte en
el tiempo.

### 2.5 El "uplift" $T(t) = \mathbb{E}[\max(T_H, T_{AI})]$ — el HITL justificado

En el modelo, los humanos no se reemplazan: **se elevan**. El taste agregado es
el *max* entre humanos e IA. Esto valida formalmente nuestro diseño:

- El **DRI humano / approval gates** no son un lastre: son el componente que
  mantiene el taste alto mientras el runtime ejecuta.
- La fábrica (humano + Copilot) y el runtime son **complementarios, no
  sustitutos** — igual que su CES con elasticidad negativa: el cuello de botella
  es el input más pequeño (ver §2.6).

### 2.6 Complementariedad CES — el cuello de botella es el input más pequeño

En el modelo, cómputo de experimentos y labor de coding son complementarios: si
uno crece mucho más que el otro, el progreso se embotella en el más pequeño.
Para Sigma:

- Más **modelo/tokens** sin más **conocimiento** → el agente repite descubrimientos
  (lo vimos: 740k tokens con el patrón equivocado en gap-abasto).
- Más **conocimiento** sin modelo suficiente → el agente no sabe usar lo que
  tiene.

El balance correcto NO es maximizar ambos: es **no dejar que ninguno domine
grotescamente al otro**. La radiografía (costo por turno vs. calidad) es el
termómetro de ese balance.

---

## 3. La condición $m > \beta$ como criterio medible del self-improvement

Este es el aporte operativo del documento: convertir la condición de singularidad
en un **gate medible** para la meta-fábrica.

### Definición operativa para Sigma

| Variable | Definición Sigma | Cómo se mide |
|---|---|---|
| $m$ | Mejora del taste de la fábrica: valor marginal de cada learning promovido | $\Delta$(tokens, calls, errores, calidad) por turno entre ciclos de promoción consecutivos, atribuible a conocimiento promovido |
| $\beta$ | Dificultad creciente de encontrar conocimiento nuevo impactante | $\Delta$ del impacto medio por skill/doc nueva a medida que crece el research stock (conocimiento acumulado en el Twin) |

### El ciclo de medición (ratchet)

1. **Baseline**: turno E2E de la feature en sesión nueva (tokens/steps/calls/errores).
2. **Promoción**: la fábrica promueve un learning del buffer al hogar canónico.
3. **Re-medición**: mismo turno E2E, sesión nueva, misma pregunta.
4. **Cálculo de $m$**: mejora del turno ÷ (costo de promover). Si la mejora es
   real y sostenida → $m$ alto.
5. **Tendencia de $\beta$**: el impacto medio por skill nueva cae a medida que el
   Twin crece → $\beta$ sube.
6. **Decisión**:
   - $m > \beta$ → régimen acelerante: **promover más, invertir en curaduría**.
   - $m \le \beta$ → régimen de saturación: **dejar de añadir conocimiento y
     consolidar** (dedupe, supersession temporal, poda); la adición bruta es
     ruido.

### Ya tenemos la infraestructura

- La **radiografía durable** (`/api/audit/turns`, `turn_summaries`, `llm_inputs`,
  `prompt_injections`) mide el efecto por turno.
- El **evaluador de calidad** (`scripts/eval-calidad.ts`) mide exactitud vs.
  verdad de runtime.
- El **buffer + promote-learnings** es el ciclo de promoción.
- El **linter de conocimiento** impide que el ruido entre al Twin cuando $\beta$
  sube.

**Implicación para la tesis:** el recursive self-improvement deja de ser una
afirmación filosófica y se vuelve una **hipótesis medible**: *Sigma acelera si y
solo si la calidad de su curaduría ($m$) supera la dificultad creciente de
encontrar conocimiento nuevo ($\beta$)* — y la radiografía es el instrumento de
medición.

---

## 4. Implicaciones para el roadmap

| Fase tesis v2 | Lectura con el AI Futures Model |
|---|---|
| **F0-F3** (hecho) | Stage 1 *parcial*: automatizar la "ejecución" (queries correctas: 40/40 E2E). Equivale a automatizar el "código" de la interacción ERP |
| **F1** (watchdog + memoria) | Extensión del **time horizon**: de turno a tarea durable. La métrica de madurez cambia de "responde bien" a "completa tareas largas con 80% de éxito" |
| **F2** (seguridad) | No aparece en el modelo (ellos asumen un proyecto único); es nuestra restricción adicional — el taste alto sin contención es peligroso (ver `tesis.md` §4) |
| **F4** (enjambre) | Los agentes especialistas = "labor de coding" paralelo; el **taste** sigue viviendo en la fábrica y el orquestador de misión (quién elige los experimentos) |
| **F5** (memory graph) | El research stock formalizado: **supersession temporal** = el mecanismo para que $\beta$ no se dispare (inactivar conocimiento viejo en vez de acumular) |
| **F7** (Pattern Engine cross-client) | El cross-client es *exactamente* el taste del modelo aplicado a la consultora: cada cliente es un "experimento"; la calidad de lo que aprendes entre clientes es el multiplicador |
| **Visión 2027-2028** | La "coordinación computable" (departamentos como agentes) es la versión Sigma de la singularidad: el sistema mejora su propia operación más rápido de lo que la fábrica interviene |

---

## 5. Limitaciones del modelo y advertencias honestas

1. **Es especulación cuantificada, no predicción.** Las fechas (AC 06/2028, ASI
   05/2029) dependen de parámetros con mucha varianza entre autores (Eli vs.
   Daniel difieren en órdenes de magnitud). Para Sigma solo tomamos la
   **arquitectura del modelo**, no las fechas.
2. **No modela hardware, economía ni restricciones de contención/seguridad.** Su
   proyecto único sin threat model es nuestra limitación adicional (F2).
3. **El "taste" es difícil de medir** incluso para ellos (lo operacionalizan como
   "valor por experimento", proxy). Nuestro proxy (mejora de turno por learning
   promovido) es igual de indirecto — usarlo como **tendencia**, no como número
   absoluto.
4. **El modelo asume que ideas y experimentos son el insumo del progreso.** En
   Sigma, el "experimento" es el probe + el turno E2E; hay que tratar la medición
   de $m$ y $\beta$ como un **loop continuo de la fábrica**, no como un one-shot.
5. **La singularidad no es el objetivo de Sigma.** El objetivo es la tarea
   durable con SLOs y gobernanza (tesis v2 §12). El marco $m > \beta$ sirve para
   **no desperdiciar la fábrica en saturación**, no para perseguir aceleración
   sin control.

---

## 6. Referencias

- [AI Futures Model — aifuturesmodel.com](https://www.aifuturesmodel.com/)
  (Lifland & Kokotajlo, versión Dec 2025; parámetros Abr 2026)
- [METR — Measuring AI Ability to Complete Long Tasks](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)
  (time horizon benchmark)
- [AI 2027](https://ai-2027.com/) (el libro que motiva el modelo)
- Relacionado en el repo: [`reflexion-conexion.md`](./reflexion-conexion.md)
  (la conexión en términos filosóficos/ML) y `tesis/tesis.md` v2 (la frontera
  2026 con fuentes: BEAM, Mem0, Zep/Graphiti, OWASP, Five Eyes).

---

## Estado

- Borrador de trabajo (2026-08-13).
- Destino propuesto: sección de visión/formalización de `tesis/tesis.md` (v2),
  o apéndice de la meta-fábrica (el criterio $m > \beta$ como gate del
  self-improvement).
- No modifica conocimiento del agente: es documentación de la fábrica.
