<script lang="ts">
	import { cn } from "$lib/utils.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as Bubble from "$lib/components/ui/bubble/index.js";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Message from "$lib/components/ui/message/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import type { BubbleVariant } from "$lib/components/ui/bubble/bubble.svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { Markdown } from "$lib/components/ai/markdown/index.js";
	import {
		extractVoiceSections,
		extractNarratedEntity,
		highlightNarratedEntity,
		normalizeNameKey,
		extractSpokenAmounts,
		highlightSpokenAmounts,
		textContainsAmount
	} from "$lib/realtime/chat-voice";
	import CheckIcon from "@lucide/svelte/icons/check";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import ThumbsDownIcon from "@lucide/svelte/icons/thumbs-down";
	import ThumbsUpIcon from "@lucide/svelte/icons/thumbs-up";

	type MessageAnimatedPart = {
		type: string;
		text?: string;
	};

	type MessageAnimatedMessage = {
		id: string;
		role: string;
		text?: string;
		parts?: ReadonlyArray<MessageAnimatedPart>;
	};

	type MessageAnimatedTextPart = {
		key: string;
		text: string;
	};

	type Feedback = "up" | "down" | null;

	const PREVIEW_LENGTH = 240;

	let {
		message,
		assistantVariant = "ghost",
		scrollAnchor,
		userVariant = "muted",
		collapsible = true,
		class: className,
		stripVoiceSections = false,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		assistantVariant?: BubbleVariant;
		collapsible?: boolean;
		message: MessageAnimatedMessage;
		scrollAnchor?: boolean;
		stripVoiceSections?: boolean;
		userVariant?: BubbleVariant;
	} = $props();

	const isUserMessage = $derived(message.role === "user");
	const textParts = $derived(getMessageAnimatedTextParts(message, stripVoiceSections));
	const fullText = $derived(textParts.map((part) => part.text).join("\n\n"));

	// ── Resaltado interactivo de la entidad narrada (voz = pantalla) ─────────
	// La entidad se conoce cuando el SPEECH del mensaje se completa. Pero el
	// resaltado NO es un flash que se desvanece: se PRENDE mientras la voz
	// narra la entidad (evento `narrate:start` de la capa de voz) y se APAGA
	// cuando el audio termina (`narrate:end`). Así la fila/celda queda encendida
	// exactamente durante la narración. La NEGRITA determinista sí permanece.
	let narrateRoot = $state<HTMLElement | null>(null);
	let narrating = $state(false);

	const rawText = $derived(
		stripVoiceSections
			? message.parts
				? message.parts
						.filter((p) => p.type === "text" && typeof p.text === "string")
						.map((p) => (p as { text?: string }).text ?? "")
						.join("\n")
				: (message.text ?? "")
			: ""
	);
	const narratedEntity = $derived.by(() => {
		if (!stripVoiceSections || !rawText) return null;
		try {
			const { speech, rest } = extractVoiceSections(rawText);
			return speech ? extractNarratedEntity(speech, rest) : null;
		} catch {
			return null;
		}
	});
	// Cantidades que la voz narra ("casi diez millones", "54 millones", "84") —
	// para el flash sincronizado sobre los spans que contienen el número exacto.
	const narratedAmounts = $derived.by(() => {
		if (!stripVoiceSections || !rawText) return [];
		try {
			const { speech } = extractVoiceSections(rawText);
			return speech ? extractSpokenAmounts(speech) : [];
		} catch {
			return [];
		}
	});

	$effect(() => {
		const host = narrateRoot;
		const entity = narratedEntity;
		const amounts = narratedAmounts;
		const active = narrating;
		if (!host) return;
		const key = entity ? normalizeNameKey(entity) : "";
		try {
			const apply = () => {
				if (!active) return;
				for (const el of Array.from(host.querySelectorAll<HTMLElement>("tr, span[data-streamdown-strong]"))) {
					if (el.classList.contains("narrate-flash")) continue;
					const isRow = el.tagName === "TR";
					const t = el.textContent ?? "";
					// Matching tolerante: la voz dice el nombre corto, la tabla la razón
					// social en mayúsculas → comparar con normalizeNameKey.
					const byEntity = key !== "" && normalizeNameKey(t).includes(key);
					// Cantidades SOLO en spans (no en filas: el tr incluye códigos tipo
					// "PP-0084" cuyo token "0084" falsearía el match numérico).
					const byAmount = !isRow && amounts.length > 0 && textContainsAmount(t, amounts);
					if (byEntity || byAmount) el.classList.add("narrate-flash");
				}
			};
			const clear = () => {
				for (const el of Array.from(host.querySelectorAll<HTMLElement>(".narrate-flash"))) {
					el.classList.remove("narrate-flash");
				}
			};
			const onStart = () => {
				narrating = true;
			};
			const onEnd = () => {
				narrating = false;
			};
			window.addEventListener("narrate:start", onStart);
			window.addEventListener("narrate:end", onEnd);
			// Estado actual (re-corre al cambiar narrating/narratedEntity/amounts/root):
			// encendido mientras narra, apagado en cuanto termina (o sin voz).
			// El apply corre con entidad O cantidades (un SPEECH puede narrar solo
			// números: "compraste casi 54 millones…" sin nombre propio → key vacío).
			if (active && (key !== "" || amounts.length > 0)) apply();
			else clear();
			return () => {
				window.removeEventListener("narrate:start", onStart);
				window.removeEventListener("narrate:end", onEnd);
			};
		} catch {
			/* noop: cosmético, nunca romper el render */
		}
	});
	const isLong = $derived(fullText.length > PREVIEW_LENGTH);
	// Si el mensaje contiene una tabla GFM (fila separadora `|---|`), NO se
	// colapsa: el preview recortado cortaría la tabla a la mitad. Se renderiza
	// completa siempre.
	const hasTable = $derived(/\|[\s:]*---+[\s:]*\|/.test(fullText));

	let collapsibleOpen = $state(false);
	let copied = $state(false);
	let feedback = $state<Feedback>(null);

	async function copyText() {
		try {
			await navigator.clipboard.writeText(fullText);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// clipboard no disponible
		}
	}

	function toggleFeedback(value: Exclude<Feedback, null>) {
		feedback = feedback === value ? null : value;
	}

	function getMessageAnimatedTextParts(
		message: MessageAnimatedMessage,
		stripVoiceSections: boolean
	): MessageAnimatedTextPart[] {
		// `stripVoiceSections` (mensajes del asistente): el SPEECH puede venir en
		// una PARTE distinta a la tabla, así que se procesa el mensaje COMPLETO
		// como una unidad: se extrae la narración (SPEECH/INSIGHT) → se oculta de
		// la burbuja (rest) → y se resalta en negrita la ENTIDAD que la voz dice
		// (fila completa en tablas, prosa en el resto).
		if (stripVoiceSections) {
			const raw = message.parts
				? message.parts
						.filter((p) => p.type === "text" && typeof p.text === "string")
						.map((p) => (p as { text?: string }).text ?? "")
						.join("\n")
				: (message.text ?? "");
			const { speech, rest } = extractVoiceSections(raw);
			// Resaltado determinista voz = pantalla: primero la ENTIDAD que la voz
			// narra, luego las CANTIDADES ("casi diez millones" ↔ "9,868,562").
			let text = speech ? highlightNarratedEntity(rest, speech) : rest;
			if (speech) text = highlightSpokenAmounts(text, speech);
			return text.trim() ? [{ key: `${message.id}-narrated`, text }] : [];
		}
		// Sin strip (mensajes del usuario o asistentes sin canal de voz): por partes.
		if (message.parts) {
			return message.parts.flatMap((part, index) => {
				if (part.type !== "text" || typeof part.text !== "string") {
					return [];
				}
				if (!part.text.trim()) return [];
				return [{ key: `${message.id}-${index}`, text: part.text }];
			});
		}

		return typeof message.text === "string" && message.text.trim()
			? [{ key: `${message.id}-text`, text: message.text }]
			: [];
	}
</script>

<MessageScroller.Item
	messageId={message.id}
	scrollAnchor={scrollAnchor ?? (isUserMessage ? true : undefined)}
	class={cn(isUserMessage && "message-animated-user", className)}
	{...restProps}
>
	<Message.Root align={isUserMessage ? "end" : "start"}>
		<Message.Avatar>
			<Avatar.Root>
				{#if isUserMessage}
					<Avatar.Fallback class="bg-background text-[10px] font-semibold">Yo</Avatar.Fallback>
				{:else}
					<Avatar.Fallback class="bg-primary/10 text-primary">
						<SparklesIcon class="size-4" />
					</Avatar.Fallback>
				{/if}
			</Avatar.Root>
		</Message.Avatar>

		<Message.Content>
			{#if !isUserMessage}
				<Message.Header>Asistente ERP</Message.Header>
			{/if}

			<!-- Host del resaltado interactivo: la entidad que la voz narra se marca
			     con `narrate-flash` en el $effect cuando el SPEECH se completa. -->
			<div class="contents" bind:this={narrateRoot}>
			{#if !isUserMessage && isLong && collapsible && !hasTable}
				<Bubble.Root variant={assistantVariant}>
					<Bubble.Content class="w-full">
						<Collapsible.Root bind:open={collapsibleOpen} class="w-full">
							<!-- Preview colapsado: renderiza el markdown COMPLETO (tablas incluidas) y recorta la altura por CSS. -->
							<div class={cn("relative", !collapsibleOpen && "max-h-40 overflow-hidden")}>
								{#each textParts as part (part.key)}
									<Markdown content={part.text} />
								{/each}
							</div>
							<Collapsible.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="link"
										class="text-muted-foreground mt-1 h-auto gap-1 p-0 text-xs"
									>
										{collapsibleOpen ? "Mostrar menos" : "Mostrar más"}
										<ChevronDownIcon
											class={cn("size-3.5 transition-transform", collapsibleOpen && "rotate-180")}
										/>
									</Button>
								{/snippet}
							</Collapsible.Trigger>
						</Collapsible.Root>
					</Bubble.Content>
				</Bubble.Root>
			{:else}
				<Bubble.Group>
					{#each textParts as part (part.key)}
						<Bubble.Root variant={isUserMessage ? userVariant : assistantVariant}>
							<Bubble.Content>
								{#if isUserMessage}
									<p class="whitespace-pre-wrap">{part.text}</p>
								{:else}
									<Markdown content={part.text} />
								{/if}
							</Bubble.Content>
						</Bubble.Root>
					{/each}
				</Bubble.Group>
			{/if}
			</div>

			{#if !isUserMessage && fullText.trim() !== ''}
				<Message.Footer class="gap-1">
					<Button
						variant="ghost"
						size="icon-xs"
						class="size-6 text-muted-foreground"
						aria-label="Copiar respuesta"
						title="Copiar"
						onclick={copyText}
					>
						{#if copied}
							<CheckIcon class="size-3.5 text-green-600" />
						{:else}
							<CopyIcon class="size-3.5" />
						{/if}
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						class={cn("size-6 text-muted-foreground", feedback === "up" && "text-blue-500")}
						aria-label="Me gusta"
						title="Me gusta"
						onclick={() => toggleFeedback("up")}
					>
						<ThumbsUpIcon class="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						class={cn("size-6 text-muted-foreground", feedback === "down" && "text-red-500")}
						aria-label="No me gusta"
						title="No me gusta"
						onclick={() => toggleFeedback("down")}
					>
						<ThumbsDownIcon class="size-3.5" />
					</Button>
				</Message.Footer>
			{/if}
		</Message.Content>
	</Message.Root>
</MessageScroller.Item>

<style>
	:global(.message-animated-user) {
		animation: message-slide-up 260ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes message-slide-up {
		from {
			opacity: 0;
			transform: translateY(10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.message-animated-user) {
			animation: none;
		}
	}
</style>
