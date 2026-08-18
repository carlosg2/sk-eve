# Voice UX — análisis de preámbulos + mejores prácticas (2026-08-17)

> Material de la FÁBRICA (VS Code Copilot). El runtime NO lo lee.
> Fuentes: evidencia local (radiografía `voice_events` de la sesión de 10 turnos
> `wrun_01M096T5GYZK5568XKSME45VZZ`), OpenAI Realtime prompting guide
> (developers.openai.com/api/docs/guides/realtime-models-prompting),
> OpenAI Realtime conversations / Voice agents, Gemini Live API
> (ai.google.dev/gemini-api/docs/live), referencias del repo
> (xai-cookbook Android, AI SDK Vercel, `voice-canonical-patterns.md`).

---

## 1. Diagnóstico con evidencia: los preámbulos SÍ son redundantes y cacofónicos

Secuencia hablada REAL de la sesión de 10 turnos (columna `speak` de `voice_events`):

```
T1  Déjame revisarlo…                     → Encontré el proveedor Leticia… → El proveedor activo…
T2  Un momento…                           → En los últimos dos meses le compraste…
T3  Déjame consultarlo…                   → En julio hay 987 órdenes de compra…
T4  Déjame revisarlo…                     → En la semana 31 se producen 2.39 millones…
T5  Un momento…                           → Tienes once presentaciones de frijol negro…
T6  Déjame consultarlo…                   → En almacén tienes 434 mil piezas…
T7  Déjame revisarlo…                     → El pronóstico a doce semanas…
T8  Un momento…                           → El proveedor con más órdenes concluidas…
T9  Déjame consultarlo…                   → En junio le compraste…
T10 Déjame revisarlo…                     → Esta semana el plan lo encabeza…
```

**Hallazgos:**
1. **Solo 3 preámbulos fijos rotando en bucle** ("Déjame revisarlo… / Un momento… / Déjame
   consultarlo…") → la secuencia es predecible, robótica y cacofónica tras el turno 3.
2. **El cerebro casi NO narró** (solo 1 `narrar` en 10 turnos: "Encontré el proveedor Leticia…").
   El peso de "sentir vivo" recayó 100% en los preámbulos hardcodeados — DeepSeek no llama
   `narrar` de forma fiable con instrucciones permisivas.
3. Los preámbulos son **exactamente las frases que OpenAI lista como "AVOID"** para preámbulos
   (ver §2): "One moment…", "Let me think…", "I am now going to access the tool…".

---

## 2. Mejores prácticas oficiales (OpenAI Realtime prompting guide) — aplicables HOY

### 2.1 Preámbulos: "first-class behavior", usados con intención
> "Used well, they reassure the user that the assistant is working. Used poorly, they become
> filler and increase perceived latency."

- **CUÁNDO usar**: antes de un tool call que tarda; razonamiento multi-step; consultar registros
  / disponibilidad / estado; si el silencio haría sentir al asistente no-responsive.
- **CUÁNDO NO usar**: la respuesta es directa e inmediata; el usuario solo confirma/corrige;
  audio poco claro (pedir clarificación); tool call ligero que no aporta un update; silencio/ruido
  de fondo (NO hablar).
- **Estilo**: natural, calmo, conciso; **VARIAR la redacción entre turnos**; describir la ACCIÓN,
  no el razonamiento; sin filler.
- **AVOID** (los nuestros caen aquí): "Let me think…", "Hmm…", "One moment while I process
  that…", "I am now going to access the tool…".
- **PREFER** (acciones): "I'll check that order now." · "I'll look up your appointment details."
  · "I'll pull that up so we can make sure it's the right account."
- **Longitud**: una frase corta (máx 2 si hay impacto alto).

### 2.2 Verbosity (longitud de respuesta por tipo)
- Respuestas directas: 1-2 frases cortas.
- Resultados de tool: **resumir el resultado primero, luego dar SOLO la siguiente acción útil**.
- Preguntas de aclaración: una a la vez.

### 2.3 Rephrase Supervisor (responder-renacer del texto del "thinker")
Patrón que YA usamos en el dual-brain (DeepSeek=thinker, voz=responder). La guía afina el opener:
- Opener activo tras el trabajo: "Thanks for waiting—", "Just finished checking that.",
  "I've got that pulled up now." → NO abrir con el preámbulo repetido.
- Plantilla: **opener + gist de 1 frase + hasta 3 detalles clave + confirmación/elección corta**
  ("Does that match what you expected?").
- Leer los números de forma hablada natural ($45.20 → "cuarenta y cinco dólares con veinte").

### 2.4 Variety (anti-repetición)
- Regla: "Do not repeat the same sentence twice. Vary your responses so they don't sound robotic."
- Con Sample Phrases: "DO NOT ALWAYS USE THESE EXAMPLES, VARY YOUR RESPONSES."

### 2.5 Silence / no-op tool (`wait_for_user`)
- Cuando el audio es silencio, ruido de fondo, TV, conversación lateral → el modelo NO debe
  responder ni decir "I'm here" / "I didn't catch that". Tool `wait_for_user` sin output.
- → **Nuestro idle tier 1 ("¿Sigues ahí? Puedes preguntarme lo que necesites." a los 25s)
  viola esto**: responde al silencio. Debería ser más tarde, solo visual, o un aviso mucho más
  breve y solo tras inactividad larga real.

### 2.6 Unclear audio
- No actuar sobre audio que no se entiende con confianza; pedir una aclaración breve y única
  ("Sorry, could you repeat that clearly?"); NO preámbulos ni tools en audio poco claro.

### 2.7 Message channels (commentary vs final) — gpt-realtime-2
- `commentary`: preámbulos + tool calls (intermediate).
- `final`: respuesta final al usuario.
- Nuestro thin-layer ya separa conceptualmente: `narrar` = commentary, `SPEECH:` = final. Alinear
  el tono: commentary en voz baja, final claro.

---

## 3. Plan de mejoras (ordenadas por impacto/riesgo)

### 🟢 Sencillas (P0 — 1 sesión, bajo riesgo)
| # | Mejora | Cómo |
|---|---|---|
| S1 | **Pool de preámbulos de ACCIÓN contextuales** (reemplaza los 3 fijos) | Mapear módulo/entidad (ya existe `ENTITY_MODULE_LABELS` en `agent-diagnostics.ts`): "Reviso las compras…", "Consulto el inventario…", "Voy al plan de producción…". Pool amplio + **anti-repetición** (no usar la misma en los últimos ~4 turnos). |
| S2 | **Gate de preámbulo con timing real de tool** | Decir preámbulo SOLO si una tool real corrió y tardó > ~2-3s (no la gracia fija de 4s); nunca si la respuesta será directa. |
| S3 | **Opener activo variado en el SPEECH** | Instruir al cerebro (agent-active.ts): abrir el SPEECH con un puente activo variado ("Ya lo tengo —", "Aquí tienes:", "Revisé las compras:") en vez de solo el dato. Regla Variety. |
| S4 | **Regla Variety + frases de acción para `narrar`** | agent-active.ts: "no repitas la misma frase de narración; varía; di la ACCIÓN". Ejemplos obligatorios. |
| S5 | **Idle tier 1 más conservador** | Subir el aviso hablado de 25s → ~60s, o hacerlo SOLO visual; el tier 2 (90s) se mantiene. (Lección wait_for_user: no hablar al silencio.) |
| S6 | **Preámbulo = etiqueta de UI** (voz = pantalla) | Que el preámbulo diga lo mismo que la pill del feed (reusar `friendlyToolLabel`), ya es el patrón "mostrando y platicando". |

### 🟡 Medianas (P1)
| # | Mejora | Cómo |
|---|---|---|
| M1 | **Narración por fases del cerebro reforzada** | DeepSeek no llama `narrar` (1/10). Hacerla MECÁNICA (frase obligatoria al arrancar cada módulo) o fallback contextual con pool de fases + variedad. |
| M2 | **SPEECH: resumen primero + siguiente acción útil** | Verbosity de OpenAI: "resume primero, luego solo la siguiente acción útil" en agent-active.ts. |
| M3 | **Manejo de audio poco claro** | Si el STT da transcripción corta/ruidosa (o el commit falla), pedir una aclaración breve única en lugar de lanzar el turno. |

### 🔴 Radicales (P2 — requieren evaluación/arquitectura)
| # | Mejora | Cómo |
|---|---|---|
| R1 | **Superficie speech-to-speech real (modelo realtime con commentary/final nativo)** | Eliminaría el TTS verbatim + preámbulos hardcodeados: el modelo realtime decide cuándo/preámbulos y separa commentary/final (patrón gpt-realtime-2). Depende del gateway/xAI soportar fases. |
| R2 | **Canal commentary/final en el gateway** | Si el protocolo lo soporta: preámbulos y tools en commentary (voz baja), respuesta en final. |
| R3 | **Proactive silence / wait_for_user** | No-op cuando el audio es silencio/ruido: nunca "¿Sigues ahí?" hablado; solo UI. |
| R4 | **Tool output con envelope JSON** (`response_text` + `require_repeat_verbatim`) | Para que el SPEECH verbatim sea más fiable (menos parafraseo/truncado) — patrón de OpenAI. |
| R5 | **Entonación por utterance generalizada** | `response-create.options.instructions` ya se usa experimental en `narrar`: extender a preámbulos (tono bajo) y SPEECH (tono claro) si el proveedor las respeta. |

---

## 4. Recomendación

- **Ahora (P0)**: S1-S6. El mayor salto percibido = reemplazar el pool fijo por **frases de
  acción contextuales con variedad** + **no-preámbulo si la respuesta es directa** + **opener
  activo en el SPEECH**. Todo son ediciones pequeñas en `grok-voice.ts` (pool), `ChatSession.svelte`
  (gate), `agent-active.ts` (opener + Variety) y `grok-voice.ts` (idle tier 1).
- **Después (P1)**: M1 (hacer que el cerebro narre de verdad) + M2 (verbosity) + M3 (unclear audio).
- **Radicales (P2)**: evaluar R1/R2 (speech-to-speech real) cuando el gateway/xAI madure las fases
  commentary/final — es el destino natural para eliminar por completo los preámbulos hardcodeados.
