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
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		assistantVariant?: BubbleVariant;
		collapsible?: boolean;
		message: MessageAnimatedMessage;
		scrollAnchor?: boolean;
		userVariant?: BubbleVariant;
	} = $props();

	const isUserMessage = $derived(message.role === "user");
	const textParts = $derived(getMessageAnimatedTextParts(message));
	const fullText = $derived(textParts.map((part) => part.text).join("\n\n"));
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
		message: MessageAnimatedMessage
	): MessageAnimatedTextPart[] {
		if (message.parts) {
			return message.parts.flatMap((part, index) => {
				if (part.type !== "text" || typeof part.text !== "string") {
					return [];
				}

				return [{ key: `${message.id}-${index}`, text: part.text }];
			});
		}

		return typeof message.text === "string"
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
