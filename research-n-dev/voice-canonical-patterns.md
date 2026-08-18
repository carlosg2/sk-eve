# Patrones canónicos de realtime voice del AI SDK vs `GrokVoiceClient` — análisis y recomendaciones

> Fecha: 2026-08-17 · Autor: subagente de investigación (P6 del plan de mejora de voz) · Hogar: `research-n-dev/` (material de la FÁBRICA, el runtime no lo lee)
> Alcance: comparar el patrón canónico de realtime del AI SDK de Vercel (referencias del repo) contra nuestro cliente custom `src/lib/realtime/grok-voice.ts`, y decidir QUÉ reutilizar y QUÉ no en la arquitectura thin-layer de `/chat`.

---

## 0. Resumen ejecutivo (TL;DR)

- Nuestro `GrokVoiceClient` ya implementa **el 80% del patrón canónico** (setup endpoint, `getWebSocketConfig`, `parseServerEvent`/`serializeClientEvent` vía el modelo realtime de `@ai-sdk/gateway`, cola de tool outputs con un solo `response-create`, guard de identidad del WebSocket) y es **superior al canónico en captura** (AudioWorkletNode en vez de ScriptProcessorNode deprecado).
- **(a) NO reemplazar** `RealtimePcmBatcher`/`playAudio` por `BrowserRealtimeAudio`: esa clase **NO está exportada públicamente** desde `ai` (es interna de `AbstractRealtimeSession`), usa `ScriptProcessorNode` (deprecado), y adoptarla implicaría perder el gate anti-eco, la telemetría, la cola de voz y el watchdog — la razón de ser del thin-layer.
- **(b) `experimental_encodeRealtimeAudio`/`decode`/`resample` SÍ son exactamente las mismas funciones** que `encodeRealtimeAudio`/`decodeRealtimeAudio`/`resampleAudio` (alias de re-export en `realtime/index.ts`). Ya las usamos; no hay nada que migrar, solo seguir usándolas (y dejar de pensar en ellas como "experimentales propias").
- **(c) Adoptar `getPlaybackOffsetMs()`** como API del cliente: es la pieza canónica que falta para (1) el truncado de barge-in (`conversation-item-truncate` con `audioEndMs`, patrón de `AbstractRealtimeSession.handleReducerEffect` → `speech-started`) cuando se implemente P1 (server VAD), y (2) sincronización fina voz↔pantalla (hoy el resaltado `narrate:*` es binario on/off).

---

## 1. Resumen del patrón canónico del AI SDK

Fuentes leídas: `references/vercel-ai/packages/ai/src/realtime/{browser-realtime-audio.ts, browser-realtime-transport.ts, realtime-session.ts, audio-utils.ts, index.ts}`, `references/vercel-ai/content/docs/03-ai-sdk-core/36-realtime.mdx`, `references/vercel-ai/content/docs/07-reference/02-ai-sdk-ui/05-use-realtime.mdx`, `references/vercel-ai/packages/react/src/use-realtime.ts`, `references/vercel-ai/packages/gateway/src/gateway-realtime-model.ts`.

### 1.1 Setup endpoint (server-side)
`36-realtime.mdx`: el navegador hace `POST` a un endpoint propio que:
1. Minta un **client-secret de un solo uso** con `experimental_realtime.getToken({ model, sessionConfig })` (gateway: `gateway.experimental_realtime.getToken({ model })` → `{ token, url, expiresAt }`).
2. Opcionalmente convierte tools de AI SDK con `experimental_getRealtimeToolDefinitions()` y los devuelve junto al token.
3. Responde `{ token, url, tools, ... }`.

> Nuestro `src/routes/api/realtime/chat-token/+server.ts` sigue **exactamente** este patrón (mint `vcst_` + `sessionConfig` normalizada: `outputModalities: ["audio"]`, `inputAudioFormat`/`outputAudioFormat` a 24 kHz PCM, `turnDetection: disabled`, `inputAudioTranscription` grok-stt/es). La diferencia deliberada: **sin tools** (thin-layer; las tools las ejecuta el agente de `/chat`).

### 1.2 `getWebSocketConfig` (modelo realtime)
`RealtimeModel.getWebSocketConfig({ token, url })` → `{ url, protocols }`. En `GatewayRealtimeModel` (`gateway-realtime-model.ts`) devuelve `{ url, protocols: getGatewayRealtimeProtocols(token, ...) }` — los subprotocolos `['ai-gateway-realtime.v1', 'ai-gateway-auth.<token>']` (url con `?ai-model-id=`).

> Lo usamos igual: `grok-voice.ts` `connect()` → `this.model.getWebSocketConfig({ token, url })`.

### 1.3 `parseServerEvent` / `serializeClientEvent` (codec del wire protocol)
El modelo traduce el wire event del provider al evento TIPADO del SDK. En el gateway es identity (los eventos ya vienen normalizados kebab-case). `serializeClientEvent` puede devolver `undefined` para eventos que el provider ignora (p.ej. xAI no soporta `conversation-item-truncate` sobre WebSocket).

> Lo usamos igual: `send()` y `handleMessage()` en `grok-voice.ts`.

### 1.4 `BrowserRealtimeAudio` (captura + playback)
Clase interna (NO exportada públicamente) con:
- **Captura**: `ScriptProcessorNode(4096, 1, 1)` (⚠️ API deprecada) + `resampleAudio(input, ctx.sampleRate, captureSampleRate)` + `encodeRealtimeAudio(samples)` por cada `onaudioprocess` → `onAudio(base64)`.
- **Playback**: `AudioContext` a `playbackSampleRate`; cola `Float32Array[]`; `schedulePlayback()` encadena `source.start(Math.max(playbackTime, ctx.currentTime))` y `playbackTime = startTime + buffer.duration` (contiguo sin gaps); `activeSources: Set<AudioBufferSourceNode>`; `getPlaybackOffsetMs() = (ctx.currentTime - playbackStartTime) * 1000`; `stopPlayback()` vacía cola, detiene sources, pone `playbackTime = currentTime` y **conserva el contexto**; callbacks `onPlayingChange`/`onCapturingChange`.

### 1.5 `AbstractRealtimeSession` (orquestación)
- `connect()`: fetch del setup → `audio.ensurePlaybackContext()` → `transport.connect({ onOpen: () => sendEvent({ type: 'session-update', config }) })`.
- Tool calls: `onToolCall` → `addToolOutput` → `maybeRequestToolResponse()` (un solo `response-create` cuando la respuesta con tools cerró **y** todos los outputs están enviados).
- **Barge-in canónico**: en `handleReducerEffect` caso `speech-started`: si `isPlaying` → `getPlaybackOffsetMs()` → `stopPlayback()` → `conversation-item-truncate { itemId, contentIndex: 0, audioEndMs: round(playedMs) }` — truncar el audio del item del lado del servidor.
- Estado: reducer (`realtime-event-reducer.ts`) con `status|messages|events|isCapturing|isPlaying`; `onEvent` por cada evento normalizado.

### 1.6 `BrowserRealtimeTransport`
- **Guard de identidad**: `if (this.ws !== ws) return;` en onopen/onclose (un socket viejo no debe pisar al nuevo).
- Cola de envío `sendQueue` (promise chain) + `sendRaw` con chequeo de tipos (`string | ArrayBuffer | view | Blob`).
- `handleMessage`: text/Blob/ArrayBuffer → `safeParseJSON` → `getHealthCheckResponse(rawEvent)` (auto-respuesta a health checks del provider, opcional) → `parseServerEvent` (puede devolver array) → `onServerEvent`.

### 1.7 `experimental_useRealtime` (hook React)
`packages/react/src/use-realtime.ts` es un wrapper de `AbstractRealtimeSession` en un store con `useSyncExternalStore`. **No aplica a nosotros**: no usamos React ni el hook; nuestro orquestador es `ChatSession.svelte` (Svelte 5) sobre la capa delgada `ChatVoiceLayer`.

---

## 2. Comparación detallada: `BrowserRealtimeAudio` vs nuestro `GrokVoiceClient`

| Aspecto | `BrowserRealtimeAudio` (canónico) | `GrokVoiceClient` (nuestro) | Notas |
|---|---|---|---|
| **Captura — nodo** | `ScriptProcessorNode(4096)` en `startCapture()` | `AudioWorkletNode` (`WORKLET_NAME`, worklet `SkEvePcmCaptureProcessor` registrado vía Blob) en `startMic()` | **Ganamos nosotros**: el worklet corre fuera del hilo principal y no está deprecado. El canónico usa una API deprecada. |
| **Captura — batching** | Implícito: `onaudioprocess` entrega 4096 muestras → resample → encode (un chunk por callback) | Explícito: `RealtimePcmBatcher.push(samples)` acumula muestras parciales del worklet y emite batches **exactos** de 4096 (~171 ms @24 kHz) | Ambos producen chunks de 4096; el nuestro tolera tamaños variables del worklet. El batcher es copia del de arabclue-platform y está afinado al protocolo. |
| **Captura — gates** | Ninguno (manda TODO el mic al `onAudio`) | Gate anti-eco ANTES del batcher (`_playing` + cooldown `VOICE_PLAYBACK_COOLDOWN_MS`) + VAD por RMS + buffer de frase para re-append | **Crítico**: el gate del append es el fix del bucle "repite la respuesta" (spec §5quater). Adoptar el canónico reintroduciría el loop. |
| **Resample captura** | Siempre `resampleAudio(input, ctx.sampleRate, captureSampleRate)` | `experimental_resampleAudio(input, ctx.sampleRate, TARGET_RATE)` solo si difiere (AudioContext ya se crea a 24 kHz → no-op casi siempre) | Mismo efecto; el nuestro es defensivo. |
| **Encode/Decode** | `encodeRealtimeAudio` / `decodeRealtimeAudio` (audio-utils) | `experimental_encodeRealtimeAudio` / `experimental_decodeRealtimeAudio` (importados de `ai`) | **Son las MISMAS funciones** (ver §4b). |
| **Playback — contexto** | `AudioContext({ sampleRate: playbackSampleRate })` (según `outputAudioFormat.rate` de la sesión, default 24 k) | `AudioContext({ sampleRate: TARGET_RATE })` (24 k fijo) + resample defensivo en `playAudio` si difiere | Mismo resultado; el nuestro resamplea por si el SO ignora la tasa pedida. |
| **Playback — cola contigua** | `schedulePlayback()`: `startTime = Math.max(playbackTime, ctx.currentTime)`; `playbackTime = startTime + buffer.duration` | `playAudio()`: `nextPlaybackTime = max(nextPlaybackTime, now + 0.05)`; `nextPlaybackTime += buffer.duration` | Mismo patrón de contigüidad; el nuestro añade un lead-in de 50 ms para no abrir gap justo al crear el contexto. |
| **Playback — tracking** | `activeSources: Set<AudioBufferSourceNode>` + `onended` borra y apaga `isPlaying` | contador `activeSources` + `onended` decrementa y apaga `_playing` | Equivalente. |
| **Playback — stop** | `stopPlayback()` conserva el contexto (`playbackTime = currentTime`) | `stopPlayback()`/`cutPlayback()` **cierran** el contexto (`playbackCtx.close()`), se recrea en el próximo `audio-delta` | Trade-off: recrear garantiza un `currentTime` fresco para el scheduling contiguo tras un cut; conservar es más barato. |
| **Offset de playback** | `getPlaybackOffsetMs()` público (`(ctx.currentTime - playbackStartTime) * 1000`) | **No existe** (solo marcadores binarios `_playing`/`narrateInFlight`) | Ver §4c. |
| **Barge-in / truncado** | `speech-started` → `getPlaybackOffsetMs()` → `stopPlayback()` → `conversation-item-truncate { audioEndMs }` | `speech-started`/`speech-stopped` se IGNORAN (informativo); el barge-in es `cutPlayback()` + `cancelResponse()` client-side, sin truncar el item del servidor | El canónico trunca el audio del item server-side para que la próxima respuesta no re-suene desde el principio. En thin-layer hoy es correcto no truncar (turnDetection disabled; el modelo no tiene audio persistido que re-emitir), pero P1 (server VAD) lo requerirá. |
| **Health checks** | `model.getHealthCheckResponse(rawEvent)` → `sendRaw(autoResponse)` | **No lo usamos** | Revisar si el gateway emite health checks (ver §5). |
| **Cola de envío WS** | `sendQueue` (promise chain, serializa eventos) + `sendRaw` con tipos | `send()` directo a `ws.send(JSON.stringify(serialized))` | El gateway acepta JSON normalizado; la serialización canónica evita reordenamientos bajo ráfagas. Barato de adoptar (ver §5). |
| **Guard de identidad WS** | `if (this.ws !== ws) return;` en onopen/onclose | `const isCurrent = () => this.ws === ws;` + `if (!isCurrent()) return;` en onopen/onmessage/onerror/onclose | **Ya lo tenemos** (y es el fix documentado del race del recycle, memoria repo 2026-08-17). El canónico solo lo pone en onopen/onclose; nosotros además en onmessage/onerror. |
| **Estados/estado** | `isPlaying`/`isCapturing` (bool) + reducer `status/messages/events` | `_playing`, `_responding`, `speaking`, `vadSpeaking`, `narrateInFlight`, etc. + callbacks (`onPlayingChange`, `onListeningChange`, `onRespondingChange`, `onStatus`) | El canónico arma `UIMessage[]`/`events` para render; el thin-layer no lo necesita (las mensajes los arma el agente de `/chat`). |
| **Tool calls** | `onToolCall` → `addToolOutput` → `maybeRequestToolResponse` (un solo `response-create` cuando todo cerró) | `pendingToolOutputs` + `toolCallsClosed` + `maybeRequestResponse()` (idéntico: `response-done` cierra, un solo `response-create` cuando todos los outputs están enviados) | **Ya lo tenemos**, y es el patrón exacto del canónico (memoria repo: "mismo patrón que `maybeRequestToolResponse` del AI SDK"). |
| **Telemetría durable** | Ninguna | `tel()` en ~30 eventos (ws/mic/vad/commits/play/resp/errores) → `voice_events` | Único nuestro; no existe en el canónico. |
| **Cola de voz serializada (utterances)** | No existe (reproduce todo `audio-delta` que llegue) | `speakQueue` + `drainSpeakQueue()` (espera `response-done`; red de seguridad 8 s) | Único nuestro — es el fix del timing "suenan todos al final" (spec §4.5). |
| **Watchdog/recycle/session resync** | No existe | `startCommitWatchdog`, `maybeRecycleIdle`, `session_resync`, `reconnectVoiceSession` | Único nuestro — mitigaciones del STT del gateway que muere tras la 1ª transcripción (memoria repo 2026-08-17). |
| **dispose/limpieza** | `dispose()` (stopCapture + stopPlayback + close) | `disconnect()` (stopMic + stopPlayback + close ws) | Equivalente. |

---

## 3. ANÁLISIS CRÍTICO

### (a) ¿Reemplazar `RealtimePcmBatcher`/`playAudio` por `BrowserRealtimeAudio`?

**VEREDICTO: NO.** Justificación con evidencia:

1. **No es importable standalone.** Verificado en `references/vercel-ai/packages/ai/src/realtime/index.ts`: lo único exportado de `./realtime` es `experimental_encodeRealtimeAudio`/`decode`/`resample`, `experimental_getRealtimeToolDefinitions`, `Experimental_AbstractRealtimeSession` y tipos. `BrowserRealtimeAudio` y `BrowserRealtimeTransport` son **internos** (`realtime-session.ts` los importa directo del archivo). Para usarlos habría que o bien (i) copiar el archivo a nuestro repo (vendorizar — deuda de mantenimiento), o (ii) subclasear `AbstractRealtimeSession` (arrastra el reducer, `UIMessage[]`, el fetch de setup, la política de `session-update` — todo el patrón que el thin-layer NO quiere).
2. **Su captura está deprecada.** `startCapture()` usa `ctx.createScriptProcessor(4096, 1, 1)` — API deprecada que el propio SDK mantiene solo por compatibilidad. Nuestro `AudioWorkletNode` + `RealtimePcmBatcher` es la versión moderna del mismo patrón (batcher de 4096, el comentario del código lo declara: "mismo batch del SDK y arabclue"). Reemplazarlo sería una regresión técnica.
3. **Perderíamos exactamente lo que nos hace funcionar en este hardware (sin AEC) y en este thin-layer:**
   - El **gate anti-eco en `worklet.port.onmessage`** (suprimir el mic durante `_playing`/cooldown) es el fix del loop "repite la respuesta" (spec §5quater, validado E2E 2026-08-15). `BrowserRealtimeAudio` no tiene gate: su `onAudio` recibe TODO.
   - La **cola de voz serializada** (`speakQueue`/`drainSpeakQueue`) — el canónico no la tiene porque su modelo realtime SÍ genera las respuestas; en thin-layer el TTS lo pedimos nosotros y sin cola suenan todos juntos.
   - El **watchdog/recycle/resync** (STT del gateway muere tras la 1ª transcripción — mitigación client-side documentada).
   - La **telemetría durable** (`voice_events`), la única evidencia client-side de "dijo algo por voz y no se registró".
4. **Lo que ganaríamos** (menos código propio testado por Vercel) es real pero marginal en nuestro contexto: el patrón de playback contiguo ya lo tenemos implementado y validado (misma técnica de `playbackTime`/`nextPlaybackTime`), y la lógica de captura la superamos.

**Veredicto parcial alternativo** (si algún día se quisiera menos código): no reemplazar piezas, sino **vendorizar solo el patrón de `schedulePlayback`** (colas + `getPlaybackOffsetMs`) dentro de nuestro `playAudio` — pero ya lo hacemos, salvo el offset (ver (c)).

### (b) ¿Reutilizar `audio-utils` (encode/decode/resample) en vez de `experimental_*`?

**VEREDICTO: SÍ, ya lo estamos haciendo — y son la misma función.**

Verificado en `realtime/index.ts`:
```ts
export {
  encodeRealtimeAudio as experimental_encodeRealtimeAudio,
  decodeRealtimeAudio as experimental_decodeRealtimeAudio,
  resampleAudio as experimental_resampleAudio,
} from './audio-utils';
```
`experimental_encodeRealtimeAudio` **ES** `encodeRealtimeAudio` — un alias de re-export, no una variante. `grok-voice.ts` ya importa los tres desde `ai` (`experimental_encodeRealtimeAudio`, `experimental_decodeRealtimeAudio`, `experimental_resampleAudio`) y los usa en `worklet.port.onmessage`, `playAudio` y el resample defensivo.

Implicaciones:
- **No hay que reimplementar nada** (no "vendorizar" un codec propio — es código probado por Vercel: PCM16 LE, clamping [-1,1], chunking de 32 KB para `String.fromCharCode`, interpolación lineal en resample).
- Si algún día `ai` promueve estos helpers a API estable (sin `experimental_`), el cambio es un rename de import en 1 archivo. Opcionalmente se puede añadir un alias local tipo `const { encodeRealtimeAudio } = ...` para blindarse contra el rename, pero no es necesario.
- GOTCHA de lectura: el prefijo `experimental_` no significa "beta inestable del codec" — es el namespace de toda la superficie realtime del SDK (feature experimental en su conjunto). Los tres helpers son estables en comportamiento.

### (c) ¿Adoptar `getPlaybackOffsetMs()` para sincronizar el resaltado voz=pantalla?

**VEREDICTO: SÍ — adoptar como API del cliente y usarla para el progress del resaltado (y como prerrequisito de P1/barge-in).**

Contexto de hoy: el resaltado `narrate:*` es **binario** — `dispatchNarrate('start')` al empezar la narración (`drainSpeakQueue` cuando `narrate`), `dispatchNarrate('end')` cuando `activeSources === 0` en `onended` o en `stopPlayback` (spec §5sexies). El consumidor (`message-animated.svelte`) enciende/apaga `.narrate-flash` sobre la entidad/cantidades. No hay noción de "qué tan avanzada va la voz dentro del audio".

**Propuesta concreta de integración (sin tocar la arquitectura thin-layer):**

1. **API en `GrokVoiceClient`** (junto a `playAudio`):
   - Nuevo campo `playbackStartTime = 0` (momento `ctx.currentTime` en que la narración actual empezó a sonar — setear en el primer `playAudio` de una utterance narrada, o donde hoy se marca `narrateInFlight = true`).
   - Método público `getPlaybackOffsetMs(): number` → `this.playbackCtx && this._playing ? Math.max(0, (this.playbackCtx.currentTime - this.playbackStartTime) * 1000) : 0` (misma fórmula que el canónico `browser-realtime-audio.ts`).
   - Reset en `stopPlayback`/`cutPlayback`/`disconnect`.
2. **Evento de progreso** (opcional, Fase 2): extender `dispatchNarrate` con un tercer evento `narrate:progress` emitido con throttle (p.ej. cada ~200 ms, o desde un `setInterval` corto mientras `narrateInFlight`) con `{ offsetMs, durationMs }` (duración ≈ suma de `buffer.duration` de los chunks de la narración — se puede trackear acumulando en `playAudio`). Blindado con try/catch como los eventos actuales.
3. **Consumidor** (`message-animated.svelte`): además de `.narrate-flash` on/off, usar `offsetMs` para un efecto sutil de progreso (p.ej. intensidad del glow que sigue al avance, o una barra/`box-shadow` proporcional). Para un único highlight de entidad el uso más limpio es intensidad/posición, no "palabra a palabra" (eso requeriría timestamps por carácter — ver gotcha abajo).
4. **Uso canónico real (P1)**: cuando se implemente server VAD + barge-in real (P1 del plan), `getPlaybackOffsetMs()` es exactamente lo que `AbstractRealtimeSession` usa en `speech-started` para mandar `conversation-item-truncate { itemId, contentIndex: 0, audioEndMs: Math.round(playedMs) }` — truncar el item del lado del servidor y que la siguiente respuesta no re-emita desde el principio. Hoy `speech-started`/`speech-stopped` se ignoran; con P1 pasan a ser el detonante del barge-in y necesitan el offset.

**GOTCHA de diseño (importante):** el offset es útil para sincronizar PROGRESO de UN audio contiguo. Nuestra narración llega como múltiples `audio-delta` encadenados en `nextPlaybackTime`, así que el offset acumula correctamente mientras no haya cortes. Pero **no** da timestamps por palabra — el "highlight palabra a palabra" (Live Canvas lite) requeriría los `audioTimestamps` por carácter que el ejemplo `generate-speech/xai/timestamps.ts` expone (`providerMetadata.xai.audioTimestamps`), y eso es TTS por request, no realtime. En realtime la vía sería pedir timestamps en la respuesta del modelo (no está en la config normalizada actual). No bloquear P6 en esto.

---

## 4. Lista de "lecciones canónicas"

### 4.1 Adoptar (concretas, con referencia a función)

| # | Lección | Ref. canónica | Acción en nuestro cliente |
|---|---|---|---|
| L1 | **`getPlaybackOffsetMs()` + truncado de barge-in** | `browser-realtime-audio.ts::getPlaybackOffsetMs` + `realtime-session.ts::handleReducerEffect` (caso `speech-started`) | Añadir `playbackStartTime` + `getPlaybackOffsetMs()`; usarla para `narrate:progress` y para `conversation-item-truncate { audioEndMs }` cuando llegue P1 (server VAD). Hoy `speech-started`/`stopped` se ignoran. |
| L2 | **Auto-respuesta a health checks del provider** | `browser-realtime-transport.ts::handleMessage` → `model.getHealthCheckResponse(rawEvent)` | Verificar si el gateway emite health checks; si sí, llamar `model.getHealthCheckResponse` antes de `parseServerEvent` y `sendRaw` la respuesta. Cero costo, evita cortes de sesión. |
| L3 | **Cola de envío serializada del WebSocket** | `browser-realtime-transport.ts::sendEvent` (promise chain) | Envolver `send()` en una cadena de promesas (un `sendQueue`) para no reordenar `response-create`/`session-update`/commits bajo ráfagas. El gateway hoy tolera, pero es defensa barata. |
| L4 | **`session-update` en `onopen`** (no antes) | `realtime-session.ts::connect` → `transport.connect({ onOpen: () => sendEvent('session-update') })` | Ya lo hacemos (enviamos en `ws.onopen`). Mantener — no mover el `sendSessionUpdate` a otro punto. |
| L5 | **Un solo `response-create` tras tool outputs** | `realtime-session.ts::maybeRequestToolResponse` | Ya lo tenemos (`pendingToolOutputs` + `toolCallsClosed` + `maybeRequestResponse`). Validado idéntico al canónico. |
| L6 | **Guard de identidad del WebSocket** | `browser-realtime-transport.ts` (`if (this.ws !== ws) return;`) | Ya lo tenemos (y mejor: también en `onmessage`/`onerror`). Mantener. |
| L7 | **`onended` como fuente de verdad del fin de playback** | `browser-realtime-audio.ts::schedulePlayback` | Ya lo tenemos (`activeSources` → 0 en `onended`). Mantener. |
| L8 | **Resample de playback defensivo cuando el SO ignora la tasa pedida** | `browser-realtime-audio.ts` crea el contexto a la tasa objetivo; `audio-utils::resampleAudio` | Ya lo tenemos (`playAudio` resamplea si `ctx.sampleRate !== TARGET_RATE`). Mantener. |

### 4.2 NO aplicar (por el patrón thin-layer)

| # | Patrón canónico | Por qué NO aplica |
|---|---|---|
| N1 | `experimental_useRealtime` (hook React) | No usamos React; el orquestador es `ChatSession.svelte` + `ChatVoiceLayer`. |
| N2 | `AbstractRealtimeSession` + reducer (`status/messages/events` + `UIMessage[]`) | El thin-layer no arma mensajes: los arma el agente de `/chat`. Adoptarlo arrastraría todo el patrón (fetch de setup propio, `session-update` con tools, etc.) que ya cubrimos de forma más directa. |
| N3 | `BrowserRealtimeAudio` (captura) | No exportado públicamente, usa `ScriptProcessorNode` deprecado y no tiene gates. Nuestro `AudioWorkletNode` + `RealtimePcmBatcher` lo supera. |
| N4 | `experimental_getRealtimeToolDefinitions` + tools en el setup | `chat-token` NO expone tools por diseño (thin-layer: el agente de `/chat` es el dueño de las tools). La ruta `/voice` (con `ask_agent`) sí tiene su propio token endpoint con tool — no aplica aquí. |
| N5 | `speech-started` → truncado incondicional | Hoy `turnDetection: disabled` y el modelo nunca responde solo en thin-layer; truncar un item que no re-emitirá es innecesario. **Se reactiva con P1** (server VAD). |
| N6 | `stopPlayback()` conservando el contexto | Nuestro `cutPlayback` cierra el contexto para garantizar scheduling fresco tras un barge-in. Trade-off válido en nuestro flujo. |

---

## 5. Tabla final: patrón canónico → nuestro estado → acción

| Patrón canónico | Nuestro estado | Acción recomendada |
|---|---|---|
| Setup endpoint (mint token + sessionConfig) | ✅ Implementado (`chat-token/+server.ts`, mismo shape `{token,url,expiresAt,sessionConfig}`) | **Ya lo tenemos** — mantener. |
| `getWebSocketConfig` (subprotocolos gateway) | ✅ Implementado (`connect()` vía `model.getWebSocketConfig`) | **Ya lo tenemos** — mantener. |
| `parseServerEvent` / `serializeClientEvent` | ✅ Implementado (`send()`/`handleMessage()`) | **Ya lo tenemos** — mantener (incluye el `null` de "no enviar"). |
| `getHealthCheckResponse` (auto ping/pong) | ❌ Ausente | **Adoptar** (L2) — verificar si el gateway lo emite. |
| `experimental_*Audio` codecs | ✅ Usados (`experimental_encode/decode/resample` desde `ai`) | **Ya lo tenemos** — son las funciones canónicas (alias). Nada que migrar. |
| `BrowserRealtimeAudio` captura (ScriptProcessor) | ⚠️ Superado (AudioWorkletNode + `RealtimePcmBatcher`) | **NO adoptar** — deprecado, no exportado, sin gates anti-eco. |
| `BrowserRealtimeAudio` playback contiguo | ✅ Equivalente (`nextPlaybackTime` + `activeSources`) | **Ya lo tenemos** — mantener (con lead-in de 50 ms propio). |
| `getPlaybackOffsetMs()` | ❌ Ausente | **Adoptar** (L1) — para `narrate:progress` y para el truncado de P1. |
| `speech-started` → `stopPlayback` + `conversation-item-truncate(audioEndMs)` | ⚠️ Parcial (ignoramos `speech-started`; `cutPlayback` client-side) | **Adoptar con P1** (server VAD + barge-in real). Hoy es correcto no truncar (thin-layer). |
| Cola de envío WS serializada | ❌ Ausente (send directo) | **Adoptar** (L3) — barato, defensa contra reordenamientos. |
| Guard de identidad WS | ✅ Implementado (`isCurrent()`, incluso mejor que el canónico) | **Ya lo tenemos** — mantener. |
| Tool calls con un solo `response-create` | ✅ Implementado (`maybeRequestResponse` idéntico) | **Ya lo tenemos** — mantener. |
| `onPlayingChange`/`onCapturingChange` | ✅ Equivalente (`onPlayingChange`/`onListeningChange` + `onRespondingChange`) | **Ya lo tenemos** — mantener. |
| Reducer/messages/events (render) | ❌ N/A (thin-layer; los mensajes los arma `/chat`) | **No aplicar** (N2). |
| `experimental_useRealtime` (React) | ❌ N/A (Svelte) | **No aplicar** (N1). |
| Tools en el setup (`experimental_getRealtimeToolDefinitions`) | ❌ N/A en `chat-token` (sin tools por diseño) | **No aplicar** (N4) — es deliberado. |
| Telemetría durable / cola de voz / watchdog / recycle | ✅ Solo nuestro (no existe en el canónico) | **Mantener** — es lo que hace viable el thin-layer en este hardware/gateway. |

---

## 6. GOTCHAS encontrados comparando nuestro cliente vs el canónico

1. **`BrowserRealtimeAudio` NO se exporta desde `ai`** — la superficie pública de realtime son solo los codecs `experimental_*`, `experimental_getRealtimeToolDefinitions`, `Experimental_AbstractRealtimeSession` y tipos (`realtime/index.ts`). Cualquier plan de "importar `BrowserRealtimeAudio`" es inviable sin vendorizar o subclasear la sesión.
2. **`experimental_encodeRealtimeAudio` ≡ `encodeRealtimeAudio`** — son el MISMO símbolo con alias de re-export. Nuestro código ya usa el codec canónico; el prefijo `experimental_` es del namespace, no del helper.
3. **El canónico captura con `ScriptProcessorNode` (deprecado)** — no es un patrón a imitar; nuestro `AudioWorkletNode` es la versión correcta del mismo diseño. Si algún día se comparan números con el SDK, la captura no es comparable 1:1.
4. **El canónico trunca el audio server-side en el barge-in** (`conversation-item-truncate`), nosotros cortamos client-side (`cutPlayback`) — ambos válidos en sus arquitecturas. Pero ojo: en thin-layer el `conversation-item-truncate` es justo el evento que `serializeClientEvent` del gateway/xAI puede descartar (`null`), y de hecho el comentario de `send()` lo documenta ("xAI ignora conversation-item-truncate sobre WebSocket") — validar soporte antes de depender de él en P1.
5. **El `speech-started`/`stopped` del servidor NO debe gobernar el mic** (gotcha ya documentado en memoria repo 2026-08-14): el estado local `startMic/stopMic` es la autoridad. El patrón canónico usa `speech-started` para truncar, pero no para el estado del mic — alinear con eso en P1.
6. **`getPlaybackOffsetMs` canónico devuelve 0 sin contexto de playback** (`if (ctx == null) return 0`) — copiar ese guard al añadir nuestro método (nuestro `playbackCtx` puede ser null entre `cutPlayback` y el siguiente `audio-delta`).
7. **El lead-in de 50 ms de nuestro `playAudio`** (`if (this.nextPlaybackTime < now + 0.05) ...`) es una mejora propia sobre el `Math.max(playbackTime, ctx.currentTime)` canónico — no perderla al adoptar el offset (el offset y el scheduling son independientes).
8. **Sesión Eve = snapshot**: este documento es material de fábrica (`research-n-dev/`); cualquier cambio de código derivado (P1/P2/P6) debe validarse con sesión nueva ("Reiniciar conversación") y seguir las invariantes del plan (`npm run check` con Node 24, get_errors, telemetría, feature flag).
