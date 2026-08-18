# Patrones de voz realtime en TypeScript — investigación de la industria (2026-08-18)

> Documento de FÁBRICA (VS Code Copilot). El runtime del agente NUNCA lo referencia.
> Método: 3 subagentes de investigación en paralelo → 24 proyectos/proveedores/fuentes
> leídos (docs oficiales + código fuente en GitHub). Reportes crudos en esta carpeta
> (ver *Fuentes* al final). **Objetivo**: decidir cómo SIMPLIFICAR la capa de voz de
> Sigma (el usuario la percibió como "monstruo de implementación" de heurísticas).

## Contexto de nuestro stack

Cerebro de texto **DeepSeek** (vía Vercel AI Gateway, lento 5–20s) + capa realtime
delgada **Grok Voice** (STT/TTS, protocolo normalizado AI SDK). La UI orquesta: VAD
del servidor, mic del navegador, cola de audio FIFO, `narrar` del cerebro como
comentario en vivo, SPEECH como respuesta hablada, auto-off post-respuesta.

**La industria tiene nombre para esta arquitectura**: *Chat-Supervisor / Responder-
Thinker* (OpenAI) o *híbrido* (airi, 48k★) — un agente realtime conversa y un brain
de texto hace tools/razonamiento. **La arquitectura NO es el problema**: los 4
síntomas que reporta el usuario se resuelven con 4 patrones canónicos, sin apilar
heurísticas.

## Proyectos/proveedores investigados (24)

**Frameworks/providers (13)** — OpenAI Realtime (gpt-realtime), Gemini Live, xAI
Grok Voice, LiveKit Agents, Pipecat (Daily), Deepgram Voice Agent, ElevenLabs Eleven
Agents, Hume EVI, Retell, Vapi, Cartesia (Sonic/Ink), Ultravox, Twilio Media Streams
(+ AssemblyAI como endpointing STT en LiveKit/Vapi).

**Repos OSS TS/JS (11)** — openai/openai-realtime-console, openai/openai-realtime-
agents, vercel/ai (paquete realtime + providers cartesia), livekit/agents-js,
pipecat-client-web-transports, elevenlabs/packages (Conversational AI SDK),
RetellWebClient, humeai (EVI web/Unity), `@ai-sdk/cartesia`, moeru-ai/airi (48k★,
híbrido completo = nuestro caso), petermartens98/OpenAI-RealTime-Voice-Chat-
SvelteKit-Tailwind-Template.

## PATRONES CANÓNICOS (lo que hace todo el mundo)

### 1. Dos familias de conexión únicamente (nadie inventa híbridos raros)
- **Thin WebRTC** (OpenAI console, SvelteKit template, Retell): cliente delgado,
  VAD 100% server, audio del agente en `<audio>`.
- **WebSocket + AudioWorklet** (vercel/ai, ElevenLabs, Hume, Cartesia, pipecat):
  el cliente resamplea a PCM16 y el server manda `audio_delta`.

### 2. Server VAD como default absoluto + el cliente reacciona a eventos
Todos los providers hacen turn-detection en el servidor; el cliente solo reacciona:
`speech-started` / `user_interruption` / `interruption`. Endpointer **configurable,
nunca fijo**: `silence_duration_ms` 500–800ms (Gemini), `prefix_padding_ms` 300,
`threshold` 0.5–0.9. <200ms fragmenta al usuario; >2000ms añade latencia.

### 3. Barge-in canónico = "cortar + truncar con offset reproducido"
```
speech-started → stopPlayback()  // vaciar cola + parar sources activos
               → conversation-item-truncate { audioEndMs = offset reproducido }
```
Idéntico en vercel/ai (`getPlaybackOffsetMs`), livekit (`playbackPositionInS`),
pipecat (`getTrackSampleOffset`), ElevenLabs (gate de `event_id`). **Solo lo
realmente hablado entra al contexto** (LiveKit trunca el historial; Pipecat
`on_assistant_turn_stopped(interrupted)`).

### 4. Distinguir backchannel de interrupción real + reanudar falsas
- LiveKit: modo `adaptive` (modelo de audio distingue "uh-huh" de interrupción),
  `min_words`/`min_duration`, `false_interruption_timeout` 2s +
  `resume_false_interruption` → reanuda donde iba si no hubo transcripción.
- Pipecat: `MinWordsUserTurnStartStrategy(min_words=3)` (un "okay" no corta),
  Krisp IP, "Filter incomplete user turns".

### 5. Anti-eco = capa de AUDIO, no del LLM
- **AEC real en entrada Y salida** (Hume: sin esto "el asistente responde a su
  propia voz"; en mobile `AVAudioSession .voiceChat` en ambos nodos).
- **Suppress input durante playback + cooldown** (airi: `shouldSuppressVoiceInput` +
  `DEFAULT_ASSISTANT_SPEECH_INPUT_COOLDOWN_MS = 800`; Hume Unity quickstart:
  `isRecording && !IsPlayingAudio`).
- El resto (vercel, OpenAI console) **confía en el AEC del browser sin gates** y
  sufre eco en máquinas sin AEC real → los frameworks serios añaden la red del
  punto anterior.

### 6. Cola de audio del asistente = FIFO, un chunk a la vez
vercel encadena `source.start(startTime)`; pipecat drena en el worklet; Hume/
ElevenLabs encolan y reproducen secuencial. **Al interrumpir: vaciar cola + parar
sources + marcar track IDs interrumpidos** (no reproducir chunks stale). Hume lo
documenta con énfasis: "si reproduces cada segmento al llegar, EVI se corta a sí
mismo; hay que encolar".

### 7. Preámbulos/fillers = de primera clase pero ESCASOS
- OpenAI Realtime: canal `commentary` separado del `final`. Usar SOLO cuando el
  tool tardará / multi-step / el silencio incomodaría; **nunca cuando la respuesta
  es directa**. 1 frase (máx 2). Prohibidos: "Let me think…", "One moment while I
  process…", "I'm going to use my tools now". Aprobados: "One moment.", "Let me
  check.", "Just a second.", "Let me see.".
- **El preámbulo describe la ACCIÓN, NUNCA recapitula el input del usuario**:
  "I'll check that order now", nunca "you asked about X". Al que narra se le pasa
  **un summary de 1 línea**, no el transcript verbatim (Rephrase Supervisor).
- ElevenLabs **soft timeout**: si el LLM no responde antes del timeout (default
  -1 off, **recomendado 3.0s**), se habla un filler; **una sola vez por turno**;
  filler LLM-generado contextual (últimas 4 messages) en vez de frase fija;
  **prohibido decir el tiempo** ("One second…" no; los tiempos reales son
  impredecibles).
- Vapi: mensajes de tool con **variantes** + `timingMilliseconds` staged.

### 8. Variedad = constraint en el prompt de la capa que narra
OpenAI regla *Variety*: "Do not repeat the same sentence twice. Vary your
responses so they don't sound robotic" + "DO NOT ALWAYS USE THESE EXAMPLES, VARY
YOUR RESPONSES". LiveKit: **Expressive mode** (markup de emoción → TTS; batch de
frases, no stream de 1 frase, que destruye la línea emocional).

### 9. Turn-taking NO es VAD puro — es un modelo de fin-de-turno
LiveKit/Pipecat: EOT por modelo de audio (Smart Turn, TurnDetector) baja el
false-cutoff de 55.6% (VAD puro) a ~10–35%. Un usuario que dice "déjame pensar…"
y calla NO terminó. En texto puro la distinción es imposible (mismas palabras,
distinta entonación).

### 10. Idle/recursos = cortar por capas
- Timeout de turno (xAI Android IDLE_TIERS 5/10/15s: aviso visual/acústico y a
  los 15s cancelar el WebSocket; el server puede cerrar con 1001 "inactivity").
- Duración máxima de sesión (ElevenLabs `max_duration_seconds` default 600s;
  Gemini 15min audio; Hume 30min; Deepgram 2h).
- Tool `wait_for_user` (no-op) ante silencio/ruido de fondo (OpenAI); `proactive_
  audio` (Gemini: decidir no responder); `StopResponse` si el transcript está
  vacío (LiveKit).

## ANTI-PATRONES (lo que los proyectos serios EVITAN — leer con lupa: es nuestro monstruo)

| Práctica | Por qué es frágil | Quién lo evidencia |
|---|---|---|
| **Heurísticas ad-hoc en el cliente para turn detection** (umbrales RMS mágicos, timers fijos) | Falsos positivos/negativos según entorno; "nada de heurísticas mágicas" | Pipecat: calibrar con **latencia p99 real del STT**, no umbrales; Gemini best practices |
| **Dos detectores de turno compitiendo** | Se pelean el mismo turno | Pipecat: "Do not run a separate VAD processor in this mode — two detectors would compete" |
| **Preámbulos vacíos repetidos / que dicen el tiempo** | Suenan a grabación | OpenAI (lista de prohibidos), ElevenLabs (soft timeout), Vapi (variantes obligatorias) |
| **Encadenar audio sin cancelar los anteriores** | Suenan encimados al final | Hume (cola obligatoria), Pipecat (reconecta el WS del TTS en barge-in), todos |
| **Directivas de voz en el prompt de un modelo de TEXTO** | Los modelos de texto no las cumplen consistentemente | OpenAI/LiveKit mueven la mecánica al framework (eventos + hooks), NO al prompt — nuestro caso con `narrar`/SPEECH en DeepSeek |
| **Confiar en AEC del browser sin verificar** | `getSettings().echoCancellation===true` no garantiza AEC efectivo | airi añade suppression + cooldown como red; nuestro gotcha `voice-aec-web.md` |
| **No gatear audio post-interrupción (stale)** | El audio que ya viajaba suena después de interrumpir | ElevenLabs `lastInterruptTimestamp`, livekit `ignoreUserTranscriptUntil` |
| **`MediaRecorder` webm/opus como input** | Latencia y formato variable; peor para VAD server | Hume quickstart la usa (por simplicidad); pipecat/OpenAI/airi usan PCM directo |
| **`ScriptProcessorNode`** | Deprecado; corre en el hilo principal | pipecat/ElevenLabs/airi usan **AudioWorklet** |
| **Reconexión con bucle `sleep(5)`** | Huecos, sin backoff | Todos usan `ReconnectingWebSocket` con backoff |

## NUESTRO CASO → QUÉ SIMPLIFICAR

Los 4 síntomas del usuario ↔ patrón canónico que los resuelve (con fuente):

| Síntoma | Patrón canónico | Fuente | Nuestro fix actual (monstruo) | Fix limpio |
|---|---|---|---|---|
| Repite/parafrasea la pregunta | "El preámbulo describe la acción, no el input"; pasar **summary de 1 línea**, no verbatim; variedad por constraint | OpenAI preambles + Rephrase Supervisor + Variety | `narrationEchoesQuestion` + `isNearDuplicateNarration` + `echo_reject_assistant` + directivas en narrar/agent-active (no se cumplen) | **Narración de progreso determinista de la UI** (1 frase de módulo por turno, generada a propósito sin el objeto: "Revisando existencias…"), en vez de filtrar el eco del modelo. La tool `narrar` del cerebro se limita a HALLAZGOS o se elimina. Sin gates léxicos. |
| HITL narrado 2 veces | Canales commentary vs **final**; "un turno final = una pregunta"; id de utterance idempotente (duplicado por otra vía → descartar) | OpenAI Message Channels / Entity Collection | guard `voiceHitl.length` en el watch de narrar | **La pregunta HITL es un turno final**: al entrar en HITL la UI deja de emitir progreso (flag de estado de turno) y habla la pregunta UNA vez con idempotencia por `requestId`. Nada de dedupe por texto. |
| Se interrumpe a sí mismo | Barge-in = **capa de audio**: suppress input durante playback + cooldown 800ms + AEC real; barge-in por `speech-started` con `min_words`; reanudar falsas interrupciones | Hume, airi, LiveKit/Pipecat | `VOICE_BARGE_IN_GRACE_MS` + `echo_no_cut` + `VOICE_ECHO_RMS_FLOOR` + `echo_reject_vad` + `echo_reject_intent` (5 gates) | **Un solo mecanismo**: `_playing` gate + cooldown (ya existe) + truncate con offset (`audioEndMs`). Los gates RMS quedan como telemetría (no como decisión). AEC real (hardware) es la solución de fondo. |
| Robótico (puente repetido) | Variedad por constraint + filler LLM-generado contextual (una vez por turno, sin tiempo) | OpenAI Variety; ElevenLabs soft timeout | directiva en agent-active (no se cumple: "Ya lo tengo —" ×20) | **El puente del SPEECH lo genera la capa realtime** (o un mini-prompt con el summary), con constraint de variedad; el cerebro solo manda el gist. O, mínimo, refuerzo + dedupe de puente en la UI. |

**Conclusión de la industria**: en el patrón Chat-Supervisor, la capa realtime es
dueña del turn-taking, del barge-in, de los preámbulos y del eco; el cerebro de
texto solo produce la respuesta final. Cada síntoma tiene SU patrón en la capa
correcta (audio, turno o prompt) — **no heurísticas apiladas en la UI**. La
recomendación es mover la decisión al framework/código (hooks/eventos), no al
prompt de DeepSeek (que no cumple consistentemente).

## Fuentes

- Reportes crudos de los 3 subagentes (2026-08-18): frameworks/providers (13),
  repos OSS TS/JS (11), UX conversacional (9 fuentes: OpenAI prompting guide +
  realtime-agents, xAI cookbook + Android IDLE_TIERS, LiveKit turns/blog EOT,
  Pipecat interruptions, Vercel AI SDK realtime, Gemini Live, Hume EVI, ElevenLabs
  conversation-flow, artículos EOT/expressive).
- Docs canónicas citadas en línea en cada reporte (developers.openai.com,
  ai.google.dev, docs.livekit.io, docs.pipecat.ai, docs.x.ai, dev.hume.ai,
  elevenlabs.io, docs.vapi.ai, docs.retellai.com, developers.deepgram.com,
  docs.cartesia.ai, docs.ultravox.ai, twilio.com/docs/voice/media-streams).
