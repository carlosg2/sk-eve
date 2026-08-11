<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";

	const GRACE_MS = 8000;
	const items = [{ name: "autoriza", required: true }];
	let remaining = $state(GRACE_MS);
	let expired = $state(false);
	let progress = $derived(remaining / GRACE_MS);

	onMount(() => {
		const interval = setInterval(() => {
			remaining = Math.max(0, remaining - 100);
			if (remaining === 0) expired = true;
		}, 100);
		return () => clearInterval(interval);
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Respuesta entregada al agente", {
			description: `Decisión: ${data.get("autoriza") ?? "—"}`,
		});
	}
</script>

{#if expired}
	<div class="mx-auto max-w-md rounded-xl border bg-card p-4">
		<p class="text-sm">
			<span class="font-medium">⏱️ La pregunta expiró.</span> El agente canceló la
			espera (ventana de gracia de 8 s, como el auto-cancel de Copilot) y continuó con
			la política por defecto: <strong>la compra queda pendiente de autorización de
			finanzas</strong> y se notificó al responsable.
		</p>
	</div>
{:else}
	<div class="mx-auto max-w-md">
		<div class="mb-3 flex items-center justify-between gap-3">
			<p class="text-xs text-muted-foreground">
				El agente espera tu respuesta antes de reanudar…
			</p>
			<span class="text-xs font-medium tabular-nums" role="timer"
				>{Math.ceil(remaining / 1000)} s</span
			>
		</div>
		<div class="mb-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
			<div
				class="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
				style:width="{progress * 100}%"
			></div>
		</div>
		<Questionnaire.Root {items} onsubmit={submit}>
			<Questionnaire.Item name="autoriza" required
				><Questionnaire.Title>¿Autorizas la compra urgente de FRIJOL MEDIA OREJA?</Questionnaire.Title
				><Questionnaire.Description
					>22,689 kg sin trámite en curso; riesgo de paro de línea. Si no respondes a
					tiempo, el agente cancela y continúa por defecto.</Questionnaire.Description
				><Questionnaire.Choices
					><Questionnaire.Choice value="autorizar">Autorizar compra urgente</Questionnaire.Choice
					><Questionnaire.Choice value="escalar">Escalar a dirección</Questionnaire.Choice
					><Questionnaire.Choice value="rechazar">No autorizar</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error /></Questionnaire.Item
			>
			<Questionnaire.Actions
				><Questionnaire.Submit>Responder</Questionnaire.Submit></Questionnaire.Actions
			>
		</Questionnaire.Root>
	</div>
{/if}
