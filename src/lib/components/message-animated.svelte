<script lang="ts">
	import { cn } from "$lib/utils.js";
	import * as Bubble from "$lib/components/ui/bubble/index.js";
	import * as Message from "$lib/components/ui/message/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import type { BubbleVariant } from "$lib/components/ui/bubble/bubble.svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { Markdown } from "$lib/components/ai/markdown/index.js";

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

	let {
		message,
		assistantVariant = "ghost",
		scrollAnchor,
		userVariant = "muted",
		class: className,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		assistantVariant?: BubbleVariant;
		message: MessageAnimatedMessage;
		scrollAnchor?: boolean;
		userVariant?: BubbleVariant;
	} = $props();

	const isUserMessage = $derived(message.role === "user");
	const textParts = $derived(getMessageAnimatedTextParts(message));

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
		<Message.Content>
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
