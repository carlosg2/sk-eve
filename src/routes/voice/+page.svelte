<script lang="ts">
	import { onDestroy } from 'svelte';
	import { GrokVoiceClient, REALTIME_MODEL } from '$lib/realtime/grok-voice';
	import BarVisualizer, { type AgentState } from '$lib/components/voice/bar-visualizer.svelte';
	import LiveWaveform from '$lib/components/voice/live-waveform.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import MicIcon from '@lucide/svelte/icons/mic';
	import SquareIcon from '@lucide/svelte/icons/square';
	import PlugIcon from '@lucide/svelte/icons/plug';
	import UnplugIcon from '@lucide/svelte/icons/unplug';
	import SendIcon from '@lucide/svelte/icons/send';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import EraserIcon from '@lucide/svelte/icons/eraser';
	import CpuIcon from '@lucide/svelte/icons/cpu';

	type TranscriptLine = { role: 'user' | 'assistant'; text: string };

	let status = $state('desconectado');
	let connected = $state(false);
	let connecting = $state(false);
	let listening = $state(false);
	let playing = $state(false);
	let responding = $state(false);
	let error = $state('');
	let textInput = $state('');
	let transcript = $state<TranscriptLine[]>([]);
	let toolActivity = $state('');
	let micStream = $state<MediaStream | null>(null);
	let transcriptEl = $state<HTMLDivElement>();

	let client: GrokVoiceClient | null = null;
	let assistantBuf = '';

	// Identidad de esta conexión de voz: el server la usa para mantener la
	// continuidad de la conversación en la MISMA sesión Eve de /chat.
	const voiceSessionId = crypto.randomUUID();

	// Cuando ask_agent devuelve la respuesta real del agente, se muestra en el
	// transcript y se suprime el transcript de audio de la re-interpretación
	// (la voz habla la respuesta; no queremos dos burbujas por turno).
	let suppressVoiceTranscript = $state(false);

	// Mapeo del estado del agente de voz al visualizador (igual ciclo que /chat:
	// conectar → escuchar → pensar → hablar).
	const agentState = $derived<AgentState>(
		connecting
			? 'connecting'
			: playing
				? 'speaking'
				: responding
					? 'thinking'
					: listening
						? 'listening'
						: 'initializing'
	);

	function pushUser(text: string) {
		if (!text.trim()) return;
		assistantBuf = '';
		// Cada pregunta del usuario arranca una respuesta nueva: si la anterior
		// fue del agente (vía ask_agent), ya no se suprime el transcript.
		suppressVoiceTranscript = false;
		transcript = [...transcript, { role: 'user', text }];
	}

	function pushAssistant(chunk: string, kind: 'delta' | 'done') {
		if (!chunk) return;
		if (kind === 'done') {
			// Transcript final del item: reemplaza el último segmento (el servidor
			// re-emite el texto completo tras los deltas → no se debe anexar).
			assistantBuf = chunk;
			const last = transcript[transcript.length - 1];
			if (last?.role === 'assistant') {
				transcript = [...transcript.slice(0, -1), { role: 'assistant', text: chunk }];
			} else {
				transcript = [...transcript, { role: 'assistant', text: chunk }];
			}
			return;
		}
		assistantBuf += chunk;
		const last = transcript[transcript.length - 1];
		if (last?.role === 'assistant') {
			transcript = [...transcript.slice(0, -1), { role: 'assistant', text: assistantBuf }];
		} else {
			transcript = [...transcript, { role: 'assistant', text: assistantBuf }];
		}
	}

	// Ejecuta un tool call de la sesión de voz contra el server. La única tool
	// expuesta es `ask_agent`: delega la pregunta al agente Eve de /chat en
	// background y devuelve la respuesta completa del agente.
	async function handleToolCall(call: { callId: string; name: string; arguments: string }) {
		let args: Record<string, unknown> = {};
		try {
			args = JSON.parse(call.arguments);
		} catch {
			/* args vacíos */
		}
		const isAgent = call.name === 'ask_agent';
		if (isAgent) {
			args.__voiceSessionId = voiceSessionId;
			// ⚠️ La voz a veces NO pasa la pregunta real del usuario: manda su
			// propia paráfrasis o texto de contexto como `question` (observado:
			// "Tienes dos módulos principales…" en vez de la pregunta). La
			// pregunta VERDADERA siempre está en el transcript del usuario
			// (STT/texto); usarla como fuente de verdad para ask_agent.
			const lastUser = [...transcript].reverse().find((l) => l.role === 'user');
			if (lastUser?.text?.trim()) args.question = lastUser.text.trim();
		}
		toolActivity = isAgent ? 'consultar_agente' : call.name;
		try {
			const res = await fetch('/api/realtime/erp', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ toolName: call.name, args }),
			});
			const data = (await res.json().catch(() => ({}))) as { result?: unknown };
			const result = data.result ?? { ok: false, error: 'sin respuesta del agente' };
			if (isAgent && result && typeof result === 'object' && 'answer' in result) {
				const answer = String((result as { answer?: unknown }).answer ?? '');
				if (answer.trim()) {
					// La voz re-interpreta la respuesta hablada; aquí mostramos la
					// respuesta REAL del agente (la misma de /chat) como transcript.
					pushAssistant(answer, 'done');
					suppressVoiceTranscript = true;
				}
			}
			toolActivity = '';
			return result;
		} catch (err) {
			toolActivity = '';
			return { ok: false, error: String(err) };
		}
	}

	async function toggleConnect() {
		if (connected || connecting) {
			client?.disconnect();
			connected = false;
			return;
		}
		connecting = true;
		error = '';
		try {
			client = new GrokVoiceClient({
				onStatus: (s) => {
					status = s;
					connected = s === 'listo' || s === 'sesión abierta';
					if (s === 'desconectado') {
						micStream = null;
						listening = false;
						playing = false;
						responding = false;
						toolActivity = '';
					}
				},
				onUserTranscript: pushUser,
				onAssistantTranscript: (text, kind) => {
					// Si ask_agent ya mostró la respuesta real del agente, no
					// duplicar la re-interpretación hablada en el transcript.
					if (suppressVoiceTranscript) return;
					pushAssistant(text, kind);
				},
				onError: (msg) => {
					error = msg;
				},
				onListeningChange: (v) => {
					listening = v;
				},
				onPlayingChange: (v) => {
					playing = v;
				},
				onRespondingChange: (v) => {
					responding = v;
				},
				onToolCall: handleToolCall,
			});
			await client.connect();
			status = 'listo';
			connected = true;
		} catch {
			status = 'error';
		} finally {
			connecting = false;
		}
	}

	async function toggleMic() {
		if (!client?.connected) return;
		if (listening) {
			client.stopMic();
			micStream = null;
		} else {
			try {
				await client.startMic();
				micStream = client.micStream;
			} catch {
				/* el error ya lo reporta el cliente */
			}
		}
	}

	function sendText() {
		const text = textInput.trim();
		if (!text || !client?.connected) return;
		pushUser(text);
		client.sendTextMessage(text);
		textInput = '';
	}

	function clearTranscript() {
		transcript = [];
		assistantBuf = '';
	}

	$effect(() => {
		if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
	});

	onDestroy(() => {
		client?.disconnect();
	});
</script>

<svelte:head>
	<title>Voz · Asistente ERP</title>
</svelte:head>

<div class="mx-auto flex h-full max-w-3xl flex-col gap-4 p-4">
	<!-- Encabezado -->
	<div class="flex items-center gap-2">
		<a
			href="/chat"
			class="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
			aria-label="Volver al chat"
		>
			<ArrowLeftIcon class="size-4" />
		</a>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-sm font-semibold">Voz · Asistente ERP</h1>
			<p class="text-muted-foreground text-xs">Grok Voice realtime · delega al agente de /chat en background · {REALTIME_MODEL}</p>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="size-2 rounded-full {status === 'listo' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : connected ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/40'}"></span>
			<span class="text-muted-foreground text-xs">{status}</span>
		</div>
	</div>

	{#if error}
		<div class="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
			{error}
		</div>
	{/if}

	<!-- Visualizador del agente (bar-visualizer) + waveform del micrófono -->
	<div class="space-y-2">
		<BarVisualizer
			{agentState}
			mediaStream={micStream}
			barCount={24}
			minHeight={15}
			maxHeight={100}
			class="h-40"
		/>
		{#if listening || responding}
			<LiveWaveform
				active={listening}
				processing={responding && !listening}
				height={36}
				barWidth={3}
				barGap={1}
				barColor="gray"
				mode="static"
			/>
		{/if}
	</div>

	<!-- Controles -->
	<div class="flex flex-wrap items-center gap-2">
		<Button variant={connected ? 'outline' : 'default'} onclick={toggleConnect}>
			{#if connecting}
				<LoaderCircleIcon class="size-4 animate-spin" />
				Conectando…
			{:else if connected}
				<UnplugIcon class="size-4" />
				Desconectar
			{:else}
				<PlugIcon class="size-4" />
				Conectar
			{/if}
		</Button>
		<Button variant="outline" disabled={!connected} onclick={toggleMic} class={listening ? 'border-red-500/40 bg-red-500/10 text-red-500' : ''}>
			{#if listening}
				<SquareIcon class="size-4" />
				Detener micrófono
			{:else}
				<MicIcon class="size-4" />
				Hablar
			{/if}
		</Button>
		{#if playing}
			<span class="inline-flex items-center gap-1.5 text-xs text-blue-500">Hablando…</span>
		{:else if responding}
			<span class="inline-flex items-center gap-1.5 text-xs text-violet-500">Consultando agente…</span>
		{/if}
		<div class="ml-auto">
			<Button variant="ghost" size="sm" onclick={clearTranscript} disabled={transcript.length === 0}>
				<EraserIcon class="size-4" />
				Limpiar
			</Button>
		</div>
	</div>

	<!-- Actividad de tools (como el feed de /chat, compacto) -->
	{#if toolActivity}
		<div class="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
			<CpuIcon class="size-3.5" />
			{#if toolActivity === 'consultar_agente'}
				Consultando al agente de /chat…
			{:else}
				Ejecutando <code class="rounded bg-accent px-1 py-0.5">{toolActivity}</code>
			{/if}
		</div>
	{/if}

	<!-- Transcripción -->
	<div
		bind:this={transcriptEl}
		class="bg-card min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border p-4 text-sm"
		aria-label="Transcripción de la sesión de voz"
	>
		{#if transcript.length === 0}
			<p class="text-muted-foreground text-xs">Conecta y pulsa «Hablar» (o escribe un mensaje de prueba). El agente de /chat consulta el Company Twin y el ERP en background y la voz te lo dice.</p>
		{/if}
		{#each transcript as line, i (i)}
			<div class="flex flex-col gap-1 {line.role === 'user' ? 'items-end' : 'items-start'}">
				<span class="text-muted-foreground text-[0.65rem] uppercase">{line.role === 'user' ? 'Tú' : 'Asistente'}</span>
				<span
					class="max-w-[85%] rounded-lg px-3 py-1.5 whitespace-pre-wrap {line.role === 'user'
						? 'bg-primary text-primary-foreground rounded-br-sm'
						: 'bg-accent rounded-bl-sm'}"
				>{line.text}</span>
			</div>
		{/each}
	</div>

	<!-- Entrada de texto (útil para probar sin micrófono) -->
	<div class="flex items-center gap-2">
		<Input
			bind:value={textInput}
			placeholder="Escribe un mensaje (también sirve sin micrófono)…"
			disabled={!connected}
			onkeydown={(e) => {
				if (e.key === 'Enter') sendText();
			}}
		/>
		<Button onclick={sendText} disabled={!connected || !textInput.trim()}>
			<SendIcon class="size-4" />
			Enviar
		</Button>
	</div>
</div>
