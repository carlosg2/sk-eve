<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";

	// Réplica de la tool row de ask_user en Copilot:
	// "Asking a question..." → "Waiting for answer..." → (oculta tras completar).
	// `generatingLabel` / `waitingLabel` permiten contexto distinto (p. ej. la
	// autorización de conexión: "Solicitando autorización…").
	let {
		status = "generating",
		generatingLabel = "Generando la pregunta…",
		waitingLabel = "Esperando tu respuesta…",
	}: {
		status?: "generating" | "waiting" | "answered";
		generatingLabel?: string;
		waitingLabel?: string;
	} = $props();
</script>

<div
	data-slot="ask-tool-row"
	class="flex animate-in items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs fade-in-0 slide-in-from-bottom-1 duration-200"
>
	{#if status === "generating"}
		<span class="shimmer text-muted-foreground">{generatingLabel}</span>
	{:else if status === "waiting"}
		<span class="shimmer text-amber-600/90">{waitingLabel}</span>
	{:else}
		<span class="flex items-center gap-1.5 text-muted-foreground">
			<CheckIcon class="size-3.5 text-emerald-500" />
			Pregunta respondida
		</span>
	{/if}
</div>
