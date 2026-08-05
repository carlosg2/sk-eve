<script lang="ts" module>
	export interface ToolOutputProps {
		class?: string;
		output?: unknown;
		errorText?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils";

	const MAX_DISPLAY = 6000;

	let { class: className = "", output, errorText }: ToolOutputProps = $props();

	let shouldRender = $derived(!!(output !== undefined && output !== null) || !!errorText);
	let formatted = $derived.by(() => {
		if (errorText) return errorText;
		let s: string;
		try {
			s = JSON.stringify(output, null, 2);
		} catch {
			s = String(output);
		}
		return s.length > MAX_DISPLAY ? `${s.slice(0, MAX_DISPLAY)}\n… (truncado — ver inspector)` : s;
	});
</script>

{#if shouldRender}
	<div class={cn("space-y-2 p-4", className)}>
		<h4 class="text-muted-foreground text-xs font-medium tracking-wide uppercase">{errorText ? "Error" : "Resultado"}</h4>
		<pre
			class={cn(
				"max-h-60 overflow-auto rounded-md p-3 font-mono text-xs",
				errorText ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-foreground",
			)}
		>{formatted}</pre>
	</div>
{/if}
