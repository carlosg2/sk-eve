# Sigma AGI — Tesis de mercado

Documento de posicionamiento. Complementa la tesis técnica ([`tesis.md`](./tesis.md)) y el modelo de contexto ([`context-stack.md`](./context-stack.md)) con el **por qué importa** y el **tamaño de la oportunidad**.

> **Separación deliberada:** Este documento es sobre *negocio y posicionamiento*, no arquitectura. Define qué es Sigma como producto y mercado. El *cómo* se construye vive en la tesis técnica.

---

## 1. La tesis de mercado: Vertical AI > SaaS

La oportunidad de los **agentes de IA verticales** es paralela al auge del SaaS de los 2000, pero potencialmente mayor. Por cada unicornio SaaS imaginable existe un equivalente de agente vertical. La razón es estructural:

> El SaaS reemplaza **software**. La IA vertical reemplaza **software Y costo laboral**.

Las empresas gastan mucho más en personas que en software. Un agente vertical que automatiza trabajo administrativo repetitivo ataca el presupuesto grande (nómina), no el chico (licencias). Eso multiplica el techo de mercado.

### 1.1 Por qué Sigma encaja en la tesis

| Señal de mercado (YC) | Cómo aplica a Sigma |
|---|---|
| Buscar trabajo administrativo aburrido y repetitivo | CXP, conciliaciones, validación de gastos, captura de movimientos en Intelisis |
| La IA reemplaza software + labor | Sigma no es "otra pantalla del ERP"; opera el trabajo que hoy hacen capturistas y analistas |
| Vender a decisores altos, no al equipo que se automatiza | GTM: dirección de finanzas / operaciones, no al capturista cuyo puesto cambia |
| Conexión personal con la industria | Ya operamos consultoría Intelisis: conocemos el dominio desde adentro |
| Verticales permanecen especializados | Sigma es profundo en Intelisis, no un agente genérico horizontal |

### 1.2 El diferencial defendible

El valor no está en el chat ni en el modelo (ambos commodity). Está en lo que ya tenemos y nadie más:
- **Conocimiento profundo de Intelisis** (SDK, trazas, 187 entidades, 390 reglas, wiki de 617 páginas).
- **Acceso a operación real** vía consultoría: trazas SQL, procesos reales, excepciones.
- **El Company Twin** que se profundiza con cada implementación (ver [`inteligencia-consultora.md`](./inteligencia-consultora.md)).

---

## 1bis. Landscape competitivo: las tres olas

La industria converge hacia "Company as Intelligence", pero en olas de profundidad creciente. Sigma no compite en las dos primeras: apunta a la tercera.

| Ola | Categoría | Construido sobre | Ejemplos |
|---|---|---|---|
| **1ª** | AI copilots | Chat sobre el trabajo | ChatGPT for work |
| **2ª** | Company Brain / AI OS | Memoria + coordinación sobre **información** | Scout, Falconer, Single Brain, "Company OS" |
| **3ª** | **Enterprise AGI Infrastructure** | **Cognición organizacional procedural sobre operación real** | ← donde apunta Sigma |

### El diferenciador exacto: knowledge orchestration vs procedural cognition

Casi todos los competidores se construyen sobre **información organizacional** (Slack, Notion, GitHub, docs, email) y hacen *knowledge orchestration*: retrieval, memoria, resumen, coordinación.

Sigma se construye sobre **realidad operacional** (movimientos, afectaciones, contabilidad, inventario, flujo) y hace *procedural organizational cognition*: razona sobre **secuencias organizacionales vivas**, no sobre documentos.

> La mayoría construye **AI over software**. Sigma es **AI as organizational infrastructure**.

### Las tres capas que casi nadie tiene

1. **ERP-native cognition** (la más importante) — Los Company Brain viven sobre conversaciones; Sigma vive sobre la realidad operacional del ERP. Eso cambia todo: el ERP contiene lo que de verdad pasó, no lo que alguien dijo en un chat.
2. **Organizational sequencing** — Modelar cadenas causales del negocio: `presión comercial → descuentos → desfase de costos → caída de margen → problema de liquidez`. Eso es cognición procedural, no retrieval.
3. **Dynamic surface generation** — Materializar superficies (apps/dashboards/flujos) temporales según la necesidad. *North-star, no MVP* — ver [`tesis.md`](./tesis.md) §Visión y [`decisiones.md`](./decisiones.md) ADR-005.

El equivalente histórico: mainframes → ERPs → cloud → SaaS → **Enterprise Cognitive Infrastructure**. Esa es la categoría grande que Sigma persigue, acotada al dominio Intelisis (ver "Domain-Bounded Enterprise AGI" en [`glosario.md`](./glosario.md)).

---

## 2. Sigma como Enterprise Operating System

El posicionamiento más fuerte no es "asistente ERP" sino **sistema operativo empresarial**: la capa inteligente que conecta datos, operaciones y personas, y orquesta los procesos centrales.

```
No otro chatbot.
No otro dashboard.
No otro "Zapier con IA".
Sigma es donde los procesos viven, piensan y se optimizan.
```

### 2.1 Los cuatro pilares del posicionamiento

| Pilar | Qué significa | Anclaje técnico |
|---|---|---|
| **Productivity engine** | Acelera flujos eliminando trabajo manual repetitivo | Loops persistentes (tesis v1) |
| **Diseño modular** | Adoptar por componentes; empezar con lo crítico e ir sumando | Subagents + skills + loops independientes |
| **Optimización por datos** | Decisiones en tiempo real, predictivas y prescriptivas | Company Twin + Event Ledger |
| **Arquitecturas genéricas** | Misma base reutilizable entre clientes y verticales | ERP Kernel universal + overlays por empresa |

### 2.2 Modularidad como estrategia de adopción

La modularidad no es solo técnica; es **estrategia comercial**. Reduce la barrera de entrada: el cliente arranca con un loop de bajo riesgo (ej. monitoreo nocturno de CXP en shadow), ve valor, y suma capacidades. Esto baja el TCO y evita el "big bang" que hace fracasar implementaciones.

---

## 3. Estrategia go-to-market

### 3.1 A quién venderle
- **Sí:** dirección de finanzas, operaciones, sistemas — decisores que ganan con la automatización.
- **No (al inicio):** el equipo operativo cuyo trabajo se transforma — tienden a sabotear lo que perciben como amenaza.

### 3.2 Cómo entrar
- **Shadow primero**: el agente observa y recomienda sin escribir. Cero riesgo percibido, máxima confianza construida. (Coincide con el ladder de autonomía de la tesis técnica.)
- **Una misión aburrida y dolorosa**: elegir el proceso más repetitivo y odiado (conciliación, validación de gastos) como cuña.
- **Prueba con evidencia**: cada avance respaldado por evals, no por demos. La confianza empresarial se gana con verificación.

### 3.3 Por qué no se consolidará en una sola plataforma
Como el SaaS, los agentes verticales permanecerán especializados. Sigma no compite por ser "el agente de todo"; compite por ser **el mejor operando Intelisis**. La profundidad vertical es la defensa.

---

## 4. La frase de posicionamiento

> Sigma convierte el ERP en un sistema inteligente capaz de entender, coordinar y ejecutar procesos empresariales mediante agentes de IA — reemplazando no solo software, sino el trabajo manual que hoy lo rodea.

Versión corta para pitch:

> **El sistema operativo de inteligencia para empresas que corren sobre Intelisis.**

---

## 5. Riesgos de mercado y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Resistencia del equipo operativo | Vender a decisores; arrancar en shadow (no amenaza puestos visiblemente) |
| Desconfianza en IA que escribe al ERP | Ladder de autonomía + evals + governance auditables |
| Competencia de horizontales (Copilot genérico) | Profundidad vertical en Intelisis: conocimiento que el genérico no tiene |
| "Demo que no escala" | Eval-driven: nada avanza sin verificación; sin sobre-ingeniería prematura |

---

## Documentos relacionados
- [`tesis.md`](./tesis.md) — Tesis técnica (loops persistentes).
- [`context-stack.md`](./context-stack.md) — Modelo de contexto.
- [`inteligencia-consultora.md`](./inteligencia-consultora.md) — El moat de aprendizaje entre implementaciones.
- [`glosario.md`](./glosario.md) — Vocabulario.
- [`decisiones.md`](./decisiones.md) — Decisiones arquitectónicas.

---

*Tesis de mercado — 2026-06-23. Basado en la tesis de YC sobre agentes verticales. Capa de negocio del proyecto Sigma AGI.*
