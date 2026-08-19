/**
 * Sonidos del botón "dictate" de VS Code Copilot, replicados en este proyecto.
 *
 * VS Code reproduce dos señales de accesibilidad (audio cues) del core al usar
 * dictado por voz:
 *   - `voiceRecordingStarted.mp3` → al INICIAR la grabación (pulsar "dictate")
 *   - `voiceRecordingStopped.mp3` → al TERMINAR la grabación
 * Origen (2026-08-18):
 *   /Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/platform/
 *   accessibilitySignal/browser/media/voiceRecording{Started,Stopped}.mp3
 * Copiados a `static/sounds/voice-dictate-{start,stop}.mp3`.
 *
 * Uso: tocar el sonido de inicio justo cuando el mic se activa (dictate on) y
 * el de fin cuando la voz se desactiva (dictate off, incluye auto-off post
 * respuesta e idle timeout). Todo el módulo está blindado con try/catch: un
 * fallo de audio (autoplay bloqueado, recurso no encontrado) NUNCA rompe la
 * UI ni el turno de voz (regla del repo para el código del self-improvement).
 */

const VOICE_SOUND_START_URL = '/sounds/voice-dictate-start.mp3';
const VOICE_SOUND_STOP_URL = '/sounds/voice-dictate-stop.mp3';

let startAudio: HTMLAudioElement | null = null;
let stopAudio: HTMLAudioElement | null = null;

/** Crea (una sola vez) el elemento de audio de una URL y lo reusa. */
function cachedAudio(url: string): HTMLAudioElement | null {
	try {
		if (typeof window === 'undefined') return null;
		const a = new Audio(url);
		a.preload = 'auto';
		return a;
	} catch {
		return null;
	}
}

/** Reproduce un clip desde cero (permite disparos repetidos sin solaparse). */
function playClip(audio: HTMLAudioElement | null): void {
	try {
		if (!audio) return;
		audio.volume = 1; // el unlock lo deja a 0 (silencioso)
		audio.currentTime = 0;
		void audio.play().catch(() => {
			// silencioso: autoplay bloqueado o recurso ausente — nunca es fatal.
		});
	} catch {
		/* noop */
	}
}

/**
 * "Desbloquea" los clips dentro del gesto del usuario (el click en "Activar
 * voz"): crea los Audio y les hace un play+pause inmediato para que el navegador
 * permita `play()` más tarde — cuando el mic REALMENTE empieza a escuchar
 * (onListeningChange(true), tras los awaits de connect+startListening).
 * Sin este desbloqueo, un `play()` fuera del gesto puede ser bloqueado por la
 * política de autoplay (intermitente: "a veces sí, a veces no").
 */
export function unlockVoiceSounds(): void {
	try {
		if (!startAudio) startAudio = cachedAudio(VOICE_SOUND_START_URL);
		if (!stopAudio) stopAudio = cachedAudio(VOICE_SOUND_STOP_URL);
		for (const a of [startAudio, stopAudio]) {
			if (!a) continue;
			// Volumen 0: el unlock es un play+pause SILENCIOSO (solo desbloquea el
			// autoplay del navegador; playClip restaura volume=1 al reproducir).
			a.volume = 0;
			const p = a.play();
			if (p && typeof p.catch === 'function') p.catch(() => {});
			// Pausar inmediatamente para que no suene en el gesto; el elemento
			// queda "desbloqueado" para play() posteriores.
			window.setTimeout(() => {
				try {
					a.pause();
					a.currentTime = 0;
				} catch {
					/* noop */
				}
			}, 0);
		}
	} catch {
		/* noop */
	}
}

/** Sonido de "dictate encendido" (el mic empieza a escuchar). */
export function playDictateStartSound(): void {
	if (!startAudio) startAudio = cachedAudio(VOICE_SOUND_START_URL);
	playClip(startAudio);
}

/** Sonido de "dictate apagado" (la voz se desactiva). */
export function playDictateStopSound(): void {
	if (!stopAudio) stopAudio = cachedAudio(VOICE_SOUND_STOP_URL);
	playClip(stopAudio);
}
