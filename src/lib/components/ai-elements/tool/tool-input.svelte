<script lang="ts" module>
	export interface ToolInputProps {
		class?: string;
		input: unknown;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils";

	const MAX_DISPLAY = 6000;

	let { class: className = "", input }: ToolInputProps = $props();

	let formatted = $derived.by(() => {
		let s: string;
		try {
			s = JSON.stringify(input ?? {}, null, 2);
		} catch {
			s = String(input ?? "");
		}
		return s.length > MAX_DISPLAY ? `${s.slice(0, MAX_DISPLAY)}\n… (truncado — ver inspector)` : s;
	});
</script>

<div class={cn("space-y-2 overflow-hidden p-4", className)}>
	<h4 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Parámetros</h4>
	<pre class="text-muted-foreground bg-muted/50 max-h-60 overflow-auto rounded-md p-3 font-mono text-xs">{formatted}</pre>
</div>
