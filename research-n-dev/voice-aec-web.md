# AEC en el navegador — verificación real y diseño de integración (voz Grok realtime)

> **Tipo**: investigación + diseño de fábrica (`research-n-dev/`, el runtime NO lo lee).
> **Fecha**: 2026-08-17 · **Origen**: plan de voz P2 — verificar si el AEC se aplica de verdad y diseñar los modos AEC vs no-AEC.
> **Estado**: DISEÑO — nada de esto está implementado en `src/`. Para implementar ver el plan en `/memories/session/voice-plan-execution.md` (Fase B2).

---

## 1. Resumen ejecutivo

El cliente `src/lib/realtime/grok-voice.ts` pide el micrófono con:

```ts
navigator.mediaDevices.getUserMedia({
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
});
```

**Pero pedir `echoCancellation: true` NO garantiza que el AEC se aplique**: en web el navegador y el SO deciden el procesamiento final, y el estado REAL se lee con `MediaStreamTrack.getSettings()`. La evidencia de runtime del repo (2026-08-15/17: el mic capta el audio del asistente con la misma energía que la voz del usuario; loops de eco `0.022/0.032` vs voz real `0.125/0.143`) indica que **en esta máquina el AEC efectivo NO está activo** pese a las constraints.

Hoy el cliente compensa la ausencia de AEC con un gate por software (suprime el mic durante el playback + cooldown + piso de eco RMS), lo que **desactiva el barge-in por voz**. El objetivo de este documento: cómo verificar el AEC real en runtime (protocolo + telemetría `aec_status`) y cómo diseñar los dos modos de operación.

**Conclusión clave**: la verificación por `getSettings()` es la señal programática más barata; la verificación **conductual** (turno E2E de voz con `say` + mic, midiendo si hay `mic_drop`/ecos) es la autoritativa. El modo de operación debe decidirse por la combinación de ambas.

---

## 2. Cómo funciona el AEC en WebRTC / navegador

### 2.1 Las constraints de `getUserMedia` NO son mandatos

En `getUserMedia`, las propiedades del objeto `audio` son constraints **"ideal/best-effort"** por defecto. El navegador intenta satisfacerlas con el dispositivo y el pipeline de audio disponibles, pero puede entregar un track **sin** el procesamiento pedido sin error:

- `echoCancellation: true` → el navegador *intenta* activar AEC; si el dispositivo/SO no lo soporta o el driver lo desactiva, **el track se entrega igual con AEC off** (sin excepción).
- Para forzar fallo hay que usar `{ exact: true }` (constraint mandatoria): si no se puede cumplir, `getUserMedia` rechaza con `OverconstrainedError`. **NO recomendado** aquí: preferimos degradar a modo no-AEC que fallar el mic.

> Nota de spec: Chrome aplica `echoCancellation` **por defecto en `true`** incluso sin declararlo (valor default de la constraint). Pero el default también es best-effort: el valor que el navegador *declara haber aplicado* es lo que reporta `getSettings()`, no lo que pediste.

### 2.2 `MediaStreamTrack.getSettings()` — la verdad aplicada

Después de `getUserMedia`, cada track expone `getSettings()` con los valores **realmente aplicados**:

```ts
const track = stream.getAudioTracks()[0];
const s = track.getSettings();
// { deviceId, groupId, sampleRate, sampleSize, channelCount,
//   echoCancellation: boolean, noiseSuppression: boolean, autoGainControl: boolean,
//   latency, ... }
```

| Campo | Significado |
|---|---|
| `echoCancellation` | `true` = el navegador **declara** que el AEC está activo en el track |
| `noiseSuppression` | `true` = supresión de ruido aplicada |
| `autoGainControl` | `true` = AGC aplicado (normaliza el nivel de entrada) |
| `channelCount` / `sampleRate` | canal y tasa que el navegador entregó (puede diferir de lo pedido) |

⚠️ **Advertencia honesta**: `getSettings().echoCancellation === true` es lo que *el navegador cree* que aplicó. No garantiza calidad del AEC (puede ser un AEC por software pobre, o un dispositivo cuyo "AEC" no cancela el audio reproducido por otra aplicación/web). Es la mejor señal programática disponible; la validación conductual (sección 4.4) es la que confirma el comportamiento real.

### 2.3 `MediaStreamTrack.getCapabilities()` — qué soporta el dispositivo

Solo Chrome/Edge (y Firefox en mayor medida). **NO está soportado para audio en Safari** (devuelve `undefined`). Devuelve los rangos soportados:

```ts
const c = track.getCapabilities?.(); // guard: Safari no lo tiene
// { channelCount: {max, min}, sampleRate: {...}, echoCancellation: [true, false],
//   noiseSuppression: [true, false], autoGainControl: [true, false], ... }
```

Sirve para diagnosticar: si `echoCancellation` **ni aparece** en las capabilities (o viene como `[false]`), el dispositivo simplemente no ofrece AEC. Si aparece `[true, false]`, el navegador pudo elegir; el valor elegido está en `getSettings()`.

### 2.4 Qué pasa si el dispositivo no soporta AEC

- `getUserMedia` **NO falla** con constraints ideales: entrega el track sin AEC.
- `getSettings().echoCancellation` viene `false` → nuestro detector lo clasifica como **no-AEC** → modo no-AEC (supresión del mic durante playback, sin barge-in por voz).
- Casos típicos: micrófonos USB/Bluetooth sin procesamiento, altavoces con mic integrado de baja calidad, algunos drivers macOS/Windows con AEC deshabilitado, y configs donde el *output* no es el *default* del sistema (el AEC del navegador suele cancelar solo contra el stream de salida del MISMO origen/navegador; si el audio sale por otro path, el AEC puede ser inefectivo aunque `getSettings()` diga `true`).

### 2.5 Diferencia entre AEC del navegador vs procesamiento del modelo realtime (server-side)

- **AEC del navegador**: procesamiento local en el pipeline de captura (`getUserMedia`), cancelación del *monitor* (lo que la misma página reproduce) que se realimenta al mic. Es el único AEC que podemos controlar vía constraints.
- **AEC server-side del gateway/proveedor**: **DESCONOCIDO — no hay evidencia en nuestro stack ni en las referencias**. Revisé:
  - `references/vercel-ai/packages/ai/src/realtime/browser-realtime-audio.ts` → solo captura/reproduce; `startCapture(stream)` recibe el `MediaStream` ya obtenido por el consumidor; **cero procesamiento de AEC**.
  - `references/vercel-ai/examples/ai-e2e-next/app/live-translate/page.tsx` → pide las mismas 3 constraints y no hace más.
  - `src/routes/api/realtime/token/+server.ts` (sessionConfig) → `turnDetection`, `inputAudioTranscription`, formatos, tools; **nada de AEC/audio processing server-side**.
  - `references/xai-cookbook/Android/...` → el AEC es 100% del lado cliente (Android, ver §6).
  - **Evidencia de que NO hay AEC server-side efectivo**: el bucle observado en runtime — la narración del propio asistente (reproducida en el navegador) se transcribía como pregunta del usuario y re-ejecutaba el turno. Si el gateway aplicara AEC sobre el audio recibido, no podría cancelarlo de todos modos: el echo entra **ya mezclado en el mic** del cliente (el gateway solo ve una señal mono sin referencia del altavoz). Concluir "no hay AEC server-side" o "desconocido" es lo correcto; **asumir que NO existe** es la posición de diseño segura (todo el gate anti-eco client-side se mantiene como red de seguridad).

---

## 3. Estado actual del código (lo que ya existe)

### 3.1 `src/lib/realtime/grok-voice.ts`

- `startMic()` (≈L490): `getUserMedia` con las 3 constraints; **no lee `getSettings()`**.
- Gate anti-eco en `worklet.port.onmessage` (≈L520): descarta el audio del mic mientras `_playing` o en `VOICE_PLAYBACK_COOLDOWN_MS` (1500ms) tras el playback — **el audio del asistente nunca llega al servidor** (fix 2026-08-15 del loop "repite la respuesta").
- `vadTick()`: mismo gate (`_playing`/cooldown) + VAD por RMS (`VOICE_RMS_THRESHOLD=0.012`, `VOICE_SILENCE_MS=1200`).
- `finalizeUtterance()`: gate anti-eco por energía — si `vadPeakRms < VOICE_ECHO_RMS_FLOOR (0.045)` y el asistente habló en `VOICE_ECHO_WINDOW_MS (6000ms)`, rechaza el commit (`echo_reject_vad`).
- `playAudio()`: setea `_playing=true` y `lastAssistantSpeakAt` en `play_start`.
- `handleEvent()`: `speech-started`/`speech-stopped` se ignoran ("informativo"); `input-transcription-completed` hace `cutPlayback()+clearSpokenQueue()+cancelResponse()` cuando `autoCancelAfterTranscript`.
- Telemetría `tel(type, data)` → `voice_events` (radiografía SQLite). Ya existe `mic_drop` (reason playing|cooldown).

### 3.2 `src/lib/realtime/chat-voice.ts`

- `ChatVoiceLayer` envuelve a `GrokVoiceClient`: `startListening()`→`client.startMic()`, `stopListening()`→`client.stopMic()`. Sin superficie de AEC.

### 3.3 `src/routes/chat/ChatSession.svelte` + `/voice`

- Estados de voz: `voiceActive`, `voiceListening`, `voiceSpeaking`, `voiceStatus`, `voiceError`. Sin estado de AEC.

---

## 4. Protocolo de detección en runtime — pasos exactos

### 4.1 Código de detección (navegador, TS) — para `startMic()`

```ts
// ── Detección de AEC real (P2) ─────────────────────────────────────────
// Después de getUserMedia, el track expone qué procesamiento se APLICÓ de
// verdad (getSettings). Las constraints pedidas son best-effort: el
// navegador/SO puede entregar el track SIN AEC sin error. `getCapabilities`
// solo existe en Chrome/Edge/Firefox (Safari → undefined; guard con `?.`).
export type AecInfo = {
  /** true SOLO si el navegador declara AEC aplicado en el track. */
  aecEnabled: boolean;
  /** Procesamiento completo pedido aplicado (AEC + NS + AGC). */
  fullProcessing: boolean;
  /** Settings reales del track (la verdad aplicada). */
  settings: MediaTrackSettings | null;
  /** Capacidades soportadas del dispositivo (undefined en Safari). */
  capabilities: MediaTrackCapabilities | null;
  /** Soporte de la API de capacidades en este navegador. */
  capabilitiesSupported: boolean;
};

function detectAec(stream: MediaStream): AecInfo {
  const track = stream.getAudioTracks()[0];
  let settings: MediaTrackSettings | null = null;
  let capabilities: MediaTrackCapabilities | null = null;
  try {
    settings = track?.getSettings?.() ?? null;
  } catch {
    settings = null; // track no live / excepción del navegador → desconocido
  }
  let capabilitiesSupported = false;
  try {
    if (typeof track?.getCapabilities === 'function') {
      capabilities = track.getCapabilities();
      capabilitiesSupported = true;
    }
  } catch {
    capabilities = null; // no soportado / lanza → no lo usamos
  }
  const s = settings ?? {};
  const aecEnabled = s.echoCancellation === true;
  const fullProcessing =
    aecEnabled && s.noiseSuppression === true && s.autoGainControl === true;
  return { aecEnabled, fullProcessing, settings, capabilities, capabilitiesSupported };
}
```

### 4.2 Integración en `startMic()` (diseño)

```ts
async startMic(): Promise<void> {
  if (this.captureCtx) return;
  try {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { ... } });
    // ── NUEVO P2: verificar el AEC real y decidir modo ──
    const aec = detectAec(this.stream);
    this.aec = aec;                                   // estado del cliente
    this.aecMode = aec.aecEnabled ? 'aec' : 'no-aec'; // decisión de modo
    this.tel('aec_status', {                          // telemetría durable
      mode: this.aecMode,
      aecEnabled: aec.aecEnabled,
      fullProcessing: aec.fullProcessing,
      requested: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      applied: aec.settings,
      capabilities: aec.capabilities,
      capabilitiesSupported: aec.capabilitiesSupported,
      sampleRate: aec.settings?.sampleRate ?? null,
      channelCount: aec.settings?.channelCount ?? null,
    });
    this.callbacks.onAecChange?.(aec);                // notifica a la UI
    // ... resto del setup (AudioContext, worklet, etc.) sin cambios ...
  } catch (err) { ... }
}
```

### 4.3 Qué loguear / telemetría (`aec_status`)

Evento durable `aec_status` (1 por `startMic`, va a `voice_events`):

```jsonc
{
  "at": "2026-08-17T...",
  "type": "aec_status",
  "data": {
    "mode": "aec" | "no-aec",          // decisión de modo (ver §5.2)
    "aecEnabled": true | false,         // getSettings().echoCancellation === true
    "fullProcessing": true | false,     // AEC+NS+AGC aplicados
    "requested":  { "echoCancellation": true, "noiseSuppression": true, "autoGainControl": true },
    "applied":    { "echoCancellation": ..., "noiseSuppression": ..., "autoGainControl": ...,
                    "channelCount": ..., "sampleRate": ... },
    "capabilities": { "echoCancellation": [true,false], ... } | null,
    "capabilitiesSupported": true | false
  }
}
```

Reglas:
- 1 evento por `startMic()` (recomputar en cada arranque del mic — un dispositivo puede cambiar).
- Nunca lanza: todo en try/catch (convención del repo: un throw en runtime crashea el turno).
- En modo no-AEC, los eventos `mic_drop` existentes ya documentan cuánto audio del usuario se descarta durante el playback (el costo del trade-off).

### 4.4 Verificación conductual (la autoritativa) — receta E2E

`getSettings()` dice qué *declara* el navegador; el comportamiento real se valida así (receta ya usada en el repo):

1. `/chat` → activar voz con mic real.
2. Reproducir por el altavoz del sistema una narración del asistente **mientras el mic está activo** (método del repo: `say -v Elena "..."` no aplica aquí — en este caso la VOZ DEL ASISTENTE sale por el altavoz del navegador; el mic lo capta).
3. Verificar en `voice_events` (`.data/sessions.sqlite3`, tabla `voice_events`):
   - **Con AEC real**: durante el playback NO debe haber `mic_drop` con rms alto por eco del altavoz (el AEC cancela), y un `vad_commit` posterior de voz real debe pasar limpio (sin `echo_reject_vad`). Al hablar encima del asistente, el server debería emitir `speech-started` y el cliente poder hacer barge-in (cortar playback).
   - **Sin AEC** (estado actual): `mic_drop reason:playing` con rms ≈ del audio del asistente, `echo_reject_vad`/`echo_reject_intent` con peakRms 0.02–0.04, y la voz del usuario durante el playback se pierde en silencio.
4. Decisión final de modo = `getSettings()` **confirmado por** la conducta. Si `getSettings()` dice `true` pero el comportamiento muestra eco del altavoz con la misma energía que la voz → tratar como no-AEC (el AEC declarado no es efectivo en ese hardware/ruta de audio) y loguearlo (`aec_status.data.effective=false` en un evento `aec_behavioral`).

> ⚠️ **Importante para la máquina del usuario**: el repo documenta que el AEC NO funciona de verdad (el mic capta al asistente con la misma energía). Eso significa que, aunque `getSettings()` pudiera reportar `echoCancellation: true` (algunos setups lo reportan), el modo efectivo es **no-AEC**. El diseño debe tratar el valor de `getSettings()` como *sospechoso hasta confirmación conductual*; ver §5.2 para la decisión.

### 4.5 Superficie nueva del cliente (diseño)

- `GrokVoiceCallbacks` gana `onAecChange?: (aec: AecInfo) => void`.
- `GrokVoiceClient` gana `aec: AecInfo | null`, `aecMode: 'aec' | 'no-aec' | 'unknown'`, y getters (`get aecEnabled()`, `get isAecMode()`).
- `ChatVoiceLayer` propaga `onAecChange` → `ChatVoiceCallbacks.onAecChange` (o un `get aecInfo()`).
- `ChatSession.svelte`/`voice/+page.svelte`: estado `voiceAec = $state<'aec' | 'no-aec' | 'unknown'>('unknown')` → aviso de UI (§5.4).

---

## 5. Diseño de integración — dos modos de operación

### 5.1 Lógica de decisión del modo

```ts
type AecMode = 'aec' | 'no-aec';

function resolveAecMode(aec: AecInfo, behavioral: boolean | null): AecMode {
  // `behavioral` = null (no evaluado aún) | true (conducta sin eco) | false (eco observado).
  // La conducta gana: getSettings() puede declarar AEC que no cancela de verdad.
  if (behavioral === false) return 'no-aec';
  if (behavioral === true) return 'aec';
  return aec.aecEnabled ? 'aec' : 'no-aec'; // sin evidencia conductual → confiar en settings
}
```

Condición exacta que activa cada modo (lo que se implementará):

| Modo | Condición |
|---|---|
| **AEC** | `getSettings().echoCancellation === true` **y** sin evidencia conductual de eco (sin `mic_drop` por playback del asistente con RMS alto, sin `echo_reject_*` en la sesión) |
| **no-AEC** | `getSettings().echoCancellation === false`, **o** capabilities sin AEC, **o** evidencia conductual de eco (cualquier `mic_drop reason:playing` con RMS ≈ audio del asistente, o `echo_reject_vad/intent`) |

Default conservador: **no-AEC** hasta que la verificación confirme lo contrario (en esta máquina hoy es no-AEC).

### 5.2 Modo no-AEC (el actual — se conserva como está)

- **Gate de supresión del mic durante playback**: `if (this._playing) return` + cooldown `VOICE_PLAYBACK_COOLDOWN_MS` en `worklet.port.onmessage` y `vadTick` (ya implementado).
- **Piso de eco RMS** en `finalizeUtterance` (`VOICE_ECHO_RMS_FLOOR`/`VOICE_ECHO_WINDOW_MS`) y dedupe de intención por energía en `ChatSession.svelte` (ya implementado).
- **Sin barge-in por voz**: el usuario no puede interrumpir hablando; barge-in vía UI (texto / botón Detener) y vía `input-transcription-completed` (si algo se transcribió, se corta).
- **Aviso de UI** (§5.4).
- El cooldown y el piso de eco **se mantienen siempre** como red de seguridad incluso en modo AEC (baratos, blindados, sin impacto perceptible cuando el AEC funciona).

### 5.3 Modo AEC (nuevo — el objetivo del plan P2)

- **El mic SIEMPRE appendea**: quitar el gate `if (this._playing) return` y la ventana de cooldown del `worklet.port.onmessage` y de `vadTick` (el AEC debe cancelar el audio del asistente; el servidor solo oye voz real).
- **Barge-in real vía `speech-started`**: en `handleEvent`, dejar de ignorar `speech-started` — cuando el servidor (server-vad) detecta habla del usuario:
  ```ts
  case 'speech-started':
    // Barge-in real (modo AEC): el usuario habló encima del asistente.
    this.cutPlayback();        // corta el audio del asistente
    this.clearSpokenQueue();   // descarta utterances encoladas
    this.tel('barge_in_speech_started');
    break;
  ```
- Mantener `VOICE_ECHO_RMS_FLOOR`/`VOICE_ECHO_WINDOW_MS` como red de seguridad (si un commit de bajo RMS llega justo tras hablar el asistente, se rechaza igual — aun con AEC un residuo mínimo puede colarse).
- Mantener el auto-cancel de respuestas automáticas (`autoCancelAfterTranscript`), que ya existe y es independiente del AEC.

### 5.4 Aviso de UI (modo no-AEC)

Propuesta (texto + lugar):

- **Lugar**: `ChatSession.svelte` junto al estado de voz (pill/banner bajo el toggle "Activar voz") y en `voice/+page.svelte`. Estado `voiceAec === 'no-aec'`.
- **Texto largo** (banner inline, dismissible, aparece al activar la voz):  
  > **Modo sin cancelación de eco.** Tu micrófono se pausa mientras el asistente responde: evita hablar en ese momento. El barge-in por voz está desactivado (puedes interrumpir escribiendo o con el botón Detener).
- **Texto corto** (pill de estado, siempre visible en no-AEC):  
  > Sin cancelación de eco — habla cuando el asistente termine.
- **Modo AEC** (opcional, informativo): mostrar una vez al conectar "Cancelación de eco activa — puedes interrumpir hablando" y dejar de mostrar el aviso.

### 5.5 Dónde detectar el modo al conectar

En `ChatVoiceLayer.connect()`/`startListening()` → el `GrokVoiceClient.startMic()` ya computa `aec` (diseño §4.2) → propaga `onAecChange` → la UI setea `voiceAec` y renderiza el aviso. Recomputar en **cada** `startMic()` (el dispositivo puede cambiar; el reciclaje de sesión re-arranca el mic).

---

## 6. Referencia Android — qué hace y su equivalente en web

**Android** (`references/xai-cookbook/Android/VoiceApiAndroidExample/.../capture/VoiceAudioCapture.kt`):
- Usa `MediaRecorder.AudioSource.VOICE_COMMUNICATION`: un source de audio del framework que enruta la captura por el DSP del sistema (típicamente con AEC/NS/AGC para comunicación — el "modo llamada").
- Además crea y habilita explícitamente (con `isAvailable()` + try/catch, lista por si falla) los efectos de audio:
  ```kotlin
  if (NoiseSuppressor.isAvailable())         NoiseSuppressor.create(sessionId)?.enabled = true
  if (AcousticEchoCanceler.isAvailable())    AcousticEchoCanceler.create(sessionId)?.enabled = true
  if (AutomaticGainControl.isAvailable())    AutomaticGainControl.create(sessionId)?.enabled = true
  ```
- Los efectos se adjuntan al `audioSessionId` del `AudioRecord` y se liberan en el `finally`.

**Web — NO hay equivalente directo**:
- No existe un "modo comunicación" ni una API para crear/enumerar efectos de audio del sistema (nada como `AcousticEchoCanceler`).
- El único control es la constraint de `getUserMedia` (`echoCancellation/noiseSuppression/autoGainControl`), y la decisión final la toma el navegador + el SO + el driver. No se puede consultar "¿cuántos efectos hay?" ni "¿cuál está activo?" más allá de `getSettings()`.
- El patrón Android de "intentar habilitar y degradar si no está disponible" (try/catch, no fallar) se traduce en web a: **pedir las constraints ideales, leer `getSettings()`, y degradar a modo no-AEC si no se aplicaron** — exactamente el diseño de §4/§5.

---

## 7. Gotchas encontrados (leer antes de implementar)

1. **`getSettings()` puede lanzar o venir null** si el track no está "live" o en navegadores raros → siempre try/catch y `?? null`.
2. **`getCapabilities()` NO existe en Safari** para audio (undefined) y en algunos navegadores lanza → guard con `typeof fn === 'function'` + try/catch. No bloquear la detección por esto (solo diagnóstico).
3. **`getSettings().echoCancellation: true` NO garantiza cancelación efectiva** — la prueba conductual manda (el caso documentado de esta máquina es exactamente esto: constraints pedidas pero eco con la misma energía). Diseñar el modo con la conducta como override.
4. **Pedir `echoCancellation` como ideal no falla nunca**; no usar `exact: true` (rompería el mic en hardware sin AEC). La degradación a no-AEC es la estrategia.
5. **El AEC del navegador cancela mejor contra el output del MISMO origen**: si el audio del asistente se reproduce por otro dispositivo/ruta (o por otra pestaña/altavoz), `getSettings()` puede decir true y aún así haber eco → de nuevo, conducta.
6. **El gateway/proveedor NO aplica AEC server-side útil** (desconocido/inexistente en nuestro stack): el echo entra mezclado en el mic del cliente; el servidor no tiene la referencia del altavoz. **Asumir que no existe** y mantener el gate client-side como red de seguridad en ambos modos.
7. **No quitar los gates a ciegas en modo AEC**: primero validar conductualmente que el loop desaparece; mantener `VOICE_ECHO_RMS_FLOOR`/`VOICE_ECHO_WINDOW_MS` siempre (costo despreciable).
8. **Telemetría**: `aec_status` es un evento nuevo de `voice_events` — añadirlo sin tocar los existentes (`mic_drop`, `echo_reject_vad`, etc. ya cubren la conducta). Nunca lanzar desde el detector (convención del repo).
9. **Recomprobar en cada `startMic()`**: el reciclaje de sesión (`maybeRecycleIdle`/`reconnectVoiceSession`) re-arranca el mic; el modo puede cambiar si el usuario cambia de dispositivo a mitad de sesión.
10. **`speech-started` hoy se ignora** ("informativo") — en modo AEC se reutiliza para barge-in, pero hay que blindarlo (try/catch) y decidir si también aplica `cutPlayback` en no-AEC (hoy el barge-in lo maneja `input-transcription-completed`).
11. **No editar código productivo en este documento** — esto es diseño; la implementación va en Fase B2 del plan (`grok-voice.ts`, `chat-voice.ts`, `ChatSession.svelte`, `voice/+page.svelte`, telemetría).

---

## 8. Entregables del plan P2 (referencia para la implementación)

| Ítem | Estado |
|---|---|
| Verificación AEC real en `startMic` (`detectAec` + `aec_status`) | Diseñado (§4) |
| Decisión de modo `aec`/`no-aec` (settings + conducta) | Diseñado (§5.1) |
| Modo AEC: mic siempre appendea + barge-in por `speech-started` | Diseñado (§5.3) |
| Modo no-AEC: gates existentes + aviso UI | Existente + aviso diseñado (§5.4) |
| Aviso UI no-AEC | Diseñado (§5.4) |
| Nota referencia Android + equivalente web | Documentado (§6) |
| AEC server-side | Desconocido — asumir inexistente (§2.5) |
| `scripts/probe-aec.ts` | **NO se crea** — `getUserMedia` no corre en Node puro; el código de detección vive solo en este documento (§4.1) |
