# Voice radical — speech-to-speech real y canales (2026-08-17)

> Material de la FÁBRICA (Copilot). El runtime NO lo lee.
> Autor: subagente de investigación (R1-R5 del plan de mejoras de voz, `voice-ux-best-practices.md` §3).
> Fuentes: `node_modules/@ai-sdk/provider/dist/index.d.ts`, `node_modules/@ai-sdk/gateway/dist/index.{d.ts,js}`,
> `node_modules/ai/dist/index.d.ts`, `references/vercel-ai/packages/{provider,gateway,ai}/src/realtime/**`,
> `references/xai-cookbook/` (ejemplo Android Voice API), OpenAI Realtime prompting guide
> (developers.openai.com/api/docs/guides/realtime-models-prompting), y el código actual de
> `src/lib/realtime/{grok-voice.ts,chat-voice.ts,voice-session-config.ts}` + `src/routes/chat/ChatSession.svelte`.

---

## Resumen ejecutivo (veredictos)

| # | Mejora | Veredicto | Evidencia clave |
|---|---|---|---|
| R1 | S2S real con commentary/final **nativo** del modelo | **VIABLE PARCIAL** — el protocolo normalizado NO expone `phase`; hoy es imposible "preámbulo nativo + suprimir final por fase". Pero la capa JS YA separa commentary/final (`narrar` vs `SPEECH`), así que el UX objetivo se logra sin fases. | `realtime-model-v4-server-event.ts`: `response-done` = `{responseId, status, raw}` sin `phase`; `custom` = passthrough `{rawType, raw}`. |
| R2 | Canales commentary/final vía instructions | **YA OPERATIVO** (por utterance) | `response-create.options.instructions` (client-event normalizado) + `speak(text, {instructions})`. |
| R3 | Proactive silence / wait_for_user | **IMPLEMENTADO** (idle 60s/150s en esta sesión) | `grok-voice.ts` `VOICE_IDLE_TIER1_MS=60000`, `VOICE_IDLE_TIER2_MS=150000`. |
| R4 | Envelope JSON de tool output (`response_text`+`require_repeat_verbatim`) | **N/A HOY** — el SPEECH lo parsea la capa JS y lo habla el modelo como TTS verbatim; no hay modelo realtime que parafrasee tool outputs. | `chat-voice.ts` parsea `SPEECH` → `client.speak(text)`; `grok-voice.ts` envía "Lee en voz alta: {text}". |
| R5 | Entonación por utterance | **PARCIAL** — ya en `narrar` (tono bajo) y HITL (clara/pausada); falta en SPEECH final y preámbulos. | `ChatSession.svelte:1553/1436` pasan `instructions`; `chat-voice.ts:661/671/563` no. |
| VAD | `turn_detection.type: semantic_vad` | **TIPADO SÍ, VERIFICADO NO** — existe en el tipo normalizado, pero el respeto efectivo por `xai/grok-voice-think-fast-2.0` no es verificable desde los tipos (el gateway lo mapea server-side). Requiere probe de runtime. | `realtime-model-v4-session-config.ts`: `type: 'server-vad' \| 'semantic-vad' \| 'disabled'`. |

---

## R1 — S2S real con commentary/final nativos: hallazgos del protocolo + veredicto

### Qué encontré en node_modules (protocolo normalizado AI SDK)

El cliente de `grok-voice.ts` habla el **protocolo normalizado** del AI SDK (eventos kebab-case) y el
**gateway server** (nube de Vercel) lo traduce al protocolo nativo del provider. La fuente de verdad
del lado cliente está en:

- `references/vercel-ai/packages/provider/src/realtime-model/v4/realtime-model-v4-server-event.ts`
  (mismo contenido en `node_modules/@ai-sdk/provider/dist/index.d.ts`).

**`response-done` (el evento donde OpenAI pondría la fase):**
```ts
| {
    type: 'response-done';
    responseId: string;
    status: string;   // estado de COMPLETADO (p.ej. completed/cancelled), NO la fase
    raw: unknown;     // payload original del provider (única vía hoy de leer `phase`)
  }
```

- **NO existe `phase`** en el union: ni en `response-done`, ni `response.output[].phase`, ni en
  `output-item-added/done`, `content-part-added/done`, `audio-done`, `text-done`. Lo verifiqué en el
  source de `references/vercel-ai` y en los `.d.ts` compilados de `node_modules` (grep `phase` = 0 hits
  en `@ai-sdk/gateway/dist/index.d.ts` y en los sources de `references/vercel-ai/packages/{gateway,ai}`).
- El único passthrough de eventos provider nativos es el evento **`custom`**:
  ```ts
  | { type: 'custom'; rawType: string; raw: unknown; }
  ```
  Además, **todo** evento normalizado lleva `raw: unknown` (payload original del provider).
- El cliente del gateway es **identity**: `GatewayRealtimeModel.parseServerEvent(raw) { return raw; }`
  (`references/vercel-ai/packages/gateway/src/gateway-realtime-model.ts`) — "The Gateway emits
  normalized AI SDK realtime events, so no provider-specific mapping is needed on the client".
  O sea: lo que llegue normalizado lo decide el **gateway server**, no el cliente.
- El paquete `ai` re-exporta los tipos del provider SIN extensiones (`RealtimeModel = Experimental_RealtimeModelV4`,
  etc. en `node_modules/ai/dist/index.d.ts:8198-8202`); `AbstractRealtimeSession` no maneja fases.

### Contraste: OpenAI nativo SÍ tiene fases

La guía oficial de `gpt-realtime-2` ("Use message channels deliberately") documenta:

> "gpt-realtime-2 can emit multiple response phases in a single turn. In API output, this distinction
> is represented by the `response.done` event, which includes a `phase` value that indicates whether
> the content is commentary or the final answer."
> `response.output[0].phase: "commentary"` · `response.output[1].phase: "final_answer"`

Eso es el **protocolo nativo de OpenAI**, no el normalizado del AI SDK. El gateway expone
`openai/gpt-realtime-2` en `GatewayRealtimeModelId` (`node_modules/@ai-sdk/gateway/dist/index.d.ts:74`),
pero el tipo normalizado que recibimos NO lleva la fase.

### ¿Podemos hoy "preámbulos nativos + suprimir el final por fase"?

**NO vía protocolo**: no hay `phase` que leer. El `custom`/`raw` son teóricamente una puerta — SI el
gateway server dejara pasar el `response.done` nativo con `phase`, lo veríamos en `ev.raw` — pero eso
depende del gateway server (caja negra, no controlable desde el cliente) y nuestro cliente hoy **ignora
los eventos `custom`** (`case "custom": // ... se ignoran` en `grok-voice.ts`).

**SÍ en nuestra arquitectura actual, pero por la capa JS, no por el modelo**: el "preámbulo nativo"
en nuestro thin-layer es la herramienta `narrar` del cerebro (DeepSeek) y el final es `SPEECH`; ambos
los genera la capa JS y los habla el modelo realtime como TTS verbatim, serializados en la cola
filler → narración → respuesta (`speakQueue` + `drainSpeakQueue`, `grok-voice.ts:365-366,796-858`).

### Veredicto R1

> **VIABLE PARCIAL.** Hoy NO es viable hacer speech-to-speech "real" con commentary/final **nativos**
> (generados por el modelo realtime y distinguibles por fase) porque el protocolo normalizado del
> AI SDK/gateway no expone `phase` (`response-done` solo trae `status` + `raw`). PERO el efecto de UX
> (comentario en vivo + respuesta final) ya se logra con la separación `narrar`≈commentary /
> `SPEECH`≈final en la capa JS, que es exactamente la recomendación de la guía de OpenAI (§2.7 de
> `voice-ux-best-practices.md`). El salto "radical" (que el modelo realtime decida preámbulos) queda
> bloqueado hasta que el gateway normalice `phase` (o lo pase por `custom`/`raw` de forma verificada).

---

## R2 — Canales commentary/final en la arquitectura actual (narrar vs SPEECH)

### Mapeo actual

| Canal OpenAI | Nuestro canal | Dónde |
|---|---|---|
| `commentary` (preámbulos + tool calls) | `narrar` (tool del cerebro, SOLO voz) + preámbulos hardcodeados | `agent/tools/*` → `ChatSession.svelte:236-238` (excluido del feed) → `chat-voice.ts:570 speakNarration` |
| `final` (respuesta final al usuario) | `SPEECH` (parsed por la capa JS) | `chat-voice.ts:661/671` → `client.speak(full/condensed)` |

### Instructions distintas por utterance — ya soportado

- El protocolo normalizado soporta `response-create.options: { modalities?, instructions?, metadata? }`
  (`references/vercel-ai/packages/provider/src/realtime-model/v4/realtime-model-v4-client-event.ts`).
- `grok-voice.ts` `speak(text, { instructions?, narrate? })` (línea 798) → cola → `drainSpeakQueue`
  envía `response-create` con `options: { modalities: ["audio"], ...(instructions ? { instructions } : {}) }`
  (líneas 846-847).
- El gateway mapea `instructions` al payload del provider server-side (`buildSessionConfig` es identity
  con el comentario "the Gateway maps it to the upstream provider's session payload server-side").

### Qué más se podría hacer (ya hay instrucciones reales en producción)

- **Tono bajo (commentary)**: narración usa `"léelo con naturalidad, como un asistente que comenta en
  voz baja lo que está haciendo. Pausado y claro."` (`ChatSession.svelte:1553-1555`).
- **Tono claro (final)**: preguntas HITL usan `"léela clara y pausada, como quien pide una respuesta…"`
  (`ChatSession.svelte:1436-1438`).
- **Falta**: aplicar el mismo mecanismo al SPEECH final (tono claro) y a los preámbulos (tono bajo) —
  ver R5. También se podría variar la instrucción por módulo/entidad (alineado con S1/S6).

---

## R3 — Proactive silence / wait_for_user (estado: idle 60s/150s implementado)

- **Implementado en esta sesión** (`src/lib/realtime/grok-voice.ts:110-111`):
  - `VOICE_IDLE_TIER1_MS`: 25000 → **60000** (aviso amable "¿Sigues ahí?" solo tras 60s de inactividad real).
  - `VOICE_IDLE_TIER2_MS`: 90000 → **150000** (desconexión amable; ~90s de margen entre tier1 y tier2).
  - Comentario del bloque actualizado con la justificación (patrón `wait_for_user`: no hablar al silencio;
    el keepalive de la UI ya cubre turnos largos de DeepSeek). El resto de la lógica del watchdog
    (`idleTick`, `tier1Notified`, `onIdle(1|2)`, `VOICE_IDLE_POLL_MS=1000`) quedó intacto.
- **Patrón de referencia** (OpenAI Realtime prompting, "Handle silence and background audio"): una tool
  no-op `wait_for_user` para que el modelo NO hable al silencio y NO diga "I'm here" / "I didn't catch
  that". Nuestro equivalente es el watchdog con tiers conservadores.
- **Pendiente (otros subagentes)**: el mensaje del tier1 en `ChatSession.svelte:1196` ("¿Sigues ahí?
  Puedes preguntarme lo que necesites.") y el tier2 (`:1213`) siguen igual — solo cambió el timing.
  La lección `wait_for_user` sugiere que el tier1 podría volverse solo-visual o más breve.

---

## R4 — Envelope JSON de tool output (veredicto N/A o aplicable)

- **Patrón OpenAI** ("Tool Output Formatting"): envolver salidas verbatim en
  `{ "response_text": "...", "require_repeat_verbatim": true }` para que el **modelo realtime** que
  consume tool outputs repita el texto sin parafrasear/truncar.
- **En NUESTRA arquitectura el SPEECH lo parsea la capa JS** (`chat-voice.ts` extrae `SPEECH:` del
  texto del cerebro) y lo habla el modelo realtime como **TTS verbatim** con la instrucción
  `"Lee en voz alta: ${text}"` (`grok-voice.ts:840`). No hay un modelo realtime decidiendo qué decir a
  partir de tool outputs → el problema que resuelve el envelope (parafraseo/truncado del modelo
  generador) **no existe en esta ruta**.

> **Veredicto R4: N/A HOY.** Solo aplicaría si el modelo realtime pasara a generar contenido a partir
> de tool outputs (modo S2S real del R1); entonces el envelope sería la práctica correcta. Higiene
> opcional sin evidencia de fallo: envolver el texto del `conversation-item-create` en el envelope
> para reforzar el verbatim — no lo recomiendo sin medir primero.

---

## R5 — Entonación por utterance (estado)

**Dónde está:**
- API: `GrokVoiceClient.speak(text, { instructions?, narrate? })` (`grok-voice.ts:798`) →
  `response-create.options.instructions` (`:846-847`).
- Puente: `ChatVoiceLayer.speakNarration(text, { instructions? })` (`chat-voice.ts:570`) →
  `client.speak(clean, options)` (`:576`).
- Ya en uso con instructions reales:
  - Narración/commentary (tono bajo): `ChatSession.svelte:1553-1555`.
  - Preguntas HITL (clara y pausada): `ChatSession.svelte:1436-1438`.

**Qué falta (completar R5):**
- SPEECH final sin instructions: `chat-voice.ts:661/671` (`client.speak(full)` / `client.speak(condensed)`)
  → añadir instructions de "tono claro / respuesta final".
- Preámbulos sin instructions: `chat-voice.ts:563` (`client.speak(PREAMBLES[...])`) → añadir "tono bajo".
- Riesgo: si el provider no respeta `instructions` por response, es no-op (sin regresión observable).

---

## VAD semántico

- **El tipo normalizado lo soporta**: `RealtimeModelV4SessionConfig.turnDetection.type` =
  `'server-vad' | 'semantic-vad' | 'disabled'`
  (`references/vercel-ai/packages/provider/src/realtime-model/v4/realtime-model-v4-session-config.ts`;
  idem `node_modules/@ai-sdk/provider/dist/index.d.ts` ~línea 6450). Documentado como "OpenAI's
  semantic detection".
- **Pero**: el mapeo a la forma wire del provider ocurre en el gateway server (Vercel cloud) — el
  cliente no puede verificar si `xai/grok-voice-think-fast-2.0` lo respeta. El ejemplo Android del
  xAI-cookbook no configura `turn_detection` en absoluto (0 hits en el source) → sin evidencia de
  semantic VAD nativo xAI.
- **En nuestra arquitectura**: modo no-AEC usa `turnDetection: disabled` + VAD cliente por RMS
  (push-to-talk natural, `voice-session-config.ts`); modo AEC usa `server-vad` (`SERVER_VAD_CONFIG`).
  `semantic-vad` solo tendría sentido en modo AEC.

> **Veredicto VAD: TIPADO SÍ, VERIFICADO NO.** Antes de adoptarlo: probe de fábrica que abra una
> sesión con `turnDetection: { type: "semantic-vad", ... }` y mida commits/`speech-started` en
> `xai/grok-voice-think-fast-2.0`. Hasta entonces, seguir con `server-vad`/`disabled` actuales.

---

## Spec de migración (R1 viable parcial — qué hacer y qué NO romper)

### Qué NO hacer hoy
1. **No leer `phase` de `response-done`** — no existe en el tipo; un cast rompería el chequeo de tipos.
2. **No migrar el "cerebro" a un modelo realtime con herramientas** (p.ej. `openai/gpt-realtime-2` vía
   gateway) para lograr S2S nativo: es un cambio arquitectónico grande (dual-brain → responder único),
   sacrifica el thin-layer (gate anti-eco, cola serializada, watchdog, telemetría) y **el protocolo
   normalizado no entrega `phase` hoy**, así que ni siquiera se obtendría la separación commentary/final
   que ya tenemos por JS.

### Qué hacer (bajo riesgo, sin tocar la estabilidad de `grok-voice.ts` salvo lo ya hecho)
1. **Probe de fábrica** (scripts/): sesión realtime contra el gateway y telemetría del `raw` de
   `response-done` (y de eventos `custom`) para verificar si el gateway server deja pasar `phase`
   (aunque no esté tipado). Resultado define si "preámbulo nativo" es alcanzable en algún futuro.
2. **Completar R5** (entonación por utterance): instructions en SPEECH final y preámbulos
   (`chat-voice.ts:661/671/563`) — es la forma más barata de conseguir "commentary en voz baja, final
   claro" sin fases del modelo.
3. **R3 ya implementado** (60s/150s); re-evaluar el mensaje del tier1 (¿solo-visual?).
4. **Re-evaluar R1** cuando el gateway normalice `phase` (o cuando `custom`/`raw` demuestren pasarlo) —
   apuntarlo en el programa de investigación de `stack-mastery`.

### Qué NO romper (invariantes del thin-layer)
- **Cola serializada** `speakQueue`/`drainSpeakQueue` (orden filler→narración→respuesta; un
  `response-create` por vez esperando `response-done`).
- **Gate anti-eco** + `turnDetection: disabled` en no-AEC (VAD cliente por RMS, piso de eco).
- **Barge-in** por `speech-started` en modo AEC + `SERVER_VAD_CONFIG`.
- **Guard de identidad** del WebSocket y el manejo de `response-created` anti-colisión (el guard
  `<3s` + `hasOwnSpeak`).
- **Watchdog** (ahora 60s/150s) y telemetría `voice_events`.
- La **estabilidad de `grok-voice.ts`** (otros subagentes la están editando en paralelo: solo se
  tocaron las 2 constantes del idle + su comentario).
