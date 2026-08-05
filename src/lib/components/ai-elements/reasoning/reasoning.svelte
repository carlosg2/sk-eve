<script lang="ts" module>
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";
	import type { Snippet } from "svelte";

	export interface ReasoningProps extends CollapsiblePrimitive.RootProps {
		children?: Snippet;
		/**
		 * true mientras el modelo está razonando. Auto-expande al empezar a
		 * razonar y auto-colapsa cuando ese bloque termina.
		 */
		isStreaming?: boolean;
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
		isStreaming = false,
		...restProps
	}: ReasoningProps = $props();

	// `open` se controla explícitamente: inicia desde `isStreaming` (el bloque
	// monta con el razonamiento en curso, así que debe abrir de entrada) y
	// `watch` (runed) lo mantiene sincronizado en cada cambio — sin `$effect`.
	// El usuario puede alternarlo con el trigger vía `onOpenChange`.
	let isOpen = $state(isStreaming);
	watch([() => isStreaming], ([streaming]) => {
		isOpen = streaming;
	});
</script>

<Collapsible.Root
	bind:ref
	open={isOpen}
	onOpenChange={(o) => (isOpen = o)}
	class={cn("border-border/70 bg-muted/20 overflow-hidden rounded-lg border", className)}
	{...restProps}
>
	{@render children?.()}
</Collapsible.Root>
