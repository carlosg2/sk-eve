<script lang="ts">
	import { onMount } from "svelte";
	import { Chat } from "@ai-sdk/svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import MessageAnimated from "$lib/components/message-animated.svelte";
	import { createChat } from "$lib/lib/ai.svelte.js";
	import HITLGate from "./hitl-gate.svelte";
	import AskToolRow from "./ask-tool-row.svelte";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import BotIcon from "@lucide/svelte/icons/bot";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
	import CircleDashedIcon from "@lucide/svelte/icons/circle-dashed";
	import MessageCircleQuestionIcon from "@lucide/svelte/icons/message-circle-question";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";

	// ─── Guión del agente (Sigma) ────────────────────────────────────────────
	const PROMPT = "Revisa el abasto de frijol para la próxima semana.";

	const A1 = `## Diagnóstico de abasto — frijol

Encontré un **faltante crítico** de **FRIJOL MEDIA OREJA 2024**:

| Concepto | Valor |
|---|---|
| Requerido (explosión de julio) | **22,689 kg** |
| En trámite (traspaso/préstamo/arribo) | **0 kg** |
| Riesgo | Paro de línea de producción |

No hay traspaso, préstamo ni arribo en curso que cubra el faltante. Antes de
continuar necesito tu decisión:`;

	const A2 = `Perfecto. Con tu respuesta armo la **requisición pre-llenada**:

- **FRIJOL MEDIA OREJA 2024** — 22,689 kg
- Prioridad: **alta** (riesgo de paro de línea)

Para fincarla revisé el historial real de compras de julio y tengo tres
opciones de proveedor:`;

	const A3 = `Con el proveedor que elegiste la requisición queda así:

\`\`\`
REQ-2026-07-114   FRIJOL MEDIA OREJA 2024   22,689 kg   ≈ $1.9M
\`\`\`

El importe supera el tope de compra, así que **finanzas debe autorizar**
(autorización extraordinaria). Confirmo el alta:`;

	const A4 = `## Requisición creada ✅

- **REQ-2026-07-114** — FRIJOL MEDIA OREJA 2024, 22,689 kg
- Importe estimado: **≈ $1.9M**
- Estatus: **pendiente de autorización de finanzas**

Te aviso en cuanto finanzas la autorice. ¿Algo más?`;

	const chat = createChat()
		.user(PROMPT)
		.sleep(900)
		.assistant(A1)
		.user("") // respuesta gate 1 (se sustituye al enviar)
		.sleep(700)
		.assistant(A2)
		.user("") // respuesta gate 2
		.sleep(700)
		.assistant(A3)
		.user("") // respuesta gate 3
		.sleep(700)
		.assistant(A4);

	// ─── Estados del demo ───────────────────────────────────────────────────
	type Phase =
		| "start"
		| "a1"
		| "g1wait"
		| "g1"
		| "a2"
		| "g2wait"
		| "g2"
		| "a3"
		| "g3wait"
		| "g3"
		| "a4"
		| "done";

	let phase = $state<Phase>("start");
	let assistantCount = $state(0);

	const isGatePhase = $derived(phase.startsWith("g"));
	// Patrón de scroll = /demo (sin autoScroll): el mensaje del usuario es el
	// ancla → al responder una gate, tu respuesta queda ARRIBA del viewport y la
	// respuesta del agente genera debajo sin mover la vista ("empieza limpio a
	// generar"). Para leer el resto (o la gate nueva) se usa la flecha ↓, que
	// lleva badge ámbar cuando hay una pregunta pendiente abajo. Nada arrastra
	// el scroll automáticamente.

	// Las gates son content parts PERSISTENTES del transcript (como en Copilot):
	// una vez que aparecen, quedan (interactiva → resumen Q/A).
	const gate1Seen = $derived(
		["g1wait", "g1", "a2", "g2wait", "g2", "a3", "g3wait", "g3", "a4", "done"].includes(phase)
	);
	const gate2Seen = $derived(["g2wait", "g2", "a3", "g3wait", "g3", "a4", "done"].includes(phase));
	const gate3Seen = $derived(["g3wait", "g3", "a4", "done"].includes(phase));

	// Tool row de ask_user: "Generando la pregunta…" → "Esperando tu respuesta…" → oculta tras responder.
	const toolRow1 = $derived(phase === "g1wait" ? "generating" : phase === "g1" ? "waiting" : null);
	const toolRow2 = $derived(phase === "g2wait" ? "generating" : phase === "g2" ? "waiting" : null);
	const toolRow3 = $derived(phase === "g3wait" ? "generating" : phase === "g3" ? "waiting" : null);

	const phaseLabel = $derived.by(() => {
		switch (phase) {
			case "start":
				return "Iniciando sesión del agente…";
			case "a1":
				return "Sigma está consultando el ERP (inventario y arribos)…";
			case "g1wait":
			case "g1":
			case "g2wait":
			case "g2":
			case "g3wait":
			case "g3":
				return "Sigma pausó el turno y espera tu decisión";
			case "a2":
				return "Sigma está prellenando la requisición…";
			case "a3":
				return "Sigma está validando proveedor y presupuesto…";
			case "a4":
				return "Sigma está generando el resumen…";
			case "done":
				return "Turno completado · 3 preguntas resueltas";
		}
	});

	// ─── Chat scripteado (streaming) ────────────────────────────────────────
	const initialMessages = chat.get({ count: 0 });
	const transport = chat.transport({ chunkDelayMs: 20 });
	const chatState = new Chat({
		messages: initialMessages,
		transport,
		onFinish: () => {
			assistantCount += 1;
			if (assistantCount === 1) enterGate("g1wait", "g1");
			else if (assistantCount === 2) enterGate("g2wait", "g2");
			else if (assistantCount === 3) enterGate("g3wait", "g3");
			else if (assistantCount === 4) phase = "done";
		},
	});

	const isBusy = $derived(
		chatState.status === "submitted" || chatState.status === "streaming"
	);

	/** Estado previo de la tool ask_user: "generando" un beat perceptible (como
	 * el indicador "Asking you…" de Copilot), luego muestra la gate. */
	const ASK_GENERATING_MS = 2000;

	function enterGate(waitPhase: Phase, gatePhase: Phase) {
		phase = waitPhase;
		setTimeout(() => {
			if (phase === waitPhase) phase = gatePhase;
		}, ASK_GENERATING_MS);
	}

	onMount(() => {
		const first = chat.next({ after: [] });
		if (first) {
			phase = "a1";
			void chatState.sendMessage(first);
		}
	});

	/** Envía el siguiente turno scripteado reemplazando el texto por la respuesta real. */
	function sendScriptedUser(text: string) {
		const next = chat.next({ after: chatState.messages });
		if (!next) return;
		next.parts = [{ type: "text", text }];
		void chatState.sendMessage(next);
	}

	function resetConversation() {
		assistantCount = 0;
		phase = "a1";
		chatState.messages = [];
		const first = chat.next({ after: [] });
		if (first) void chatState.sendMessage(first);
	}

	// ─── Línea de tiempo unificada del transcript ────────────────────────────
	// Las gates son content parts del turno que las preguntó (como el
	// InputRequestResponsePart de Copilot): viven DENTRO del flujo de mensajes,
	// en la posición donde el agente preguntó, y al responder colapsan a un
	// registro Q/A serializable en esa misma posición. Ese es el modelo que
	// permite almacenar y precargar conversaciones pasadas y que la meta-fábrica
	// las inspeccione (cada turno = mensajes + gate(s) resueltas).
	type TimelineItem =
		| { kind: "message"; message: (typeof chatState.messages)[number] }
		| { kind: "gate"; gate: 1 | 2 | 3; tool: "generating" | "waiting" | null };

	const timeline = $derived.by(() => {
		const items: TimelineItem[] = [];
		let assistants = 0;
		for (const message of chatState.messages) {
			items.push({ kind: "message", message });
			if (message.role !== "assistant") continue;
			assistants += 1;
			if (assistants === 1 && gate1Seen) items.push({ kind: "gate", gate: 1, tool: toolRow1 });
			else if (assistants === 2 && gate2Seen) items.push({ kind: "gate", gate: 2, tool: toolRow2 });
			else if (assistants === 3 && gate3Seen) items.push({ kind: "gate", gate: 3, tool: toolRow3 });
		}
		return items;
	});

	function timelineKey(item: TimelineItem) {
		return item.kind === "message" ? item.message.id : `gate-${item.gate}`;
	}

	// ─── Gates (ask_user) ───────────────────────────────────────────────────
	const gate1Choices = [
		{ value: "urgente", label: "Compra urgente hoy", hint: "Riesgo de paro de línea" },
		{ value: "coordinar", label: "Coordinar con compras", hint: "Revisar antes de fincar" },
		{ value: "informar", label: "Solo informar", hint: "Sin acción por ahora" },
	];
	const gate2Choices = [
		{ value: "rg", label: "RG COMPAÑIA BENEFICIADORA", hint: "Granos · $27.2M en julio" },
		{ value: "arbolitos", label: "GRANOS LOS ARBOLITOS", hint: "Granos · $9.3M en julio" },
		{ value: "pulses", label: "PULSES DEL BAJIO", hint: "Leguminosas · $1.5M en julio" },
	];
	const gate3Choices = [
		{ value: "confirmar", label: "Confirmar el alta" },
		{ value: "ajustar", label: "Ajustar cantidades" },
		{ value: "cancelar", label: "Cancelar operación" },
	];

	const gate1Labels: Record<string, string> = {
		urgente: "Compra urgente hoy",
		coordinar: "Coordinar con compras",
		informar: "Solo informar",
	};
	const gate2Labels: Record<string, string> = {
		rg: "RG COMPAÑIA BENEFICIADORA",
		arbolitos: "GRANOS LOS ARBOLITOS",
		pulses: "PULSES DEL BAJIO",
	};
	const gate3Labels: Record<string, string> = {
		confirmar: "Confirmar el alta de la requisición",
		ajustar: "Ajustar cantidades",
		cancelar: "Cancelar operación",
	};

	function answerGate(data: FormData, labels: Record<string, string>) {
		const choice = String(data.get("respuesta") ?? "");
		const free = String(data.get("otra") ?? "").trim();
		const base = labels[choice] ?? choice;
		return free ? `${base} — ${free}` : base;
	}

	function onGate1(data: FormData) {
		const text = answerGate(data, gate1Labels);
		phase = "a2";
		sendScriptedUser(text);
	}

	function onGate2(data: FormData) {
		const text = answerGate(data, gate2Labels);
		phase = "a3";
		sendScriptedUser(text);
	}

	function onGate3(data: FormData) {
		const text = answerGate(data, gate3Labels);
		phase = "a4";
		sendScriptedUser(text);
	}
</script>

<svelte:head>
	<title>Sigma — Agente con HITL (demo2)</title>
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<!-- Header -->
	<div class="flex h-9 shrink-0 items-center justify-between px-3">
		<div class="flex items-center gap-2">
			<BotIcon class="size-3.5 text-muted-foreground" />
			<span class="text-xs font-medium">Sigma · Agente con HITL</span>
		</div>
		<div class="flex items-center gap-0.5">
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class="size-6"
							aria-label="Reiniciar conversación"
							onclick={resetConversation}
							disabled={isBusy}
						>
							<RotateCwIcon class="size-3.5" />
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
			<!-- Estado del agente -->
			<div class="flex h-7 shrink-0 items-center gap-2 border-b px-3">
				{#if phase === "done"}
					<CircleCheckIcon class="size-3.5 text-emerald-500" />
				{:else if isGatePhase}
					<MessageCircleQuestionIcon class="size-3.5 text-amber-500" />
				{:else}
					<CircleDashedIcon class="size-3.5 animate-spin text-muted-foreground" />
				{/if}
				<span class="truncate text-xs text-muted-foreground">{phaseLabel}</span>
			</div>

			<MessageScroller.Root class="flex-1">
				<MessageScroller.Viewport>
					<MessageScroller.Content aria-busy={isBusy} class="p-4">
						{#each timeline as item (timelineKey(item))}
							{#if item.kind === "message"}
								<MessageAnimated
									message={item.message}
									scrollAnchor={item.message.role === "user"}
								/>
							{:else if item.kind === "gate"}
								{#if item.tool}<AskToolRow status={item.tool} />{/if}
								{#if item.tool !== "generating"}
								<div
									class="animate-in rounded-xl border bg-card p-4 fade-in-0 slide-in-from-bottom-2 duration-300"
								>
									<div class="mb-3 flex items-center justify-between gap-2">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<MessageCircleQuestionIcon class="size-3.5" />
										Pregunta del agente
										</p>
										{#if item.tool}
											<span
												class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600"
												>Turno pausado</span
											>
										{:else}
											<span
												class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"
												>Respondida</span
											>
										{/if}
									</div>
									{#if item.gate === 1}
										<HITLGate
											title="¿Cómo procedemos con el faltante?"
											description="22,689 kg requeridos y 0 en trámite. Tu respuesta reanuda el turno."
											choices={gate1Choices}
											freeform
											onsubmit={onGate1}
										/>
									{:else if item.gate === 2}
										<HITLGate
											title="¿Con qué proveedor cotizamos el frijol?"
											description="Sugerencia basada en el historial real de compras de julio 2026."
											choices={gate2Choices}
											onsubmit={onGate2}
										/>
									{:else}
										<HITLGate
											title="¿Confirmas la escritura en el ERP?"
											description="La requisición excede el tope de compra y requiere autorización extraordinaria de finanzas."
											choices={gate3Choices}
											onsubmit={onGate3}
										/>
									{/if}
								</div>
								{/if}
							{/if}
						{/each}

					</MessageScroller.Content>
				</MessageScroller.Viewport>
				<MessageScroller.Button aria-label="Ir al final del chat">
					<ArrowDownIcon class="size-4" />
					{#if isGatePhase}
						<span class="absolute -end-0.5 -top-0.5 flex size-2.5">
							<span
								class="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75"
							></span>
							<span class="relative inline-flex size-2.5 rounded-full bg-amber-500"></span>
						</span>
					{/if}
				</MessageScroller.Button>
			</MessageScroller.Root>

			<!-- Pie: hint -->
			<div class="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
				Demo del patrón HITL: el agente pausa, pregunta con opciones y respuesta libre, y reanuda con tu
				respuesta para continuar el flujo.
			</div>
		</div>
	</MessageScroller.Provider>
</div>
