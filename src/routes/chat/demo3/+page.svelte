<script lang="ts">
	import { onMount } from "svelte";
	import { Chat } from "@ai-sdk/svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import * as Attachment from "$lib/components/ui/attachment/index.js";
	import MessageAnimated from "$lib/components/message-animated.svelte";
	import { createChat } from "$lib/lib/ai.svelte.js";
	import HITLGate from "../demo2/hitl-gate.svelte";
	import AskToolRow from "../demo2/ask-tool-row.svelte";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import BotIcon from "@lucide/svelte/icons/bot";
	import BrainIcon from "@lucide/svelte/icons/brain";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
	import CircleDashedIcon from "@lucide/svelte/icons/circle-dashed";
	import DatabaseIcon from "@lucide/svelte/icons/database";
	import MessageCircleQuestionIcon from "@lucide/svelte/icons/message-circle-question";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";

	// ─── Guión del agente (basado en la reunión de descubrimiento ICF 2026-08-05) ──
	const PROMPT = "Buenos días. Revisa el presupuesto de compras de julio y dime qué desviaciones hay.";

	const A1 = `## Presupuesto de compras — julio 2026

Como pidió finanzas (Guillermo: *"no me enseñes todo el chorizo, nada más las desviaciones"*), aquí están solo las **desviaciones del periodo**:

| Artículo | Concepto | Desviación |
|---|---|---|
| A5944 | Frijol negro americano | **+447%** 🔴 |
| A6539 | Frijol pinto | +212% 🔴 |
| A6541 | Mitades claras | +192% 🔴 |
| A6781 | Frijol negro | +153% 🔴 |
| A6787 | Frijol media oreja | +151% 🔴 |
| A6319 | Frijol negro argentino | +145% 🔴 |
| A6790 | Mitades negras | +130% 🔴 |
| A5688 | Frijol peruano | +117% 🔴 |

**8 artículos sobre presupuesto** sobre un gasto total de **$136,325,726.56**; el resto del portafolio está dentro de tope (🟢).

Antes de profundizar necesito tu decisión:`;

	const A2 = `Perfecto. Crucé las desviaciones contra la **explosión de materia prima** del MRP — lo que pedía Iván: *"el MRP me tiene que decir… no tienes esto para producirlo, falta la materia prima"*.

Las 8 desviaciones se explican por **faltantes** que forzaron compras de emergencia:

| Artículo | Faltante | En trámite | Urgencia |
|---|---|---|---|
| FRIJOL NEGRO 2024 | **22,689 kg** | 0 kg | 🔴 paro de línea |
| TARIMA CHEP | 25 pz | 0 pz | 🟡 logística |
| PIMIENTA MOLIDA | 1 bulto | 0 | 🟡 mezcla |

El MRP ya calculó qué hay que comprar y con qué urgencia (Ale: *"el sistema va y revisa las existencias…"*). ¿Procedemos?`;

	const A3 = `Con tu decisión armo la **requisición pre-llenada**:

\`\`\`
REQ-2026-07-114   FRIJOL NEGRO 2024     22,689 kg   ≈ $1.9M
REQ-2026-07-115   TARIMA CHEP              25 pz    ≈ $6,250
REQ-2026-07-116   PIMIENTA MOLIDA           1 bulto  ≈ $4,800
\`\`\`

Para asignar proveedor revisé el historial real de compras de julio (qué proveedor surtió y por cuánto). Tengo tres opciones:`;

	const A4 = `Con **RG COMPAÑIA BENEFICIADORA** la requisición queda así:

\`\`\`
REQ-2026-07-114   FRIJOL NEGRO 2024   22,689 kg   ≈ $1.9M
\`\`\`

El importe supera el tope de compra, así que **finanzas debe autorizar** (autorización extraordinaria).

El agente es **read-only por defecto**: esta escritura en el ERP queda pausada hasta que la confirmes. Confirmo el alta:`;

	const A5 = `## Requisición creada ✅

- **REQ-2026-07-114** — FRIJOL NEGRO 2024, 22,689 kg ≈ $1.9M
- Proveedor: **RG COMPAÑIA BENEFICIADORA**
- Estatus: **pendiente de autorización de finanzas**

El cruce presupuesto → faltante quedó documentado para la revisión de mañana. Te aviso en cuanto finanzas la autorice. ¿Algo más?`;

	// Razonamiento y evidencia por turno (lo que el agente "hace" antes de responder).
	const REASONING: Record<number, string> = {
		1: "Plan de la consulta: detecto el periodo activo (julio) → agrego Compra por Ejercicio/Periodo y por proveedor → cruzo contra el presupuesto para aislar solo las desviaciones, como pidió finanzas.",
		2: "Causa raíz: las desviaciones se explican por faltantes de materia prima. Uso la explosión del MRP y cruzo contra los artículos sobre presupuesto para priorizar.",
		3: "Requisición: armo las líneas con la cantidad faltante y la urgencia del MRP. Para el proveedor uso el historial real de julio y sugiero tres opciones.",
		4: "Escritura: el importe supera el tope → requiere autorización extraordinaria de finanzas. Por política, las escrituras se pausan y esperan tu confirmación.",
	};
	const EVIDENCE: Record<number, { label: string; kb: string }> = {
		1: { label: "Consultando el ERP…", kb: "30.9 KB" },
		2: { label: "Calculando faltantes…", kb: "30.9 KB" },
		3: { label: "Armando requisición…", kb: "37.6 KB" },
		4: { label: "Validando autorización…", kb: "2.4 KB" },
	};

	const chat = createChat()
		.user(PROMPT)
		.sleep(700)
		.assistant(A1)
		.user("") // respuesta gate 1 (se sustituye al enviar)
		.sleep(650)
		.assistant(A2)
		.user("") // respuesta gate 2
		.sleep(650)
		.assistant(A3)
		.user("") // respuesta gate 3
		.sleep(650)
		.assistant(A4)
		.user("") // respuesta gate 4
		.sleep(650)
		.assistant(A5);

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
		| "g4wait"
		| "g4"
		| "a5"
		| "done";

	let phase = $state<Phase>("start");
	let assistantCount = $state(0);

	const isGatePhase = $derived(phase.startsWith("g"));
	// Patrón de scroll = /demo (sin autoScroll): el mensaje del usuario es el
	// ancla → al responder una gate, tu respuesta queda ARRIBA del viewport y la
	// respuesta del agente genera debajo sin mover la vista. Para leer el resto
	// (o la gate nueva) se usa la flecha ↓, que lleva badge ámbar cuando hay una
	// pregunta pendiente abajo.

	// Las gates son content parts PERSISTENTES del transcript: una vez que
	// aparecen quedan (interactiva → resumen Q/A en su posición).
	const gate1Seen = $derived(
		["g1wait", "g1", "a2", "g2wait", "g2", "a3", "g3wait", "g3", "a4", "g4wait", "g4", "a5", "done"].includes(phase)
	);
	const gate2Seen = $derived(
		["g2wait", "g2", "a3", "g3wait", "g3", "a4", "g4wait", "g4", "a5", "done"].includes(phase)
	);
	const gate3Seen = $derived(["g3wait", "g3", "a4", "g4wait", "g4", "a5", "done"].includes(phase));
	const gate4Seen = $derived(["g4wait", "g4", "a5", "done"].includes(phase));

	// Tool row: "Generando la pregunta…" → "Esperando tu respuesta…" → oculta tras responder.
	const toolRow1 = $derived(phase === "g1wait" ? "generating" : phase === "g1" ? "waiting" : null);
	const toolRow2 = $derived(phase === "g2wait" ? "generating" : phase === "g2" ? "waiting" : null);
	const toolRow3 = $derived(phase === "g3wait" ? "generating" : phase === "g3" ? "waiting" : null);
	const toolRow4 = $derived(phase === "g4wait" ? "generating" : phase === "g4" ? "waiting" : null);

	const phaseLabel = $derived.by(() => {
		switch (phase) {
			case "start":
				return "Iniciando sesión del agente…";
			case "a1":
				return "Sigma está consultando el presupuesto…";
			case "g1wait":
			case "g1":
			case "g2wait":
			case "g2":
			case "g3wait":
			case "g3":
			case "g4wait":
			case "g4":
				return "Sigma pausó el turno y espera tu decisión";
			case "a2":
				return "Sigma está cruzando faltantes del MRP…";
			case "a3":
				return "Sigma está armando la requisición…";
			case "a4":
				return "Sigma está validando la autorización…";
			case "a5":
				return "Sigma está generando el resumen…";
			case "done":
				return "Turno completado · 4 preguntas resueltas";
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
			else if (assistantCount === 4) enterGate("g4wait", "g4");
			else if (assistantCount === 5) phase = "done";
		},
	});

	const isBusy = $derived(chatState.status === "submitted" || chatState.status === "streaming");

	/** Estado previo de la tool ask: "generando" un beat perceptible, luego muestra la gate. */
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

	// ─── Línea de tiempo del transcript ─────────────────────────────────────
	// message | reasoning | evidence | gate — cada gate intercalada justo
	// después del mensaje del asistente que preguntó.
	type TimelineItem =
		| { kind: "message"; message: (typeof chatState.messages)[number] }
		| { kind: "gate"; gate: 1 | 2 | 3 | 4; tool: "generating" | "waiting" | null }
		| { kind: "reasoning"; turn: number; text: string; streaming: boolean }
		| { kind: "evidence"; turn: number; label: string; kb: string };

	const gateSeenFor = (n: number) =>
		n === 1 ? gate1Seen : n === 2 ? gate2Seen : n === 3 ? gate3Seen : n === 4 ? gate4Seen : false;
	const toolRowFor = (n: number) =>
		n === 1 ? toolRow1 : n === 2 ? toolRow2 : n === 3 ? toolRow3 : n === 4 ? toolRow4 : null;

	const timeline = $derived.by(() => {
		const items: TimelineItem[] = [];
		let assistants = 0;
		for (const message of chatState.messages) {
			if (message.role === "assistant") {
				assistants += 1;
				if (REASONING[assistants]) {
					items.push({
						kind: "reasoning",
						turn: assistants,
						text: REASONING[assistants],
						streaming: phase === `a${assistants}`,
					});
				}
				if (EVIDENCE[assistants]) {
					items.push({
						kind: "evidence",
						turn: assistants,
						label: EVIDENCE[assistants].label,
						kb: EVIDENCE[assistants].kb,
					});
				}
			}
			items.push({ kind: "message", message });
			if (message.role !== "assistant") continue;
			if (gateSeenFor(assistants)) items.push({ kind: "gate", gate: assistants as 1 | 2 | 3 | 4, tool: toolRowFor(assistants) });
		}
		return items;
	});

	function timelineKey(item: TimelineItem): string {
		switch (item.kind) {
			case "message":
				return item.message.id;
			case "gate":
				return `gate-${item.gate}`;
			case "reasoning":
				return `reasoning-${item.turn}`;
			case "evidence":
				return `evidence-${item.turn}`;
		}
	}

	// ─── Gates (HITL) ───────────────────────────────────────────────────────
	const gate1Choices = [
		{ value: "criticos", label: "Solo los críticos", hint: "desviación > +150%" },
		{ value: "causa", label: "Causa raíz", hint: "cruce con faltantes del MRP" },
		{ value: "proveedor", label: "Por proveedor", hint: "top del gasto" },
	];
	const gate2Choices = [
		{ value: "generar", label: "Generar requisiciones", hint: "cubre los 3 faltantes" },
		{ value: "priorizar", label: "Priorizar por urgencia", hint: "solo lo crítico hoy" },
		{ value: "informar", label: "Solo informar", hint: "sin escritura por ahora" },
	];
	const gate3Choices = [
		{ value: "rg", label: "RG COMPAÑIA BENEFICIADORA", hint: "Granos · $27.1M en julio" },
		{ value: "leticia", label: "LETICIA MARQUEZ VALENZUELA", hint: "Granos · $42.7M en julio" },
		{ value: "vaca", label: "ALMACENES VACA", hint: "Granos · $17.2M en julio" },
	];
	const gate4Choices = [
		{ value: "confirmar", label: "Confirmar el alta" },
		{ value: "ajustar", label: "Ajustar cantidades" },
		{ value: "cancelar", label: "Cancelar operación" },
	];

	const gate1Labels: Record<string, string> = {
		criticos: "Solo los críticos",
		causa: "Causa raíz",
		proveedor: "Por proveedor",
	};
	const gate2Labels: Record<string, string> = {
		generar: "Generar requisiciones",
		priorizar: "Priorizar por urgencia",
		informar: "Solo informar",
	};
	const gate3Labels: Record<string, string> = {
		rg: "RG COMPAÑIA BENEFICIADORA",
		leticia: "LETICIA MARQUEZ VALENZUELA",
		vaca: "ALMACENES VACA",
	};
	const gate4Labels: Record<string, string> = {
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

	function onGate4(data: FormData) {
		const text = answerGate(data, gate4Labels);
		phase = "a5";
		sendScriptedUser(text);
	}
</script>

<svelte:head>
	<title>Sigma — Revisión de compras ICF (demo3)</title>
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<!-- Header -->
	<div class="flex h-9 shrink-0 items-center justify-between px-3">
		<div class="flex items-center gap-2">
			<BotIcon class="size-3.5 text-muted-foreground" />
			<span class="text-xs font-medium">Sigma · Revisión de compras ICF</span>
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
							{:else if item.kind === "reasoning"}
								<div class="mb-3 overflow-hidden rounded-lg border border-border/70 bg-muted/20">
									<div class="flex items-center justify-between px-3 py-2">
										<span class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											<BrainIcon class="size-3.5" />
											{#if item.streaming}
												<span class="shimmer">Pensando…</span>
											{:else}
												Razonamiento
											{/if}
										</span>
									</div>
									<div class="px-3 pb-3 text-xs leading-relaxed text-muted-foreground/90">
										{item.text}
									</div>
								</div>
							{:else if item.kind === "evidence"}
								<div class="mb-3">
									<Attachment.Group>
										<Attachment.Root state="done" class="w-full">
											<Attachment.Media>
												<DatabaseIcon class="text-muted-foreground size-4" />
											</Attachment.Media>
											<Attachment.Content>
												<Attachment.Title>{item.label}</Attachment.Title>
												<Attachment.Description>{item.kb}</Attachment.Description>
											</Attachment.Content>
										</Attachment.Root>
									</Attachment.Group>
								</div>
							{:else}
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
											title="¿Cómo enfoco la revisión de las desviaciones?"
											description="8 artículos sobre presupuesto en julio 2026. Tu respuesta reanuda el turno."
											choices={gate1Choices}
											onsubmit={onGate1}
										/>
									{:else if item.gate === 2}
										<HITLGate
											title="¿Qué hacemos con los faltantes del MRP?"
											description="La explosión ya calculó cantidades y urgencia."
											choices={gate2Choices}
											onsubmit={onGate2}
										/>
									{:else if item.gate === 3}
										<HITLGate
											title="¿Con qué proveedor cotizamos el frijol negro?"
											description="Sugerencia por historial real de compras de julio 2026."
											choices={gate3Choices}
											onsubmit={onGate3}
										/>
									{:else}
										<HITLGate
											title="¿Confirmas la escritura en el ERP?"
											description="La requisición excede el tope de compra y requiere autorización extraordinaria de finanzas."
											choices={gate4Choices}
											freeform
											onsubmit={onGate4}
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
				Demo basado en la reunión de descubrimiento de ICF (2026-08-05): el agente revisa el presupuesto de
				compras, cruza con los faltantes del MRP y pide tu decisión en cada paso antes de escribir en el ERP.
			</div>
		</div>
	</MessageScroller.Provider>
</div>
