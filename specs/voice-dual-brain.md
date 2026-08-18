# Canal-Aware Dual-Brain — Voz que COMPLEMENTA la pantalla (spec canónica)

> Estado: **IMPLEMENTADO y validado** (2026-08-14) · Autor: meta-fábrica (Copilot) · Hogar: `specs/`
> Esta spec es la referencia canónica de la arquitectura de voz de `/chat`. El runtime NO la lee;
> es documentación de la fábrica (igual que `tesis/` y `research-n-dev/`).

---

## 1. El problema (por qué existe esto)

El usuario interactúa con el Asistente ERP de dos formas: escribiendo en `/chat` y **hablando por
voz** (Grok Voice Think Fast 2.0 realtime, capa delgada sobre el agente de Eve).

**Bug de UX original**: cuando la pregunta venía por voz, la capa delgada leía en voz alta la
respuesta COMPLETA del agente (hasta 646 tokens = minutos de audio) aunque el usuario YA la estaba
viendo en pantalla. Voz y pantalla decían exactamente lo mismo → redundante, lento, molesto.

**Visión del usuario** (investigada a fondo): la voz debe **complementar** la pantalla. El modelo
de texto (DeepSeek, "el cerebro") y el de voz (Grok, "la superficie") deben **colaborar en dos
vías**: el agente SABE que la voz está activa y produce outputs adaptados al canal — respuesta
completa para la pantalla + **resumen hablado** con datos exactos para la voz, y ocasionalmente un
**dato accionable** que solo se dice, no se escribe.

## 2. La frontera investigada (evidencia)

Referencias verificadas antes de implementar:

| Fuente | Patrón | Qué aporta |
|---|---|---|
| openai/openai-realtime-agents (Chat-Supervisor) | junior realtime + supervisor texto que produce `# Message` leído verbatim | El modelo de TEXTO formula el resumen hablado; la voz NO reformula (evita degradación) |
| OpenAI Realtime prompting guide (Rephrase Supervisor / Verbosity) | "The message is for a voice conversation, be very concise, use prose, never bulleted lists" + preámbulos cortos ("I'll check that order now", máx 1-2) | Formato del resumen + uso de filler mientras se trabaja |
| Gemini Live API | Hybrid VAD, proactive audio (el modelo decide NO responder si es irrelevante), async function calling NON_BLOCKING, activity handling | VAD ≥500ms de silencio; el agente puede decidir cuándo hablar |
| Gemini Live Canvas / Pipecat Voice UI Kit | voice+screen coordinados, componentes de UI de voz (ControlBar, VoiceVisualizer) | Indicadores de estado de canal en la UI |
| vercel/ai + handlemotion/dewey | AI SDK realtime (getWebSocketConfig/parseServerEvent), turnDetection disabled = push-to-talk | Nuestro `GrokVoiceClient` ya es el patrón oficial |

**Decisión de arquitectura**: patrón **Chat-Supervisor + Rephrase Supervisor** → el agente de texto
emite un canal de voz estructurado en su propia respuesta (cero latencia extra, mismo turno), y la
capa delgada de voz lo parsea y lo lee verbatim. No hace falta un round-trip de voz extra.

## 3. Arquitectura

```mermaid
flowchart TB
    subgraph CANAL["Canal-Aware Dual-Brain"]
        AGENT["DeepSeek — CEREBRO<br/>razona · tools · ERP · twin"]
        VOICE["Grok Voice — SUPERFICIE<br/>STT + TTS verbatim + preámbulos"]
        ORCH["Orquestador de canales<br/>ChatSession.svelte + chat-voice.ts"]
    end
    TÚ -->|habla| VOICE
    VOICE -->|transcript| ORCH
    ORCH -->|clientContext efímero {voice.active}| AGENT
    AGENT -->|respuesta completa + **SPEECH:** + **INSIGHT:**| ORCH
    ORCH -->|filler "Déjame revisarlo…" mientras piensa| VOICE
    ORCH -->|parsea SPEECH/INSIGHT → lee verbatim| VOICE
```

### Flujo completo (turno por voz)

1. El usuario activa la voz (`toggleVoice`) → se conecta la sesión realtime y abre el mic.
2. El usuario habla → server-vad transcribe → `onTranscript(text)`.
3. La capa escribe el texto en el chat y llama `submit()` **con `clientContext` de voz**:
   `Client context: {"voice":{"active":true,"state":"listening"}}` (efímero, 1 turno, NO se persiste).
4. Mientras DeepSeek piensa/consulta el ERP, la capa dice un **preámbulo** al inicio
   ("Déjame revisarlo…", rotativo — elimina el silencio muerto) y luego **narra por fases** lo
   que el agente está haciendo (revisar procedimiento → consultar conocimiento → consultar el
   ERP) con frases cortas encoladas tras el filler. Todo pasa por la **cola de voz serializada**.
5. El agente responde: **cuerpo completo para la pantalla** + al final `**SPEECH:** <resumen>`
   (1-2 frases, ~30 palabras, datos exactos) y opcionalmente `**INSIGHT:** <dato accionable>`.
6. `maybeSpeakAnswer` → `speakAgentAnswer(answer)`:
   - Si hay `SPEECH:` → lee SOLO el resumen verbatim (+ `Nota: <INSIGHT>` si existe) → modo `speech`.
   - Sin SPEECH y respuesta corta (≤ 180 chars) → lee completa → modo `full`.
   - Sin SPEECH y respuesta larga → la condensa a 1-2 frases (corte en límite de frase) → modo `truncated`.
7. La UI muestra el estado del canal: "Resumiendo la respuesta…" / "Consultando…" / "Escuchando…".
8. Vuelve a escuchar (barge-in + auto-retorno).

## 4. Contrato del canal de voz

### 4.1 `clientContext` de voz (entrada)

`ChatSession.svelte` → `submit()`:

```ts
{ voice: { active: true, state: 'listening' | 'speaking' | 'idle' } }
```

- Es **efímero** (solo el turno en curso) — Eve lo inyecta como mensaje `Client context: <json>`
  visible al modelo y NO lo persiste en el historial.
- Convierte el `submit()` de voz en **canal-aware**: el agente sabe qué canal está activo.
- Compatible con el `clientContext` de recuperación (ambos conviven en un objeto `{recoveryContext, voice}`).

### 4.2 Secciones `SPEECH:` / `INSIGHT:` (salida)

El agente (instruido en `agent/instructions/agent-active.ts`) emite al final de su respuesta,
SOLO cuando el `Client context` marca voz activa:

```
**SPEECH:** <resumen hablado: 1-3 frases en prosa, sin viñetas, con los datos EXACTOS
(nombres, montos, fechas, estatus) tal como los obtuvo. Solo los puntos más importantes.>

**INSIGHT:** <opcional: un dato accionable que el usuario NO ve en la pantalla, en una frase.>
```

Reglas del agente:
- El cuerpo de la respuesta sigue siendo COMPLETO para la pantalla.
- El SPEECH NO es una copia: redacción distinta, menos detalle, **mismo dato exacto**.
- Si la respuesta es corta (1-2 frases) NO hace falta SPEECH (la voz lee el texto completo).
- Solo se emiten con voz activa en el turno.

### 4.3 Parser y lectura (capa delgada)

`chat-voice.ts` exporta:
- `SPEECH_THRESHOLD_CHARS = 180` — umbral adaptativo (respuestas cortas se leen completas).
- `extractVoiceSections(text)` → `{ speech?, insight?, rest }` (tolerante a `SPEECH:` / `**SPEECH:**`).
- `condenseForSpeech(text, min=120, max=220)` — corta en el primer límite de frase.
- `ChatVoiceLayer.speakAgentAnswer(text): SpeakMode` — decide y lee (modos `speech|full|truncated|none`);
  cap defensivo: un SPEECH >260 chars se condensa.
- `ChatVoiceLayer.speakPreamble()` — filler ("Déjame revisarlo…", rotativo).
- `ChatVoiceLayer.speakNarration(text)` — narración de fase (skill/twin/ERP), encolada.
- `ChatVoiceLayer.clearSpokenQueue()` — barge-in: descarta utterances pendientes.

### 4.5 Cola de voz serializada (fix de timing — 2026-08-14)

**El bug original**: `speak()` mandaba `conversation-item-create` + `response-create` por cada
utterance SIN serializar. El modelo realtime procesa UNA respuesta a la vez; los `response-create`
del filler (inicio) y de la respuesta (final) se encolaban/reordenaban en el provider y sonaban
TODOS juntos al final ("Déjame revisarlo… + respuesta completa" consecutivos).

**El fix** (`GrokVoiceClient`): cola FIFO de utterances.
- `speak()` encola; `drainSpeakQueue()` envía un solo item + `response-create` SOLO cuando el
  modelo está libre (`!speaking && !_responding`).
- En `response-done` se libera la siguiente utterance → orden garantizado: filler → narración →
  respuesta, cada una esperando a que la anterior cierre.
- Red de seguridad: si una respuesta lleva >8s colgada sin `response-done` (cancelación que el
  provider nunca confirma), se fuerza el avance.
- Barge-in: al transcribir una pregunta nueva (`autoCancelAfterTranscript`) se descartan las
  utterances pendientes y se cancela la respuesta en curso.
- Diagnóstico: `console.info("[voz] …")` por utterance (timestamps para verificar el orden).

### 4.6 Coreografía de voz (simbiosis voz ↔ pantalla — 2026-08-14, 3ª iteración)

El objetivo es que la voz se sienta COORDINADA con lo que el usuario ve: "mostrando y
platicando". Para eso `ChatSession.svelte` implementa:

1. **Preámbulo con GRACIA**: el "Déjame revisarlo…" (rotativo) solo se dice si el agente sigue
   ocupado tras **1.5s** (turnos instantáneos NO lo dicen — la respuesta en pantalla manda).
2. **Narración por tool (voz = pantalla)**: cuando una herramienta arranca, la voz dice la MISMA
   etiqueta que muestra el feed (`friendlyToolLabel`: "Buscando proveedor…", "Consultando
   compras…", "Calculando totales…"). Gated: solo si es una tool nueva distinta de la ya
   narrada y pasó el gap (4.5s) — una ráfaga de tools narra solo la primera.
3. **Narración por timer de fase** (latido 5s): narra la fase actual (skill/twin/erp/analizando)
   solo en transición de fase o tras **18s** en la misma — mantiene el turno vivo sin repetir.
   Frases: "Voy a revisar el procedimiento…", "Consultando el conocimiento del sistema…",
   "Estoy analizando los datos…".
4. **Flush al terminar**: cuando la respuesta está lista, `maybeSpeakAnswer` corta TODO
   (`cutPlayback` + `clearSpokenQueue`) y habla SOLO la respuesta — nunca se oye el preámbulo
   cuando la respuesta ya está en pantalla.
5. **Kill del eco**: al transcribir una pregunta nueva (barge-in) se corta el audio en
   reproducción (`cutPlayback`) para que la auto-respuesta del VAD (que puede ECOAR la
   pregunta) no se escuche, además de cancelarse la respuesta y descartarse las utterances.

Solo narra cuando el turno vino por voz (`voicePendingSpeak`) y el agente está ocupado
(`isBusy`). Todo se resetea en cada pregunta nueva (y en barge-in).

### 4.7 Commentary channel — narración EN VIVO del cerebro (fusión total, 2026-08-14)

El salto de naturalidad: **la narración intermedia la genera el MODELO GRANDE (DeepSeek),
no la UI**. El cerebro sabe de dónde vienen los datos (módulo de negocio), qué consulta y
qué encontró en su razonamiento; ahora lo dice EN VIVO por el canal de voz.

**Mecánica:**
- Nueva tool del agente `narrar({ texto })` (`agent/tools/narrar.ts`, `defineTool` read-only,
  sin HITL, blindado). El cerebro la llama DURANTE el turno (transiciones de fase y hallazgos
  relevantes) cuando el Client context marca `voice.active`.
- `ChatSession.svelte` intercepta la tool-call en los EVENTOS (`watch` sobre `agent.events.length`,
  ventana deslizante de 25 eventos, dedupe por `meta.id` — el stream re-emite al reabrir) y la
  encola en la cola de voz serializada vía `speakNarration(texto, { instructions })`.
- La tool `narrar` se **excluye del feed** de actividades (`actions.requested` la salta) — su
  texto va SOLO a la voz, no ensucia la pantalla ni viola la regla de silencio del canal escrito
  (reconciliada en `instructions.md` y `agent-active.ts`).
- **Nivel de abstracción: MÓDULO de negocio, no tabla** — el cerebro dice "en el módulo de
  compras"/"en las existencias"/"en el plan de producción". El mapa entidad→módulo es
  conocimiento universal (kernel `erp-kernel/index.md` §Módulos de negocio) y su espejo en
  `friendlyToolLabel` alimenta el fallback determinista (voz = pantalla).
- **Tono por utterance** (experimental): cada narración del cerebro se envía con
  `response-create.options.instructions` (el protocolo normalizado lo soporta) para que Grok la
  lea con naturalidad de comentario en voz baja. `speak(text, { instructions? })` en `grok-voice.ts`
  y `speakNarration(text, options?)` en `chat-voice.ts`.
- Fallback: si el cerebro no llama `narrar`, la coreografía de §4.6 sigue intacta (cero regresión).

Reglas del cerebro (en `agent-active.ts`): máx 1-2 llamadas por fase, frases de 4-12 palabras,
solo hallazgos que valga la pena decir, NUNCA mecánica/tablas/razonamiento completo.

### 4.4 Contrato `VOICE_INSTRUCTIONS` (chat-token)

La sesión realtime de `/chat` sigue siendo SOLO voz: transcribe lo que el usuario dice y lee
verbatim lo que se le envía con "Lee en voz alta: <TEXTO>". El TEXTO ahora es el resumen SPEECH
(formulado por el agente de texto), no la respuesta completa.

## 5. Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/lib/realtime/grok-voice.ts` | **Cola de voz serializada**: `speak()` encola, `drainSpeakQueue()` envía uno a la vez (espera `response-done`), `clearSpokenQueue()` (barge-in), `cutPlayback()` (corta audio en curso), red de seguridad 8s, log `[voz]` |
| `src/lib/realtime/chat-voice.ts` | `extractVoiceSections`, `condenseForSpeech`, `speakAgentAnswer` (+cap 260), `speakPreamble`, `speakNarration`, `clearSpokenQueue`, `cutPlayback`, `SPEECH_THRESHOLD_CHARS`, `SpeakMode` |
| `src/routes/chat/ChatSession.svelte` | `submit()` inyecta `clientContext.voice`; `maybeSpeakAnswer` usa `speakAgentAnswer` + **flush** (corta narración pendiente); **coreografía**: preámbulo con gracia 1.5s, narración por tool (`friendlyToolLabel`), narración por timer de fase (5s tick, 18s repeat), kill de eco en barge-in; UI: "Resumiendo la respuesta…" / "Consultando…" |
| `agent/instructions/agent-active.ts` | Sección "## Canal de voz (resumen hablado)" — SPEECH **1-2 frases (~30 palabras)** + INSIGHT opcional |
| `src/routes/api/realtime/chat-token/+server.ts` | `VOICE_INSTRUCTIONS` ajustada (lee resúmenes verbatim, pausado y claro) |
| `agent/tools/narrar.ts` | **NUEVO** — tool de comentario hablado del cerebro (read-only, sin HITL); la UI la intercepta y la manda a la voz |
| `agent/instructions/agent-active.ts` | Sección "Canal de voz — narración en vivo (commentary)": cuándo llamar `narrar`, módulos no tablas, máx 1-2 por fase |
| `agent/instructions.md` | Nota que reconcilia la regla de silencio: `narrar` va SOLO al canal hablado (no a pantalla/razonamiento) |
| `src/routes/chat/ChatSession.svelte` | Intercepta `narrar` en los eventos (dedupe por meta.id, gap) → `speakNarration` con instructions; filtra `narrar` del feed; resetea dedupe en barge-in/toggle |
| `src/lib/realtime/grok-voice.ts` | Cola de utterances con `instructions?` opcional → `response-create.options.instructions` por respuesta |
| `src/lib/realtime/chat-voice.ts` | `speakNarration(text, options?)` propaga las instructions |
| `src/lib/lib/agent-diagnostics.ts` | `friendlyToolLabel` con mapa entidad→módulo (fallback determinista "voz = pantalla" en módulos) |
| `company-twin/erp-kernel/index.md` | Sección "Módulos de negocio — cómo decirlos": mapa entidad→módulo (conocimiento universal) |

## 5bis. Validación del fix de timing + coreografía (2026-08-14, E2E real)

Turno rápido por voz (STT vía ruido ambiente):

```
11:41:04 · Déjame revisarlo…          ← filler con gracia (solo porque siguió ocupado)
11:41:06 · Buscando proveedor…        ← narración por TOOL = la MISMA etiqueta del feed
11:41:13 · Estoy analizando los datos… ← fase de análisis
11:41:14 · El único proveedor Leticia activo...  ← SOLO la respuesta al final (~10s de turno)
```

Turno largo por voz (pregunta de compras):

```
11:37:54 · Un momento…                ← filler (rotación)
11:38:03 · Estoy analizando los datos…  ← fase
11:38:23 · Estoy analizando los datos…  ← repetida a los 20s (mantiene vivo, sin spam)
11:38:43 · Estoy analizando los datos…  ← otra a los 20s
11:38:52 · En los dos últimos meses recibimos veinte entradas...  ← SOLO la respuesta (SPEECH)
```

Sin repeticiones de fases, sin eco de la pregunta, respuesta corta al final. `npm run check`
0 errores/0 warnings, linter 0 críticos.

## 5ter. Diagnóstico del "caos" + coreografía v3 (2026-08-15, E2E con logs)

El usuario reportó "ahora está peor, se atropella". Con logs `[vad]/[stt]/[resp]/[play]/[voice]`
se diagnosticaron **DOS causas raíz** de hardware/gateway (no de coreografía):

1. **Mic + altavoz en la misma máquina (SIN AEC)**: el altavoz del asistente suena y el mic lo
   capta con la MISMA energía que la voz del usuario. El VAD por energía lo interpretaba como
   habla del usuario → `cutPlayback` (se cortaba a sí mismo) → `COMMIT` del audio del asistente →
   se transcribía como pregunta ("Perfecto.") → submit → nuevo turno → **atropello / loop**.
2. **El gateway crea una respuesta automática tras el commit** (turnDetection `disabled` no
   siempre lo impide): `response-created` inmediato tras el STT → audio del modelo no pedido
   (eco) que además alimentaba la causa 1.

**Fix (coreografía v3, `grok-voice.ts`):**
- **El VAD IGNORA el mic mientras `_playing`** (audio del asistente sonando). Se ELIMINÓ el
  barge-in por energía: sin AEC no distingue habla de usuario vs audio del asistente (ambos
  tienen RMS alto). El barge-in queda disponible vía UI (texto/Detener) y en hardware con AEC
  (reactivar `_playing → cutPlayback()`).
- **Cooldown post-playback** (`VOICE_PLAYBACK_COOLDOWN_MS = 1500`): tras terminar el audio del
  asistente, el residuo del altavoz que sigue sonando no dispara un `COMMIT` falso.
- **Matar el eco no pedido**: `expectResponse` se marca `true` SOLO cuando `drainSpeakQueue`
  envía un `response-create` pedido. En `response-created`, si `autoCancelAfterTranscript &&
  !expectResponse` → `response-cancel` AL INSTANTE (log `CREATED AUTOMÁTICA → CANCEL`) y break;
  si es pedida, se limpia la flag y sigue el flujo normal. `response-done` resetea la flag.
- `lastPlaybackEndAt` se setea en `onended` (cuando `activeSources === 0`) y en `stopPlayback`.

**Validación E2E real (04:11, `/chat` con voz + `say -v Elena`):**
```
04:11:04 · COMMIT (pregunta real) → STT → submit
04:11:04 · CREATED AUTOMÁTICA → CANCEL          ← eco matado al instante
04:11:08 · Déjame revisarlo…                     ← filler
04:11:10 · Déjame revisar las existencias de frijol negro en el almacén…  ← narrar (SIN corte)
04:11:22 · Ahora busco las existencias de frijol negro por presentación…  ← narrar (SIN corte)
04:11:47 · En el almacén principal tienes 279 mil 353 piezas de frijol negro…  ← respuesta (completa)
```
CERO commits falsos durante el turno, CERO cuts por auto-eco, 0 errores de consola, inspector
`status: ready` (turno 42.5s / 6 steps / 9 calls / 0 err / cache 85%). Los commits posteriores
al turno (ruido ambiente del usuario) transcriben vacío → sin daño. Lección: **sin AEC, el VAD
por energía NO puede distinguir habla de usuario vs audio del asistente; hay que suprimir el mic
virtualmente durante el playback del asistente** (patrón del research).

## 5quater. ⚠️ "SIEMPRE REPITE LA RESPUESTA" — causa raíz real = el APPEND sin gate (2026-08-15, FIXED)

El usuario reportó que el agente **siempre repite la respuesta** y que "no está registrado".
Diagnóstico exhaustivo contra el espejo durable (`.data/sessions.sqlite3`): en la sesión
`wrun_...TZ15` (04:35, 6 turnos) aparecen como "preguntas del usuario":
- `"Lee en voz alta: Armando el análisis completo de Almacenes Vaca…"` — **el audio del PROPIO
  asistente transcrito** (el prefijo "Lee en voz alta:" es el que la capa de voz envía al modelo
  realtime en `conversation-item-create`).
- `"¿Cuáles son las concluidas? Un momento…"` — mezcla la pregunta real con el filler "Un momento…".

**Causa raíz**: la coreografía v3 (5ter) solo gateaba el **COMMIT** (`vadTick` ignora mientras
`_playing`/cooldown), pero el **`input-audio-append` se enviaba SIEMPRE** (el mic seguía mandando
todo el audio al buffer del servidor durante el playback del asistente). El siguiente commit
(disparado por la voz real del usuario o al vencer el cooldown) transcribe **TODO lo acumulado
desde el último commit — incluida la respuesta del asistente** → se re-somete como "pregunta"
→ el agente responde lo mismo otra vez → loop de repetición.

**Fix (el que cierra la fuente real)**: en `worklet.port.onmessage` de `grok-voice.ts`, **si
`_playing` (asistente sonando) o dentro de `VOICE_PLAYBACK_COOLDOWN_MS` tras `lastPlaybackEndAt`,
se hace `return` ANTES del `captureBatcher.push`** — el audio del asistente NUNCA entra al buffer
del servidor (ni al batcher), así que el próximo commit solo contiene audio real del usuario.

**Validación E2E (04:38-04:40, 3 turnos seguidos por voz en `/chat`)**:
```
04:38:52 · COMMIT → STT "¿En qué estatus están las órdenes de compra del mes?" → submit
04:38:56 · Déjame revisarlo…                     ← filler genérico
04:38:58 · Revisando el estatus de las órdenes de compra del mes…  ← narrar (ACCIÓN, no eco)
04:39:06 · Las órdenes de compra del mes suman 233: 131 por surtir…  ← respuesta
04:39:09 · DONE → 55s de SILENCIO (cero commits falsos, cero re-submits)   ← ¡loop muerto!
04:40:04 · COMMIT → STT "¿Qué monto ascienden las concluidas?" → submit (pregunta NUEVA real)
04:40:15 · Las 89 órdenes concluidas suman 9 millones 208 mil 980 pesos.
04:40:27 · COMMIT → STT "¿Cuál fue la más grande?" → submit (pregunta NUEVA real)
04:40:40 · La orden más grande es el folio 17883, de Comercial de Tubos del Bajío, por 678…
```
CERO re-submits del audio del asistente en los 3 turnos, 0 errores de consola. Además las
narraciones del cerebro ahora dicen la ACCIÓN ("Revisando el estatus…", "Sumo el importe…",
"Buscando la orden de compra de mayor importe…"), no parafrasean la pregunta verbatim (directiva
anti-eco en `agent-active.ts` + `narrar.ts`).

**LEYES del hardware sin AEC (actualizadas)**:
1. El VAD solo controla CUÁNDO se commitea; el APPEND decide QUÉ audio llega al servidor.
   Gatear solo el commit NO basta — hay que suprimir el mic a nivel de append (y del batcher).
2. La evidencia del loop vive en el espejo (`events.message.received` con textos del propio
   asistente como "Lee en voz alta: …"); es la primera pista a revisar ante "repite la respuesta".
3. Sin AEC no existe barge-in por voz; el usuario debe esperar el final o usar texto.

## 5quinquies. SPEECH invisible en la UI + resaltado determinista de la entidad narrada (2026-08-15)

**Pedido**: (1) que el bloque `**SPEECH:**`/`**INSIGHT:**` NO se muestre en la burbuja (es
redundante — va SOLO al canal de voz); (2) que la ENTIDAD que la voz narra se resalte en negrita
en el cuerpo visible para que voz y pantalla resalten lo mismo.

**Implementación**:
- `message-animated.svelte` nueva prop `stripVoiceSections` (true para mensajes del asistente):
  renderiza `extractVoiceSections(text).rest` (el cuerpo SIN SPEECH/INSIGHT) en la burbuja.
  La VOZ sigue usando el texto completo (`speakAgentAnswer` → `extractVoiceSections`), así que
  el SPEECH se lee verbatim aunque no se vea en pantalla. El "Copiar respuesta" también copia
  solo el `rest` (sin SPEECH).
- **Resaltado DETERMINISTA** (no depende del modelo): nuevas funciones en `chat-voice.ts`:
  `extractNarratedEntity(speech)` — heurística que extrae del SPEECH la secuencia capitalizada
  MÁS LARGA de ≥2 palabras (nombres propios, con conectores de/del/la/los/el/y…), con regex de
  property escapes Unicode `\p{Lu}/\p{L}` (`\w` NO matchea acentos en este runtime — ¡verificado!).
  `highlightNarratedEntity(body, speech)` — envuelve esa entidad en `**…**` dentro del cuerpo
  (prosa Y celdas de tabla); si el modelo ya la puso en negrita, no duplica. Blindado try/catch.
- **Directiva al cerebro** (`agent-active.ts`): el elemento que narra en el SPEECH debe ir en
  negrita en el cuerpo con el MISMO nombre — la capa determinista lo garantiza aunque el modelo
  no lo haga (ej. el modelo resaltó el encabezado, no la entidad; la capa la resalta igual).
- **Validado E2E en /chat**: rehidratada la sesión de "Poly Películas Impresas", la burbuja NO
  muestra SPEECH (`hasSpeechVisible:false`) y la entidad aparece en `<span class="font-semibold">`
  en la prosa Y en la celda de la tabla (el renderer streamdown usa `span.font-semibold`, NO
  `<strong>`). 4/4 casos de prueba de la heurística (2 con entidad real acentuada, 2 sin nombre
  propio → null). `npm run check` 0/0.
- Nota: `extractVoiceSections` ya devolvía `rest` — la pieza nueva es usarlo en el render y el
  resaltado. El GOTCHA del renderer: streamdown marca la negrita como `span[data-streamdown-strong]`
  con `font-semibold`, no `<strong>/<b>` — verificar con ese selector en la UI.

## 5sexies. El resaltado se PRENDE al narrarse, no flashea (2026-08-15)

**Reporte del usuario**: "siento que las animaciones están al revés, debería de prenderse al
narrarse, no flashear". El `narrate-pop` previo (añadido en 5quinquies) era un destello de
1.1–1.4s que terminaba en `transparent`: la fila se apagaba mientras la voz seguía hablando.

**Rediseño — estado encendido SOSTENIDO sincronizado con el playback**:
- El glow ya NO es una animación que se desvanece: se PRENDE cuando la voz empieza a leer el
  `SPEECH` y permanece encendido mientras dura el audio; se APAGA cuando el audio termina.
- La NEGRITA determinista de la entidad (fila completa) permanece siempre (marca permanente).

**Eventos globales de narración** (`window` CustomEvents, blindados con try/catch + `?.`):
- `narrate:start` → la UI añade `narrate-flash` (fila + span de la entidad).
- `narrate:end` → la UI la quita (audio terminado o cortado por barge-in/`cutPlayback`).

**Dónde se emiten** (`grok-voice.ts`):
- `speak(text, { narrate?: boolean })` — la cola guarda `narrate`; `drainSpeakQueue` emite
  `narrate:start` al reproducir una utterance narrada (`narrateInFlight = true`).
- `playAudio` `source.onended` (cuando `activeSources` vuelve a 0) y `stopPlayback` (barge-in,
  `cutPlayback`, `disconnect`) emiten `narrate:end` y resetean `narrateInFlight`.
- `chat-voice.ts` `speakAgentAnswer` con `SPEECH` → `client.speak(clean, { narrate: true })`
  (solo el camino del SPEECH narra una entidad; fillers/narraciones de fase/sin SPEECH no).

**Dónde se escucha** (`message-animated.svelte`): `narrating` ($state) lo gobiernan los eventos;
el `$effect` registra los listeners y aplica/limpia `narrate-flash` según `narrating && narratedEntity`
(matching tolerante `normalizeNameKey`). Sin voz (mensaje rehidratado) → sin glow, solo negrita.

**CSS** (`layout.css`): se eliminó `@keyframes narrate-pop`. Estado: `span[data-streamdown-strong]`
y `tr[data-streamdown-tr] td` con `transition: background-color .35s ease` (entrada/salida suaves);
`.narrate-flash` = `background-color: color-mix(in oklab, var(--primary) 18%/13%, transparent)`
(+ `box-shadow 0 0 0 2px` al 12% en el span). Selector de fila: `tr[data-streamdown-tr].narrate-flash td`.

**Validado E2E por voz** (turno real, `say -v Elena` + mic): polling del DOM mostró
`ON: Poly Películas…` (filas con la entidad encendidas) al iniciar la narración y `OFF` a los
34.2s cuando terminó el audio; glow apagado final, `hasSpeechVisible:false`. También validado
por dispatch manual de los CustomEvents (start→enciende, end→apaga). `npm run check` 0/0.

**GOTCHAS**:
- El `$effect` de Svelte reacciona de forma ASÍNCRONA → al validar con dispatch manual hay que
  esperar ~300ms antes de leer la clase en el DOM.
- `?.` defensivo en `this.dispatchNarrate?.(...)`: un edge de HMR durante una transición de página
  dio `TypeError: this.dispatchNarrate is not a function` dentro de un `onended` (uncaught si no
  se protege) → el optional chaining evita que un `throw` en un callback de audio rompa el turno.
- Para validar tras editar, navegar a `/chat?t=<timestamp>` (la navegación simple a veces sirvió
  módulo cacheado: el primer intento mostró `boldCells:1` con el fix ya aplicado).

## 5septies. Resaltado de CANTIDADES narradas (match voz → número exacto, 2026-08-15)

**Pedido del usuario**: "falta poder resaltar las cantidades… en voz dice 'un poco más de 12
millones' y en texto 12,000,100 — deberíamos poder hacer el match también para destacarlo".

**El problema (datos reales del espejo)**: la voz dice las cifras de forma VERBAL/APROXIMADA
mientras el cuerpo tiene el número EXACTO: "casi diez millones" ↔ `$9,868,562`; "54 millones" ↔
`$53,943,631`; "42 millones en julio y once en junio" ↔ `$42,753,891`/`$11,189,740`; "84/316/28/
114" ↔ igual; "90 a 120 días" ↔ igual; "$22,500" ↔ `$22,500.00`.

**Implementación** (`chat-voice.ts`, todo blindado try/catch):
- `normalizeNumeric(s)` — token del cuerpo a número (quita `$`, comas, espacios; el punto es decimal).
- `extractSpokenAmounts(speech)` — extrae las cantidades del SPEECH: (1) DÍGITOS con/sin magnitud
  ("84", "54 millones", "$22,500") y (2) números en PALABRAS en español ("diez millones", "once",
  "cincuenta y cuatro") con magnitudes `mil/miles` (×1000) y `millón/millones` (×1e6). Cada una
  con `{ value, approx, raw }` y dedupe por valor. Una magnitud redonda o un prefijo de
  aproximación marca `approx=true` (12M ≠ 12,000,100).
- `ES_APROX` — prefijos de aproximación ("casi", "unos", "un poco más de", "alrededor de",
  "más de", "menos de", "~"…). ⚠️ GOTCHA: DEBE ser grupo capturing OPCIONAL `(...)?` con
  `m[1]`=prefijo, `m[2]`=número/palabras, `m[3]`=magnitud. Con `(?:...)` o sin `?` los índices se
  desalinean o solo matchea con prefijo → probar SIEMPRE sin prefijo ("84", "54 millones").
- `parseSpanishNumber(words)` — parser de secuencias en español ("cincuenta y cuatro"=54, "dos y
  media"=2.5, "diez millones"=1e7).
- `highlightSpokenAmounts(body, speech)` — envuelve en `**…**` el token del cuerpo que matchea
  (exacto `<1e-6`, o ±2% `max(value*0.02,1)` si `approx`, eligiendo el más cercano); recorta
  espacios y puntuación final (".",",") para que el `**` quede pegado al número; ignora tokens con
  leading zeros (códigos "PP-0084"→"0084"); no duplica si ya está en negrita; dedupe por cantidad.
- `textContainsAmount(text, amounts)` — true si un textContent contiene un token que matchea
  (para el flash).

**`message-animated.svelte`**:
- `narratedAmounts` ($derived de `extractSpokenAmounts(speech)`) para el flash.
- `getMessageAnimatedTextParts` aplica `highlightSpokenAmounts` DESPUÉS de `highlightNarratedEntity`.
- El `$effect` del flash marca `tr`/`span[data-streamdown-strong]` por ENTIDAD **o** por CANTIDAD
  (`textContainsAmount`, solo spans — el tr incluye códigos que falsearían).
- ⚠️ BUG arreglado: el apply solo corría con `active && key` (entidad) → un SPEECH que narra SOLO
  números (sin nombre propio de ≥2 palabras) nunca encendía las cantidades. Fix:
  `if (active && (key !== "" || amounts.length > 0)) apply();`.

**Validado E2E en navegador** (sesión real de Leticia): negrita determinista en `$53,943,631`,
`64`, `$42,753,891`, `$9,868,562`, `90`, `120`; con `narrate:start` se encienden todas esas
cantidades + la entidad; `narrate:end` apaga todo. 11/11 casos node (incluye el del usuario
"un poco más de 12 millones" → "de **12,000,100** pesos"). `npm run check` 0/0.

**Límites aceptados**: "un/una"→1, "5", "dos"→2 solo resaltan si el cuerpo tiene ese número suelto
(falso positivo coherente). "once" sin magnitud no matchea "11,189,740" (el SPEECH no dice
"once millones" — el contexto implícito no se modela).

## 5septies. Roadmap ejecutado (2026-08-17) — server VAD, barge-in, AEC, idle watchdog, overlay

Ejecutado por la meta-fábrica con subagentes, comparando contra las referencias de voz
(`references/xai-cookbook` ejemplo Android + `references/vercel-ai` AI SDK realtime). La
investigación y el diseño viven en `research-n-dev/voice-canonical-patterns.md` y
`research-n-dev/voice-aec-web.md` (material de FÁBRICA, el runtime no los lee).

### A. Modo AEC vs modo no-AEC (server VAD + barge-in real) — P1/P4

El cliente detecta el AEC real al abrir el mic: `track.getSettings().echoCancellation === true`
(la verdad aplicada, best-effort; `getCapabilities?.()` con guard Safari) → `aecMode`.

| Aspecto | **Modo AEC** | **Modo no-AEC** (fallback, intacto) |
|---|---|---|
| `turnDetection` | `server-vad` (`SERVER_VAD_CONFIG`: threshold 0.5 / silence 700ms / prefix 300ms) vía `session-update` | `disabled` |
| Mic durante playback | SIEMPRE appendea (el AEC cancela al asistente) | Gate `_playing` + cooldown 1500ms |
| Commit | El server decide (`speech-stopped`); fallback cliente a 8s (`SERVER_VAD_COMMIT_FALLBACK_MS` → `vad_server_fallback`) | VAD cliente por RMS (silencio 1200ms) |
| Barge-in | **Real**: `speech-started` → `cutPlayback()` + `clearSpokenQueue()` (`barge_in`) | No por voz; solo vía UI/transcript |
| Reciclaje proactivo | No corre (era un parche no-AEC) | Corre (`maybeRecycleIdle`) |
| `session_resync` | Sí (con config del modo) | Sí |

- La config de turnDetection vive en un módulo compartido `src/lib/realtime/voice-session-config.ts`
  (fuente única endpoint + cliente; formato camelCase normalizado del AI SDK).
- El endpoint `chat-token` acepta `?turnDetection=server-vad` para probar el modo AEC sin mic.
- El barge-in NO depende de `conversation-item-truncate` (el gateway puede descartarlo) — se corta
  client-side. El auto-cancel de `input-transcription-completed` sigue matando la respuesta
  automática del modelo (thin-layer: el modelo realtime solo transcribe/lee).

### B. Override conductual del AEC (defensa del "AEC declarado pero inefectivo") — P2

- `getSettings()` puede decir `true` y el eco persistir (caso real de esta máquina). En el
  `worklet.port.onmessage` del modo AEC, `monitorAecEcho()` mide el RMS del mic mientras `_playing`:
  si se sostiene ≥ `AEC_ECHO_RMS_OVERRIDE` (0.03) durante ≥ `AEC_ECHO_CONFIRM_MS` (1800ms) →
  `downgradeToNoAec("eco-sostenido-durante-playback")` en caliente: re-envía `session-update` con
  `disabled`, vuelve al gate del append, telemetría `aec_downgrade`. Se resetea en cada `startMic`.
- Limitación aceptada: un barge-in real y continuo (~2s) también degrada — degradar es seguro (solo
  suprime el mic durante playback; la pregunta no se pierde, se transcribe al terminar el asistente).

### C. Aviso de UI del modo (P2)

- `ChatVoiceCallbacks.onAecChange` → `ChatSession.svelte` estado `voiceAec`.
- no-AEC: banner ámbar dismissible "Modo sin cancelación de eco. Tu micrófono se pausa mientras el
  asistente responde… El barge-in por voz está desactivado (puedes interrumpir escribiendo o con
  Detener)".
- AEC: chip verde informativo "Cancelación de eco activa — puedes interrumpir hablando".

### D. Idle watchdog (referencia Android `IDLE_TIERS`) — P3

- 2 escalones configurados (`VOICE_IDLE_TIER1_MS` 25s / `VOICE_IDLE_TIER2_MS` 90s), poll 1s.
- `noteActivity()` rearmera en: `startMic`, `vadTick` (habla), `input-transcription-completed`,
  `play_start`, `response-done`, `speak()`. Se pospone mientras el asistente habla / respuesta en
  vuelo / cola con utterances. Se cancela en `stopMic`/`disconnect`.
- Tier 1 → `onIdle(1)` (una vez por ventana) → la UI habla "¿Sigues ahí? Puedes preguntarme lo que
  necesites." + estado visual.
- Tier 2 → `onIdle(2)` → la UI habla "Voy a pausar la voz por inactividad." y apaga la voz a los 4s
  (la conversación de chat NO se pierde; la voz es solo el canal).

### E. Overlay buffer — lo que dices mientras suena el asistente (P5, EXPERIMENTAL)

- Flag `VOICE_BUFFER_DURING_PLAYBACK = false` (OFF por defecto; con OFF el comportamiento es
  byte-identical al actual). Solo aplica en modo no-AEC (en AEC el mic ya appendea y hay barge-in).
- `capturePlaybackOverlay()` acumula el audio del mic durante `_playing` en un buffer aparte
  (`playbackOverlayChunks`, cap 10s), discriminando voz del usuario vs eco del asistente por
  heurística de RMS (`echoFloorRms` EMA del mic, "voz probable" si `micRms > floor*1.4+0.01`
  sostenida ≥342ms, bootstrap anti-loop 400ms).
- Al terminar el playback (`onended` con `activeSources===0`) y tras el cooldown, si hay
  ≥ `PLAYBACK_OVERLAY_MIN_VOICE_MS` (600ms) de voz → re-append + `input-audio-commit` →
  `startCommitWatchdog` (misma recuperación del flujo normal). Telemetría
  `overlay_capture/overlay_discard/overlay_commit/overlay_limit`.
- Riesgo conocido (documentado): sin AEC puede haber doble transcripción si el usuario sigue
  hablando tras el playback; el flag lo neutraliza.

### F. Investigación del patrón canónico (P6)

- `research-n-dev/voice-canonical-patterns.md`: nuestro `GrokVoiceClient` ya implementa ~80% del
  patrón canónico; `BrowserRealtimeAudio` NO es importable standalone desde `ai` (interno del hook)
  y su captura usa `ScriptProcessorNode` deprecado → NO reemplazar nuestro
  `RealtimePcmBatcher`/playback (la cola, el gate anti-eco, el watchdog y la telemetría son la razón
  de ser del thin-layer). `experimental_encodeRealtimeAudio` ≡ `encodeRealtimeAudio` (alias).
  Adopción pendiente: `getPlaybackOffsetMs()` para sincronizar el resaltado con el progreso del audio.

## 5octies. UX de voz: preámbulos de acción + variedad + narrar mecánico (2026-08-17, ejecutado)

Diagnóstico con evidencia: los 3 preámbulos fijos rotando ("Déjame revisarlo… / Un momento… /
Déjame consultarlo…") se repetían en bucle cada turno (cacofonía; secuencia hablada extraída de
`voice_events` de la sesión de 10 turnos) y el cerebro solo narró 1/10 turnos. Análisis completo +
mejores prácticas en `research-n-dev/voice-ux-best-practices.md`; decisión radical en
`research-n-dev/voice-radical-speech-to-speech.md`.

### Implementado (P0 sencillas + P1 medianas + P2 parcial)

| # | Mejora | Dónde |
|---|---|---|
| S1/S6 | Pool de preámbulos de **ACCIÓN** (`PREAMBLE_ACTION_PHRASES`, 8 frases) + hint contextual de módulo (`friendlyToolLabel` de la primera tool ERP del turno, voz = pantalla) + anti-repetición por historial (últimas ~5) | `chat-voice.ts` `speakPreamble(hint?)` · `ChatSession.svelte` `voiceTurnToolHint` |
| S2 | Gate de timing real: el filler temprano (1800ms) se dispara solo cuando arrancó la primera tool; la gracia de 4s ya no marca el flag al programar (el primero que habla gana, sin duplicados) | `ChatSession.svelte` `voiceFirstToolAt` + watch de tools |
| S3 | SPEECH con **puente activo variado** ("Ya lo tengo —", "Aquí tienes:", "Revisé las compras:") + regla Variety entre turnos | `agent/instructions/agent-active.ts` |
| S4/M1 | `narrar` **OBLIGATORIO** (inicio de turno antes de la 1ª tool, cambio de módulo, hallazgo) + variedad entre turnos + 6 ejemplos de frases de arranque por módulo | `agent/instructions/agent-active.ts` + `agent/instructions.md` |
| S5/R3 | Idle watchdog 25s/90s → **60s/150s** (patrón `wait_for_user`: no hablarle al silencio salvo inactividad real prolongada) | `grok-voice.ts` |
| M2 | Verbosity del SPEECH: [puente] + [gist] + [≤2 detalles] + [siguiente acción útil opcional] | `agent/instructions/agent-active.ts` |
| M3 | Audio poco claro: transcript <3 chars (sin HITL, sin busy, >30s) → "¿Podrías repetirlo?" una vez por ventana + telemetría `unclear_audio` | `ChatSession.svelte` `onTranscript` |
| R5 | Tono por utterance: `instructions` de commentary (voz baja) en preámbulo/narración y de **respuesta final** en SPEECH/lectura | `chat-voice.ts` (`PREAMBLE_INSTRUCTIONS`, `FINAL_ANSWER_INSTRUCTIONS`) |
| — | `VOICE_INSTRUCTIONS` de chat-token: eliminada la línea muerta "responde proactivamente con el preámbulo" (la capa auto-cancela) → "nunca hables por tu cuenta: solo transcribes" | `chat-token/+server.ts` |

### Veredicto radical (R1/R2/R4) — `research-n-dev/voice-radical-speech-to-speech.md`
- **R1 (S2S real con commentary/final nativos)**: VIABLE PARCIAL — el protocolo normalizado del
  gateway NO expone fases (`RealtimeModelV4ServerEvent["response-done"]` = `{ responseId, status,
  raw }` sin `phase`); `phase: commentary|final_answer` existe solo en el protocolo nativo de
  OpenAI gpt-realtime-2. Hoy la capa JS ya separa `narrar`≈commentary y `SPEECH`≈final (recomendación
  de la guía). No migrar a cerebro realtime hoy.
- **R2**: `instructions` por utterance ya operativo (mapeo commentary/final).
- **R4 (envelope JSON de tool output)**: N/A — el SPEECH lo parsea la capa JS, no un modelo realtime.
- **VAD semántico**: tipado sí (`semantic-vad` en `RealtimeModelV4SessionConfig.turnDetection.type`),
  mapeo wire server-side sin verificar → requiere probe de runtime antes de adoptarlo.

Validación: `get_errors` 0 en los 6 archivos editados · `npm run check` → **0 errores / 0 warnings**.

## 6. Fases futuras (no implementadas, por diseño)

1. **Proactive silence**: el agente decide NO hablar si la respuesta ya está visible (respuestas
   triviales) — requiere un marcador extra tipo `NO_VOICE:` o que la ausencia de SPEECH + respuesta
   corta ya implique lectura (parcialmente cubierto por el umbral; el idle ya es 60s/150s).
2. **Highlight sincronizado** (Live Canvas lite): resaltar en pantalla la sección que la voz está
   leyendo — requiere post-procesar el render del mensaje (hoy las secciones SPEECH/INSIGHT se
   muestran en negrita dentro de la burbuja; ocultarlas o resaltarlas es Fase 3). Adopción pendiente
   de `getPlaybackOffsetMs()` para sincronizar con el progreso del audio.
3. **VAD híbrido** (client-end-of-speech ≥500ms) para menor latencia de fin de turno — hoy usamos
   server-vad con `autoCancelAfterTranscript`.
4. **Reconnect con backoff** de la sesión realtime.
5. **S2S real con commentary/final nativos** (R1): esperar a que el gateway/xAI exponga fases de
   respuesta (`response.output[].phase`) — ver `voice-radical-speech-to-speech.md` (spec de
   migración incluida; NO romper los invariantes del thin-layer).

## 7. Cómo validar

1. `nvm use 24 && npm run check` → 0 errores/0 warnings.
2. E2E en `/chat` (sesión nueva): activar voz → hablar una pregunta → observar en el `Agent
   inspector`: el input LLM del primer step contiene `Client context: {"voice"...}`; la respuesta
   final contiene `**SPEECH:**`; la voz lee solo el resumen; el pill muestra "Resumiendo la
   respuesta…".
3. Sin voz (teclado): el agente NO emite SPEECH (regresión cero).
4. Persistencia: `/api/audit/turns` sigue trayendo question+answer+métricas.
