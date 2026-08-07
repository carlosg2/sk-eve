<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="message-content"
	class={cn(
		// NOTA: NO aplicar `self-end` a los hijos via `*:data-slot` — eso impedía
		// que el bubble-group se estirara a todo el ancho y el bubble (`w-fit`)
		// colapsaba a min-content (mensajes de usuario angostos partidos en
		// varias líneas). La alineación a la derecha la hace el propio
		// `Bubble.Root` con `data-[align=end]:self-end`.
		"flex w-full min-w-0 flex-col gap-2.5 wrap-break-word",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
