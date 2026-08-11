<script lang="ts">
	import { useEveAgent } from 'eve/svelte';
	import { computeDiagnostics, detectMcpError, formatDiagnosticsSummary, friendlyToolLabel, redactSensitiveData, unwrapMcpOutput } from '$lib/lib/agent-diagnostics';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Attachment from '$lib/components/ui/attachment/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Marker from '$lib/components/ui/marker/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import * as MessageScroller from '$lib/components/ui/message-scroller/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Queue from '$lib/components/ai-elements/queue/index.js';
	import * as Reasoning from '$lib/components/ai-elements/reasoning/index.js';
	import * as Tool from '$lib/components/ai-elements/tool/index.js';
	import MessageAnimated from '$lib/components/message-animated.svelte';
	import MessageParts from '$lib/components/ai-elements/message-parts.svelte';
	import { watch } from 'runed';
	import type { UserContent } from 'ai';
	import type { InputResponse } from 'eve/client';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import MessageCircleDashedIcon from '@lucide/svelte/icons/message-circle-dashed';
	import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
	import SquareIcon from '@lucide/svelte/icons/square';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import FileWarningIcon from '@lucide/svelte/icons/file-warning';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import XIcon from '@lucide/svelte/icons/x';

	// Props de rehidratación: al abrir una sesión pasada desde el sidebar, el
	// shell (+page.svelte) carga { session, events } vía GET /api/sessions/[id]
	// y los pasa aquí. Sin ellos, useEveAgent() arranca una sesión nueva vacía.
	// `onSessionId`/`onStatusChange` notifican al shell en vivo (sesión asignada
	// / si está respondiendo ahora) para que el sidebar no dependa solo del
	// polling del índice server-side.
	//
	// `recovered`: la sesión se reconstruyó desde nuestro propio espejo SQLite
	// porque Eve ya perdió su estado en vivo (p. ej. tras `rm -rf .eve`). NO
	// bloquea el input: el servidor ya omite el `sessionId` muerto en ese caso,
	// así que el próximo `agent.send()` simplemente abre una sesión física
	// nueva en Eve — y le adjuntamos el historial previo como `clientContext`
	// del primer mensaje para que el modelo continúe con naturalidad.
	interface Props {
		initialSession?: unknown;
		initialEvents?: unknown[];
		recovered?: boolean;
		onSessionId?: (id: string) => void;
		onStatusChange?: (id: string, busy: boolean) => void;
	}
	let { initialSession = undefined, initialEvents = undefined, recovered = false, onSessionId, onStatusChange }: Props = $props();
	// Solo se adjunta el historial recuperado una vez: a partir de ahí la nueva
	// sesión física de Eve ya construye su propio historial persistido.
	let recoveryContextSent = $state(false);

	// svelte-ignore state_referenced_locally — seed intencional: props "seed", solo se leen al montar
	// svelte-ignore state_referenced_locally — seed intencional: props "seed", solo se leen al montar
	const agent = useEveAgent({
		initialSession: initialSession as never,
		initialEvents: initialEvents as never,
		onSessionChange: (session) => {
			const id = (session as { sessionId?: string } | undefined)?.sessionId;
			if (id) onSessionId?.(id);
		},
	});

	function currentSessionId(): string | undefined {
		const s = (agent.session ?? {}) as { sessionId?: string; id?: string };
		return s.sessionId ?? s.id;
	}

	// Persiste las respuestas HITL en el servidor (tabla `input_responses` de
	// session-store). El reducer marca la gate como respondida con el evento
	// LOCAL `client.input.responded` — que nunca llega al stream de Eve — así
	// que sin persistirlas aparte, al reabrir la sesión las preguntas vuelven a
	// "approval-requested" (aparecen sin responder). Este POST corre en
	// paralelo con `agent.send({ inputResponses })` (fire-and-forget).
	function persistInputResponses(responses: InputResponse[]) {
		const id = currentSessionId();
		if (!id || responses.length === 0) return;
		void fetch(`/api/sessions/${encodeURIComponent(id)}/input-response`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ responses }),
		}).catch(() => {
			// silencioso: el turno sigue aunque falle la persistencia
		});
	}

	let text = $state('');

	// Adjuntos del composer: archivos locales (dataURL) que se envían como parts
	// `file` de UserContent. Sin subida: FileReader → dataURL → agent.send.
	type ComposerFile = { id: string; name: string; mediaType: string; data: string };
	let composerFiles = $state<ComposerFile[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);

	function addComposerFiles(list: FileList | File[]) {
		for (const file of Array.from(list)) {
			if (composerFiles.some((f) => f.name === file.name && f.mediaType === file.type)) continue;
			const reader = new FileReader();
			reader.onload = () => {
				composerFiles = [
					...composerFiles,
					{ id: crypto.randomUUID(), name: file.name, mediaType: file.type, data: String(reader.result) },
				];
			};
			reader.readAsDataURL(file);
		}
	}

	function removeComposerFile(id: string) {
		composerFiles = composerFiles.filter((f) => f.id !== id);
	}

	function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files?.length) addComposerFiles(input.files);
		input.value = '';
	}

	function onComposerPaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		if (!items) return;
		const files: File[] = [];
		for (const item of Array.from(items)) {
			if (item.kind === 'file') {
				const file = item.getAsFile();
				if (file) files.push(file);
			}
		}
		if (files.length) {
			event.preventDefault();
			addComposerFiles(files);
		}
	}

	let showDebug = $state(false);
	let devFilter = $state<'all' | 'llm' | 'tool' | 'step' | 'flow'>('all');
	let expandedRows = $state(new Set<number>());

	const messages = $derived(agent.data.messages);
	const isBusy = $derived(agent.status === 'submitted' || agent.status === 'streaming');
	let elapsedMs = $state(0);

	// Dot de estado del header (patrón de la referencia de Eve): verde pulsante
	// cuando el agente trabaja, neutral en ready, rojo en error.
	const statusDot = $derived.by(() => {
		const s = agent.status;
		if (s === 'submitted' || s === 'streaming') return { live: true, tone: 'bg-emerald-500' };
		if (s === 'error') return { live: false, tone: 'bg-destructive' };
		return { live: false, tone: s === 'ready' ? 'bg-muted-foreground' : 'bg-muted-foreground/50' };
	});

	// ── Feed de actividad POR TURNO (tool calls + razonamiento) ────────────
	// Se reconstruye desde los eventos del stream (append-only, en orden) y se
	// agrupa por turnId: cada mensaje assistant de la conversación (histórico o
	// en vivo) puede mostrar las actividades de SU turno. Antes esto se
	// reseteaba en cada `turn.started` y solo se renderizaba en el último
	// mensaje — al reabrir una sesión con varios turnos, los tool calls y el
	// razonamiento de los turnos anteriores desaparecían.
	//   - `actions.requested`/`action.result` → tool calls con estado.
	//   - `reasoning.appended`/`reasoning.completed` → bloques de razonamiento
	//     que se van agregando (uno por segmento) con texto en vivo.
	type ActivityToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
	type Activity =
		| { kind: 'reasoning'; key: string; text: string; streaming: boolean }
		| {
				kind: 'tool';
				key: string;
				name: string;
				state: ActivityToolState;
				input: unknown;
				output: unknown;
				errorText?: string;
		  };

	const activitiesByTurn = $derived.by((): Map<string, Activity[]> => {
		const evs = agent.events as readonly StreamEv[];
		const byTurn = new Map<string, Activity[]>();
		let cur: Activity[] = [];
		let reasoningSeq = 0;
		let toolSeq = 0;
		let openReasoning = -1;
		for (const ev of evs) {
			const d = (ev.data ?? {}) as Record<string, unknown>;
			if (ev.type === 'turn.started') {
				cur = [];
				byTurn.set(String(d?.turnId ?? `turn_${byTurn.size}`), cur);
				reasoningSeq = 0;
				toolSeq = 0;
				openReasoning = -1;
			} else if (ev.type === 'reasoning.appended') {
				if (openReasoning === -1) {
					openReasoning = cur.length;
					cur.push({ kind: 'reasoning', key: `r${reasoningSeq++}`, text: '', streaming: true });
				}
				const item = cur[openReasoning];
				if (item.kind === 'reasoning') {
					const soFar = d?.reasoningSoFar;
					const delta = d?.reasoningDelta;
					item.text =
						typeof soFar === 'string'
							? soFar
							: item.text + (typeof delta === 'string' ? delta : '');
					item.streaming = true;
				}
			} else if (ev.type === 'reasoning.completed') {
				if (openReasoning === -1) {
					openReasoning = cur.length;
					cur.push({ kind: 'reasoning', key: `r${reasoningSeq++}`, text: '', streaming: false });
				}
				const item = cur[openReasoning];
				if (item.kind === 'reasoning') {
					const full = d?.reasoning;
					if (typeof full === 'string') item.text = full;
					item.streaming = false;
				}
				openReasoning = -1;
			} else if (ev.type === 'actions.requested') {
				const actions = (d?.actions as unknown[]) ?? [];
				for (const a of actions) {
					const rec = (a ?? {}) as Record<string, unknown>;
					const name = String(rec?.name ?? rec?.toolName ?? rec?.tool ?? 'tool');
					cur.push({
						kind: 'tool',
						key: `t${toolSeq++}`,
						name,
						state: 'input-available',
						input: rec?.input ?? rec?.arguments,
						output: undefined,
					});
				}
			} else if (ev.type === 'action.result') {
				const r = (d?.result ?? {}) as Record<string, unknown>;
				const name = String(r?.toolName ?? r?.name ?? '');
				for (let i = cur.length - 1; i >= 0; i--) {
					const it = cur[i];
					if (
						it.kind === 'tool' &&
						it.name === name &&
						(it.state === 'input-available' || it.state === 'input-streaming')
					) {
						const output = r?.output;
						const isError = !!r?.isError;
						it.output = output;
						// DAB/MCP devuelven los errores como resultado "exitoso" con
						// `{ error: … }` embebido (isError=false). detectMcpError lo detecta.
						const errText = detectMcpError(output);
						if (isError || errText) {
							it.state = 'output-error';
							it.errorText = errText ?? (typeof output === 'string' ? output : JSON.stringify(output ?? {}));
						} else {
							it.state = 'output-available';
						}
						break;
					}
				}
			}
		}
		return byTurn;
	});

	// Actividades del turno de un mensaje assistant. Los `message.id` del store
	// vienen como `<turnId>:assistant` (verificado: `turn_0:assistant`), así que
	// el turnId se extrae de la parte anterior al `:`.
	function activitiesOf(message: { id: string }): Activity[] {
		const id = String(message?.id ?? '');
		const turnId = id.includes(':') ? id.split(':')[0] : id;
		return activitiesByTurn.get(turnId) ?? [];
	}

	// Actividades del turno ACTIVO (el último) — para el autoscroll en vivo.
	const liveActivities = $derived.by((): Activity[] => {
		let last: Activity[] = [];
		for (const arr of activitiesByTurn.values()) last = arr;
		return last;
	});

	// Autoscroll del viewport: al crecer el feed (nuevo bloque/tool o razonamiento
	// en vivo), baja el scroll para ir viendo lo que se va escribiendo. Reacciona
	// al feed vía `watch` (runed) con deps explícitas — sin `$effect`.
	let prevActCount = 0;
	watch([() => liveActivities], () => {
		const count = liveActivities.length;
		const live = liveActivities.some((a) => a.kind === 'reasoning' && a.streaming);
		if (count !== prevActCount || live) {
			const viewport = document.querySelector(
				'[data-slot="message-scroller-viewport"]',
			) as HTMLElement | null;
			if (viewport) viewport.scrollTop = viewport.scrollHeight;
		}
		prevActCount = count;
	});

	watch([() => isBusy], ([busy]) => {
		const id = currentSessionId();
		if (id) onStatusChange?.(id, busy);
		if (!busy) {
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
	watch([() => agent.events.length], () => {
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
	const diagnostics = $derived(computeDiagnostics(agent.events as readonly StreamEv[], eventTs));

	// ── Trace store (self-improvement) ─────────────────────────────────────
	// Al terminar cada turno (turn.completed/turn.failed) persiste un resumen de
	// la trayectoria vía POST /api/traces (JSONL en .eve/traces.jsonl) para
	// minería offline y tendencias. El inspector muestra la tendencia reciente.
	type TraceToolRec = { name: string; state: string; inputKey: string; outputLen: number };

	function collectTraceTools(evs: readonly StreamEv[]): TraceToolRec[] {
		// ⚠️ Blindado: nunca debe lanzar al procesar un error de tool (un throw
		// aquí rompería el render del feed y podría disparar un reload de Vite).
		try {
			const out: TraceToolRec[] = [];
			for (const ev of evs) {
				if (ev.type === 'actions.requested') {
					for (const a of (ev.data?.actions as unknown[]) ?? []) {
						const rec = (a ?? {}) as Record<string, unknown>;
						const name = String(rec?.name ?? rec?.toolName ?? rec?.tool ?? 'tool');
						const input = rec?.input ?? rec?.arguments ?? {};
						out.push({ name, state: 'input-available', inputKey: `${name}:${JSON.stringify(input)}`, outputLen: 0 });
					}
				} else if (ev.type === 'action.result') {
					const r = (ev.data?.result ?? {}) as Record<string, unknown>;
					const name = String(r?.toolName ?? r?.name ?? '');
					const output = r?.output;
					const len = typeof output === 'string' ? output.length : JSON.stringify(output ?? '').length;
					for (let i = out.length - 1; i >= 0; i--) {
						const it = out[i];
						if (it.name === name && it.state === 'input-available') {
							it.outputLen = len;
							it.state = r?.isError || detectMcpError(output) ? 'output-error' : 'output-available';
							break;
						}
					}
				}
			}
			return out;
		} catch {
			return [];
		}
	}

	let trendText = $state('');
	async function refreshTrend() {
		try {
			const res = await fetch('/api/traces?limit=50');
			const body = (await res.json()) as { trend?: { count: number; avgTurnMs: number; avgSteps: number; avgCalls: number; avgInputTok: number; avgCacheHit: number; totalErrors: number } };
			const tr = body?.trend;
			if (!tr) { trendText = ''; return; }
			trendText =
				`turnos=${tr.count} · avg ${(tr.avgTurnMs / 1000).toFixed(0)}s · ${tr.avgSteps.toFixed(1)} steps · ` +
				`${tr.avgCalls.toFixed(1)} calls · ${Math.round(tr.avgInputTok / 1000)}k tok · ` +
				`cache ${(tr.avgCacheHit * 100).toFixed(0)}% · errores=${tr.totalErrors}`;
		} catch {
			trendText = '';
		}
	}
	void refreshTrend();

	let lastTraceTurn = 0;
	watch([() => agent.events.length], () => {
		// ⚠️ Blindado: un throw aquí (shape de evento inesperado) rompería el
		// watch y podría causar un reload de la página al fallar un tool.
		try {
			const evs = agent.events as readonly StreamEv[];
			const last = evs[evs.length - 1];
			if (!last || (last.type !== 'turn.completed' && last.type !== 'turn.failed')) return;
			let turn = 0;
			for (const ev of evs) if (ev.type === 'turn.started') turn++;
			if (turn === lastTraceTurn) return;
			lastTraceTurn = turn;
			const d = computeDiagnostics(evs, eventTs);
			const session = (agent.session ?? {}) as unknown as Record<string, unknown>;
			const rec = {
				sessionId: String(session?.sessionId ?? session?.id ?? 'unknown'),
				turn,
				at: new Date().toISOString(),
				turnMs: d.turnMs,
				steps: d.steps,
				toolCalls: d.toolCalls,
				inputTok: d.inputTok,
				outputTok: d.outputTok,
				cacheRead: d.cacheRead,
				cacheHit: d.cacheHit,
				errors: d.warnings.filter((w) => w.level === 'error').length,
				warnings: d.warnings.length,
				status: String(last.type),
				tools: collectTraceTools(evs),
			};
			void fetch('/api/traces', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(rec),
			}).finally(() => void refreshTrend());
		} catch {
			// nunca romper la UI por el trace store
		}
	});

	// ── Todo widget (tool framework `todo`) ─────────────────────────────────
	// Solo puede existir una lista a la vez: el tool siempre reemplaza el
	// arreglo completo, así que basta con leer el último `action.result`.
	type TodoItem = { content: string; priority: 'high' | 'medium' | 'low'; status: 'pending' | 'in_progress' | 'completed' | 'cancelled' };
	type TodoOutput = { counts: { pending: number; in_progress: number; completed: number; cancelled: number; total: number }; todos: TodoItem[] };

	let todoOpen = $state(true);

	const todoState = $derived.by((): TodoOutput | null => {
		const evs = agent.events as readonly StreamEv[];
		for (let i = evs.length - 1; i >= 0; i--) {
			const ev = evs[i];
			if (ev.type !== 'action.result') continue;
			const r = (ev.data?.result ?? {}) as any;
			if ((r.toolName ?? r.name) !== 'todo') continue;
			let output = r.output;
			if (typeof output === 'string') {
				try { output = JSON.parse(output); } catch { return null; }
			}
			if (output && Array.isArray(output.todos)) return output as TodoOutput;
			return null;
		}
		return null;
	});

	// Se limpia sola cuando ya no quedan tareas pendientes/en curso.
	const todoActive = $derived(!!todoState && (todoState.counts.pending > 0 || todoState.counts.in_progress > 0));

	// Estado en vivo: qué está haciendo el agente AHORA (mejora la UX percibida
	// durante los ~segundos de generación/tool en que no hay texto que mostrar).
	const liveStatus = $derived.by(() => {
		if (!isBusy) return null;
		const evs = agent.events as readonly StreamEv[];
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

	// Marker en el transcript: se muestra mientras el agente trabaja pero aún
	// no hay texto del asistente (fase pendiente o procesando tools). Desaparece
	// en cuanto empieza a fluir la respuesta.
	const showLiveMarker = $derived(
		isBusy &&
			liveStatus !== null &&
			messages.length > 0 &&
			(() => {
				const last = messages[messages.length - 1];
				return last.role === 'user' || messageText(last).trim() === '';
			})()
	);

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

	// ⚠️ Límites del inspector: con turnos largos (miles de eventos, tool results
	// de cientos de KB) el <pre> crecía sin tope, bloqueando el hilo del navegador
	// hasta abortar el stream SSE (ERR_ABORTED). Ventana deslizante + truncado.
	const MAX_TRACE_EVENTS = 300;
	const MAX_TRACE_BLOCK_CHARS = 2000;
	function traceBlock(text: string): string {
		return text.length > MAX_TRACE_BLOCK_CHARS
			? `${text.slice(0, MAX_TRACE_BLOCK_CHARS)}\n… [truncado ${text.length - MAX_TRACE_BLOCK_CHARS} chars]`
			: text;
	}

	type StreamEv = { type: string; data?: Record<string, unknown> };

	const tokenTotals = $derived.by(() => {
		let input = 0, output = 0, total = 0;
		for (const ev of agent.events as readonly StreamEv[]) {
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
		if (trendText) lines.push(`trend: ${trendText}`);
		lines.push('');
		lines.push(formatDiagnosticsSummary(diagnostics));
		lines.push('');
		lines.push('## TRACE');
		const events = (agent.events as readonly StreamEv[]).slice(-MAX_TRACE_EVENTS);
		for (const ev of events) {
			const d = (ev as any).data ?? {};
			switch (ev.type) {
				case 'session.started':  lines.push('[session.started]'); break;
				case 'turn.started':     lines.push('[turn.started]'); break;
				case 'reasoning.completed': if (d.text) lines.push(`[reasoning] ${traceBlock(String(d.text))}`); break;
				case 'message.completed':   if (d.content) lines.push(`[assistant] ${traceBlock(String(d.content))}`); break;
				case 'actions.requested':
					for (const a of (d.actions ?? [])) {
						const name = a.name ?? a.toolName ?? a.tool ?? 'tool';
						lines.push(`[tool.call] ${name} input: ${traceBlock(fullToolPayload(a.input ?? a.arguments ?? {}))}`);
					}
					break;
				case 'action.result': {
					const r = d.result;
					if (!r) { lines.push('[tool.result] (sin datos)'); break; }
					const name = r.toolName || r.name || 'tool';
					const errText = detectMcpError(r.output);
					if (d.status === 'rejected') lines.push(`[tool.result] ${name} → RECHAZADO`);
					else if (d.error || r.isError || errText) lines.push(`[tool.result] ${name} → ERROR\n${indentBlock(traceBlock(errText ?? unwrapMcpOutput(d.error ?? r.output)))}`);
					else lines.push(`[tool.result] ${name} → ${indentBlock(traceBlock(unwrapMcpOutput(r.output)))}`);
					break;
				}
				case 'step.completed': lines.push(`[step.completed] finish=${d.finishReason}`); break;
				case 'turn.completed': lines.push('[turn.completed]'); break;
				case 'turn.failed':    lines.push(`[turn.failed] ${d.message}`); break;
				case 'input.requested': {
					const reqs = (d.requests ?? []) as Record<string, unknown>[];
					for (const req of reqs) {
						const kind = req.kind ?? '?';
						const prompt = String(req.prompt ?? '');
						const opts = ((req.options as { label?: string }[]) ?? [])
							.map((o) => o.label ?? '')
							.join(' | ');
						lines.push(`[hitl.request] kind=${kind} id=${req.requestId ?? ''} prompt=${traceBlock(prompt)}`);
						if (opts) lines.push(`  options: ${traceBlock(opts)}`);
					}
					if (!reqs.length) lines.push('[hitl.request]');
					break;
				}
				default: break;
			}
		}
		// Parts HITL del último mensaje assistant: dynamic-tool con input request
		// (pregunta del agente). El transcript los renderiza vía MessageParts;
		// aquí quedan inspeccionables para la meta-fábrica (estado, prompt,
		// opciones y respuesta si la hubo).
		const lastAssistant = agent.data.messages
			.filter((m) => m.role === 'assistant')
			.at(-1);
		if (lastAssistant) {
			for (const part of lastAssistant.parts) {
				if (part.type !== 'dynamic-tool') continue;
				const req = part.toolMetadata?.eve?.inputRequest;
				if (!req) continue;
				const res = part.toolMetadata?.eve?.inputResponse;
				lines.push(`[hitl.part] ${part.toolName} state=${part.state} requestId=${req.requestId}`);
				lines.push(`  prompt: ${traceBlock(req.prompt)}`);
				lines.push(
					`  options: ${(req.options ?? []).map((o) => o.label).join(' | ') || '—'}${req.allowFreeform ? ' · libre' : ''}`
				);
				if (res) lines.push(`  response: ${res.optionId ?? res.text ?? '—'}`);
			}
		}
		return lines.join('\n');
	});

	// ── DevTools table ──────────────────────────────────────────────────────

	type DevRow = { idx: number; t: number; delta: number; type: string; label: string; detail: string };

	const devRows = $derived.by(() => {
		const rows: DevRow[] = [];
		const evs = agent.events as readonly StreamEv[];
		const t0 = evs.length ? eventTs(evs[0], 0) : 0;
		let prev = t0;
		// Ventana deslizante: evita miles de filas DOM (turnos con >8k eventos
		// bloqueaban el hilo). Los idx reales se conservan para expandir payloads.
		const off = Math.max(0, evs.length - MAX_TRACE_EVENTS);
		evs.slice(off).forEach((ev, i) => {
			const idx = off + i;
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

	async function copyToClipboard(text: string) {
		try { await navigator.clipboard.writeText(text); } catch { /* ok */ }
	}

	// Resumen compacto de un tool output para el chip de evidencia (Attachment):
	// "34 filas · 2.1 KB" cuando es JSON con arreglo, o solo el tamaño en KB.
	function summarizeToolOutput(output: unknown): string {
		try {
			const text = unwrapMcpOutput(output).trim();
			let rows: number | null = null;
			try {
				const parsed = JSON.parse(text);
				const arr = Array.isArray(parsed)
					? parsed
					: (parsed as Record<string, unknown> | null)?.result;
				if (Array.isArray(arr)) rows = arr.length;
				else if (parsed && typeof parsed === 'object') {
					const v = (parsed as Record<string, unknown>).value;
					if (Array.isArray(v)) rows = v.length;
				}
			} catch { /* no es JSON */ }
			const kb = (text.length / 1024).toFixed(1);
			if (rows !== null) return `${rows} ${rows === 1 ? 'fila' : 'filas'} · ${kb} KB`;
			return `${kb} KB`;
		} catch {
			return 'Resultado';
		}
	}

	// Chips de evidencia: un Attachment por tool call del turno activo.
	// Solo se muestran para tools que tocan datos del ERP (read/aggregate/search);
	// las internas (load_skill, query_company_twin, memory…) NO generan chip,
	// para no exponer outputs internos ni añadir ruido.
	function isDataEvidenceTool(name: string): boolean {
		return /read_records|aggregate_records|buscar_registro/.test(name);
	}

	const evidenceAttachments = $derived.by(() => {
		const out: Array<{
			key: string;
			title: string;
			description: string;
			state: 'done' | 'error' | 'processing';
			raw: string;
		}> = [];
		for (const act of liveActivities) {
			if (act.kind !== 'tool') continue;
			if (!isDataEvidenceTool(act.name)) continue;
			const label = friendlyToolLabel(act.name, act.input as Record<string, unknown>);
			if (act.state === 'output-available') {
				out.push({
					key: `ev-${act.key}`,
					title: label,
					description: summarizeToolOutput(act.output),
					state: 'done',
					raw: unwrapMcpOutput(act.output),
				});
			} else if (act.state === 'output-error') {
				out.push({
					key: `ev-${act.key}`,
					title: label,
					description: act.errorText ?? 'Error',
					state: 'error',
					raw: act.errorText ?? '',
				});
			} else if (act.state === 'input-available' || act.state === 'input-streaming') {
				out.push({
					key: `ev-${act.key}`,
					title: label,
					description: 'Ejecutando…',
					state: 'processing',
					raw: '',
				});
			}
		}
		return out;
	});

	// ── form ────────────────────────────────────────────────────────────────

	function messageText(m: { text?: string; parts?: ReadonlyArray<{ type: string; text?: string }> }): string {
		if (m.parts) {
			return m.parts
				.filter((p) => p.type === 'text' && typeof p.text === 'string')
				.map((p) => p.text)
				.join('\n');
		}
		return typeof m.text === 'string' ? m.text : '';
	}

	const MAX_RECOVERY_CONTEXT_CHARS = 8_000;

	// Transcript compacto (usuario/asistente, sin tool calls ni razonamiento)
	// del historial recuperado, para dárselo al modelo como contexto efímero
	// (`clientContext`: no se persiste, solo aplica a esta llamada) del primer
	// mensaje tras recuperar la sesión — así responde con continuidad real.
	function buildRecoveryContext(): string {
		const transcript = messages
			.map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${messageText(m)}`.trim())
			.filter((line) => line.length > 0)
			.join('\n\n');
		const trimmed =
			transcript.length > MAX_RECOVERY_CONTEXT_CHARS
				? `…${transcript.slice(-MAX_RECOVERY_CONTEXT_CHARS)}`
				: transcript;
		return (
			'Esta conversación se recuperó desde el registro persistente porque se perdió el estado ' +
			'en vivo (p. ej. una purga de caché). Continúa con naturalidad, como si no se hubiera ' +
			`interrumpido. Historial previo:\n\n${trimmed}`
		);
	}

	async function submit() {
		const value = text.trim();
		if ((!value && composerFiles.length === 0) || isBusy) return;
		text = '';
		const files = composerFiles;
		composerFiles = [];
		const needsRecoveryContext = recovered && !recoveryContextSent;
		if (needsRecoveryContext) recoveryContextSent = true;
		const clientContext = needsRecoveryContext ? { clientContext: buildRecoveryContext() } : {};
		if (files.length === 0) {
			await agent.send({ message: value, ...clientContext });
			return;
		}
		const parts: UserContent = [];
		if (value) parts.push({ text: value, type: 'text' });
		for (const f of files) {
			parts.push({ data: f.data, filename: f.name, mediaType: f.mediaType, type: 'file' });
		}
		await agent.send({ message: parts, ...clientContext });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void submit();
		}
	}
</script>

<div class="bg-background flex h-full w-full flex-col">
	<!-- Header -->
	<div class="flex h-11 shrink-0 items-center justify-between px-4">
		<div class="flex items-center gap-2">
			<MessageSquare class="text-muted-foreground size-4" />
			<span class="text-sm font-medium">Chat IA</span>
			<span class="relative flex size-2" aria-hidden="true">
				{#if statusDot.live}
					<span
						class="absolute inline-flex size-full animate-ping rounded-full opacity-75 {statusDot.tone}"
					></span>
				{/if}
				<span class="relative inline-flex size-2 rounded-full transition-colors {statusDot.tone}"></span>
			</span>
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
							{#if recovered && !recoveryContextSent}
								<MessageScroller.Item messageId="recovered-separator">
									<Marker.Root variant="separator" role="status">
										<Marker.Content>Conversación recuperada</Marker.Content>
									</Marker.Root>
								</MessageScroller.Item>
							{/if}
							{#each messages as message, i (message.id)}
								{#if message.role === 'assistant'}
									{@const turnActivities = activitiesOf(message)}
									{#if turnActivities.length > 0 || (i === messages.length - 1 && evidenceAttachments.length > 0)}
										<div class="space-y-2 pb-2">
											{#each turnActivities as act (act.key)}
												{#if act.kind === 'tool'}
													<Tool.Tool status={act.state}>
														<Tool.ToolHeader type={friendlyToolLabel(act.name, act.input as Record<string, unknown>)} state={act.state} />
														<Tool.ToolContent>
															<Tool.ToolInput input={act.input} />
															{#if act.state === 'output-available'}
																<Tool.ToolOutput output={redactSensitiveData(act.output)} />
															{/if}
															{#if act.state === 'output-error' && act.errorText}
																<Tool.ToolOutput errorText={act.errorText} />
															{/if}
														</Tool.ToolContent>
													</Tool.Tool>
												{:else}
													<Reasoning.Reasoning class="w-full" isStreaming={act.streaming}>
														<Reasoning.ReasoningTrigger isStreaming={act.streaming} />
														<Reasoning.ReasoningContent content={act.text} isStreaming={act.streaming} />
													</Reasoning.Reasoning>
												{/if}
											{/each}
											{#if i === messages.length - 1 && evidenceAttachments.length > 0}
												<Attachment.Group>
													{#each evidenceAttachments as ev (ev.key)}
														<Attachment.Root state={ev.state} class="w-full">
															<Attachment.Media>
																{#if ev.state === 'error'}
																	<FileWarningIcon class="size-4 text-red-500" />
																{:else}
																	<DatabaseIcon class="text-muted-foreground size-4" />
																{/if}
															</Attachment.Media>
															<Attachment.Content>
																<Attachment.Title>{ev.title}</Attachment.Title>
																<Attachment.Description>{ev.description}</Attachment.Description>
															</Attachment.Content>
															<Attachment.Actions>
																{#if ev.state === 'done' || ev.state === 'error'}
																	<Attachment.Action aria-label="Copiar resultado" title="Copiar" onclick={() => void copyToClipboard(ev.raw)}>
																		<CopyIcon class="size-3.5" />
																	</Attachment.Action>
																{/if}
															</Attachment.Actions>
														</Attachment.Root>
													{/each}
												</Attachment.Group>
											{/if}
										</div>
									{/if}
								{/if}
								<MessageAnimated
									{message}
									scrollAnchor={message.role === 'user'}
									collapsible={i < messages.length - 1}
								/>
								{#if message.role === 'assistant'}
									<MessageParts
										{message}
										canRespond={!isBusy}
										onInputResponse={(response) => {
											persistInputResponses([response]);
											void agent.send({ inputResponses: [response] });
										}}
										onRespondAll={(responses) => {
											persistInputResponses(responses);
											void agent.send({ inputResponses: responses });
										}}
									/>
								{/if}
							{/each}
							{#if showLiveMarker && liveStatus}
								<MessageScroller.Item messageId="live-status">
									<Marker.Root role="status">
										<Marker.Icon>
											<Spinner />
										</Marker.Icon>
										<Marker.Content class="shimmer">
											<span class="font-medium">{liveStatus.label}</span>
											<span class="text-muted-foreground/60 tabular-nums">· {Math.max(1, Math.ceil(elapsedMs / 1000))} s</span>
										</Marker.Content>
									</Marker.Root>
								</MessageScroller.Item>
							{/if}
						</MessageScroller.Content>
					</MessageScroller.Viewport>
					<MessageScroller.Button />
				</MessageScroller.Root>
			{/if}

			{#if liveStatus}
				<div class="flex min-h-7 items-center gap-2 px-4 pb-2 text-xs text-muted-foreground" aria-live="polite">
					<span class="inline-block size-2 animate-pulse rounded-full bg-blue-500"></span>
					<span class="shimmer font-medium text-foreground/80">{liveStatus.label}</span>
					<span class="tabular-nums text-muted-foreground/70">{Math.max(1, Math.ceil(elapsedMs / 1000))} s</span>
				</div>
			{/if}

			{#if todoActive && todoState}
				<div class="shrink-0 px-3 pt-1">
					<Queue.Root>
						<Queue.Section bind:open={todoOpen}>
							<Queue.SectionTrigger>
								<Queue.SectionLabel count={todoState.counts.total} label="tareas" />
							</Queue.SectionTrigger>
							<Queue.SectionContent>
								<Queue.List>
									{#each todoState.todos as item, i (i)}
										{@const isDone = item.status === 'completed' || item.status === 'cancelled'}
										<Queue.Item>
											<div class="flex items-center gap-2">
												<Queue.ItemIndicator completed={isDone} />
												<Queue.ItemContent completed={isDone}>{item.content}</Queue.ItemContent>
											</div>
											{#if item.status === 'in_progress'}
												<Queue.ItemDescription>en curso…</Queue.ItemDescription>
											{/if}
										</Queue.Item>
									{/each}
								</Queue.List>
							</Queue.SectionContent>
						</Queue.Section>
					</Queue.Root>
				</div>
			{/if}

			<!-- Input -->
			<div class="shrink-0 border-t p-3">
				{#if recovered && !recoveryContextSent}
					<p class="text-muted-foreground mb-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
						Conversación recuperada desde el registro persistente. Puedes seguir escribiendo con
						normalidad.
					</p>
				{/if}
				<form onsubmit={(event) => { event.preventDefault(); void submit(); }}>
					{#if composerFiles.length}
						<div class="mb-2 flex flex-wrap gap-2">
							{#each composerFiles as f (f.id)}
								<span
									class="flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs"
								>
									<PaperclipIcon class="size-3 shrink-0 text-muted-foreground" />
									<span class="truncate">{f.name}</span>
									<button
										type="button"
										aria-label="Quitar {f.name}"
										class="text-muted-foreground hover:text-foreground"
										onclick={() => removeComposerFile(f.id)}
									>
										<XIcon class="size-3" />
									</button>
								</span>
							{/each}
						</div>
					{/if}
					<input
						bind:this={fileInput}
						type="file"
						multiple
						class="hidden"
						aria-label="Adjuntar archivos"
						onchange={onFileChange}
					/>
					<InputGroup.Root>
						<InputGroup.Textarea
							bind:value={text}
							placeholder="Escribe tu mensaje…"
							rows={2}
							onkeydown={onKeydown}
							onpaste={onComposerPaste}
						/>
						<InputGroup.Addon align="block-end" class="pt-1">
							<InputGroup.Button
								type="button"
								variant="ghost"
								size="icon-sm"
								class="ml-auto"
								aria-label="Adjuntar"
								disabled={isBusy}
								onclick={() => fileInput?.click()}
							>
								<PaperclipIcon />
							</InputGroup.Button>
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
									disabled={!text.trim() && composerFiles.length === 0}
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
