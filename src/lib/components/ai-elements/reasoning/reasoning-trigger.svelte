<script lang="ts" module>
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";

	export interface ReasoningTriggerProps extends CollapsiblePrimitive.TriggerProps {
		/** Texto cuando NO está razonando. */
		label?: string;
		/** Texto mientras razona. */
		streamingLabel?: string;
		isStreaming?: boolean;
	}
</script>

<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import BrainIcon from "@lucide/svelte/icons/brain";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import { cn } from "$lib/utils";

	let {
		class: className,
		label = "Razonamiento",
		streamingLabel = "Pensando…",
		isStreaming = false,
		...restProps
	}: ReasoningTriggerProps = $props();
</script>

<Collapsible.Trigger class={cn("w-full", className)} {...restProps}>
	{#snippet child({ props })}
		<button
			{...props}
			class="group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			<span class="flex items-center gap-1.5">
				<BrainIcon class="size-3.5" />
				{isStreaming ? streamingLabel : label}
			</span>
			{#if isStreaming}
				<LoaderCircleIcon class="size-3.5 animate-spin text-primary" />
			{:else}
				<ChevronDownIcon
					class="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
				/>
			{/if}
		</button>
	{/snippet}
</Collapsible.Trigger>
