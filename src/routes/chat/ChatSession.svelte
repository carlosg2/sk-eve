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
	import MicIcon from '@lucide/svelte/icons/mic';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import { ChatVoiceLayer, narrationEchoesQuestion, isNearDuplicateNarration } from '$lib/realtime/chat-voice';
	import type { AecInfo } from '$lib/realtime/grok-voice';

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
			void refreshInjections();
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
				/** callId único del tool call (Eve lo emite en actions.requested y action.result). */
				callId?: string;
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
					// Commentary channel (fusión total): la tool `narrar` es SOLO voz —
					// se intercepta en un watch aparte y NUNCA se muestra como chip.
					if (name === 'narrar') continue;
					cur.push({
						kind: 'tool',
						key: `t${toolSeq++}`,
						name,
						callId: rec?.callId !== undefined ? String(rec.callId) : undefined,
						state: 'input-available',
						input: rec?.input ?? rec?.arguments,
						output: undefined,
					});
				}
			} else if (ev.type === 'action.result') {
				const r = (d?.result ?? {}) as Record<string, unknown>;
				const name = String(r?.toolName ?? r?.name ?? '');
				const resultCallId = r?.callId !== undefined ? String(r.callId) : undefined;
				// Correlación EXACTA por callId: con llamadas repetidas al MISMO tool
				// (paralelas o en serie) los results pueden llegar en orden distinto
				// al de las llamadas, y emparejar solo por nombre entrega el output al
				// call equivocado (parámetros que no corresponden al resultado).
				let target: Extract<Activity, { kind: 'tool' }> | undefined;
				if (resultCallId) {
					for (let i = cur.length - 1; i >= 0; i--) {
						const it = cur[i];
						if (
							it.kind === 'tool' &&
							it.callId === resultCallId &&
							(it.state === 'input-available' || it.state === 'input-streaming')
						) {
							target = it;
							break;
						}
					}
				}
				// Fallback defensivo: si no hay callId o no se encontró, emparejar por
				// nombre (último tool abierto con ese nombre) como antes.
				if (!target) {
					for (let i = cur.length - 1; i >= 0; i--) {
						const it = cur[i];
						if (
							it.kind === 'tool' &&
							it.name === name &&
							(it.state === 'input-available' || it.state === 'input-streaming')
						) {
							target = it;
							break;
						}
					}
				}
				if (target) {
					const output = r?.output;
					const isError = !!r?.isError;
					target.output = output;
					// DAB/MCP devuelven los errores como resultado "exitoso" con
					// `{ error: … }` embebido (isError=false). detectMcpError lo detecta.
					const errText = detectMcpError(output);
					if (isError || errText) {
						target.state = 'output-error';
						target.errorText = errText ?? (typeof output === 'string' ? output : JSON.stringify(output ?? {}));
					} else {
						target.state = 'output-available';
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
	type TraceToolRec = { name: string; callId?: string; state: string; inputKey: string; outputLen: number };

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
						out.push({ name, callId: rec?.callId !== undefined ? String(rec.callId) : undefined, state: 'input-available', inputKey: `${name}:${JSON.stringify(input)}`, outputLen: 0 });
					}
				} else if (ev.type === 'action.result') {
					const r = (ev.data?.result ?? {}) as Record<string, unknown>;
					const name = String(r?.toolName ?? r?.name ?? '');
					const resultCallId = r?.callId !== undefined ? String(r.callId) : undefined;
					const output = r?.output;
					const len = typeof output === 'string' ? output.length : JSON.stringify(output ?? '').length;
					let hit: TraceToolRec | undefined;
					// Igual que el feed: correlacionar por callId (los results de un mismo
					// tool pueden llegar en orden distinto al de las llamadas).
					if (resultCallId) {
						for (let i = out.length - 1; i >= 0; i--) {
							if (out[i].callId === resultCallId && out[i].state === 'input-available') { hit = out[i]; break; }
						}
					}
					if (!hit) {
						for (let i = out.length - 1; i >= 0; i--) {
							if (out[i].name === name && out[i].state === 'input-available') { hit = out[i]; break; }
						}
					}
					if (hit) {
						hit.outputLen = len;
						hit.state = r?.isError || detectMcpError(output) ? 'output-error' : 'output-available';
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

	// ── Inyecciones de contexto (lóbulo frontal + memoria episódica) ──────
	// llm_inputs captura el prompt PRE-middleware (por eso planTag sale null en
	// /api/audit/llm); la radiografía durable de lo que SÍ se inyectó vive en
	// /api/audit/injections (SQLite). Aquí se formatea para el inspector con el
	// CONTENIDO COMPLETO (body) para ver qué skills/conceptos del Company Twin
	// se precargaron y qué memoria episódica se inyectó en cada mensaje.
	type InjectionRow = {
		sessionId: string; at: string; kind: 'plan' | 'memory'; tag: string;
		chars: number; hits?: number; message?: string;
		sources?: Array<{ sessionId: string; type: string }>; body?: string;
	};
	let injectionsText = $state('');
	async function refreshInjections() {
		try {
			const id = currentSessionId();
			if (!id) { injectionsText = ''; return; }
			const res = await fetch(`/api/audit/injections?session=${encodeURIComponent(id)}&limit=50`);
			const j = (await res.json()) as { injections?: InjectionRow[] };
			const rows = j.injections ?? [];
			if (!rows.length) { injectionsText = ''; return; }
			const parts: string[] = ['## INYECCIONES DE CONTEXTO (lo inyectado al prompt)', ''];
			for (const inj of rows) {
				const kind = inj.kind === 'plan' ? 'plan' : 'memoria';
				parts.push(
					`[${kind}] ${inj.tag} · ${inj.chars} chars · ${new Date(inj.at).toLocaleTimeString()}` +
						(inj.kind === 'memory' && inj.hits ? ` · ${inj.hits} hits` : '')
				);
				if (inj.message) parts.push(`  ↳ mensaje: ${traceBlock(String(inj.message))}`);
				if (inj.sources?.length) {
					parts.push(`  ↳ fuentes: ${inj.sources.map((s) => `${s.type}·${String(s.sessionId).slice(-8)}`).join(', ')}`);
				}
				if (inj.body) parts.push(indentBlock(traceBlock(inj.body)));
				parts.push('');
			}
			injectionsText = parts.join('\n').trimEnd();
		} catch {
			injectionsText = '';
		}
	}
	void refreshInjections();

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
			void refreshInjections();
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
		if (injectionsText) {
			lines.push(injectionsText);
			lines.push('');
		}
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
		// Reset del estado de voz POR TURNO (S1/S2): el hint de módulo y la marca de
		// la primera tool arrancan de cero en cada turno, y se cancela el filler
		// temprano pendiente para que no hable dentro de un turno nuevo.
		voiceTurnToolHint = '';
		voiceFirstToolAt = 0;
		if (voiceFillerTimer) {
			window.clearTimeout(voiceFillerTimer);
			voiceFillerTimer = null;
		}
		// Auto-off post-respuesta: un turno nuevo cancela la ventana previa.
		cancelPostAnswerAutoOff();
		voiceAnswerDoneAt = 0;
		text = '';
		const files = composerFiles;
		composerFiles = [];
		const needsRecoveryContext = recovered && !recoveryContextSent;
		if (needsRecoveryContext) recoveryContextSent = true;
		// Canal-Aware Dual-Brain: si la voz está activa, el agente recibe el estado del
		// canal como `clientContext` efímero (1 turno, NO se persiste) y adapta su salida:
		// respuesta COMPLETA en pantalla + sección **SPEECH:** (resumen hablado) y, si
		// aplica, **INSIGHT:** (dato accionable extra). Sin voz, el comportamiento es el
		// de siempre (regresión cero).
		type VoiceClientContext = { recoveryContext?: string; voice?: { active: boolean; state: string } };
		let clientContext: string | VoiceClientContext | undefined;
		if (needsRecoveryContext && !voiceActive) {
			clientContext = buildRecoveryContext();
		} else if (needsRecoveryContext || voiceActive) {
			const obj: Record<string, unknown> = {};
			if (needsRecoveryContext) obj.recoveryContext = buildRecoveryContext();
			if (voiceActive) {
				obj.voice = {
					active: true,
					state: voiceSpeaking ? 'speaking' : voiceListening ? 'listening' : 'idle',
				};
			}
			clientContext = obj;
		}
		const context = clientContext !== undefined ? { clientContext } : {};
		if (files.length === 0) {
			await agent.send({ message: value, ...context });
			return;
		}
		const parts: UserContent = [];
		if (value) parts.push({ text: value, type: 'text' });
		for (const f of files) {
			parts.push({ data: f.data, filename: f.name, mediaType: f.mediaType, type: 'file' });
		}
		await agent.send({ message: parts, ...context });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void submit();
		}
	}

	// ── Capa delgada de voz (mic → STT → chat → agente → TTS) ─────────────
	// La voz controla al agente de Eve que ya corre aquí (NO es la delegación
	// ask_agent de /voice): el micrófono transcribe lo que dices (Grok Voice
	// realtime), el texto se escribe en el chat y se envía al agente con tool
	// calls visibles; cuando el agente termina su respuesta COMPLETA en
	// pantalla, la capa la lee en voz alta (verbatim).
	let voiceLayer = $state<ChatVoiceLayer | null>(null);
	let voiceActive = $state(false);
	let voiceListening = $state(false);
	let voiceSpeaking = $state(false);
	let voiceError = $state('');
	let voiceStatus = $state('');
	let voicePendingSpeak = $state(false);
	// Modo AEC/no-AEC del mic (Fase B2): lo reporta el cliente de voz en cada
	// `startMic` (o al degradar en caliente por eco). 'unknown' hasta el primer
	// reporte (o al desactivar la voz).
	let voiceAec = $state<'aec' | 'no-aec' | 'unknown'>('unknown');
	// Detección completa del AEC del último startMic (diagnóstico/chip).
	let voiceAecInfo = $state<AecInfo | null>(null);
	// Aviso no-AEC dismissible (banner) y chip informativo de AEC (una vez por ciclo).
	let voiceAecNoticeDismissed = $state(false);
	let voiceAecChipDismissed = $state(false);
	// Inactividad (Fase B3, idle watchdog): tier activo para el estado visual.
	// 'none' = sin inactividad; 1 = "¿Sigues ahí?" (aviso hablado UNA vez por
	// ventana); 2 = "En pausa por inactividad…" (desconexión amable).
	let voiceIdleTier = $state<'none' | 1 | 2>('none');
	// Anti-spam del aviso del tier 1 (solo estado visual; se resetea al restaurar
	// actividad). El TTS de "¿Sigues ahí?" se ELIMINÓ (ahorro de recursos, 2026-08-18).
	let voiceIdleTier1Spoken = $state(false);
	// Modo de lectura aplicado por speakAgentAnswer (speech/full/truncated/none) y
	// guard del preámbulo hablado (1× por pregunta por voz mientras el agente trabaja).
	let voiceSpeakMode = $state<'none' | 'speech' | 'full' | 'truncated'>('none');
	let voiceFillerSpoken = $state(false);
	// Coreografía de voz v2 (fluida, una sola fuente): la narración DURANTE el
	// turno la genera SOLO el cerebro (tool `narrar`); un filler corto y único al
	// inicio (tras gracia) cubre el silencio inicial; la respuesta se encola sin
	// cortar el audio en curso. `voiceLastNarrationAt` marca el gap anti-spam.
	let voiceLastNarrationAt = 0;
	// Naturalidad conversacional (2026-08-18): `voiceLastNarrationNorm` = última
	// narración hablada (para descartar duplicados casi-idénticos que el cerebro
	// emite en el mismo turno) y `voiceUserQuestionNorm` = la pregunta que el
	// usuario acaba de hacer por voz (para descartar narraciones que la
	// PARAFRASEAN — un asistente humano no repite lo que acabas de decir).
	let voiceLastNarrationNorm = '';
	let voiceUserQuestionNorm = '';
	// Auto-off post-respuesta (ahorro de recursos, 2026-08-18): al terminar de
	// sonar la respuesta (o cerrar el turno sin audio) se arma una ventana corta
	// (VOICE_POST_ANSWER_AUTO_OFF_MS); si el usuario no habla, se DESCONECTA la
	// voz. Referencia: xAI Android IDLE_TIERS 5/10/15s cierran; OpenAI recomienda
	// push-to-talk — la sesión realtime es EFÍMERA por interacción, nunca
	// "¿sigues ahí?". `voiceAnswerDoneAt` = momento en que se entregó la última
	// respuesta por voz; `voicePostAnswerTimer` = timer (number, DOM).
	let voiceAnswerDoneAt = 0;
	let voicePostAnswerTimer: number | null = null;
	// Hint de módulo para el preámbulo hablado (S1/S6): la PRIMERA tool ERP del
	// turno (distinta de `narrar`) produce una frase de acción contextual
	// ("Consultando compras…" vía friendlyToolLabel) que se pasa a speakPreamble().
	// Se resetea en submit/voiceRespondHitl/toggleVoice junto a voiceLastNarrationAt.
	let voiceTurnToolHint = '';
	// Marca de la PRIMERA tool del turno (ms): si el agente ya arrancó una tool, el
	// filler temprano (S2, 1800ms) gana a la gracia completa de 4s. 0 = sin tools aún.
	let voiceFirstToolAt = 0;
	// Timeout del filler temprano por tool (S2): se limpia antes de programar para
	// no duplicar disparos y al resetear el turno para no hablar en un turno nuevo.
	let voiceFillerTimer: number | null = null;
	// Anti-repetición del aviso de audio poco claro (M3): una aclaración por
	// ventana de 30s.
	let lastClarifyAt = 0;
	// Keepalive del idle watchdog: mientras el AGENTE de /chat trabaja (isBusy)
	// la UI rearma el watchdog periódicamente (ver watch de isBusy). Sin esto, en
	// turnos largos de DeepSeek el watchdog avisaba "¿Sigues ahí?" y llegaba a
	// APAGAR la voz (idle tier 2) perdiendo la siguiente pregunta (E2E 2026-08-17).
	// Tipado `number` (DOM): `window.setInterval` devuelve number, NO Timeout de
	// Node (gotcha documentado del repo con voiceNarrationTimer).
	let voiceBusyKeepalive: number | null = null;
	// Commentary channel: ids de eventos `narrar` ya procesados (dedupe — el
	// stream re-emite eventos al reabrir y el watch escanea una ventana).
	let voiceNarratedEventIds = new Set<string>();
	// Vibe con voz: texto del usuario captado mientras el agente trabajaba
	// (se envía como seguimiento al terminar el turno — "busca X… y dime sus compras").
	let voicePendingIntent = $state<string | null>(null);
	// Anti-eco de transcripción: el gateway a veces re-transcribe el MISMO audio
	// ya commiteado (commit fantasma de bajo RMS justo después de la pregunta
	// real — observado 2026-08-17: 2º commit 3.7s después con la misma
	// transcripción) y fabrica una "segunda pregunta" que el usuario no dijo.
	// Si llega un transcript IDÉNTICO al último en <VOICE_TRANSCRIPT_DEDUP_MS,
	// se ignora (no se encola como intent ni se envía).
	const VOICE_TRANSCRIPT_DEDUP_MS = 6000;
	let lastVoiceTranscriptNorm = '';
	let lastVoiceTranscriptAt = 0;
	// Anti-eco de TRANSCRIPCIÓN (bucle 2026-08-17): el STT del gateway a veces
	// transcribe el ECO del audio del asistente (bajo RMS) con el MISMO texto de
	// una intención recién enviada y eso re-ejecuta la pregunta (3 commits
	// "Es Leticia." en 15s). El dedupe de 6s no basta (el eco llega más tarde);
	// este ring guarda los últimos transcripts ACEPTADOS y rechaza una repetición
	// si el commit que la produjo fue de BAJO RMS (= eco, no voz real).
	const VOICE_ECHO_RMS_FLOOR = 0.045;
	const VOICE_INTENT_ECHO_MS = 60000;
	let voiceRecentIntents: Array<{ norm: string; at: number }> = [];
	// HITL por voz: requests pendientes del último mensaje assistant + dedupe.
	type VoiceHitlReq = {
		requestId: string;
		prompt: string;
		options: Array<{ id: string; label: string }>;
		allowFreeform: boolean;
	};
	let voiceHitlKey = '';
	let voiceHitlSpoken = false;

	// ── Telemetría durable de voz ────────────────────────────────────────
	// Los eventos del cliente (vad/mic drops/commits/STT/playback/respuestas y
	// las decisiones sobre el transcript) se acumulan y persisten EN LOTE a
	// /api/voice/telemetry (tabla `voice_events` de la radiografía SQLite). El
	// diagnóstico de "dijo algo por voz y no se registró" ocurre client-side
	// (antes de que llegue a Eve) y el espejo de eventos NO tiene rastro — esta
	// telemetría es la única evidencia durable de qué pasó en la capa de voz.
	let voiceTelemetry: Array<{ at: string; type: string; data?: Record<string, unknown> }> = [];
	let voiceTelemetryTimer: ReturnType<typeof setTimeout> | null = null;

	function flushVoiceTelemetry(): void {
		if (voiceTelemetry.length === 0) return;
		const events = voiceTelemetry;
		voiceTelemetry = [];
		const sid = currentSessionId();
		void fetch('/api/voice/telemetry', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId: sid ?? null, events }),
		}).catch(() => {
			// silencioso: la telemetría nunca rompe el turno/UI
		});
	}

	function pushVoiceTelemetry(type: string, data?: Record<string, unknown>): void {
		voiceTelemetry.push({ at: new Date().toISOString(), type, data });
		if (voiceTelemetry.length >= 50) {
			if (voiceTelemetryTimer) {
				clearTimeout(voiceTelemetryTimer);
				voiceTelemetryTimer = null;
			}
			flushVoiceTelemetry();
			return;
		}
		if (!voiceTelemetryTimer) {
			voiceTelemetryTimer = setTimeout(() => {
				voiceTelemetryTimer = null;
				flushVoiceTelemetry();
			}, 2000);
		}
	}

	function ensureVoice(): ChatVoiceLayer {
		if (voiceLayer) return voiceLayer;
		const layer = new ChatVoiceLayer({
			onTranscript: (t, meta) => {
				console.info(`[voice] ${new Date().toISOString().slice(11, 19)} · transcript="${t.slice(0, 100)}" busy=${isBusy} hitl=${voiceHitl.length} peakRms=${meta?.peakRms ?? '?'}`);
				// Fase B3: el usuario volvió a hablar → se limpia el estado de inactividad.
				voiceIdleTier = 'none';
				voiceIdleTier1Spoken = false;
				// Anti-eco: si el STT devuelve el MISMO texto de la pregunta en los
				// segundos siguientes (el gateway re-transcribe audio ya commiteado),
				// se ignora — no se encola como intent ni se envía al agente. Mata la
				// "segunda pregunta que no hice" (duplicado fantasma, 2026-08-17).
				const normT = t.trim().replace(/\s+/g, ' ').toLowerCase();
				const isEcho =
					normT !== '' &&
					normT === lastVoiceTranscriptNorm &&
					Date.now() - lastVoiceTranscriptAt < VOICE_TRANSCRIPT_DEDUP_MS;
				if (normT !== '') {
					lastVoiceTranscriptNorm = normT;
					lastVoiceTranscriptAt = Date.now();
				}
				if (isEcho) {
					console.info(`[voice] → duplicado/eco ignorado (mismo texto < ${VOICE_TRANSCRIPT_DEDUP_MS}ms)`);
					pushVoiceTelemetry('transcript_duplicate', { text: t.slice(0, 120) });
					return;
				}
				// Anti-eco por ENERGÍA: si este transcript repite una intención recién
				// aceptada (≤1min) y el commit que lo produjo fue de BAJO RMS, es el
				// eco del altavoz transcrito igual (bucle "es Leticia" 3×, 2026-08-17)
				// — no una repetición real del usuario (esa tiene RMS ≥ 0.05).
				const peakRms = meta?.peakRms ?? 0;
				const matchedRecent = voiceRecentIntents.find(
					(r) => r.norm === normT && Date.now() - r.at < VOICE_INTENT_ECHO_MS
				);
				if (normT !== '' && matchedRecent && peakRms < VOICE_ECHO_RMS_FLOOR) {
					console.info(`[voice] → eco de intención rechazado (rms=${peakRms.toFixed(4)} < piso, mismo texto "${t.slice(0, 60)}")`);
					pushVoiceTelemetry('echo_reject_intent', {
						text: t.slice(0, 120),
						peakRms: Number(peakRms.toFixed(4)),
						sinceMs: Date.now() - matchedRecent.at,
					});
					return;
				}
				if (normT !== '') {
					voiceRecentIntents.push({ norm: normT, at: Date.now() });
					if (voiceRecentIntents.length > 5) voiceRecentIntents.shift();
				}
				// Eco del propio asistente (2026-08-18, análisis de la sesión E2E):
				// el STT a veces transcribe un FRAGMENTO de lo que el asistente acaba
				// de decir por el altavoz ("Reviso eso en el…" ← el filler). Ese texto
				// NO es una pregunta del usuario; procesarlo como submit/intent/HITL se
				// enredaba solo (el agente respondía su propio HITL con su propio eco →
				// doble pregunta hablada). Se descarta antes de cualquier path.
				if (voiceLayer?.isLikelyEchoOfAssistant(t) === true) {
					console.info(`[voice] → eco del asistente transcrito, ignorado: "${t.slice(0, 60)}"`);
					pushVoiceTelemetry('echo_reject_assistant', { text: t.slice(0, 120), peakRms });
					return;
				}
				// M3 (audio poco claro, P1): transcript con < 3 caracteres de contenido
				// (solo ruido/letras sueltas del STT) NO se envía al agente. Solo se pide
				// aclaración si NO hay HITL pendiente (una respuesta corta válida tipo
				// "sí"/"uno" la maneja el flujo HITL de después), no está busy y no se
				// preguntó en los últimos 30s (anti-spam: una por ventana). El caso de
				// texto vacío tras trim() lo maneja el flujo actual — aquí solo aplica
				// con 1-2 caracteres.
				if (
					normT.length >= 1 &&
					normT.length < 3 &&
					voiceHitl.length === 0 &&
					!isBusy &&
					Date.now() - lastClarifyAt > 30000
				) {
					console.info(`[voice] → audio poco claro (${normT.length} chars), pido repetir`);
					pushVoiceTelemetry('unclear_audio', { text: t.slice(0, 80) });
					lastClarifyAt = Date.now();
					cancelPostAnswerAutoOff(); // el usuario intenta hablar
					voiceAnswerDoneAt = 0;
					try {
						voiceLayer?.speakNarration('Perdona, no te escuché bien. ¿Podrías repetirlo?');
					} catch {
						/* noop */
					}
					return;
				}
				// HITL por voz: si el agente tiene una pregunta pendiente y no está
				// trabajando, la respuesta del usuario responde la gate.
				if (!isBusy && voiceHitl.length > 0) {
					console.info(`[voice] → responde HITL`);
					pushVoiceTelemetry('transcript_decision', { path: 'hitl', text: t.slice(0, 120), hitl: voiceHitl.length });
					cancelPostAnswerAutoOff();
					voiceAnswerDoneAt = 0;
					voiceRespondHitl(t);
					return;
				}
				// Barge-in continuo (vibe con voz): si el agente está trabajando, el
				// texto se guarda como intención y se envía al terminar el turno —
				// "busca X…" arranca y "y dime sus compras…" se agrega al vuelo.
				if (isBusy) {
					console.info(`[voice] → INTENTO (agente ocupado): "${t.slice(0, 80)}"`);
					pushVoiceTelemetry('transcript_decision', { path: 'intent', text: t.slice(0, 120) });
					cancelPostAnswerAutoOff();
					voiceAnswerDoneAt = 0;
					voicePendingIntent = t;
					voiceLayer?.clearSpokenQueue();
					voiceLayer?.cutPlayback();
					voiceStatus = 'Entendido, lo agrego…';
					return;
				}
				console.info(`[voice] → pregunta nueva (submit)`);
				pushVoiceTelemetry('transcript_decision', { path: 'submit', text: t.slice(0, 120) });
				cancelPostAnswerAutoOff();
				voiceAnswerDoneAt = 0;
				voiceLayer?.clearSpokenQueue();
				voiceLayer?.cutPlayback();
				voicePendingSpeak = true;
				voiceFillerSpoken = false;
				voiceSpeakMode = 'none';
				voiceLastNarrationAt = 0;
				voiceLastNarrationNorm = '';
				// La pregunta del usuario (para descartar narraciones que la
				// parafraseen — anti-eco conversacional, 2026-08-18).
				voiceUserQuestionNorm = t;
				voiceNarratedEventIds = new Set();
				text = t;
				void submit();
			},
			onListeningChange: (l) => (voiceListening = l),
			onSpeakingChange: (s) => (voiceSpeaking = s),
			onStatus: (s) => (voiceStatus = s),
			onError: (e) => {
				// El gateway realtime responde "Cancellation failed: no active
				// response found" cuando recibe un response-cancel sin respuesta
				// activa (carrera benigna de doble-cancel). NUNCA debe aparecer como
				// error rojo en la UI aunque llegue por cualquier vía.
				if (/cancellation failed|no active response/i.test(e)) {
					console.info(`[voice] onError benigno ignorado: ${e.slice(0, 120)}`);
					return;
				}
				voiceError = e;
			},
			onTelemetry: (ev) => pushVoiceTelemetry(ev.type, ev.data),
			onAecChange: (mode, aec) => {
				voiceAec = mode;
				voiceAecInfo = aec;
				console.info(
					`[voice] modo AEC=${mode} (${mode === 'aec' ? 'barge-in por voz activo' : 'el mic se pausa durante playback'})`
				);
				pushVoiceTelemetry('aec_ui', { mode, aecEnabled: aec.aecEnabled });
			},
			onIdle: (tier) => {
				// Fase B3: watchdog de inactividad (el mic quedó "Escuchando…" y el
				// usuario no habla). AHORRO DE RECURSOS (2026-08-18): SIN TTS de
				// "¿Sigues ahí?" (costaba tokens; la referencia xAI/OpenAI corta rápido)
				// — tier 1 solo estado visual, tier 2 desconecta ya. El caso común
				// (tras responder) lo cubre el auto-off post-respuesta.
				if (tier === 1) {
					console.info(`[voice] idle tier 1 — solo estado visual (sin TTS)`);
					pushVoiceTelemetry('idle_tier1_ui');
					if (!voiceIdleTier1Spoken) {
						voiceIdleTier1Spoken = true;
						voiceIdleTier = 1;
						voiceStatus = '¿Sigues ahí?';
					}
					return;
				}
				if (tier === 2) {
					console.info(`[voice] idle tier 2 — desconectando por inactividad`);
					pushVoiceTelemetry('idle_timeout_ui');
					voiceIdleTier1Spoken = false;
					voiceIdleTier = 2;
					voiceStatus = 'Desconectando…';
					if (voiceActive) void toggleVoice();
				}
			},
		});
		voiceLayer = layer;
		return layer;
	}

	async function toggleVoice() {
		const v = ensureVoice();
		if (voiceActive) {
			voiceActive = false;
			v.stopListening();
			v.disconnect();
			// Auto-off post-respuesta: limpiar la ventana y la marca al apagar.
			cancelPostAnswerAutoOff();
			voiceAnswerDoneAt = 0;
			voiceError = '';
			voiceStatus = '';
			voicePendingSpeak = false;
			voiceFillerSpoken = false;
			voiceSpeakMode = 'none';
			voiceNarratedEventIds = new Set();
			voicePendingIntent = null;
			voiceHitlKey = '';
			voiceHitlSpoken = false;
			voiceLastNarrationAt = 0;
			voiceLastNarrationNorm = '';
			voiceUserQuestionNorm = '';
			// Reset por turno (S1/S2): hint de módulo, marca de primera tool y filler
			// temprano pendiente (no debe hablar en una sesión apagada o turno nuevo).
			voiceTurnToolHint = '';
			voiceFirstToolAt = 0;
			if (voiceFillerTimer) {
				window.clearTimeout(voiceFillerTimer);
				voiceFillerTimer = null;
			}
			// Fase B2: al apagar la voz se olvida el modo AEC y los avisos
			// (volverán a mostrarse en la próxima activación).
			voiceAec = 'unknown';
			voiceAecInfo = null;
			voiceAecNoticeDismissed = false;
			voiceAecChipDismissed = false;
			// Fase B3: limpiar el estado visual de inactividad al apagar la voz.
			voiceIdleTier = 'none';
			voiceIdleTier1Spoken = false;
			flushVoiceTelemetry();
			return;
		}
		voiceError = '';
		// Fase B3: al reactivar la voz se limpia cualquier estado de inactividad.
		voiceIdleTier = 'none';
		voiceIdleTier1Spoken = false;
		// Reset por turno (S1/S2): al encender la voz arranca un ciclo limpio.
		voiceTurnToolHint = '';
		voiceFirstToolAt = 0;
		if (voiceFillerTimer) {
			window.clearTimeout(voiceFillerTimer);
			voiceFillerTimer = null;
		}
		try {
			await v.connect();
			voiceActive = true;
			await v.startListening();
		} catch (err) {
			voiceError = err instanceof Error ? err.message : String(err);
			voiceActive = false;
		}
	}

	/**
	 * Lee la respuesta del agente por el canal de voz (SPEECH verbatim si existe).
	 * Coreografía v2: NADA se corta — si hay una narración en curso, la respuesta
	 * se ENCOLA detrás (la cola FIFO serializada garantiza el orden sin pisarse).
	 */
	function maybeSpeakAnswer() {
		if (!voiceActive) return;
		if (isBusy) return;
		// HITL por voz: si el turno terminó con una pregunta del agente (gate), se
		// lee en voz alta EN VEZ de intentar "leer" la respuesta — el input.requested
		// NO produce message.completed con texto, la respuesta vendría vacía.
		if (voiceHitl.length && !voiceHitlSpoken) {
			voiceHitlSpoken = true;
			speakHitl(voiceHitl);
			return;
		}
		// Vibe con voz: si el usuario añadió contexto mientras el agente trabajaba,
		// se envía como seguimiento (no se lee la respuesta anterior — la nueva
		// pregunta la completa en la misma sesión).
		if (voicePendingIntent) {
			console.info(`[voice] maybeSpeakAnswer → ENVÍA INTENTO: "${voicePendingIntent.slice(0, 80)}"`);
			const intent = voicePendingIntent;
			voicePendingIntent = null;
			voicePendingSpeak = false;
			voiceSpeakMode = 'none';
			voiceStatus = '';
			text = intent;
			void submit();
			return;
		}
		if (!voicePendingSpeak) return;
		const last = messages[messages.length - 1];
		if (last && last.role === 'assistant') {
			console.info(`[voice] maybeSpeakAnswer → lee respuesta (modo=${voiceSpeakMode})`);
			const answer = messageText(last);
			voicePendingSpeak = false;
			voiceSpeakMode = voiceLayer?.speakAgentAnswer(answer) ?? 'none';
			voiceAnswerDoneAt = Date.now();
			pushVoiceTelemetry('speak_answer', { mode: voiceSpeakMode, chars: answer.length });
			return;
		}
		// El mensaje del asistente puede tardar un instante en llegar al store;
		// se reintenta una vez antes de rendirse (turno sin respuesta).
		window.setTimeout(() => {
			if (!voiceActive || isBusy) return;
			if (voicePendingIntent) {
				console.info(`[voice] retry → ENVÍA INTENTO: "${voicePendingIntent.slice(0, 80)}"`);
				const intent = voicePendingIntent;
				voicePendingIntent = null;
				voicePendingSpeak = false;
				voiceStatus = '';
				text = intent;
				void submit();
				return;
			}
			if (!voicePendingSpeak) return;
			const again = messages[messages.length - 1];
			if (again && again.role === 'assistant') {
				const answer = messageText(again);
				voicePendingSpeak = false;
				voiceSpeakMode = voiceLayer?.speakAgentAnswer(answer) ?? 'none';
				voiceAnswerDoneAt = Date.now();
			} else {
				voicePendingSpeak = false;
			}
		}, 500);
	}

	watch([() => isBusy], ([busy]) => {
		// Keepalive del idle watchdog: mientras el AGENTE de /chat trabaja (isBusy)
		// el usuario espera en silencio pero NO está ausente. El watchdog del cliente
		// solo mira el canal realtime; sin este rearmado, en turnos largos de DeepSeek
		// avisaba "¿Sigues ahí?" (idle tier 1 ×7 en el E2E) y APAGABA la voz a los 90s
		// (idle tier 2 → pregunta 4 perdida). Al terminar el turno se limpia y se
		// rearma el contador para detectar ausencia real tras la respuesta.
		if (voiceActive) {
			if (busy) {
				if (!voiceBusyKeepalive) {
					voiceBusyKeepalive = window.setInterval(() => {
						try {
							voiceLayer?.noteActivity();
						} catch {
							/* noop */
						}
					}, VOICE_BUSY_KEEPALIVE_MS);
				}
			} else if (voiceBusyKeepalive) {
				window.clearInterval(voiceBusyKeepalive);
				voiceBusyKeepalive = null;
				try {
					voiceLayer?.noteActivity();
				} catch {
					/* noop */
				}
			}
		}
		if (busy && voicePendingSpeak && voiceActive && !voiceFillerSpoken) {
			// Filler con GRACIA (S2): el flag NO se marca al programar — se marca al
			// HABLAR, para que el disparo temprano por primera tool (1800ms) pueda
			// hablar primero y el flag evite duplicados (el primero que hable gana).
			// Antes de hablar se verifica que el turno siga vivo (isBusy/voiceActive)
			// y que el cerebro aún no narró (el commentary es la fuente principal de
			// voz). El hint de módulo se pasa cuando ya arrancó una tool.
			window.setTimeout(() => {
				if (voiceFillerSpoken || !voiceActive || !isBusy) return;
				if (voiceLastNarrationAt > 0) return;
				voiceFillerSpoken = true;
				try {
					voiceLayer?.speakPreamble(voiceTurnToolHint || undefined);
				} catch {
					/* noop */
				}
			}, VOICE_FILLER_GRACE_MS);
			return;
		}
		maybeSpeakAnswer();
		// Caso "respuesta SIN audio" (mode none): si la voz no arrancó playback
		// en ~1.5s, arma la ventana de auto-off (con audio la arma el watch de
		// voiceSpeaking al terminar el playback).
		if (!busy && voiceAnswerDoneAt > 0 && voiceActive) {
			window.setTimeout(() => {
				try {
					if (!voiceActive || isBusy || voiceSpeaking) return;
					armPostAnswerAutoOff();
				} catch {
					/* noop */
				}
			}, 1500);
		}
	});

	/** Cancela la ventana de auto-off post-respuesta (el usuario sigue activo). */
	function cancelPostAnswerAutoOff(): void {
		try {
			if (voicePostAnswerTimer) {
				window.clearTimeout(voicePostAnswerTimer);
				voicePostAnswerTimer = null;
			}
		} catch {
			/* noop */
		}
	}

	/**
	 * Arma la desconexión automática de la voz tras la respuesta (ahorro de
	 * recursos): ventana corta; si el usuario no habla y no hay HITL pendiente,
	 * se apaga la voz (la conversación de chat NO se pierde — la voz es solo el
	 * canal; se reactiva con "Activar voz"). Patrón de referencia (xAI 5/10/15s,
	 * OpenAI push-to-talk): sesión realtime efímera por interacción.
	 */
	function armPostAnswerAutoOff(): void {
		if (!voiceActive || isBusy) return;
		if (voiceHitl.length > 0) return; // el agente espera la respuesta del usuario
		cancelPostAnswerAutoOff();
		voicePostAnswerTimer = window.setTimeout(() => {
			voicePostAnswerTimer = null;
			if (!voiceActive || isBusy) return;
			if (voiceSpeaking) {
				// Aún suena audio (respuesta larga): re-arranca la ventana.
				armPostAnswerAutoOff();
				return;
			}
			if (voiceHitl.length > 0) return;
			console.info(`[voice] auto-off post-respuesta (ahorro de recursos)`);
			pushVoiceTelemetry('post_answer_auto_off', { graceMs: VOICE_POST_ANSWER_AUTO_OFF_MS });
			void toggleVoice();
		}, VOICE_POST_ANSWER_AUTO_OFF_MS);
	}

	// Auto-off post-respuesta (con audio): cuando la voz termina de sonar la
	// respuesta (voiceSpeaking → false con una respuesta entregada reciente) se
	// arma la ventana de desconexión corta.
	watch([() => voiceSpeaking], ([speaking]) => {
		if (!voiceActive) return;
		if (!speaking && voiceAnswerDoneAt > 0 && Date.now() - voiceAnswerDoneAt < 30000) {
			armPostAnswerAutoOff();
		}
	});

	// ── Coreografía de voz v2 (fluida) ────────────────────────────────────
	// La voz NARRA solo lo que el cerebro dice (`narrar`) o el filler único al
	// inicio. Se ELIMINARON la narración por fases/tools hardcodeada y el latido
	// por timer (eso pisaba frases y repetía). La respuesta se encola sin cortar.
	const VOICE_FILLER_GRACE_MS = 5000;
	const VOICE_NARRATION_GAP_MS = 4500;
	const VOICE_BUSY_KEEPALIVE_MS = 20000; // rearmar el idle watchdog cada 20s mientras isBusy
	// Ventana de desconexión automática tras la respuesta (ahorro de recursos).
	const VOICE_POST_ANSWER_AUTO_OFF_MS = 8000;

	// HITL por voz: gates pendientes del último mensaje assistant (inputRequest
	// sin inputResponse). Fuente: parts dynamic-tool del mensaje.
	const voiceHitl = $derived.by((): VoiceHitlReq[] => {
		try {
			for (let i = messages.length - 1; i >= 0; i--) {
				const m = messages[i];
				if (m.role !== 'assistant') continue;
				const parts = (m as { parts?: readonly unknown[] }).parts;
				if (!Array.isArray(parts)) continue;
				const reqs: VoiceHitlReq[] = [];
				for (const part of parts) {
					const meta = (part as {
						toolMetadata?: { eve?: { inputRequest?: Record<string, unknown>; inputResponse?: unknown } };
					})?.toolMetadata?.eve;
					const ir = meta?.inputRequest;
					if (!ir || meta?.inputResponse) continue;
					reqs.push({
						requestId: String(ir.requestId ?? ''),
						prompt: String(ir.prompt ?? ''),
						options: ((ir.options as Array<{ id?: unknown; label?: unknown }>) ?? []).map((o) => ({
							id: String(o.id ?? ''),
							label: String(o.label ?? o.id ?? ''),
						})),
						allowFreeform: !!ir.allowFreeform,
					});
				}
				if (reqs.length) return reqs;
			}
			return [];
		} catch {
			return [];
		}
	});

	/** Lee una pregunta HITL en voz alta (con opciones numeradas). */
	function speakHitl(reqs: VoiceHitlReq[]): void {
		if (!voiceActive || !voiceLayer) return;
		const lines = reqs.map((r) => {
			let t = r.prompt;
			if (r.options.length) {
				t += ` Opciones: ${r.options.map((o, i) => `${i + 1}. ${o.label}`).join(', ')}.`;
			} else {
				t += ' Responde libremente.';
			}
			return t;
		});
		try {
			voiceLayer.speakNarration(lines.join(' '), {
				instructions:
					'Pregunta del sistema: léela clara y pausada, como quien pide una respuesta. Al final, queda en silencio esperando.',
			});
		} catch {
			/* noop */
		}
	}

	/** Normaliza texto para matchear opciones HITL (minúsculas, sin acentos). */
	function normHitl(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	/** Responde una gate HITL con la voz del usuario (número, ordinal, etiqueta o texto libre). */
	function voiceRespondHitl(t: string): void {
		const reqs = voiceHitl;
		if (!reqs.length) return;
		const tn = normHitl(t).trim();
		const responses: InputResponse[] = [];
		for (const req of reqs) {
			let resp: InputResponse | null = null;
			if (req.options.length) {
				const n = parseInt(tn, 10);
				if (Number.isInteger(n) && n >= 1 && n <= req.options.length) {
					resp = { requestId: req.requestId, optionId: req.options[n - 1].id };
				}
				if (!resp) {
					const ords = [
						'uno', 'primera', 'primero', 'primera opcion', 'primera opción',
						'dos', 'segunda', 'segundo',
						'tres', 'tercera', 'tercero',
						'cuatro', 'cuarta',
						'cinco', 'quinta',
					];
					for (let i = 0; i < req.options.length; i++) {
						if (ords[i] && tn.includes(ords[i])) {
							resp = { requestId: req.requestId, optionId: req.options[i].id };
							break;
						}
					}
				}
				if (!resp) {
					const opt = req.options.find((o) => tn.includes(normHitl(o.label)));
					if (opt) resp = { requestId: req.requestId, optionId: opt.id };
				}
				if (!resp && req.allowFreeform) resp = { requestId: req.requestId, text: t };
			} else if (req.allowFreeform) {
				resp = { requestId: req.requestId, text: t };
			}
			if (resp) responses.push(resp);
		}
		if (!responses.length) {
			// No se entendió: releer la pregunta.
			voiceHitlSpoken = false;
			speakHitl(reqs);
			return;
		}
		voiceHitlSpoken = true;
		// Prepara el turno siguiente (la respuesta del agente a la gate): la
		// respuesta final se leerá en voz alta (voicePendingSpeak) y el filler /
		// narración arrancan de cero para este turno nuevo.
		voicePendingSpeak = true;
		voiceFillerSpoken = false;
		voiceSpeakMode = 'none';
		voiceLastNarrationAt = 0;
		voiceLastNarrationNorm = '';
		voiceNarratedEventIds = new Set();
		// Reset por turno (S1/S2): nuevo turno tras responder la gate → hint y marca
		// de primera tool en cero, y se cancela el filler temprano pendiente.
		voiceTurnToolHint = '';
		voiceFirstToolAt = 0;
		if (voiceFillerTimer) {
			window.clearTimeout(voiceFillerTimer);
			voiceFillerTimer = null;
		}
		persistInputResponses(responses);
		void agent.send({ inputResponses: responses });
	}

	// Lee en voz alta cada gate HITL nueva cuando el agente pausa esperando input.
	// Deps = voiceHitl + isBusy: el `input.requested` llega con el stream aún
	// abierto (isBusy=true); dependiendo SOLO de voiceHitl, cuando el turno se
	// estacionaba (isBusy→false) el watch no volvía a correr y la pregunta del
	// agente NUNCA se leía en voz alta. Con isBusy en las deps, al cerrar el
	// turno se re-evalúa y se habla la gate pendiente.
	watch([() => voiceHitl, () => isBusy], () => {
		if (!voiceActive || isBusy) return;
		const key = voiceHitl.map((r) => r.requestId).join('|');
		if (!key) return;
		if (key !== voiceHitlKey) {
			voiceHitlKey = key;
			voiceHitlSpoken = false;
		}
		if (!voiceHitlSpoken) {
			voiceHitlSpoken = true;
			speakHitl(voiceHitl);
		}
	});

	// Commentary channel (fusión total de los dos brains): el agente narra en
	// vivo con la tool `narrar` (su texto va SOLO a la voz). Se intercepta sobre
	// los EVENTOS (no sobre liveActivities — `narrar` se excluye del feed), con
	// dedupe por meta.id y el mismo gap de narración para no saturar la cola.
	watch([() => agent.events.length], () => {
		// ⚠️ Blindado: un throw aquí (shape de evento inesperado) rompería el watch
		// y podría causar un reload de la página (convención del repo).
		try {
			if (!voiceActive || !voicePendingSpeak || !isBusy) return;
			const evs = agent.events as readonly StreamEv[];
			for (let i = Math.max(0, evs.length - 25); i < evs.length; i++) {
				const ev = evs[i];
				if (ev.type !== 'actions.requested') continue;
				const id = (ev as { meta?: { id?: string } }).meta?.id;
				if (id) {
					if (voiceNarratedEventIds.has(id)) continue;
					voiceNarratedEventIds.add(id);
				}
				const actions = (((ev.data ?? {}) as { actions?: unknown[] }).actions) ?? [];
				for (const a of actions) {
					const rec = (a ?? {}) as Record<string, unknown>;
					const name = String(rec?.name ?? rec?.toolName ?? rec?.tool ?? '');
					if (name === 'narrar') {
						const input = (rec?.input ?? rec?.arguments ?? {}) as Record<string, unknown>;
						const texto = String(input?.texto ?? '').trim();
						if (!texto) continue;
						// Naturalidad conversacional (2026-08-18, análisis de la sesión
						// de 20 turnos). El cerebro es la fuente de la narración, pero la
						// capa es el FILTRO de naturalidad: descarta lo que un asistente
						// humano no diría.
						// F1 — HITL pendiente: la pregunta de aclaración la habla la UI
						// (speakHitl) UNA vez. Si el cerebro la narra también, se escucha
						// doble (evidencia: "¿A qué semana te refieres…?" ×2 a las
						// 02:52:26/33 y "¿A qué te refieres…?" ×2 a las 02:42:10/16).
						if (voiceHitl.length > 0) continue;
						// F2 — Nunca repetir la pregunta del usuario: si la narración
						// parafrasea la pregunta recién hecha ("Buscando el inventario
						// del chícharo mitad…" tras preguntar por el chícharo mitad), se
						// descarta en silencio (telemetría `narration_echo_question`).
						if (voiceUserQuestionNorm && narrationEchoesQuestion(texto, voiceUserQuestionNorm)) {
							console.info(`[voice] narración eco de la pregunta descartada: "${texto.slice(0, 80)}"`);
							pushVoiceTelemetry('narration_echo_question', { text: texto.slice(0, 120) });
							continue;
						}
						// F3 — Duplicado casi-idéntico a la narración anterior del mismo
						// turno ("Buscando el inventario del chícharo mitad…" + "Consulto
						// las existencias del chícharo mitad por almacén…" → solo la 1ª).
						if (
							voiceLastNarrationNorm &&
							isNearDuplicateNarration(texto, voiceLastNarrationNorm) &&
							Date.now() - voiceLastNarrationAt < VOICE_NARRATION_GAP_MS * 3
						) {
							console.info(`[voice] narración duplicada descartada: "${texto.slice(0, 80)}"`);
							pushVoiceTelemetry('narration_duplicate', { text: texto.slice(0, 120) });
							continue;
						}
						if (Date.now() - voiceLastNarrationAt < VOICE_NARRATION_GAP_MS) continue;
						voiceLastNarrationAt = Date.now();
						voiceLastNarrationNorm = texto;
						// F4 — El cerebro narró → el filler genérico de la UI sobra
						// (evita "Te lo busco ahora…" + "Buscando el inventario…" juntos):
						// se cancela el filler pendiente y se marca como hablado.
						if (voiceFillerTimer) {
							window.clearTimeout(voiceFillerTimer);
							voiceFillerTimer = null;
						}
						voiceFillerSpoken = true;
						try {
							voiceLayer?.speakNarration(texto, {
								instructions:
									'Comentario de progreso: léelo con naturalidad, como un asistente que comenta en voz baja lo que está haciendo. Pausado y claro.',
							});
						} catch {
							/* noop */
						}
						break;
					}
					// S1/S6 — Hint de módulo + S2 — gate de timing real: la PRIMERA tool
					// ERP del turno (distinta de `narrar`) produce la frase de acción
					// contextual del preámbulo ("Consultando compras…") y dispara el
					// filler temprano (1800ms) en vez de esperar la gracia completa de 4s.
					if (voiceFirstToolAt === 0) {
						voiceFirstToolAt = Date.now();
						if (!voiceTurnToolHint) {
							const hintInput = (rec?.input ?? rec?.arguments ?? {}) as Record<string, unknown>;
							voiceTurnToolHint = friendlyToolLabel(name, hintInput);
						}
						// Filler temprano: solo si el cerebro aún no narró y no se ha
						// hablado filler; al hablar marca el flag (el mismo flag evita
						// duplicados con la gracia de 4s). Se limpia antes de programar.
						if (voiceLastNarrationAt === 0 && !voiceFillerSpoken) {
							if (voiceFillerTimer) {
								window.clearTimeout(voiceFillerTimer);
								voiceFillerTimer = null;
							}
							voiceFillerTimer = window.setTimeout(() => {
								voiceFillerTimer = null;
								try {
									if (!voiceActive || !isBusy || voiceFillerSpoken || voiceLastNarrationAt > 0) return;
									voiceFillerSpoken = true;
									voiceLayer?.speakPreamble(voiceTurnToolHint || undefined);
								} catch {
									/* noop */
								}
							}, 3000);
						}
					}
				}
			}
		} catch {
			/* noop — un error en el scan de tools nunca debe romper el turno */
		}
	});

	// Desconexión segura de la voz al desmontar el componente.
	$effect(() => {
		const layer = voiceLayer;
		return () => {
			try {
				layer?.disconnect();
			} catch {
				/* noop */
			}
			flushVoiceTelemetry();
		};
	});
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
									stripVoiceSections={message.role === 'assistant'}
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
					{#if voiceActive}
						<div
							class="mb-2 flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
							role="status"
						>
							<span class="relative flex size-2 shrink-0">
								{#if voiceListening}
									<span
											class="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75"
									></span>
								{/if}
								<span
									class="relative inline-flex size-2 rounded-full {voiceHitl.length > 0 && !isBusy
										? 'bg-amber-500'
										: voiceListening
											? 'bg-red-500'
											: voiceSpeaking
												? 'bg-emerald-500'
												: 'bg-muted-foreground'}"
								></span>
							</span>
							<span class="truncate">
								{#if voiceHitl.length > 0 && !isBusy}
									Pregunta del agente — responde por voz…
								{:else if voiceSpeaking}
									{#if voiceSpeakMode === 'speech' || voiceSpeakMode === 'truncated'}
										Resumiendo la respuesta…
									{:else}
										Hablando la respuesta…
									{/if}
								{:else if voicePendingIntent}
									{voiceStatus || 'Entendido, lo agrego…'}
								{:else if isBusy && voicePendingSpeak}
									Consultando… te aviso en cuanto tenga la respuesta
								{:else if voiceIdleTier === 2}
									En pausa por inactividad…
								{:else if voiceIdleTier === 1}
									¿Sigues ahí? Puedes preguntarme lo que necesites…
								{:else if voiceListening}
									Escuchando… habla para preguntar
								{:else if voiceError}
									<span class="text-destructive">{voiceError}</span>
								{:else if voiceStatus}
									{voiceStatus}
								{:else}
									Voz activa
								{/if}
							</span>
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground"
								aria-label="Desactivar voz"
								onclick={() => void toggleVoice()}
							>
								<XIcon class="size-3" />
							</button>
						</div>
						{#if voiceAec === 'no-aec' && !voiceAecNoticeDismissed}
							<div
								class="mb-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300"
								role="status"
							>
								<AlertCircleIcon class="mt-px size-3.5 shrink-0" />
								<span class="min-w-0 flex-1">
									<span class="font-medium">Modo sin cancelación de eco.</span>{' '}
									Tu micrófono se pausa mientras el asistente responde: evita hablar en ese
									momento. El barge-in por voz está desactivado (puedes interrumpir escribiendo o
									con Detener).
								</span>
								<button
									type="button"
									class="shrink-0 text-amber-700/70 hover:text-amber-700 dark:text-amber-300/70 dark:hover:text-amber-300"
									aria-label="Cerrar aviso de modo sin cancelación de eco"
									onclick={() => (voiceAecNoticeDismissed = true)}
								>
									<XIcon class="size-3" />
								</button>
							</div>
						{/if}
						{#if voiceAec === 'aec' && !voiceAecChipDismissed}
							<div
								class="mb-2 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300"
								role="status"
							>
								<span class="relative flex size-2 shrink-0">
									<span class="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
								</span>
								<span class="min-w-0 flex-1">
									Cancelación de eco activa — puedes interrumpir hablando.
								</span>
								<button
									type="button"
									class="shrink-0 text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-300/70 dark:hover:text-emerald-300"
									aria-label="Cerrar aviso de cancelación de eco"
									onclick={() => (voiceAecChipDismissed = true)}
								>
									<XIcon class="size-3" />
								</button>
							</div>
						{/if}
					{/if}
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
								variant={voiceActive ? 'outline' : 'ghost'}
								size="icon-sm"
								class={voiceActive ? 'border-red-500/60 text-red-500' : 'ml-auto'}
								aria-label={voiceActive ? 'Desactivar voz' : 'Activar voz'}
								aria-pressed={voiceActive}
								disabled={isBusy && !voiceActive}
								onclick={() => void toggleVoice()}
							>
								{#if voiceActive && voiceSpeaking}
									<Volume2Icon />
								{:else}
									<MicIcon />
								{/if}
								<span class="sr-only">{voiceActive ? 'Desactivar voz' : 'Activar voz'}</span>
							</InputGroup.Button>
							<InputGroup.Button
								type="button"
								variant="ghost"
								size="icon-sm"
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
