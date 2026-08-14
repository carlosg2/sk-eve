# Estado del arte 2026 — Fuente externa: video "ChatGPT Offered Me $2m To Keep Quiet" (Diary Of A CEO)

> **Fábrica · 2026-08-13.** Análisis de la entrevista a **Daniel Kokotajlo** (ex-OpenAI, fundador de **AI Futures Project**), canal The Diary Of A CEO, video `_g4l7YkDQwA` (≈2h, timestamp señalado por el usuario ~79min). La transcripción completa quedó en el historial del chat; aquí su análisis y sus implicaciones para Sigma.

## Quién es la fuente
- Daniel Kokotajlo: ex-OpenAI (2022-2024), trabajó en **forecasting de IA**, **evaluaciones de capacidades peligrosas** y RL para agentes. Renunció por desacuerdo con la dirección (perdió ~$2M de equity por no firmar cláusula de no-desprestigio). Director de **AI Futures Project** (nonprofit de forecasting).
- Autores de los escenarios **AI 2027** (ai27.com) y **AI 2040 Plan A** (ai2040.com).

## Los hechos de la frontera que valida
1. **Timelines de la industria**: superinteligencia con mediana ~2029-2030; en 2026 los agentes ya son producto (Claude Code, agentes en Slack/Teams/WhatsApp); "autonomous employee" llegó en 2025-2026. **Esto valida la dirección de Sigma (agents as services)**: el mercado ya consume agentes como empleados autónomos.
2. **Estrategia de los labs**: automatizarse a sí mismos primero (código → investigación → **recursive self-improvement** → luego expandir a la economía). La automatización laboral masiva es "paso 3", no paso 1.
3. **Riesgos**: (a) **loss of control** (alineación: hoy es "solo una esperanza"), (b) **concentración de poder** (pocos CEOs/estados controlan ejércitos de AIs; "army of geniuses in the data center"), (c) empleo, (d) **falta de interpretabilidad** (no se puede ver por qué decide un neural net de 10T parámetros), (e) manipulación política vía AIs sesgadas.
4. **Gobierno despertando más rápido de lo previsto**: export controls, disputa DoW-Anthropic, conversación de regulación real (2029 es la "última ventana" del escenario Plan A).
5. **Plan A (recomendación)**: desacelerar + transparencia total de investigación + difusión multi-empresa/multi-país + **reversibilidad** (kill-switch físico: data centers diseñados para ser destruibles) + safety cases como gate de despliegue.

## Implicaciones directas para Sigma (lo accionable)
| Hecho del video | Implicación para Sigma | Acción |
|---|---|---|
| "Nadie con ese poder debería ser confiable" → concentración de poder es el riesgo #2 | La tesis §4 (seguridad como pilar) y §7 (guardian agents) apuntan bien; **reforzar**: diseño para que el cliente (no Sigma/una persona) mantenga el control | Mantener HITL, RBAC hard-gate, approval gates; documentar "quién controla" por tenant |
| La **interpretabilidad** es la llave para confiar/controlar | Sigma YA tiene una ventaja rara: la **radiografía** (espejo `events` con reasoning completo por step). Eso es interpretabilidad de agente | Posicionarlo como feature: "cada decisión del agente es auditable" (bootstrapped-monitoring refuerza: auditar el CoT) |
| Recursive self-improvement = el patrón que acelera todo | La tesis Sigma YA lo hace (fábrica promueve learnings→skills); es la dirección correcta pero **requiere los gates de seguridad primero** (subliminal-distillation: los sesgos se transfieren) | No destilar/automatizar la promoción sin red-team previo (F2) |
| Los agentes se adoptan vía Slack/Teams/WhatsApp (2026) | Sigma ya tiene canales chat + WhatsApp/Twilio; el **Agent Inbox** (F6) es el siguiente salto de producto | Priorizar F6 (inbox) tras F1/F2; el mercado ya lo pide |
| "Safety case" como gate de despliegue (Plan A) | Equivale a los SLOs + evals como gates de promoción de la tesis §7/§8 | Formalizar el "safety case" por agente antes de subir de autonomía (L2→L3) |
| Transparencia de investigación (open science) | La radiografía pública por tenant = evidencia vendible; la opacidad mata la confianza | Los informes del agente deben citar fuentes (MCP + twin) — ya ocurre; hacerlo explícito |

## Desviaciones de la tesis que el video sugiere
1. **La tesis asume 2027-2028 con agentes gobernados; el video sugiere que la ventana de diferenciación es AHORA (2026-2029)** — Sigma debería priorizar llegar a un primer cliente en shadow/recommend (F3) ANTES de perfeccionar el memory graph (F5). El orden del roadmap quizá deba invertirse parcialmente: **F2 seguridad → F3 cliente → F1/F4/F5 después**.
2. **"Concentración de poder" no está en la tesis como riesgo del PRODUCTO** (sí como escenario global). Para Sigma como vendor: el riesgo es que un cliente dependa de Sigma como único operador de su ERP → diseñar **reversibilidad** (el Plan A: que el cliente pueda salir / matar al agente). La tesis §4 menciona kill-switch por loop; el video lo eleva a principio de producto.
3. **La regulación (EU AI Act Annex III, SOX) ya no es futura**: el video dice que el gobierno interviene más rápido de lo previsto. La tesis lo tiene en §4.2 como "documentar"; debería pasar a **requisito de diseño activo** (auditoría nativa, no un doc).

## Fuente
- Video: https://www.youtube.com/watch?v=_g4l7YkDQwA · Canal: The Diary Of A CEO
- Escenarios: https://ai27.com (AI 2027) · https://ai2040.com (AI 2040 Plan A)
