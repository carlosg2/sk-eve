<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";
	import CheckCircleIcon from "@lucide/svelte/icons/circle-check";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import XCircleIcon from "@lucide/svelte/icons/x-circle";

	// Tarjeta de autorización de conexión (part `authorization` de Eve, adaptada
	// al demo): un reto OAuth/device-code ("required" → código + botón de inicio
	// de sesión) que al completarse colapsa a su resultado (conectado/rechazado).
	// El modelo NUNCA ve la URL ni el código; solo la UI (ver docs/icf/hitl-tipos.md).

	let {
		name = "Finanzas",
		description = "El agente necesita acceso a tu sistema de finanzas para ejecutar la escritura de la orden de compra.",
		userCode = "ICF-3F7A",
		oncomplete,
		onreject,
	}: {
		name?: string;
		description?: string;
		userCode?: string;
		oncomplete: () => void;
		onreject?: () => void;
	} = $props();

	let state = $state<"required" | "authorized" | "declined">("required");

	const authorized = $derived(state === "authorized");
	const done = $derived(state !== "required");

	const title = $derived(
		state === "required" ? `Conectar ${name}` : `${name} ${state === "authorized" ? "conectado" : "rechazado"}`
	);
	const detail = $derived(
		state === "required"
			? description
			: state === "authorized"
				? `${name} conectado. El agente ya puede escribir en el ERP con tu sesión.`
				: `${name} rechazado. La escritura queda pendiente; el agente no continuará sin tu autorización.`
	);
</script>

<div
	data-slot="authorization-card"
	class={cn(
		"space-y-3 rounded-lg border p-3",
		authorized
			? "border-emerald-500/30 bg-emerald-500/5"
			: done
				? "border-destructive/30 bg-destructive/5"
				: "border-blue-500/30 bg-blue-500/5"
	)}
>
	<div class="flex items-start gap-3">
		<span
			class={cn(
				"mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
				authorized
					? "bg-emerald-500/10 text-emerald-600"
					: done
						? "bg-destructive/10 text-destructive"
						: "bg-blue-500/10 text-blue-600"
			)}
		>
			{#if authorized}
				<CheckCircleIcon class="size-4" />
			{:else if done}
				<XCircleIcon class="size-4" />
			{:else}
				<KeyRoundIcon class="size-4" />
			{/if}
		</span>
		<div class="min-w-0 flex-1 space-y-2">
			<p class="text-sm font-medium">{title}</p>
			<p class="text-muted-foreground text-sm">{detail}</p>

			{#if state === "required"}
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<span class="text-muted-foreground">Código</span>
					<code class="rounded-md bg-background px-2 py-1 font-mono">{userCode}</code>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button
						href="https://example.com/connect/icf"
						target="_blank"
						rel="noreferrer"
						size="sm"
						onclick={() => {
							state = "authorized";
							oncomplete();
						}}
					>
						<ExternalLinkIcon class="size-4" />
						Iniciar sesión con {name}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={() => {
							state = "declined";
							onreject?.();
						}}
					>
						Rechazar
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
