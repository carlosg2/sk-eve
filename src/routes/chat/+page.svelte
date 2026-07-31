<script lang="ts">
	import { useEveAgent } from 'eve/svelte';
	import { computeDiagnostics, friendlyToolLabel, redactSensitiveData, unwrapMcpOutput } from '$lib/lib/agent-diagnostics';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import * as MessageScroller from '$lib/components/ui/message-scroller/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import MessageAnimated from '$lib/components/message-animated.svelte';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import MessageCircleDashedIcon from '@lucide/svelte/icons/message-circle-dashed';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
	import SquareIcon from '@lucide/svelte/icons/square';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import CopyIcon from '@lucide/svelte/icons/copy';

	const agent = useEveAgent();

	let text = $state('');
	let showDebug = $state(false);
	let devFilter = $state<'all' | 'llm' | 'tool' | 'step' | 'flow'>('all');
	let expandedRows = $state(new Set<number>());

	const messages = $derived(agent.data.messages);
	const isBusy = $derived(agent.status === 'submitted' || agent.status === 'streaming');
	let elapsedMs = $state(0);

	$effect(() => {
		if (!isBusy) {
			elapsedMs = 0;
			return;
		}
		const startedAt = Date.now();
		elapsedMs = 0;
		const timer = window.setInterval(() => (elapsedMs = Date.now() - startedAt), 250);
		return () => window.clearInterval(timer);
	});

	// Hora de llegada por evento (cliente), sellada UNA vez al aparecer el evento.
	// Los eventos del stream no traen timestamp fiable; sin este sellado, el timing
	// del DevTools quedaba en ~0 (todos calculados en el mismo render).
	let eventTimings = $state<number[]>([]);
	$effect(() => {
		const n = agent.events.length;
		if (n < eventTimings.length) {
			eventTimings = agent.events.map(() => Date.now());
		} else if (n > eventTimings.length) {
			const now = Date.now();
			const next = eventTimings.slice();
			while (next.length < n) next.push(now);
			eventTimings = next;
		}
	});
	function eventTs(ev: StreamEv, idx: number): number {
		const at = (ev as any).meta?.at;
		if (at) {
			const p = Date.parse(at);
			if (!Number.isNaN(p)) return p;
		}
		return eventTimings[idx] ?? Date.now();
	}

	// Diagnóstico agregado (módulo compartido con / ).
	const diagnostics = $derived(computeDiagnostics(agent.events as StreamEv[], eventTs));

	// Estado en vivo: qué está haciendo el agente AHORA (mejora la UX percibida
	// durante los ~segundos de generación/tool en que no hay texto que mostrar).
	const liveStatus = $derived.by(() => {
		if (!isBusy) return null;
		const evs = agent.events as StreamEv[];
		let step = 0;
		let label = 'Entendiendo tu consulta…';
		for (const ev of evs) {
			if (ev.type === 'step.started') {
				step++;
				if (step > 1) label = 'Analizando resultados…';
			}
			if (ev.type === 'actions.requested') {
				const action = ((ev.data?.actions as any[]) ?? [])[0];
				if (action) {
					const name = action.name ?? action.toolName ?? action.tool ?? 'tool';
					label = friendlyToolLabel(name, action.input ?? action.arguments ?? {});
				}
			}
			if (ev.type === 'action.result') label = 'Analizando resultados…';
			if (ev.type === 'message.appended' || ev.type === 'message.completed') { label = 'Redactando respuesta…'; }
		}
		return { step: Math.max(1, step), label };
	});

	function fmtMs(ms: number): string {
		return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
	}

	// ── Inspector helpers (mismo contrato que / ) ──────────────────────────

	function fullToolPayload(value: unknown): string {
		if (value === null || value === undefined) return 'null';
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
		try { return JSON.stringify(redactSensitiveData(value), null, 2); } catch { return String(value); }
	}

	function indentBlock(text: string, pad = '  '): string {
		return text.split('\n').map((l) => pad + l).join('\n');
	}

	type StreamEv = { type: string; data?: Record<string, unknown> };

	const tokenTotals = $derived.by(() => {
		let input = 0, output = 0, total = 0;
		for (const ev of agent.events as StreamEv[]) {
			if (ev.type !== 'step.completed') continue;
			const u = ((ev.data?.usage ?? {}) as Record<string, number>);
			input += u.inputTokens ?? u.promptTokens ?? 0;
			output += u.outputTokens ?? u.completionTokens ?? 0;
			total += u.totalTokens ?? 0;
		}
		if (!total) total = input + output;
		return { input, output, total };
	});

	// Transcripción cronológica: fuente de verdad para read_page (sin screenshots)
	const traceText = $derived.by(() => {
		const lines: string[] = [];
		lines.push('# AGENT INSPECTOR');
		lines.push(`status: ${agent.status}`);
		lines.push(`events: ${agent.events.length} · messages: ${agent.data.messages.length}`);
		lines.push(`tokens: in=${tokenTotals.input} out=${tokenTotals.output} total=${tokenTotals.total}`);
		lines.push('');
		lines.push('## TRACE');
		for (const ev of agent.events as StreamEv[]) {
			const d = (ev as any).data ?? {};
			switch (ev.type) {
				case 'session.started':  lines.push('[session.started]'); break;
				case 'turn.started':     lines.push('[turn.started]'); break;
				case 'reasoning.completed': if (d.text) lines.push(`[reasoning] ${d.text}`); break;
				case 'message.completed':   if (d.content) lines.push(`[assistant] ${d.content}`); break;
				case 'actions.requested':
					for (const a of (d.actions ?? [])) {
						const name = a.name ?? a.toolName ?? a.tool ?? 'tool';
						lines.push(`[tool.call] ${name} input: ${fullToolPayload(a.input ?? a.arguments ?? {})}`);
					}
					break;
				case 'action.result': {
					const r = d.result;
					if (!r) { lines.push('[tool.result] (sin datos)'); break; }
					const name = r.toolName || r.name || 'tool';
					if (d.status === 'rejected') lines.push(`[tool.result] ${name} → RECHAZADO`);
					else if (d.error || r.isError) lines.push(`[tool.result] ${name} → ERROR\n${indentBlock(unwrapMcpOutput(d.error ?? r.output))}`);
					else lines.push(`[tool.result] ${name} → ${indentBlock(unwrapMcpOutput(r.output))}`);
					break;
				}
				case 'step.completed': lines.push(`[step.completed] finish=${d.finishReason}`); break;
				case 'turn.completed': lines.push('[turn.completed]'); break;
				case 'turn.failed':    lines.push(`[turn.failed] ${d.message}`); break;
				case 'input.requested': lines.push('[hitl.request]'); break;
				default: break;
			}
		}
		return lines.join('\n');
	});

	// ── DevTools table ──────────────────────────────────────────────────────

	type DevRow = { idx: number; t: number; delta: number; type: string; label: string; detail: string };

	const devRows = $derived.by(() => {
		const rows: DevRow[] = [];
		const evs = agent.events as StreamEv[];
		const t0 = evs.length ? eventTs(evs[0], 0) : 0;
		let prev = t0;
		evs.forEach((ev, idx) => {
			const ts = eventTs(ev, idx);
			const t = ts - t0;
			const delta = ts - prev;
			prev = ts;
			const d = (ev as any).data ?? {};

			let label = ev.type;
			let detail = '';

			if (ev.type === 'actions.requested') {
				const calls = (d.actions ?? []).map((a: any) => {
					const n = a.name ?? a.toolName ?? 'tool';
					return `${n}(${fullToolPayload(a.input ?? a.arguments ?? {}).replace(/\s+/g, ' ').slice(0, 60)})`;
				}).join(', ');
				label = `→ tool call`;
				detail = calls;
			} else if (ev.type === 'action.result') {
				const r = d.result ?? {};
				label = `← tool result`;
				detail = `▸ ${r.toolName ?? 'tool'} · ${unwrapMcpOutput(r.output).slice(0, 80)}`;
			} else if (ev.type === 'step.completed') {
				label = `step`;
				detail = `▸ finish=${d.finishReason} · tokens in=${(d.usage as any)?.inputTokens ?? 0} out=${(d.usage as any)?.outputTokens ?? 0}`;
			} else if (ev.type === 'message.appended') {
				label = 'message.appended';
				detail = String(d.delta ?? '').slice(0, 80);
			} else if (ev.type === 'message.completed') {
				label = 'message.completed';
				detail = `"${String(d.content ?? '').slice(0, 100)}"`;
			} else if (ev.type === 'session.started') {
				label = 'session'; detail = 'sesión iniciada';
			} else if (ev.type === 'turn.started') {
				label = 'turn'; detail = 'turno iniciado';
			} else if (ev.type === 'turn.completed') {
				label = 'turn'; detail = 'turno completado';
			}

			const filt = devFilter;
			if (filt === 'llm' && !['→ LLM input', '← LLM output', 'message.appended', 'message.completed', 'reasoning.completed'].includes(label)) return;
			if (filt === 'tool' && !['→ tool call', '← tool result'].includes(label)) return;
			if (filt === 'step' && !label.startsWith('step')) return;
			if (filt === 'flow' && !['session', 'turn'].includes(label)) return;

			rows.push({ idx, t, delta, type: ev.type, label, detail });
		});
		return rows;
	});

	function rowColor(type: string): string {
		if (type === 'actions.requested') return '#b45309';
		if (type === 'action.result') return '#15803d';
		if (type.startsWith('message')) return '#0369a1';
		if (type.startsWith('step')) return '#64748b';
		if (type.startsWith('turn') || type.startsWith('session')) return '#334155';
		return '#475569';
	}

	function toggleRow(idx: number) {
		const next = new Set(expandedRows);
		if (next.has(idx)) next.delete(idx); else next.add(idx);
		expandedRows = next;
	}

	async function copyTrace() {
		try { await navigator.clipboard.writeText(traceText); } catch { /* ok */ }
	}

	// ── form ────────────────────────────────────────────────────────────────

	async function submit() {
		const value = text.trim();
		if (!value || isBusy) return;
		text = '';
		await agent.send({ message: value });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void submit();
		}
	}
</script>

<div class="bg-background mx-auto flex h-full max-w-3xl flex-col">
	<!-- Header -->
	<div class="flex h-11 shrink-0 items-center justify-between px-4">
		<div class="flex items-center gap-2">
			<MessageSquare class="text-muted-foreground size-4" />
			<span class="text-sm font-medium">Chat IA</span>
		</div>
		<div class="flex items-center gap-0.5">
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class="size-7"
							aria-label="Reiniciar conversación"
							onclick={() => agent.reset()}
							disabled={isBusy}
						>
							<RotateCwIcon class="size-4" />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom"><p>Reiniciar</p></Tooltip.Content>
			</Tooltip.Root>
		</div>
	</div>
	<Separator />

	<MessageScroller.Provider>
		<div class="flex min-h-0 flex-1 flex-col">
			{#if messages.length === 0}
				<Empty.Root class="flex-1">
					<Empty.Header>
						<Empty.Media variant="icon">
							<MessageCircleDashedIcon />
						</Empty.Media>
						<Empty.Title>Chat IA</Empty.Title>
						<Empty.Description>¿En qué puedo ayudarte?</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<MessageScroller.Root class="flex-1">
					<MessageScroller.Viewport>
						<MessageScroller.Content aria-busy={isBusy} class="p-4">
							{#each messages as message (message.id)}
								<MessageAnimated {message} scrollAnchor={message.role === 'user'} />
							{/each}
						</MessageScroller.Content>
					</MessageScroller.Viewport>
					<MessageScroller.Button />
				</MessageScroller.Root>
			{/if}

			{#if liveStatus}
				<div class="flex min-h-7 items-center gap-2 px-4 pb-2 text-xs text-muted-foreground" aria-live="polite">
					<span class="inline-block size-2 animate-pulse rounded-full bg-blue-500"></span>
					<span class="font-medium text-foreground/80">{liveStatus.label}</span>
					<span class="tabular-nums text-muted-foreground/70">{Math.max(1, Math.ceil(elapsedMs / 1000))} s</span>
				</div>
			{/if}

			<!-- Input -->
			<div class="shrink-0 border-t p-3">
				<form onsubmit={(event) => { event.preventDefault(); void submit(); }}>
					<InputGroup.Root>
						<InputGroup.Textarea
							bind:value={text}
							placeholder="Escribe tu mensaje…"
							rows={2}
							onkeydown={onKeydown}
						/>
						<InputGroup.Addon align="block-end" class="pt-1">
							{#if isBusy}
								<InputGroup.Button
									type="button"
									variant="outline"
									size="icon-sm"
									class="ml-auto"
									aria-label="Detener"
									onclick={() => agent.stop()}
								>
									<SquareIcon />
								</InputGroup.Button>
							{:else}
								<InputGroup.Button
									type="submit"
									variant="default"
									size="icon-sm"
									disabled={!text.trim()}
									class="ml-auto"
								>
									<ArrowUpIcon />
									<span class="sr-only">Enviar</span>
								</InputGroup.Button>
							{/if}
						</InputGroup.Addon>
					</InputGroup.Root>
				</form>
			</div>
		</div>
	</MessageScroller.Provider>

	<!-- ── Debug Panel ──────────────────────────────────────────────────── -->
	<div class="shrink-0 border-t bg-slate-950 text-slate-300">
		<!-- Toggle bar -->
		<button
			class="flex w-full items-center justify-between px-3 py-1.5 text-xs font-mono hover:bg-slate-900"
			onclick={() => (showDebug = !showDebug)}
		>
			<span class="flex items-center gap-2">
				{#if showDebug}<ChevronDownIcon class="size-3" />{:else}<ChevronUpIcon class="size-3" />{/if}
				<span>▼ DevTools</span>
			</span>
			<span class="text-slate-500">
				{agent.events.length} / {agent.events.length} eventos · {tokenTotals.total} tok
			</span>
		</button>

		<!-- Inspector text: siempre en DOM para read_page (accessibility snapshot) -->
		<div role="region" aria-label="Agent inspector">
			<div class="px-3 pb-1 text-xs font-mono text-slate-400" style="display:{showDebug ? 'block' : 'none'}">
				<div class="flex items-center justify-between py-1">
					<span class="text-slate-500">status: {agent.status} · {agent.events.length} eventos · {tokenTotals.total} tokens</span>
					<button class="flex items-center gap-1 text-slate-500 hover:text-slate-200" onclick={copyTrace}>
						<CopyIcon class="size-3" />Copiar
					</button>
				</div>
			</div>
			<!-- pre siempre renderizado pero oculto visualmente: accesible via read_page -->
			<pre
				aria-label="Inspector (texto plano · sin screenshots)"
				class="sr-only"
				style="position:absolute;left:-9999px;white-space:pre-wrap"
			>{traceText}</pre>
		</div>

		{#if showDebug}
			<!-- Filter tabs -->
			<div class="flex gap-0 border-b border-slate-800 px-2">
				{#each (['all', 'llm', 'tool', 'step', 'flow'] as const) as f}
					<button
						class="px-2 py-1 text-xs font-mono {devFilter === f ? 'border-b border-blue-400 text-blue-300' : 'text-slate-500 hover:text-slate-300'}"
						onclick={() => (devFilter = f)}
					>{f}</button>
				{/each}
				<span class="ml-auto px-2 py-1 text-xs text-slate-600">{devRows.length} / {agent.events.length} eventos · {tokenTotals.total} tok</span>
			</div>

			<!-- Diagnóstico agregado -->
			<div class="flex flex-col gap-2 border-b border-slate-800 px-3 py-2">
				<div class="flex flex-wrap gap-1.5 font-mono text-xs">
					{#each [
						{ v: fmtMs(diagnostics.turnMs), l: 'turno', c: 'text-slate-200' },
						{ v: String(diagnostics.steps), l: 'steps', c: 'text-slate-200' },
						{ v: fmtMs(diagnostics.modelTime), l: 'modelo*', c: 'text-sky-300' },
						{ v: diagnostics.toolCalls > 0 && diagnostics.toolTime === 0 ? 'n/d' : fmtMs(diagnostics.toolTime), l: 'tools', c: 'text-amber-300' },
						{ v: diagnostics.tokPerSec.toFixed(0), l: 'tok/s ef.', c: 'text-slate-200' },
						{ v: String(diagnostics.outputTok), l: 'out tok', c: 'text-slate-200' },
						{ v: `${(diagnostics.cacheHit * 100).toFixed(0)}%`, l: 'cache hit', c: diagnostics.cacheHit > 0.3 ? 'text-green-400' : 'text-red-400' },
						{ v: `${diagnostics.cacheRead}/${diagnostics.cacheWrite}`, l: 'cache r/w', c: 'text-slate-200' }
					] as m}
						<span class="flex flex-col items-center rounded border border-slate-800 bg-slate-900 px-2 py-1">
							<b class="{m.c} font-semibold">{m.v}</b>
							<i class="text-[0.6rem] uppercase not-italic text-slate-500">{m.l}</i>
						</span>
					{/each}
				</div>
				{#if diagnostics.modelTime + diagnostics.toolTime > 0}
					<div class="flex h-1.5 overflow-hidden rounded bg-slate-900" title="modelo (azul) vs tools (ámbar)">
						<span class="bg-sky-600" style="flex:{diagnostics.modelTime || 1}"></span>
						<span class="bg-amber-600" style="flex:{diagnostics.toolTime || 0.0001}"></span>
					</div>
				{/if}
				{#if diagnostics.warnings.length}
					<div class="flex flex-col gap-1">
						{#each diagnostics.warnings as w}
							<div class="rounded border-l-2 px-2 py-1 text-xs {w.level === 'error' ? 'border-red-600 bg-red-950/40 text-red-300' : w.level === 'warn' ? 'border-amber-600 bg-amber-950/40 text-amber-300' : 'border-sky-600 bg-sky-950/40 text-sky-300'}">
								{w.level === 'error' ? '⛔' : w.level === 'warn' ? '⚠️' : 'ℹ️'} {w.msg}
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded border-l-2 border-green-600 bg-green-950/40 px-2 py-1 text-xs text-green-300">✅ Sin anti-patrones detectados</div>
				{/if}
			</div>

			<!-- Events table -->
			<div class="max-h-64 overflow-y-auto font-mono text-xs">
				<table class="w-full border-collapse">
					<thead class="sticky top-0 bg-slate-950">
						<tr class="text-slate-600">
							<td class="w-14 px-2 py-0.5">t</td>
							<td class="w-12 px-1 py-0.5">Δ</td>
							<td class="w-20 px-1 py-0.5">tipo</td>
							<td class="px-1 py-0.5">detalle</td>
						</tr>
					</thead>
					<tbody>
						{#if devRows.length === 0}
							<tr><td colspan="4" class="px-2 py-2 text-slate-600">Sin eventos. Envía un mensaje para ver el flujo.</td></tr>
						{/if}
						{#each devRows as row (row.idx)}
							<tr
								class="cursor-pointer border-b border-slate-900 hover:bg-slate-900"
								onclick={() => toggleRow(row.idx)}
							>
								<td class="px-2 py-0.5 text-slate-500">{row.t < 1000 ? `${row.t}ms` : `${(row.t/1000).toFixed(2)}s`}</td>
								<td class="px-1 py-0.5 text-slate-600">+{row.delta < 1000 ? `${row.delta}ms` : `${(row.delta/1000).toFixed(2)}s`}</td>
								<td class="px-1 py-0.5" style="color:{rowColor(row.type)}">{row.label}</td>
								<td class="max-w-xs truncate px-1 py-0.5 text-slate-400">{row.detail}</td>
							</tr>
							{#if expandedRows.has(row.idx)}
								<tr class="bg-slate-900">
									<td colspan="4" class="px-4 py-2">
										<pre class="whitespace-pre-wrap text-slate-300 text-xs">{fullToolPayload((agent.events[row.idx] as any)?.data)}</pre>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
