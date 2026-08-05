<script lang="ts" module>
	import type { ToolUIPartState } from "./tool.svelte";

	export interface ToolHeaderProps {
		type: string;
		state: ToolUIPartState;
		class?: string;
	}
</script>

<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import { cn } from "$lib/utils";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import CircleIcon from "@lucide/svelte/icons/circle";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import XCircleIcon from "@lucide/svelte/icons/x-circle";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

	let { type, state, class: className, ...restProps }: ToolHeaderProps = $props();

	let meta = $derived.by(() => {
		const labels = {
			"input-streaming": "Pendiente",
			"input-available": "Ejecutando",
			"output-available": "Completado",
			"output-error": "Error",
		} as const;
		const icons = {
			"input-streaming": CircleIcon,
			"input-available": ClockIcon,
			"output-available": CheckCircleIcon,
			"output-error": XCircleIcon,
		} as const;
		return { label: labels[state], Icon: icons[state] };
	});
</script>

<Collapsible.Trigger class={cn("group w-full", className)} {...restProps}>
	{#snippet child({ props })}
		<button {...props} class="flex w-full items-center justify-between gap-4 p-3 text-left">
			<div class="flex min-w-0 items-center gap-2">
				<WrenchIcon class="text-muted-foreground size-4 shrink-0" />
				<span class="truncate text-sm font-medium">{type}</span>
				<Badge class="gap-1.5 rounded-full text-xs" variant={state === "output-error" ? "destructive" : "secondary"}>
					<svelte:component
						this={meta.Icon}
						class={cn(
							"size-3.5",
							state === "input-available" && "animate-pulse",
							state === "output-available" && "text-green-600",
							state === "output-error" && "text-red-600",
						)}
					/>
					{meta.label}
				</Badge>
			</div>
			<ChevronDownIcon class="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
		</button>
	{/snippet}
</Collapsible.Trigger>
