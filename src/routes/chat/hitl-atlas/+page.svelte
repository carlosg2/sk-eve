<script lang="ts">
	import { onMount } from "svelte";
	import { Chat } from "@ai-sdk/svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import MessageAnimated from "$lib/components/message-animated.svelte";
	import { createChat } from "$lib/lib/ai.svelte.js";
	import AtlasGate from "./atlas-gate.svelte";
	import AuthorizationCard from "./authorization-card.svelte";
	import AskToolRow from "../demo2/ask-tool-row.svelte";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import BotIcon from "@lucide/svelte/icons/bot";
	import BrainIcon from "@lucide/svelte/icons/brain";
	import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
	import CircleDashedIcon from "@lucide/svelte/icons/circle-dashed";
	import DatabaseIcon from "@lucide/svelte/icons/database";
	import LayoutGridIcon from "@lucide/svelte/icons/layout-grid";
	import MessageCircleQuestionIcon from "@lucide/svelte/icons/message-circle-question";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import * as Attachment from "$lib/components/ui/attachment/index.js";

	// ─── Guión del agente (Sigma) — Atlas de todos los tipos HITL ────────────
	// Cada gate es un TIPO distinto de human-in-the-loop (ver docs/icf/hitl-tipos.md).
	// Superficie en lenguaje de negocio; los badges de tipo son para inspección de la fábrica.
	const PROMPT = "Revisa el presupuesto de compras de julio y ejecuta la requisición de los faltantes.";

	const A1 = `## Presupuesto de compras — julio 2026

Como pidió finanzas ("no me enseñes todo el chorizo, nada más las desviaciones"), aquí están solo las **desviaciones del periodo**:

| Artículo | Concepto | Desviación |
|---|---|---|
| A5944 | Frijol negro americano | +447% 🔴 |
| A6539 | Frijol pinto | +212% 🔴 |
| A6541 | Mitades claras | +192% 🔴 |
| A6781 | Frijol negro | +153% 🔴 |
| A6787 | Frijol media oreja | +151% 🔴 |
| A6319 | Frijol negro argentino | +145% 🔴 |
| A6790 | Mitades negras | +130% 🔴 |
| A5688 | Frijol peruano | +117% 🔴 |

8 artículos sobre presupuesto sobre un gasto total de **$136,325,726.56**; el resto del portafolio está dentro de tope (🟢).

Antes de profundizar necesito tu decisión:`;

	const A2 = `Perfecto. Crucé las desviaciones contra la explosión de materia prima del MRP — lo que pedía Iván: "el MRP me tiene que decir… no tienes esto para producirlo, falta la materia prima".

Las 8 desviaciones se explican por **faltantes** que forzaron compras de emergencia:

| Artículo | Faltante | En trámite | Urgencia |
|---|---|---|---|
| FRIJOL NEGRO 2024 | 22,689 kg | 0 kg | 🔴 paro de línea |
| TARIMA CHEP | 25 pz | 0 pz | 🟡 logística |
| PIMIENTA MOLIDA | 1 bulto | 0 | 🟡 mezcla |

¿Qué faltantes confirmas para armar la requisición? (puedes elegir varios)`;

	const A3 = `Con esos faltantes la requisición necesita sus datos de compra. La explosión ya calculó la cantidad y el **lead time** correcto según origen: **nacional** (FRIJOL NEGRO 2024, 3 semanas) e **importación** (TARIMA CHEP, 9 semanas).

Captura los datos de la compra directa para fincar la requisición:`;

	const A4 = `La requisición quedó así:

\`\`\`
REQ-2026-07-114   FRIJOL NEGRO 2024   22,689 kg   ≈ $1.9M
\`\`\`

El importe **supera el tope de presupuesto** del periodo, así que requiere **autorización extraordinaria de finanzas** (no se opera sin presupuesto). El agente es read-only por defecto: la escritura queda pausada hasta tu decisión.`;

	const A5 = `Con el alta autorizada, para fincar la orden de compra revisé el **historial real de compras de julio** (qué proveedor surtió y por cuánto). Tengo tres opciones; si prefieres otro, escríbelo:`;

	const A6 = `Elegido. Ahora, para configurar la **política de consumo por familia** (hoy son 4 semanas tras el ingreso), el sistema permite ajustar cuántas semanas se le da a cada material para consumirse antes de marcarlo como lento.`;

	const A7 = `Con esa política configurada, al comparar contra el forecast detecté que un cliente **subió su pedido**: el recálculo al alza afecta a 2 materiales y adelanta 1 compra a la semana 9.`;

	const A8 = `El plan queda listo a **3 meses** (presupuesto + liberación por mes). Por la sábana de autorización: **planeación propone → finanzas autoriza → compras ejecuta**.`;

	const A9 = `Para ejecutar la escritura de la orden de compra en el ERP, el agente necesita acceso a tu **sistema de finanzas** (la sesión actual no tiene conexión autorizada).`;

	const A10 = `Todo listo. Resumen de la sábana:

| Paso | Estatus |
|---|---|
| Presupuesto julio | 8 🔴 detectadas |
| Faltantes MRP | confirmados |
| Requisición REQ-2026-07-114 | ≈ $1.9M |
| Autorización finanzas | extraordinaria ✅ |
| Proveedor | RG COMPAÑIA BENEFICIADORA |
| Plan 3 meses | 2 meses liberados |

Confirma el alta final de la orden de compra (si no respondes, continúo con la política por defecto):`;

	const A11 = `## Orden de compra emitida ✅

- **OC-2026-07-221** — FRIJOL NEGRO 2024, 22,689 kg ≈ $1.9M
- Proveedor: **RG COMPAÑIA BENEFICIADORA**
- Estatus: **pendiente de autorización de finanzas** (presupuesto)
- Arribo estimado: semana 9

El cruce presupuesto → faltante → autorización quedó documentado para la revisión de mañana. Te aviso en cuanto finanzas la autorice. ¿Algo más?`;

	const REASONING: Record<number, string> = {
		1: "Plan de la consulta: detecto el periodo activo (julio) → agrego Compra por Ejercicio/Periodo y por proveedor → cruzo contra el presupuesto para aislar solo las desviaciones, como pidió finanzas.",
		2: "Causa raíz: las desviaciones se explican por faltantes de materia prima. Uso la explosión del MRP y cruzo contra los artículos sobre presupuesto para priorizar.",
		3: "Requisición: armo las líneas con la cantidad faltante y el lead time según origen (nacional/importación) del MRP.",
		4: "Escritura: el importe supera el tope → requiere autorización extraordinaria de finanzas. Por política, las escrituras se pausan y esperan tu confirmación.",
		5: "Proveedor: reviso el historial real de compras de julio y sugiero tres opciones con su volumen.",
		6: "Política de consumo: propongo semanas de cobertura para granos según la rotación por familia (hoy 4).",
		7: "Recálculo: al subir el forecast, recalculé necesidades y detecté materiales que cambian y una compra que se adelanta a la semana 9.",
		8: "Plan a 3 meses: libero por mes; la sábana de autorización registra cada paso (planeación → finanzas → compras).",
		9: "Escritura: la conexión a finanzas no está autorizada en esta sesión; pauso hasta que el usuario conecte.",
		10: "Cierre: consolido la sábana y confirmo el alta. Si no hay respuesta, continúo con la política por defecto.",
		11: "Resumen final de la OC emitida con su estatus y próximo paso.",
	};

	const EVIDENCE: Record<number, { label: string; kb: string }> = {
		1: { label: "Consultando el ERP…", kb: "30.9 KB" },
		2: { label: "Calculando faltantes…", kb: "30.9 KB" },
		3: { label: "Armando requisición…", kb: "37.6 KB" },
		4: { label: "Validando autorización…", kb: "2.4 KB" },
		5: { label: "Historial de proveedores…", kb: "12.1 KB" },
		6: { label: "Tabla de rotación por familia…", kb: "8.3 KB" },
		7: { label: "Recalculando forecast…", kb: "18.7 KB" },
		8: { label: "Plan a 3 meses…", kb: "5.9 KB" },
		9: { label: "Solicitando conexión…", kb: "1.2 KB" },
		10: { label: "Consolidando sábana…", kb: "9.4 KB" },
		11: { label: "Generando OC…", kb: "4.1 KB" },
	};

	const LABELS: Record<number, string> = {
		1: "Sigma está consultando el presupuesto…",
		2: "Sigma está cruzando faltantes del MRP…",
		3: "Sigma está armando la requisición…",
		4: "Sigma está validando la autorización…",
		5: "Sigma está revisando el historial de proveedores…",
		6: "Sigma está configurando la política de consumo…",
		7: "Sigma está recalculando el forecast…",
		8: "Sigma está liberando el plan…",
		9: "Sigma está solicitando la conexión…",
		10: "Sigma está consolidando la sábana…",
		11: "Sigma está generando la OC…",
	};

	// Leyenda del atlas: el catálogo completo de tipos HITL.
	const ATLAS = [
		"Pregunta con opciones",
		"Selección múltiple",
		"Formulario",
		"Aprobación de escritura",
		"Atajos + texto libre",
		"Cantidad",
		"Sí / No",
		"Omitible",
		"Autorización de conexión",
		"Timeout / auto-cancel",
	];

	// ─── Configuración de las gates (una por tipo) ──────────────────────────
	type Choice = { value: string; label: string; hint?: string; style?: "primary" | "outline" | "danger" };
	type Field = {
		name: string;
		label: string;
		type?: "text" | "number" | "date";
		placeholder?: string;
		min?: number;
		max?: number;
		options?: { value: string; label: string }[];
	};
	type GateCfg = {
		variant: "single" | "multiple" | "number" | "form" | "approval" | "boolean";
		badge: string;
		title: string;
		description: string;
		choices?: Choice[];
		fields?: Field[];
		freeform?: boolean;
		dismissable?: boolean;
		numberMin?: number;
		numberMax?: number;
		numberDefault?: number;
		timeoutMs?: number | null;
		userText?: (summary: string) => string;
	};

	const GATES: Record<number, GateCfg> = {
		1: {
			variant: "single",
			badge: "Pregunta con opciones",
			title: "¿Cómo enfoco la revisión de las desviaciones?",
			description: "8 artículos sobre presupuesto en julio 2026. Tu respuesta reanuda el turno.",
			choices: [
				{ value: "criticos", label: "Solo los críticos", hint: "desviación > +150%" },
				{ value: "causa", label: "Causa raíz", hint: "cruce con faltantes del MRP" },
				{ value: "proveedor", label: "Por proveedor", hint: "top del gasto" },
			],
		},
		2: {
			variant: "multiple",
			badge: "Selección múltiple",
			title: "¿Qué faltantes confirmas para la requisición?",
			description: "El agente ya verificó existencias: ninguno de estos artículos tiene cobertura.",
			choices: [
				{ value: "frijol", label: "FRIJOL NEGRO 2024", hint: "22,689 kg · 🔴 paro de línea" },
				{ value: "tarima", label: "TARIMA CHEP", hint: "25 pz · 🟡 logística" },
				{ value: "pimienta", label: "PIMIENTA MOLIDA", hint: "1 bulto · 🟡 mezcla" },
			],
		},
		3: {
			variant: "form",
			badge: "Formulario",
			title: "Captura los datos de la compra directa",
			description: "El agente necesita estos campos para fincar la orden.",
			fields: [
				{
					name: "material",
					label: "Material",
					options: [
						{ value: "frijol", label: "FRIJOL NEGRO 2024" },
						{ value: "tarima", label: "TARIMA CHEP" },
						{ value: "pimienta", label: "PIMIENTA MOLIDA" },
					],
				},
				{ name: "cantidad", label: "Cantidad", type: "number", min: 1, placeholder: "Ej. 22689" },
				{
					name: "unidad",
					label: "Unidad",
					options: [
						{ value: "kg", label: "Kilogramo" },
						{ value: "pz", label: "Pieza" },
						{ value: "bulto", label: "Bulto" },
					],
				},
				{ name: "fecha", label: "Fecha requerida", type: "date" },
			],
		},
		4: {
			variant: "approval",
			badge: "Aprobación de escritura",
			title: "¿Autorizas la escritura en el ERP?",
			description: "La requisición excede el tope de presupuesto y requiere autorización extraordinaria de finanzas.",
			choices: [
				{ value: "autorizar", label: "Autorizar el alta", style: "primary" },
				{ value: "ajustar", label: "Ajustar cantidades", style: "outline" },
				{ value: "cancelar", label: "Cancelar operación", style: "danger" },
			],
		},
		5: {
			variant: "single",
			badge: "Atajos + texto libre",
			title: "¿Con qué proveedor cotizamos el frijol negro?",
			description: "Sugerencia por historial real de compras de julio 2026. Puedes elegir o escribir otro.",
			choices: [
				{ value: "rg", label: "RG COMPAÑIA BENEFICIADORA", hint: "Granos · $27.1M en julio" },
				{ value: "leticia", label: "LETICIA MARQUEZ VALENZUELA", hint: "Granos · $42.7M en julio" },
				{ value: "vaca", label: "ALMACENES VACA", hint: "Granos · $17.2M en julio" },
			],
			freeform: true,
		},
		6: {
			variant: "number",
			badge: "Cantidad",
			title: "¿Cuántas semanas de cobertura configuramos para granos?",
			description: "La rotación por familia hoy usa 4 semanas. Configura el nuevo periodo (1 a 8 semanas).",
			numberMin: 1,
			numberMax: 8,
			numberDefault: 4,
		},
		7: {
			variant: "boolean",
			badge: "Sí / No",
			title: "¿Autorizas el recálculo del plan al alza?",
			description: "El forecast subió y el recálculo adelanta 1 compra a la semana 9.",
			choices: [
				{ value: "si", label: "Sí, autorizar el recálculo", style: "primary" },
				{ value: "no", label: "No, mantener el plan", style: "outline" },
			],
		},
		8: {
			variant: "single",
			badge: "Omitible",
			title: "¿Libero los primeros 2 meses para ejecución de OC?",
			description: "Pregunta opcional: si prefieres, continúa sin responder y el agente sigue la revisión.",
			choices: [
				{ value: "liberar", label: "Sí, liberar los 2 meses" },
				{ value: "revisar", label: "Revisar mes por mes" },
			],
			dismissable: true,
		},
		9: {
			variant: "single",
			badge: "Autorización de conexión",
			title: "Conectar Finanzas",
			description: "OAuth con código de dispositivo. Se muestra aparte (tarjeta de autorización).",
			choices: [],
		},
		10: {
			variant: "approval",
			badge: "Timeout / auto-cancel",
			title: "¿Confirmas el alta de la orden de compra?",
			description: "Ventana de gracia de 12 s: si no respondes, el agente continúa con la política por defecto.",
			choices: [
				{ value: "confirmar", label: "Confirmar el alta", style: "primary" },
				{ value: "pendiente", label: "Dejar pendiente", style: "outline" },
				{ value: "cancelar", label: "Cancelar", style: "danger" },
			],
			timeoutMs: 12000,
		},
	};

	// ─── Chat scripteado (streaming) ────────────────────────────────────────
	const chat = createChat()
		.user(PROMPT)
		.sleep(900)
		.assistant(A1)
		.user("")
		.sleep(650)
		.assistant(A2)
		.user("")
		.sleep(650)
		.assistant(A3)
		.user("")
		.sleep(650)
		.assistant(A4)
		.user("")
		.sleep(650)
		.assistant(A5)
		.user("")
		.sleep(650)
		.assistant(A6)
		.user("")
		.sleep(650)
		.assistant(A7)
		.user("")
		.sleep(650)
		.assistant(A8)
		.user("")
		.sleep(650)
		.assistant(A9)
		.user("")
		.sleep(650)
		.assistant(A10)
		.user("")
		.sleep(650)
		.assistant(A11);

	// ─── Estados del demo ───────────────────────────────────────────────────
	let assistantCount = $state(0);
	let currentGate = $state<number | null>(null);
	let gatePhase = $state<"gWait" | "gate">("gWait");
	let done = $state(false);

	const isGatePhase = $derived(currentGate !== null);
	// Patrón de scroll = /demo (sin autoScroll): el mensaje del usuario es el
	// ancla → al responder una gate, tu respuesta queda ARRIBA del viewport y la
	// respuesta del agente genera debajo sin mover la vista. La flecha ↓ lleva
	// badge ámbar cuando hay una pregunta pendiente abajo.

	const gateSeen = (n: number) => assistantCount >= n;
	const toolRowFor = (n: number) =>
		currentGate === n ? (gatePhase === "gWait" ? "generating" : "waiting") : null;

	const phaseLabel = $derived.by(() => {
		if (done) return "Turno completado · 10 preguntas resueltas";
		if (currentGate !== null) return "Sigma pausó el turno y espera tu decisión";
		if (assistantCount === 0) return "Iniciando sesión del agente…";
		return LABELS[assistantCount + 1] ?? "Sigma está trabajando…";
	});

	const ASK_GENERATING_MS = 2000;

	function enterGate(n: number) {
		currentGate = n;
		gatePhase = "gWait";
		setTimeout(() => {
			if (currentGate === n) gatePhase = "gate";
		}, ASK_GENERATING_MS);
	}

	const initialMessages = chat.get({ count: 0 });
	const transport = chat.transport({ chunkDelayMs: 20 });
	const chatState = new Chat({
		messages: initialMessages,
		transport,
		onFinish: () => {
			assistantCount += 1;
			if (assistantCount <= 10) enterGate(assistantCount);
			else done = true;
		},
	});

	const isBusy = $derived(chatState.status === "submitted" || chatState.status === "streaming");

	onMount(() => {
		const first = chat.next({ after: [] });
		if (first) void chatState.sendMessage(first);
	});

	function sendScriptedUser(text: string) {
		const next = chat.next({ after: chatState.messages });
		if (!next) return;
		next.parts = [{ type: "text", text }];
		void chatState.sendMessage(next);
	}

	function answerGate(n: number, summary: string) {
		currentGate = null;
		const text = GATES[n].userText ? GATES[n].userText!(summary) : summary;
		sendScriptedUser(text);
	}

	function resetConversation() {
		assistantCount = 0;
		currentGate = null;
		gatePhase = "gWait";
		done = false;
		chatState.messages = [];
		const first = chat.next({ after: [] });
		if (first) void chatState.sendMessage(first);
	}

	// ─── Línea de tiempo del transcript ─────────────────────────────────────
	type TimelineItem =
		| { kind: "message"; message: (typeof chatState.messages)[number] }
		| { kind: "gate"; gate: number; tool: "generating" | "waiting" | null }
		| { kind: "reasoning"; turn: number; text: string; streaming: boolean }
		| { kind: "evidence"; turn: number; label: string; kb: string };

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
						streaming: !done && currentGate === null && assistants === assistantCount + 1,
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
			if (gateSeen(assistants) && assistants <= 10) {
				items.push({ kind: "gate", gate: assistants, tool: toolRowFor(assistants) });
			}
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
</script>

<svelte:head>
	<title>Sigma — Atlas HITL (todos los tipos)</title>
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<!-- Header -->
	<div class="flex h-9 shrink-0 items-center justify-between px-3">
		<div class="flex items-center gap-2">
			<BotIcon class="size-3.5 text-muted-foreground" />
			<span class="text-xs font-medium">Sigma · Atlas HITL — todos los tipos</span>
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
			<!-- Leyenda: catálogo completo de tipos HITL -->
			<div class="flex shrink-0 items-center gap-2 overflow-x-auto border-b px-3 py-2">
				<span class="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					<LayoutGridIcon class="size-3" /> 10 tipos HITL
				</span>
				<div class="flex gap-1.5">
					{#each ATLAS as name (name)}
						<span
							class="shrink-0 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
							>{name}</span
						>
					{/each}
				</div>
			</div>

			<!-- Estado del agente -->
			<div class="flex h-7 shrink-0 items-center gap-2 border-b px-3">
				{#if done}
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
								{#if item.tool}<AskToolRow
										status={item.tool}
										generatingLabel={item.gate === 9 ? "Solicitando autorización…" : undefined}
										waitingLabel={item.gate === 9 ? "Esperando tu autorización…" : undefined}
									/>{/if}
								{#if item.tool !== "generating"}
								<div
									class="animate-in rounded-xl border bg-card p-4 fade-in-0 slide-in-from-bottom-2 duration-300"
								>
									<div class="mb-3 flex items-center justify-between gap-2">
										<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
											{#if item.gate === 9}
												<ShieldCheckIcon class="size-3.5" />
												Autorización requerida
											{:else}
												<MessageCircleQuestionIcon class="size-3.5" />
												Pregunta del agente
											{/if}
										</p>
										<div class="flex items-center gap-1.5">
											<span
												class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
												>{GATES[item.gate].badge}</span
											>
											{#if item.tool}
												<span
													class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600"
													>Turno pausado</span
												>
											{/if}
										</div>
									</div>

									{#if item.gate === 9}
										<AuthorizationCard
											name="Finanzas"
											description="El agente necesita acceso a tu sistema de finanzas para ejecutar la escritura de la orden de compra."
											userCode="ICF-3F7A"
											oncomplete={() => answerGate(9, "Conexión autorizada")}
										/>
									{:else}
										{@const gate = GATES[item.gate]}
										<AtlasGate
											variant={gate.variant}
											title={gate.title}
											description={gate.description}
											choices={gate.choices ?? []}
											fields={gate.fields ?? []}
											freeform={gate.freeform ?? false}
											dismissable={gate.dismissable ?? false}
											numberMin={gate.numberMin}
											numberMax={gate.numberMax}
											numberDefault={gate.numberDefault}
											timeoutMs={gate.timeoutMs ?? null}
											onsubmit={(summary) => answerGate(item.gate, summary)}
											ondismiss={() => answerGate(item.gate, "Sigue con la revisión (omito)")}
											onexpire={() => answerGate(item.gate, "⏱️ Sin respuesta — continúa por defecto")}
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
				Atlas de la fábrica: cada gate demuestra un tipo distinto de HITL del agente Sigma
				(contrato Eve ↔ Copilot ↔ Questionnaire), mapeado a requerimientos reales de ICF.
				Ver <code class="rounded bg-muted px-1 py-0.5">docs/icf/hitl-tipos.md</code>.
			</div>
		</div>
	</MessageScroller.Provider>
</div>
