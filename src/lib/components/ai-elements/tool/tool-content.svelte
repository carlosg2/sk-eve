<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ToolContentProps {
		class?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import { cn } from "$lib/utils";

	let { class: className = "", children }: ToolContentProps = $props();
</script>

<Collapsible.Content class={cn("border-border/70 border-t", className)}>
	{@render children?.()}
</Collapsible.Content>
