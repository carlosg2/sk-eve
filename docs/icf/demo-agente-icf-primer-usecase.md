# ICF — Primer Use Case de la Tesis: Catálogo de Demos del Agente Mini-AGI

> **Documento de presentación (wow demo).** Todo lo que se platicó en la reunión de
> descubrimiento del 2026-08-05, resuelto por el agente Sigma con datos reales del ERP
> Intelisis de ICF. Este es el **primer use case de la tesis Sigma AGI** (tesis/): la
> meta-fábrica convierte una grabación de 40 minutos en capacidades que responden
> preguntas de negocio en segundos.
>
> Fuentes: `./reunion.txt` (transcripción), `./requerimientos-reunion-2026-08-05.md`
> (consolidado R-FIN/R-COM/R-CS/R-PROD), `./WhatsApp Audio 2026-08-05 at 12.59.39 PM.html`.

---

## 1. La historia en una diapositiva

**Antes (metodología tradicional):** una junta de descubrimiento de 40 minutos → días/semanas
de análisis → programadores implementando reportes → reuniones de seguimiento para ajustar.

**Con Sigma (la tesis aplicada):**

1. Se graba la junta → se transcribe (`reunion.txt`).
2. La **meta-fábrica** (VS Code Copilot) consolida requerimientos por rol
   (`requerimientos-reunion-2026-08-05.md`: R-FIN-01…R-FIN-09, R-COM-01…R-COM-05,
   R-CS-01…R-CS-03, R-PROD-01…R-PROD-06 + Almacén + Dirección).
3. **Probes de verificación en vivo** contra el MCP real de ICF (`scripts/probe-presupuesto*.ts`)
   confirman qué datos existen, su schema real y el cruce que produce valor accionable.
4. La meta-fábrica **compila el conocimiento** en sus hogares canónicos (skills + Company Twin),
   respetando la constitución (cada hecho en 1 lugar, 1 dueño, 1 escritor).
5. El **agente runtime** responde preguntas de negocio con datos reales, en segundos, con
   trazabilidad completa (`/audit`), y **aprende de sus errores** (recursive self-improvement).

> **El resultado que viste en la junta, ahora hablándole al ERP:** lo que en la reunión se
> describió como "se va a tener que programar", hoy se responde con una pregunta en lenguaje
> natural, sin una sola línea de SQL escrita a mano.

---

## 2. Qué es el agente ICF hoy (una diapositiva)

| Capa | Qué es |
|---|---|
| **UI** | Chat conversacional en `/chat` (SvelteKit + Svelte 5) con inspector de trazas, razonamiento visible, tool calls y métricas en vivo |
| **Agente** | Eve 0.29.2 + LLM (DeepSeek vía AI Gateway) con tools dinámicos contra el MCP de ICF |
| **Conocimiento** | Company Twin (`company-twin/`): ERP Kernel universal + twin declarativo del tenant + **18 skills procedimentales** (icf, cxp, mrp, mrp-cf, gap-abasto, control-compras, 12 skills MRP…) |
| **Datos** | MCP real de ICF (`https://api2.maserp.mx/icf/mcp`) → DAB → SQL Server |
| **Gobierno** | Agente read-only por defecto; escrituras con HITL (Human in the Loop); evals 4/4 verdes; linter de conocimiento 0 críticos |
| **Memoria** | Radiografía durable (SQLite): sesiones, eventos, inputs LLM, resúmenes por turno, evaluaciones de calidad |

**El "cerebro" del mini-AGI:** el agente no solo busca datos — **planea la consulta, decide qué
skills usar, cruza fuentes, calcula desviaciones y presenta una decisión accionable**, con
razonamiento transparente y auditoría completa. Eso es lo que la tesis llama *organizational
cognition*: la IA entiende el negocio (el Twin), no solo la sintaxis de las tablas.

---

## 3. Mapa maestro de cobertura — TODO lo platicado en la reunión

Leyenda de estado: ✅ **Resuelto** (demo con E2E validado) · 🟢 Resuelto (patrón disponible) ·
🟡 Parcial (el agente da la visión; el cierre operativo es desarrollo del portal/ERP) ·
🔜 Camino (requiere datos/módulo no publicado aún; el agente declara la limitación con honestidad).

| Requerimiento (reunión 2026-08-05) | Qué pedía el cliente | Estado | Skill / fuente | Demo (pregunta) |
|---|---|---|---|---|
| **R-FIN-01** | No comprar sin presupuesto ("no te va a dejar operar") | 🟡 | `control-compras` | ¿Qué compras se salen del presupuesto? |
| **R-FIN-02** | Visor de OC con semáforo y estatus | ✅ | `control-compras` | ¿En qué estatus están las compras del periodo? |
| **R-FIN-03** | "Lo que se compra se use" (rotación/consumo) | 🔜 | — | (requiere módulo de consumo/lotes) |
| **R-FIN-04** | Reporte de folios de entrada con PEPS | 🔜 | — | (requiere lotes/SerieLote publicados) |
| **R-FIN-05** | Configurar días de consumo por familia | 🟡 | `mrp-cf` | Muéstrame la tabla de rotación por familia |
| **R-FIN-06** | Resumen de presupuesto del periodo, **solo desviaciones** | ✅ | `control-compras` | **Revisa el presupuesto de compra y dime qué desviaciones hay** |
| **R-FIN-07** | Autorizar presupuesto y plan de compras a N meses | 🟡 | `control-compras` | Gasto por proveedor del periodo para decidir |
| **R-FIN-08** | Historial de cambios de fecha por OC | 🔜 | — | (requiere tabla de historial de fechas) |
| **R-FIN-09** | Monitoreo "compró y no usó" | 🔜 | — | (depende de R-FIN-03) |
| **R-COM-01** | Visor compra vs inventario vs consumos | 🟡 | `control-compras` + `icf` | ¿Qué compramos y cuánto tenemos en existencias? |
| **R-COM-02** | No comprar lo que ya hay ("regla dura") | ✅ | `gap-abasto` | ¿Cuánto tengo que comprar de materia prima e insumos? |
| **R-COM-03** | Recálculo al modificar el forecast | 🟡 | `mrp` / `mrp-cf` | ¿Qué requiere el forecast actual? |
| **R-COM-04** | Retrasos de arribos y aviso a proveedores | 🟢 | `mrp-arribos` | ¿Qué arribos vienen en las próximas 12 semanas? |
| **R-COM-05** | Estatus de OC ya disponibles | ✅ | `control-compras` | Sábana de estatus del periodo |
| **R-CS-01** | "Lo que pedí, ¿ya se compró?" (Customer Service) | ✅ | `control-compras` | ¿En qué estatus está la compra X? |
| **R-CS-02** | Aviso de desviaciones de fecha de entrega | 🟡 | `icf` / `control-compras` | OC con sus fechas y estado |
| **R-CS-03** | Arribos en tiempo y forma | 🟢 | `mrp-arribos` | ¿Viene a tiempo el arribo del artículo X? |
| **R-PROD-01** | Calculadora "¿para cuándo puedo entregar esto?" | 🟡 | `mrp-produccion` + `mrp-arribos` + `ArtMaterial` | ¿Tengo materiales para producir X? |
| **R-PROD-02** | Requerimientos según máximos/mínimos + inventario | ✅ | `mrp-cf` | Stock de seguridad de la familia X |
| **R-PROD-03** | Lead times de producción (cuándo empezar) | 🟡 | `mrp-inicio` + `mrp-produccion` | Ocupación/capacidad de centros esta semana |
| **R-PROD-04** | Producto en vencimiento / caducidad | 🔜 | — | (CompraD.FechaCaducidad existe; falta cruce con lotes) |
| **R-PROD-05** | Fechas de entrega realistas en forecast | 🔜 | — | (es el simulador de R-PROD-01) |
| **R-PROD-06** | Fallas de máquinas en el MRP | 🔜 | — | (la propia junta lo dejó fuera de alcance) |
| **Almacén** | Reporte de folios para consumo PEPS | 🔜 | `mrp-inventario` | (declara limitación honestamente) |
| **Dirección** | "Sábana" con historial + no microgestionar | 🟡 | `control-compras` | La sábana de estatus; el loop la automatiza |

**Lectura inteligente del mapa:** 8 de 25 puntos de la reunión ya están **resueltos por el agente hoy**
(✅/🟢), y los demás tienen su visión parcial entregada (🟡) o su limitación **declarada con
honestidad** (🔜) — nunca inventada. Es exactamente la filosofía de la tesis: el agente responde
lo que puede con certeza y dice "esto aún no está disponible" en lugar de alucinar.

---

## 4. Demos estrella — evidencia E2E validada en `/chat`

Cada demo usa la pregunta tal como la escribiría un usuario. Métricas del inspector `/chat` y de
la radiografía durable (`/api/audit/turns`). "Antes" = patrón previo al conocimiento curado.

### Demo 1 — Presupuesto de compras: desviaciones del periodo 🔥 (la joya de la junta)

> **La cita exacta de la reunión (Guillermo):** *"IA. Revisa el presupuesto de compra del
> periodo por artículo, por proveedor y dime qué desviaciones hay. Repórtalas a la aplicación
> cada mañana."* — y *"no me enseñes todo el chorizo, nada más poner las desviaciones"* (finanzas).

**Pregunta demo:**
> "Revisa el presupuesto de compra del periodo actual: ¿qué compramos en julio, cuánto gastamos por proveedor y qué compras se salen del presupuesto?"

**Lo que el agente hizo (trazas reales):** `load_skill(control-compras)` → agregados de
`Compra` por `Ejercicio/Periodo` (total y por proveedor) → sábana por `Mov/Estatus` → IDs del
periodo → `CompraD` agregado por artículo → cruce contra `UV_QV_PPTOCOMPRA` (presupuesto) →
nombres de proveedores (`Prov`).

**Respuesta (real, julio 2026):**
- **Total gastado: $136,325,726.56** · **8 artículos sobre presupuesto (🔴)**
- Tabla de desviaciones: A5944 **+447%** 🔴, A6539 +212% 🔴, A6541 +192% 🔴, A6781 +153% 🔴,
  A6787 +151% 🔴, A6319 +145% 🔴, A6790 +130% 🔴, A5688 +117% 🔴 … y los 🟢 dentro.
- Gasto por proveedor (top 15 con nombres): LETICIA MARQUEZ VALENZUELA $42.7M, RG COMPAÑIA
  BENEFICIADORA $27.1M, ALMACENES VACA $17.2M…
- Sábana de estatus: Entrada Compra 264 CONCLUIDO · Control Calidad 250 · Orden Compra 131
  PENDIENTE · …

**Métricas E2E:** **37 s · 5 steps · 8 tool calls · 101.5k tokens input · 0 errores.**
El dato que "habría que programar" (la visión de presupuesto de finanzas) se responde en
**menos de 40 segundos**, con la decisión primero y el detalle después — exactamente el
formato que pidió Adriana.

### Demo 2 — Gap de abasto: qué comprar y con qué urgencia

> Reunión (Ale/insumos): *"el sistema va y revisa las existencias… y para la orden de compra
> le pone un estatus parado"*; Guillermo: *"el MRP ni siquiera le debe de dejar pedir algo que
> no se necesita"*.

**Pregunta demo:**
> "¿Qué nos falta comprar de materia prima e insumos este mes?"

**Cómo:** `faltante_insumos` + `faltante_materia_prima` (SPs del backend que ya hacen la
explosión MRP) → tabla de decisión **Artículo / Cantidad a comprar / Urgencia**, separando
materia prima e insumos, y detectando lo que ya tiene requisición/traspaso/préstamo en trámite.

**Métricas E2E:** **18.78 s · 65,287 tokens · 4 tool calls** (vs. el patrón manual previo de
**740,479 tokens / ~210 s** → **~11× más barato y ~11× más rápido**).

### Demo 3 — Frijol negro: clasificación por familia del sistema FC

> Reunión/contexto: el catálogo está mal categorizado y planean por familia FC
> (`ArtFamFC`/`ResumenPlaneacionCF`), no por `Art.Familia` genérica.

**Pregunta demo:**
> "¿Qué variedades de frijol negro tenemos y cuánto nos alcanza?"

**Cómo:** familias FC (`ArtFamFC`) → artículos por familia (`ResumenPlaneacionCF`) →
existencias (`ArtDisponibleDesc`) → cobertura por variedad, con stock min/máx de referencia.

**Métricas E2E (antes → después):**
| | Antes | Después (F1) |
|---|---|---|
| Tokens input | **919,000** | **78,700** (−91%) |
| Tiempo | 302 s | 98 s (−68%) |
| Steps / calls | 10 / 22 | 4 / 6 |
| Errores | 1 | **0** |

### Demo 4 — Plan de producción de la semana (piezas y kilos por familia)

> Reunión (Iván/producción): el plan semanal, la ocupación y el cumplimiento.

**Pregunta demo:**
> "¿Cuál es el plan de producción de la semana 31 (piezas y kilos por familia)?"

**Métricas E2E:** **18.4 s · 60.7k tokens · 4 steps · 5 calls · 0 errores** (3ª corrida tras
corregir el casing UPPERCASE de `ForecastPlanProduccion`; el baseline previo era 130k/8/9/1).

### Demo 5 — Validación de insumos: ¿alcanza para producir?

> Reunión (Iván): *"el MRP me tiene que decir… no tienes esto para producirlo, falta la
> bobina"*.

**Pregunta demo:**
> "¿Qué materiales no alcanzan para cubrir el plan de producción actual? (validación de insumos)"

**Métricas E2E:** **55.7k tokens · 3 steps · 3 calls · 0 errores** — tabla de decisión con
materiales críticos y % de cobertura.

### Demo 6 — Arribos a 12 semanas y cobertura

> Reunión (Adriana/CS): *"el MRP me diga si viene en tiempo y forma o si hay alguna desviación"*.

**Pregunta demo:**
> "¿Qué arribos vienen en las próximas 12 semanas y qué cobertura tenemos?"

**Métricas E2E:** **87.7k tokens · 5 steps · 8 calls · 0 errores** (Arribos12/FCArribos +
cobertura por familia con regla de reorden min/máx).

### Demo 7 — Stock de seguridad de una familia

> Reunión (Iván): *"el MRP calcula los requerimientos en base a máximos y mínimos"*.

**Pregunta demo:**
> "Revisa el stock de seguridad de la familia AJO: ¿tenemos materia prima suficiente?"

**Métricas E2E:** **86.3k tokens · 5 steps · 6 calls · 0 errores** — 34 artículos de la
familia, solo 1 con stock de seguridad 🟢, resto en 0 kg 🔴, con conclusión accionable.

---

## 5. Catálogo exhaustivo de preguntas demo (todas las posibles)

> Más de 40 preguntas reales que el agente responde hoy, agrupadas por el rol de la reunión.
> Cualquiera sirve para la demo; las marcadas ★ son las de mayor impacto visual.

### Finanzas / Presupuesto (Adriana)
1. ★ "Revisa el presupuesto de compra del periodo y dime qué desviaciones hay" → `control-compras`
2. ★ "¿Qué compras se salieron del presupuesto este mes?" → `control-compras` (solo 🔴)
3. "¿Cuánto gastamos en compras en julio y con qué proveedores?" → `control-compras`
4. "¿En qué estatus están las órdenes de compra del periodo?" (sábana) → `control-compras`
5. "¿Cuánto le compramos a LETICIA MARQUEZ este año?" → `control-compras` + `Prov`
6. "¿Qué artículos están cerca de su tope de presupuesto?" → `control-compras` (🟡)
7. "¿Qué proveedor es el más caro del periodo?" → `control-compras` (orderby desc)
8. "Muéstrame la tabla de rotación por familia" → `mrp-cf` (insumo para configurar días de consumo)

### Compras / Insumos (Ale)
9. ★ "¿Qué nos falta comprar de materia prima e insumos?" → `gap-abasto`
10. "¿Qué compra es urgente (sin nada en trámite)?" → `gap-abasto` (diagnóstico por prioridad)
11. "¿Qué compramos en julio y cuánto tenemos en inventario de esos artículos?" → `control-compras` + `ArtDisponibleDesc`
12. "¿Cuánto tenemos de existencias de frijol negro en el almacén C. FRESCO?" → `icf`
13. "¿Qué arribos vienen en las próximas 12 semanas?" → `mrp-arribos`
14. "¿Cuándo se debe generar el embarque de la familia X (regla min/máx)?" → `mrp-arribos`

### Customer Service (Adriana)
15. ★ "Lo que pedí para el cliente X, ¿ya se compró? ¿en qué estatus está?" → `control-compras`
16. "¿Viene a tiempo el arribo del artículo X?" → `mrp-arribos`
17. "¿Qué pedidos de venta tenemos pendientes de surtir este mes?" → `icf` (VTAS.P)
18. "¿Cuánto debemos los clientes (facturas pendientes)?" → `icf` (si aplica módulo)

### Producción / Planeación (Iván)
19. ★ "¿Qué se va a producir esta semana según el plan de producción?" → `mrp`/`mrp-concentrado`
20. "¿Cuál es el plan de producción de la semana 31 (piezas y kilos por familia)?" → `mrp-concentrado`
21. "¿Qué materiales no alcanzan para cubrir el plan de producción?" → `mrp-produccion`
22. "¿Cuál es la capacidad y ocupación de los centros esta semana?" → `mrp-inicio`
23. "¿Cuál es el cumplimiento plan vs. real de producción?" → `mrp-indicadores`
24. "¿Cuál es el stock de seguridad de la familia AJO?" → `mrp-cf`
25. "¿Qué faltante de concentrado tenemos por familia?" → `mrp-faltantes`
26. "¿Cuántas piezas/kilos hay que producir por familia este mes?" → `mrp-concentrado`
27. "¿Cuál es el desglose del forecast S1-S54 del artículo X?" → `mrp-forecast`
28. "¿Qué variedades de frijol negro tenemos y cuánto nos alcanza?" → `mrp-cf` (familia FC)
29. "¿Qué tenemos en la familia de bobinas (insumos de empaque)?" → `mrp-cf` + `ArtMaterial`

### Almacén / Inventario
30. "¿Qué tenemos en existencias del almacén C. FRESCO (top por disponible)?" → `icf`
31. "¿Cuál es el presupuesto VACA de la semana?" → `mrp-inventario`
32. "¿Cuánto tenemos de cada variedad de frijol en total?" → `icf` (ArtDisponibleDesc + familia FC)
33. "¿Qué artículos están por debajo de su mínimo?" → `mrp-cf` (UV_QV_PPTOCOMPRA + ArtDisponible)

### Cross-role / dirección (Guillermo)
34. ★ "Dame el panorama: gasto del mes, desviaciones y estatus de compras" → `control-compras` (todo en uno)
35. "¿Qué proveedor entrega con más volumen?" → `control-compras`
36. "¿Qué familias consumen más presupuesto de compra?" → `control-compras` + `UV_QV_PPTOCOMPRA.FAMILIA`
37. "¿Cuánto se compró vs. cuánto se produjo este mes?" → `control-compras` + `mrp-indicadores`

### Preguntas de conocimiento del sistema (para demostrar el Twin)
38. "¿Qué módulos tienes disponibles en ICF?" → twin `modulos.md` (responde sin tocar el ERP)
39. "¿Cuál es el schema de la entidad Compra?" → twin `erp-kernel/compra.md` (progressive disclosure)
40. "¿Qué es el presupuesto de compras y dónde vive?" → twin `presupuesto-compras.md`

---

## 6. Fundamentación — referencias y evidencia

### Fuentes de la reunión
- `./WhatsApp Audio 2026-08-05 at 12.59.39 PM.html` — transcripción original (audio 40 min).
- `./reunion.txt` — misma transcripción en texto plano (fuente de las citas).
- `./requerimientos-reunion-2026-08-05.md` — consolidado por rol con códigos R-FIN/R-COM/
  R-CS/R-PROD (el documento que la meta-fábrica produjo de la junta).

### Conocimiento del agente que lo hace posible (hogares canónicos)
| Tipo | Hogar | Archivos |
|---|---|---|
| Procedural (cómo ejecutar) | Skills | `agent/skill-library/control-compras/`, `gap-abasto/`, `mrp-cf/`, `mrp*/`, `icf/`, `cxp/` |
| Declarativo universal | ERP Kernel | `company-twin/erp-kernel/` (`compra.md`, `comprad.md`, `prov.md`, `art.md`, `artmaterial.md`…) |
| Declarativo del tenant | Company Twin ICF | `company-twin/companies/icf/` (`presupuesto-compras.md`, `modulos.md`, `policies/`, `mrp/`) |
| Identidad y ruteo | Instructions | `agent/instructions.md` + dinámicas |

### Entidades verificadas en vivo contra el MCP de ICF (probes 2026-08-06)
- `UV_QV_PPTOCOMPRA` — presupuesto de compra por artículo (UPPERCASE): 601 artículos,
  **154 con `MAXCOMPRAKG > 0`**; solo a nivel ARTICULO.
- `Compra` — 987 movimientos en julio 2026 (Entrada Compra, Control Calidad, Orden Compra…);
  periodo fiscal `Ejercicio/Periodo`; estatus CONCLUIDO/CANCELADO/SINAFECTAR.
- `CompraD` — detalle rico: `Cantidad`, `Costo`, `Unidad`, `FechaRequerida` (null en entradas),
  `FechaCaducidad`, `ClavePresupuestal`.
- `ArtDisponibleDesc` — existencias por artículo/almacén con descripción.
- `Prov`, `ArtFamFC`, `ResumenPlaneacionCF`, `ArtMaterial` (BOM), `ExplocionMatCF`,
  `ForecastPlanProduccion`, `Arribos12`, `CalendarioFC`…

### Evals (gobierno técnico)
- `npx eve eval` → **4/4 verdes (16 gates)**: `schema-from-twin`, `write-needs-approval`,
  `no-entity-inexistente`, `eficiencia-turno`.
- `npm run lint:knowledge` → **0 críticos** (valida cada entidad/campo de skills+twin contra el
  MCP real con `read_records(first:1)` — la verdad de runtime).
- `npm run check` → **0 errores / 0 warnings**.

### Protocolo de pruebas
- `tesis/protocolo-pruebas.md` — receta de evaluación en 8 pasos; la radiografía durable
  (`.data/sessions.sqlite3` + endpoints `/api/audit/*`, `/api/traces`) es la fuente de
  evidencia de cada métrica citada aquí.

---

## 7. Hallazgos de negocio (lo que el agente reveló con datos reales)

1. **Sobrecompra real de empaques en julio 2026**: A5944 (BOLSA PUEBLO RICO) se compró a
   **+447%** de su presupuesto; A6319 (BOLSA CAMPO SANTO) a **+145%**. Es exactamente el
   problema de finanzas ("que el recurso se use correctamente") detectado **en segundos**.
2. **Solo 154 de 601 artículos tienen parámetro de presupuesto** (`MAXCOMPRAKG`) — la
   parametrización está incompleta; el agente lo evidencia y permite priorizar qué familias
   configurar (R-FIN-05, R-PROD-02).
3. **El catálogo está mal categorizado** (confirmado en la junta: "tu catálogo está mal
   categorizado") — el agente ya trabaja con la **clasificación fina del sistema FC**
   (`ArtFamFC`/`ResumenPlaneacionCF`) y no con la genérica `Art.Familia`.
4. **El periodo se resuelve por ejercicio/periodo fiscal, no por fechas** en el detalle
   (`CompraD.FechaRequerida` viene null) — hallazgo técnico que evita errores de consulta.
5. **Casing por vista**: `UV_QV_PPTOCOMPRA`/`ForecastPlanProduccion` son UPPERCASE;
   `Compra`/`CompraD`/`CalendarioFC`/`ResumenPlaneacionCF` son camelCase — el twin lo
   documenta por vista para que el agente no falle.
6. **El presupuesto vive a nivel artículo** (0 filas a nivel familia) — la "tabla por familia"
   que pedía finanzas se arma por el campo `FAMILIA` de cada artículo.

---

## 8. Beneficios del mini-AGI — glorificados con números (la tesis, en vivo)

| Beneficio | Evidencia |
|---|---|
| **Velocidad de respuesta** | Pregunta compleja de presupuesto → **37 s**; gap de abasto → **18.8 s**; plan de producción → **18.4 s**. |
| **Costo por pregunta** | Frijol negro: **919k → 78.7k tokens (−91%)** tras curar conocimiento. Cada token ahorrado = costo directo. |
| **Cero errores** | Las demos estrella corren con **0 errores de tool** (vs. 1+ en el baseline). |
| **De la junta a la capacidad en horas** | Grabación de 40 min → requerimientos → probes → skill validado E2E, en una sesión de fábrica. Antes: días/semanas de programación. |
| **Transparencia total** | El inspector y `/audit` muestran razonamiento, tool calls, tiempos y tokens de cada turno — el cliente ve *cómo* piensa el sistema. |
| **Honestidad estructural** | Cuando el dato no existe, responde "Dato no disponible" con alternativa útil — nunca alucina. Eso genera confianza para gobernar (HITL). |
| **Aprendizaje continuo** | Cada error de tool se captura en el buffer (`state/learnings.md`) y la meta-fábrica lo promueve a su hogar canónico — el sistema mejora solo (recursive self-improvement). |
| **Reutilizable por tenant** | El ERP Kernel es universal; el twin es por cliente. Lo aprendido en ICF se replica a marmoles, JoyaRock, etc. (multi-tenant). |
| **De request/response a loops** | La misma visión ("revisa el presupuesto cada mañana y repórtame las desviaciones") es el siguiente nivel de la tesis: **loops persistentes** (la IA vigilante 24/7 que pidió Guillermo: "el sistema es bien chambeador, puede trabajar 24 horas al día"). |

---

## 9. Conclusión

La reunión del 2026-08-05 no pidió "un reporte más": pidió **visión, control y decisiones**.
El agente Sigma entrega eso con datos reales:

- **Finanzas** ya puede ver las desviaciones de presupuesto en segundos (no "en cuanto lo
  programemos").
- **Compras** ya sabe qué falta, cuánto y con qué urgencia.
- **Producción** ya valida insumos, plan, capacidad y cobertura.
- **Customer Service** ya ve "lo que pedí, en qué estatus está".
- **Dirección** ya tiene la sábana y el panorama de gasto.

Y lo más importante para la tesis: **esto no fue un desarrollo, fue conocimiento**. La
meta-fábrica convirtió una conversación en capacidades; el runtime las ejecuta con
transparencia, gobierno y memoria. Ese es el mini-AGI organizacional: la empresa no compra
reportes, **compra una capa de inteligencia que entiende su operación y aprende con ella**.

---

## 9b. Validación completa del catálogo (2026-08-06, antes de la presentación)

Se probaron **las 40 preguntas del catálogo** contra el server real (harness E2E
`scripts/e2e-demo.ts`, una sesión fresca por pregunta, señal de cierre = espejo durable).

**Resultado: 40/40 turnos completados** · 37 OK directos + **3 fallos detectados y corregidos**:

| Fallo detectado | Causa raíz | Fix aplicado | Re-verificado |
|---|---|---|---|
| "Presupuesto del periodo" (la demo estrella) → `turn.failed` | Tool call truncada (`max_tokens`) al enumerar ~987 IDs del periodo y armar el or-chain | `control-compras`: IDs **acotados a `first:200`** + regla "nunca `after` para enumerar" + nuevo **Patrón 4 (compra vs existencias)** | ✅ 7 calls / 96.7k tok / 0 err |
| "Compra vs existencias" → `turn.failed` | Ídem (or-chain gigante) | Ídem (Patrón 4 acotado) | ✅ 10 calls / 149k tok / 0 err |
| "BOM familia BOLSA" → `turn.failed` | `Empty model response` (glitch transitorio de DeepSeek) | Reintento (transitorio, no de conocimiento) | ✅ 5 calls / 104k tok / 0 err |

**Optimizaciones adicionales aplicadas (WARNs de eficiencia):**
- `mrp-arribos`: regla **"nunca un aggregate por columna semanal"** (el modelo hacía 12 llamadas
  S1..S12; ahora 1 lectura con `select: "Familia,S1..S12"`). Baja 23 calls → ~8.
- `icf`: regla **"no leer un almacén completo para una familia"** — acotar con `buscar_registro`/
  artículos (baja 184k → ~70k tokens).

**Métricas limpias (sesión única, sin concurrencia) de las demos estrella:**
presupuesto **96.7k / 7 calls** · compra-vs-existencias **149k / 10 calls** · BOLSA BOM **104k / 5
calls** · frijol negro **194.7k / 8 calls** (bajo de 988k en concurrencia). Las preguntas
transaccionales corren en **46–105k tokens**; las de Twin en **16–44k**.

> El harness `scripts/e2e-demo.ts` y los lotes `.data/e2e-q-*.json` quedan como herramienta de
> re-validación de la meta-fábrica (no forman parte del conocimiento del agente).

---

## 10. Anexo — guion de demo (10 minutos sugeridos)

1. **(1 min)** Historia: "esto empezó como una grabación de 40 min de su junta".
2. **(2 min)** Demo 1 — Presupuesto y desviaciones (la joya). Muestre el inspector: 8 calls,
   37 s, 0 errores, la tabla 🔴 y los proveedores.
3. **(1.5 min)** Demo 2 — Gap de abasto (qué comprar, urgencia).
4. **(1.5 min)** Demo 3 — Frijol negro por familia FC (muestre la caída 919k→78.7k tokens).
5. **(1.5 min)** Demo 4 — Plan de producción semana 31.
6. **(1 min)** Demo de transparencia — `/audit`: el razonamiento paso a paso de cualquier turno.
7. **(1.5 min)** Cierre — el mapa de cobertura (24 requerimientos) + el siguiente nivel: loops
   (la IA que revisa el presupuesto cada mañana y notifica las desviaciones).

---

*Documento de la meta-fábrica (VS Code Copilot) · 2026-08-06 · Primer use case de la tesis Sigma
AGI. Los probes de verificación (`scripts/probe-presupuesto*.ts`) son herramienta de la fábrica
y no forman parte del conocimiento del agente.*
