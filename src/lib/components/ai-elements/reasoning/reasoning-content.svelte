<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ReasoningContentProps {
		/** Texto de razonamiento acumulado (cadena de pensamiento del modelo). */
		content?: string;
		isStreaming?: boolean;
		class?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import { cn } from "$lib/utils";
	import { watch } from "runed";

	let { class: className = "", content = "", isStreaming = false, children }: ReasoningContentProps = $props();

	let preRef = $state<HTMLPreElement | null>(null);
	// Autoscroll: mientras se escribe el razonamiento, baja el scroll del bloque
	// para ir mostrando lo que se va generando. `watch` (runed) con deps
	// explícitas en vez de `$effect`.
	watch([() => preRef, () => content, () => isStreaming], () => {
		const el = preRef;
		if (el && isStreaming) el.scrollTop = el.scrollHeight;
	});
</script>

<Collapsible.Content class={cn("border-border/70 border-t", className)}>
	<div class="bg-muted/40 px-3 py-2">
		{#if content}
			<pre
				bind:this={preRef}
				class="text-muted-foreground max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed"
			>{content}{isStreaming ? "▌" : ""}</pre>
		{:else if isStreaming}
			<p class="text-muted-foreground text-[11px] italic">Pensando…</p>
		{/if}
		{@render children?.()}
	</div>
</Collapsible.Content>
