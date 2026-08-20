# Requerimientos — Reunión de descubrimiento ICF (2026-08-05)

> Fuente: transcripción `./WhatsApp Audio 2026-08-05 at 12.59.39 PM.html`
> Propósito: consolidar lo que cada área del cliente necesita del módulo MRP /
> planeación / forecast / compras, para diseñar las soluciones (tableros, visores,
> reportes, flujos de autorización) y alinearlo con el agente Sigma.

---

## 1. Contexto y participantes

Reunión de descubrimiento para entender qué necesita cada rol del sistema. El
consultor (Speaker 1) declara que el objetivo es tomar las preguntas de cada área
y responderlas con **modelos/soluciones concretas** (visores con semáforo,
reportes, tableros) — "de estas preguntas que ustedes me hagan, yo lo que voy a
hacer es el modelo para responderles".

Participantes por rol (inferido de la conversación; confirmar nombres):

| Rol / Persona | Área | Interés principal |
|---|---|---|
| Speaker 1 | Consultor / desarrollo | Diseñar y programar las soluciones |
| Speaker 2 (Guillermo) | Dirección / operación | Visión transversal, reglas de operación |
| Speaker 3 (Adriana) | Finanzas → presupuesto; también Customer Service | Presupuesto, autorizaciones, "lo que se compra se usa", seguimiento de OC |
| Speaker 4 | Planeación / apoyo finanzas | Modificaciones de forecast, autorizaciones |
| Speaker 5 | Producción / Customer Service | Calculadora de capacidad de entrega, lead times de producción |
| Speaker 6 (Ale / Mic) | Compras / insumos | OC vs inventario, folios, estatus de compra |
| Speaker 7 | Almacén | Folios PEPS, órdenes de producción |

---

## 2. Requerimientos por área

### 2.1 Finanzas / Presupuesto (Adriana)

Es el rol con más requerimientos. Su objetivo declarado: **que el recurso se use
correctamente**, que no se compre lo que no tiene presupuesto y que todo lo que se
compra se esté usando.

#### R-FIN-01 — Validación de presupuesto en el flujo de compra
- El sistema **no debe permitir operar/comprar sin presupuesto** ("si no tiene
  presupuesto, no le deje operar nada"; "el MRP ni siquiera le debe de dejar
  pedir algo que no se necesita").
- Cada orden de compra debe poder reportar su estatus de **autorización por
  presupuesto** (aprobada / pendiente / rechazada).

#### R-FIN-02 — Visor de órdenes de compra con semáforo y estatus
- Ver **todas las OC** con su estatus real:
  - Requisición creada → requisición autorizada
  - Cotización autorizada ("que Ale ya la autorizó")
  - Orden de compra emitida / autorizada
  - Presupuesto pendiente / autorizado
- Semáforo sugerido: compras en verde, finanzas en amarillo (presupuesto),
  riesgo en rojo.
- Los estatus de OC **ya existen** en el sistema; solo hay que exponerlos en el
  visor ("esos ya existen y nada más le tienes que poner").

#### R-FIN-03 — "Lo que se compra se use" (rotación / consumo)
- Tablero que muestre por cada compra/entrada:
  - Cantidad comprada y que ingresó
  - Cuánto se ha **consumido a la fecha** (según el explosionado de materiales)
  - **Días sin movimiento** desde el ingreso
  - Diferencial (solicitado 50 toneladas → solo se movió X)
- Regla de negocio: si un producto comprado **lleva más de N días sin moverse**,
  se marca (p.ej. "X producto ya tiene más de 60 días y no se ha movido").

#### R-FIN-04 — Reporte de folios de entrada de compra (con PEPS)
- Reporte por **folio / entrada de compra** con:
  - Número de folio
  - Cantidad de ingreso
  - Lo consumido a la fecha
  - Fecha de ingreso
  - Días desde el ingreso
  - **Monto total vs monto de lo no usado** (dos montos explícitos)
- Debe permitir detectar **saltos de folio**: si llegaron 5 folios y se consumió
  el 5º sin consumir el 1º, señalarlo ("te brincaste un folio").
- La orden de producción debe consumir por **PEPS** (primero en entrar, primero
  en salir): "el folio 1 que llegó, el primero que se consuma".

#### R-FIN-05 — Configuración de días de consumo por familia
- Parámetro **configurable por finanzas** de cuántos días/semanas se le da a cada
  material para consumirse tras ingresar (hoy: 4 semanas; poder cambiar a 6).
- Tabla de rotación **por familia** precisamente para esto.

#### R-FIN-06 — Resumen de presupuesto por periodo configurable
- Resumen del mes (o semana / periodo que ella elija) de presupuesto vs compras
  ("en el clip, yo que tú le pones periodo y te da").
- Como finanzas quiere ver **solo las desviaciones**, no todo el detalle
  ("no me enseñes todo el chorizo, nada más poner las desviaciones").

#### R-FIN-07 — Autorización de presupuesto y del plan de compras
- Ella **autoriza el plan de compras** a N meses (se menciona horizonte de
  **3 meses**; requiere liberar órdenes de compra — "tienes que liberar los
  primeros dos meses").
- Autoriza el forecast (inicial y modificaciones) y el presupuesto de materia
  prima **e insumos** ("de todo", nacionales e importación).
- Portal de autorización: revisa lo que planeación propone → si el dinero alcanza
  → libera para que compras ejecute.

#### R-FIN-08 — Historial de cambios de fecha de cada OC
- Trazabilidad completa de cada OC: requisición → fincado de la OC → **1ª, 2ª,
  3ª… fecha de entrega** comprometida por el proveedor.
- Sirve para entender "la historia" de una orden que se retrasa, decidir si se
  cancela y **cuándo se vuelve crítico**.
- Discusión de un **límite de cambios de fecha** (se propone 4) como señal de
  cancelación, aunque se acepta que el sistema puede guardar más.

#### R-FIN-09 — Monitoreo de "compró y no usó" como insumo de control
- La visión de "lo que se compra se usa" le permite, en revisiones mensuales,
  **no aceptar más variaciones** si hay material acumulado sin consumir.
- La **tabla de obsoletos es un proceso MANUAL** (se identifica, se vende, "ya no
  se toca") — NO se automatiza; lo automático es la rotación/consumo.

### 2.2 Compras / Insumos (Ale / Mic)

#### R-COM-01 — Visor "compra vs inventario vs consumos"
- Apartado ligado a compras que muestre: **sugerencia de compra** (según el
  explosionado, p.ej. "10 toneladas"), **inventario disponible**, y los consumos
  de acuerdo a compras y entradas.
- Regla: si ya hay inventario para cubrir, la sugerencia baja ("en inventario
  tienes 9, a lo mejor nada más tienes que comprar 1").

#### R-COM-02 — Regla dura: no comprar lo que ya hay / no se necesita
- "No comprar si tiene inventario" y "el MRP no debe dejar pedir algo que no se
  necesita". Es una **premisa de partida** (Guillermo la abre desde el inicio).
- Si el inventario disponible no es utilizable (defecto, "gorgojo"), se gestiona
  como **desviación con autorización extraordinaria**, no como compra normal.

#### R-COM-03 — Recálculo al modificar el forecast
- Al modificar el forecast (al alza o a la baja), el sistema **recalcula** las
  necesidades y avisa qué materiales cambian y para qué fecha ("te va a decir qué
  necesitas y para cuándo").
- Hoy el cálculo es por **arribo**, no por compra — se debe jugar con ese detalle.
- **Lead times por nacional vs importación** (se menciona tablita con tiempos,
  "4 vs 9 lead times" según el tipo de material). El MRP debe usar el lead time
  correcto según origen.

#### R-COM-04 — Retrasos de arribos y comunicación a proveedores
- Los **arribos se pueden retrasar** (fecha de arribo proyectada vs confirmada).
- Generar un reporte/cédula que permita **detonar el aviso al proveedor** cuando
  una entrega cambia de fecha (quién lo ejecuta: se define después — compras o
  planeación).

#### R-COM-05 — Estatus de OC ya disponibles
- Los estatus de las OC ya existen en el sistema (cotización autorizada, OC
  autorizada, presupuesto, etc.); el visor solo debe exponerlos.

### 2.3 Customer Service (Adriana)

#### R-CS-01 — Visor de requisiciones / OC con estatus
- Ver si **lo que pidió ya se le compró o no**, en qué estatus está y cuándo
  llega ("Adri quiere ver que lo que pidió ya se lo compraron o no; nada más dice
  la historia, el estatus literal").

#### R-CS-02 — Aviso de desviaciones de fecha de entrega
- Si una OC cambia de fecha (llegaba el 30 → ahora el 20), el sistema debe
  **avisar** y mostrar la secuencia de fechas (1ª, 2ª, 3ª…) para ver el riesgo
  antes de que sea sorpresa ("si hay riesgo o no hay riesgo, qué vamos a hacer
  antes de que llegue").

#### R-CS-03 — Visión de arribos en tiempo y forma
- Saber si lo que se pidió para una fecha llega a tiempo o tiene desviación
  ("el MRP me diga si viene en tiempo y forma o si hay alguna desviación").

### 2.4 Producción / Planeación (Speaker 5)

#### R-PROD-01 — Calculadora / simulador de capacidad de entrega
- El MRP debe responder **"¿para cuándo puedo entregar esto?"**:
  - Entra una orden/forecast (p.ej. 5,000 piezas de soya, o 10,000 con fecha
    pedida 10 de agosto).
  - El sistema calcula si se puede y **si no, da la mejor fecha posible** con la
    justificación ("no tienes esto para producirlo", falta la bobina, etc.).
  - Es un **simulador** con las variables que ya conoce el MRP: inventario,
    lead time de materiales (bobinas, empaque, etc.), lead time de producción,
    capacidad.
- Debe **impedir prometer fechas imposibles** ("el sistema no te va a dejar").

#### R-PROD-02 — Requerimientos según máximos/mínimos + inventario
- El MRP calcula los requerimientos **en base a máximos y mínimos** configurables
  y al inventario disponible.
- Debe **sugerir máximos y mínimos** (apoyo a la parametrización).

#### R-PROD-03 — Lead times de producción (cuándo empezar a producir)
- Con la visión de emisión (p.ej. 15 días), el MRP debe decir:
  "esta orden la entregas el viernes siguiente → **empieza a producir el lunes**".
- Requiere parametrizar los **detalles/lead times de producción** por producto.

#### R-PROD-04 — Producto en vencimiento / caducidad
- Si tengo demanda de 1,000 y 1,000 en inventario que **vence en 15 días**, el
  MRP debe avisar: "entregas el PT ya o produces la diferencia" (se va a vencer).

#### R-PROD-05 — Fechas de entrega realistas en el forecast
- Al capturar un forecast con fecha de entrega, el sistema valida contra la
  disponibilidad real y sugiere la mejor fecha (o bloquea la imposible).

#### R-PROD-06 — Consideración de fallas de máquinas (pendiente de alcance)
- Se menciona la necesidad de **sensibilidad a fallas de máquinas** en el MRP
  (una orden de 100k se hizo 0 por falla → se tuvo que mover). Se reconoce como
  tema a profundizar.

### 2.5 Almacén (Speaker 7)

#### R-ALM-01 — Reporte de folios para consumo PEPS
- El mismo reporte de folios (compra → conducción → entrada) les dice **qué
  folio toca consumir** ("cuáles son los folios que vienen tomando").
- Relacionado con la **orden de trabajo de entrada / orden de producción**: la
  producción debe consumir por PEPS.

#### R-ALM-02 — Trazabilidad de qué se tomó y cuándo
- El reporte actual que manejan "no viene fecha ni cuándo se tomó"; se necesita
  fecha de ingreso y de consumo por folio para poder auditar.

### 2.6 Dirección / Operación (Guillermo) — reglas transversales

#### R-DIR-01 — No micro-gestionar
- El presupuesto se abre/revisa **una vez al mes**, no semanal; no tiene caso
  perseguir 300 kilos de bobina ("no nos conviene"). Solo una **cancelación de
  una orden grande** justifica intervención.

#### R-DIR-02 — Máximos y mínimos bien trabajados
- Los máximos/mínimos son el amortiguador de **variaciones** (consumo inesperado
  tipo Walmart, problemas de frontera, proveedores). Si no están bien
  parametrizados, el plan no aguanta variaciones → revisión mensual de
  parámetros.

#### R-DIR-03 — Flujo de autorización de 3 filtros (la "sábana")
- **Planeación** propone (lo que se necesita) → **Finanzas** autoriza presupuesto
  → **Compras** ejecuta.
- Hoy el proceso es informal ("una foto, una servilleta, compra esto"): se
  requiere que pase por los megafiltros de planeación y finanzas.
- Visión en una "sábana" que muestre: aquí lo pidieron, aquí lo autorizó
  planeación, aquí lo autorizó finanzas, tal fecha.

#### R-DIR-04 — No saturar el tablero
- Evitar tableros llenos de materias primas tras 2-3 meses; priorizar lo
  crítico (con semáforo) para **detonar acciones** (cancelar, avisar proveedor,
  escalar).

---

## 3. Flujos de negocio

### 3.1 Ciclo de vida de una orden de compra (con autorizaciones)
```
Requisición (planeación)
  → autorización de planeación (¿se necesita? ¿hay inventario? ¿máx/mín?)
  → autorización de presupuesto (finanzas: ¿hay dinero? ¿se usará?)
  → orden de compra emitida
  → estatus de OC (cotización autorizada / OC autorizada)
  → arribo / entrada (folio)
  → consumo por PEPS (producción/almacén)
  → monitoreo de rotación (finanzas: ¿se está usando?)
```
Reglas: no se pide sin necesidad; no se compra sin presupuesto; el MRP sugiere
cantidad según explosionado + inventario + máximos/mínimos.

### 3.2 Modificación del forecast → recálculo
1. Se modifica el forecast (al alza o a la baja), con autorización.
2. El MRP **recalcula** necesidades (semana por semana, 12 semanas).
3. Avisa qué materiales cambian, para qué fecha, y con qué lead time
   (nacional/importación).
4. En el visor de OC aparecen las **fechas proyectadas y las desviaciones**
   (1ª, 2ª, 3ª fecha…).
5. Si hay material comprometido sin consumir (o sin moverse), finanzas puede
   **no autorizar más variaciones**.

### 3.3 Autorización de presupuesto por horizonte
- Planeación pide presupuesto para los próximos **3 meses**.
- Finanzas revisa y autoriza (liberando los primeros 2 meses para ejecutar las
  OC).
- Compras ejecuta solo lo autorizado.

---

## 4. Tableros / visores / reportes solicitados

| # | Artefacto | Dueño | Contenido clave |
|---|---|---|---|
| 1 | **Visor de OC con semáforo** | Finanzas, CS, Compras | OC + estatus (requisición, cotización, OC, presupuesto) + semáforo + fechas proyectadas/desviaciones |
| 2 | **Tabla de rotación por familia** | Finanzas | Compra vs consumo vs días sin moverse, con días configurables |
| 3 | **Reporte de folios (PEPS)** | Finanzas, Almacén | Folio, cantidad ingreso, consumido, fecha ingreso, días, montos (total/no usado), saltos de folio |
| 4 | **Calculadora de entrega (simulador)** | Producción/CS | "¿Para cuándo puedo entregar?" con lead times de materiales y producción |
| 5 | **Historial de fechas de OC** | Finanzas, CS | 1ª/2ª/3ª fecha por OC, para decidir riesgo/cancelación |
| 6 | **Resumen de presupuesto por periodo** | Finanzas | Presupuesto vs compras del periodo elegido, solo desviaciones |
| 7 | **Cédula de retrasos para proveedores** | Compras | OC que cambian de fecha → aviso al proveedor |

---

## 5. Reglas de negocio clave (para modelar)

1. **No comprar si hay inventario** suficiente/utilizable.
2. **No comprar sin presupuesto autorizado**.
3. **El MRP no debe pedir lo que no se necesita** (regla del sistema).
4. **PEPS en consumo** de folios (producción/almacén).
5. **Máximos/mínimos** como amortiguador de variaciones (revisión mensual).
6. **Desviaciones** (inventario no utilizable, cambios de fecha, alzas) requieren
   **autorización extraordinaria**; solo se muestran las desviaciones a finanzas.
7. **Límite de cambios de fecha** por OC (propuesto: 4) como criterio de
   cancelación (con excepciones: tránsito retenido 8 semanas, etc.).
8. **Tabla de obsoletos = manual** (fuera de alcance de automatización).
9. **Lead times por origen** (nacional vs importación) en el recálculo.
10. **Presupuesto se abre una vez al mes**; no micro-gestión semanal.

---

## 6. Parámetros configurables

| Parámetro | Default mencionado | Configurador |
|---|---|---|
| Días/semanas para consumo tras ingreso | 4 semanas | Finanzas |
| Máximos y mínimos por familia/artículo | actuales | Planeación (con sugerencia del MRP) |
| **Lead time de COMPRA** (negociación con proveedor) | — | Compras |
| **Lead time de ARRIBO** (tránsito hasta ingreso) | — | Compras/Planeación |
| Lead time de materiales (nacional / importación) | tablita 4 / 9 | Planeación/Compras |
| Lead time / detalles de producción | 15 días de visión | Producción |
| Nivel de stock de seguridad por familia | StockMinimo/Maximo (ArtFamFC) | Planeación |
| Límite de cambios de fecha por OC | 4 (discutido) | Finanzas/Dirección |
| Horizonte de autorización de presupuesto | 3 meses (liberar 2) | Finanzas |
| Ventana de alerta de desabasto / OC por vencer | — | Dirección/Compras |

---

## 7. Datos / entidades del ERP implicadas (mapeo inicial)

| Concepto de negocio | Entidad/fuente probable en ICF |
|---|---|
| Órdenes de compra y su estatus | `Compra` / `CompraD` (estatus: cotización, OC, presupuesto) |
| Requerimientos / sugerencia de compra | `ExplocionMatCF` (InvRequerido, Usuario MASERP), `gap-abasto` |
| Plan de producción por familia | `ResumenPlaneacionCF`, `ForecastPlanProduccion` |
| **Plan de producción por centro de trabajo** | `ForecastPlanProduccion` (CENTROTRABAJO), `WebInicio` (ocupación) |
| **Órdenes de surtido / producción** | `Prod` / `ProdD`, órdenes de surtido (por validar) |
| Máximos / mínimos + stock de seguridad | `ArtFamFC` (StockMinimo / StockMaximo), `UV_QV_PPTOCOMPRA` |
| Inventario disponible | `ArtDisponible` / `ArtDisponibleDesc` |
| Consumo por folio / lote (PEPS) | `SerieLote`, `Inv` / `InvD` (por validar) |
| **Lead time de compra vs arribo** | `Compra.FechaRequerida` vs `FechaPromesa/FechaEntrega` (por validar) |
| Forecast / modificaciones | `ForecastPlanSemanal`, `CalendarioFC` |
| Demanda / ventas / fill rate | `Venta` / `VentaD` (CantidadPendiente), cruce con `CompraD` + costos |
| Capacidad / lead de producción | `Centro` / `CentroFC`, `Prod` / `ProdD` |

> Pendiente: verificar con el MCP real qué entidades exponen folios/lotes de
> entrada, consumo por folio, estatus de OC (el visor de OC con semáforo
> depende de eso), plan/órdenes por centro de trabajo y el desglose de lead
> time compra vs arribo.

---

## 8. Decisiones de alcance (acordadas / sugeridas)

- **Obsoletos**: proceso manual, fuera de automatización.
- **Rotación/consumo**: se automatiza (tabla por familia + reporte de folios).
- **Cancelación de OC**: el sistema da la visión de riesgo (historial de fechas);
  la decisión la toma el humano.
- **Aviso a proveedores**: el sistema genera la cédula/reporte; quién lo envía se
  define después (compras o planeación).
- **Fallas de máquinas en el MRP**: tema abierto, requiere modelado adicional.
- Se necesitarán **varias sesiones** para afinar el reporte de "lo que se compra
  se usa"; esta reunión fija el núcleo (rotación + folios + estatus).

---

## 9. Preguntas abiertas / pendientes de validar

1. ¿Quién ejecuta el aviso de retraso al proveedor (compras vs planeación)?
2. ¿El reporte de folios toma como base la **entrada de compra** (se menciona un
   reporte "IAI" parecido que ya trae costos/fechas/toneladas/OC/folio — solo
   faltan toneladas a consumir y días)?
3. ¿Cómo se modela el consumo por folio (PEPS) con las entidades disponibles en
   el MCP (SerieLote / InvD)?
4. ¿Se confirma el límite de 4 cambios de fecha, o el sistema solo lo advierte?
5. ¿El horizonte de autorización es 3 meses con liberación de 2?
6. ¿Cómo entran las fallas de máquinas al recálculo del MRP?
7. ¿Los "máximos y mínimos" se sugieren desde el MRP o solo se parametrizan?
8. Ejemplos reales (excels) que el equipo ICF debe compartir para calibrar los
   tableros.

---

## 10. Próximos pasos sugeridos

1. Confirmar el mapeo de entidades con un **probe al MCP ICF** (estatus de OC,
   folios/lotes de entrada, consumo por folio, plan/órdenes por centro, lead
   time compra vs arribo).
2. Priorizar artefactos: **(1) visor de OC con semáforo + presupuesto**, **(2)
   reporte de folios/rotación PEPS**, **(3) historial de fechas de OC**, **(4)
   calculadora de entrega**, **(5) resultados operativos por centro** (Anexo
   equipo ICF, §13).
3. Pedir al cliente los excels de ejemplo (compra, inventario, folios, plan por
   centro) para calibrar.
4. Traducir esto a skills/evals del agente Sigma (los artefactos y las preguntas
   de §14-15 son preguntas que el agente debe poder responder de la
   radiografía).
5. Incorporar el material del **equipo ICF (2026-08-06)** integrado en §11-16
   (visores, módulo por centro, preguntas del agente, lead times dobles,
   notificador).

---

## 11. Análisis de cobertura vs. documento del equipo ICF (2026-08-06)

Segunda fuente de requerimientos (documento del equipo ICF, sin fecha — recibido
2026-08-06). Comparado contra la reunión del 2026-08-05:

**Ya cubierto por la reunión (referencia cruzada):**

| Ítem del equipo ICF | Cobertura en la reunión |
|---|---|
| Visor de OC con semáforo (por vencer, en tránsito, por arribar) | R-FIN-02 + R-COM-05 |
| Validación de presupuesto ("por qué finanzas autoriza eso") | R-FIN-01 |
| Recálculo al modificar forecast (base del notificador) | R-COM-03 |
| Máximos / mínimos (desabasto) | R-DIR-02, R-PROD-02 |
| "Compramos material que no necesitamos" (visibilidad) | R-FIN-03, R-COM-01/02 |
| Lead times por origen (nacional/importación) | R-COM-03 (parcial: falta compra vs arribo) |
| Calculadora de entrega / efectividad | R-PROD-01 (parcial: falta tablero de resultados) |
| Historial de fechas de OC | R-FIN-08 |
| Inventario sobra/obsoletos antes de comprar | R-FIN-03/09 (obsoletos manual) |

**Nuevo del equipo ICF (NO estaba en la reunión):**

1. Visor MP/insumos × familia **vs forecast vs plan de producción** (cruce 3 vías).
2. Visor de **presupuesto para forecast por producto/cliente**.
3. **Administrador de emisión de requisiciones** (resultado del explosionado).
4. **Notificador de cambios** (forecast / desabasto por máx/mín) — alertas proactivas.
5. **Tablero de resultados operativos** (efectividad de planeación y cumplimiento de plan).
6. **Lead times DOBLES**: compra (negociación) + arribo (tránsito).
7. **Módulo de plan de producción semanal por centro de trabajo** + órdenes de
   surtido + costo de cambio (3 h por artículo) + make-to-order.
8. Las **10 preguntas** de compras/inventario/desabasto (§14).
9. Los **2 problemas generales** (causas raíz) y el **notificador de OC críticas**
   (§15).

---

## 12. Nuevos visores / artefactos del equipo ICF (R-ICF-01…05)

#### R-ICF-01 — Visor MP / insumos por familia vs forecast vs plan de producción
- Cruzar 3 vías por familia de MP: lo que **se va a producir** (plan), lo que el
  forecast **demanda**, y la **disponibilidad** de MP/insumos.
- Es el visor "más consultado" según el equipo.

#### R-ICF-02 — Visor de presupuesto para forecast por producto / cliente
- Presupuesto proyectado del forecast desglosado por **producto y cliente**
  (no solo por periodo).

#### R-ICF-03 — Administrador de emisión de requisiciones
- Emitir/administrar requisiciones **resultado directo del explosionado del
  forecast** (el MRP propone qué requisitar; el administrador las gestiona).

#### R-ICF-04 — Notificador de cambios (forecast / desabasto máx-mín)
- **Alertas proactivas** cuando: cambia el forecast (alza/baja), un material
  cae bajo el mínimo o se proyecta desabasto.
- Caso de uso real citado: cliente promete 500 t/mes, cambia a 1500; se agota
  stock y **nadie avisa** (no se modifica el forecast, no llega la señal a
  compras). El objetivo **no es negar la venta**, es dar la visión a comercial/
  dirección/compras para reaccionar (desabasto, máx/mín, presupuesto, lead
  times).

#### R-ICF-05 — Tablero de resultados operativos
- **Efectividad de la planeación**: cumplimiento del plan de producción (lo que
  se planeó vs lo que se produjo) y si la operación va alineada al forecast.
- Complementa a R-PROD-01 (calculadora) con visión acumulada.

---

## 13. Módulo de emisión del plan de producción por centro (R-ICF-06…10)

Emisión del **plan de producción semanal por centro de trabajo**: qué se va a
producir toda la semana, qué se va a ocupar, y convertirlo en **órdenes de
surtido**. Planeación ya alineó productos y armó **corridas largas** (las más
convenientes para eficiencia).

Contexto/problemática:
- Cambiar un artículo en el plan pierde **~3 horas por limpieza y ajuste**.
- **Atrasos de entrega de MP** a los centros; en modo **make-to-order** esto es
  crítico.
- El tablero debe mostrar **cómo vas vs el plan**, la productividad real del
  centro y si la producción se hace conforme a la planeación, notificando
  cambios. Va de la mano con resultados operativos (R-ICF-05) pero enfocado a
  materias primas.

#### R-ICF-06 — Riesgo de paro por MP/insumos
- ¿Qué MP/insumos ponen en riesgo de **paro o atraso** por falta de entrega a
  mis centros de trabajo?

#### R-ICF-07 — Críticos para arribo a tiempo
- ¿Qué artículos son **críticos que arriben a tiempo** para evitar un paro o
  cambio de plan (make-to-order por falta de stock/MP o mala planeación)?

#### R-ICF-08 — Efectividad de centros vs forecast
- ¿Qué **% de efectividad** tienen mis centros de trabajo y voy alineado al
  forecast?

#### R-ICF-09 — Cambios al plan por centro (traza)
- ¿Qué **cambios al plan de producción** se realizaron esta semana/mes a mis
  centros de trabajo?

#### R-ICF-10 — Cambios de forecast con análisis
- ¿Cuántos **cambios de forecast** realicé y se hicieron conforme a un análisis
  que no ponga en riesgo el plan?

---

## 14. Preguntas del agente (compras / inventario / desabasto) — R-AG-01…10

Preguntas concretas que el sistema (agente) debe poder responder; son los
candidatos naturales a **skills + evals** del agente Sigma:

| # | Pregunta | Datos clave |
|---|---|---|
| R-AG-01 | ¿Qué materiales tengo con **inventario de sobra u obsoletos** antes de autorizar la compra? | ArtDisponibleDesc vs demanda/rotación |
| R-AG-02 | ¿Cuál es el **nivel de mi stock de seguridad**? | ArtFamFC / UV_QV_PPTOCOMPRA |
| R-AG-03 | Si modifico el forecast a mitad de mes, ¿en cuánto tiempo la IA me dice si la **MP actual soporta el cambio** (con capacidad instalada, ±10% cubierto por stock de seguridad, aumento de producción)? | ExplocionMatCF + capacidad |
| R-AG-04 | ¿Tenemos **suficiente MP por familia** para cumplir el plan de producción de los próximos **30 días**? | ExplocionMatCF + ResumenPlaneacionCF |
| R-AG-05 | Si se cumpliera al 100% el programa, ¿qué producto/MP **primero entra en desabasto** y en qué **fecha**? | ExplocionMatCF (AlcanceDias) |
| R-AG-06 | ¿Qué familias de insumos tienen **mayor riesgo de desabasto** frente al forecast del próximo **trimestre**? | ExplocionMatCF + forecast 12 sem |
| R-AG-07 | ¿Qué **OC de MP debo acelerar hoy** para evitar paros de planta en las próximas **2 semanas**? | Compra/CompraD + fechas vs alcance |
| R-AG-08 | Muéstrame las **5 MP con mayor impacto financiero** si su proveedor falla (cruce ingresos + OC). | CompraD + costos + Venta/VentaD |
| R-AG-09 | Si el proveedor principal de frijol/X MP se retrasa, ¿qué **familias de PT** se afectan y cuál es el **impacto en venta / fill rates**? | ArtMaterial (BOM) + Venta |
| R-AG-10 | ¿Qué OC están por vencer / en tránsito / por arribar / sin ingresar? (visor de seguimiento) | Compra/CompraD estatus + fechas |

---

## 15. Problemas generales / causas raíz + notificador (R-ICF-11)

El equipo plantea 2 problemas generales actuales (por qué pasa lo que pasa):

1. **¿Por qué compramos material que no necesitamos?**
   - Por qué **finanzas autoriza** eso (sin presupuesto/uso claro).
   - Por qué **Customer Service autoriza la venta** sin saber si hay stock:
     ejemplo real — demanda mensual proyectada 500 t, el cliente pidió más
     (1500 t), CS vendió, se consumió el equivalente a 3 meses → desabasto en
     sep/oct y **se dan cuenta tarde**.
   - Por qué **compras no da seguimiento puntual**: colocan las OC y se
     olvidan; cuando urgen, están detrás del proveedor.

#### R-ICF-11 — Notificador / visor de OC críticas (seguimiento de compras)
- **Alarma o visor de OC con semáforo** que notifique lo **crítico**: OC por
  vencer, en tránsito, por arribar, o que no se han ingresado — para que
  compras dé seguimiento a tiempo.
- Debe cruzar: cuándo se pidió, cuándo se autorizó, fechas comprometidas,
  estatus real (tránsito/arribo/ingreso).
- Complementa el flujo de §3.1 y el caso 500→1500 de R-ICF-04.

---

## 16. Actualizaciones transversales (integración equipo ICF)

- **Lead times dobles** (R-ICF): el tiempo que tarda **compras en negociar** con
  el proveedor + el tiempo de **arribo/tránsito**. El recálculo (R-COM-03) debe
  usar ambos, no solo el de arribo.
- **Stock de seguridad** = StockMinimo/Maximo (ArtFamFC) ya documentado; se
  vuelve parámetro explícito de alerta (R-AG-02/03).
- **Resultados operativos por centro** (R-ICF-05/08) se apoyan en
  `ForecastPlanProduccion` (CENTROTRABAJO) + `Prod`/`ProdD` (producción real) +
  `WebInicio` (ocupación) — patrón de cumplimiento ya esbozado en el skill
  `mrp-indicadores`.
- **Make-to-order**: el riesgo de desabasto/atraso por MP es mayor; los
  visores de riesgo (R-ICF-06/07) deben priorizar cuando aplique.
- Las preguntas de §14 son la **lista de evals candidatos** para graduar skills
  nuevos (mismo mecanismo que `eval-calidad`): cada R-AG tiene invariantes
  verificables contra el MCP real.
