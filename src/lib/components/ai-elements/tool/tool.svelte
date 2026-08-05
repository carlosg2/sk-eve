<script lang="ts" module>
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	export type ToolUIPartState = "input-streaming" | "input-available" | "output-available" | "output-error";

	export interface ToolProps extends CollapsiblePrimitive.RootProps {
		children?: Snippet;
		/** Estado del tool: controla auto-open mientras corre y auto-close al completar. */
		status?: ToolUIPartState;
	}
</script>

<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import { cn } from "$lib/utils";
	import { watch } from "runed";

	let {
		class: className,
		children,
		ref = $bindable(null),
		status = "input-available" as ToolUIPartState,
		...restProps
	}: ToolProps = $props();

	// `open` controlado explícitamente: abre si el tool está corriendo al montar
	// (monta con `status` ya en input-available) y se colapsa al completar vía
	// `watch` (runed) — sin `$effect`. El usuario puede alternarlo con el trigger.
	// svelte-ignore state_referenced_locally — la captura inicial es intencional;
	// `watch` mantiene `isOpen` al día en cada cambio de `status`.
	let isOpen = $state(status === "input-available" || status === "input-streaming");
	watch([() => status], ([st]) => {
		isOpen = st === "input-available" || st === "input-streaming";
	});
</script>

<Collapsible.Root
	bind:ref
	open={isOpen}
	onOpenChange={(o) => (isOpen = o)}
	class={cn("border-border/70 bg-background not-prose mb-2 w-full overflow-hidden rounded-md border", className)}
	{...restProps}
>
	{@render children?.()}
</Collapsible.Root>
