<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{ name: "mes1", required: true },
		{ name: "mes2", required: true },
		{ name: "mes3", required: true },
	];
	const questions = [
		{
			name: "mes1",
			title: "Mes 1 — Requisiciones de julio",
			choices: [
				["liberar", "Liberar requisiciones"],
				["pendiente", "Dejar pendiente"],
			],
		},
		{
			name: "mes2",
			title: "Mes 2 — Órdenes de compra de agosto",
			choices: [
				["liberar", "Liberar OC"],
				["pendiente", "Dejar pendiente"],
			],
		},
		{
			name: "mes3",
			title: "Mes 3 — Arribos de septiembre",
			choices: [
				["liberar", "Confirmar arribos"],
				["pendiente", "En observación"],
			],
		},
	];
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Plan de compras a 3 meses configurado", {
			description: `Mes 1: ${data.get("mes1") ?? "—"} · Mes 2: ${data.get("mes2") ?? "—"} · Mes 3: ${data.get("mes3") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" defaultItem="mes1" {items} onsubmit={submit}>
	<Questionnaire.Progress class="w-full">
		{#snippet children(state)}
			<div class="mb-2 flex gap-1.5" aria-hidden="true">
				{#each Array(state.total) as _, index (index)}<span
						class={index < state.current
							? "h-1.5 flex-1 rounded-full bg-primary"
							: "h-1.5 flex-1 rounded-full bg-muted"}
					></span>{/each}
			</div>
			<span>Mes {state.current} de {state.total} liberado</span>
		{/snippet}
	</Questionnaire.Progress>
	{#each questions as question (question.name)}<Questionnaire.Item name={question.name} required
			><Questionnaire.Title>{question.title}</Questionnaire.Title><Questionnaire.Choices
				>{#each question.choices as choice (choice[0])}<Questionnaire.Choice value={choice[0]}
						>{choice[1]}</Questionnaire.Choice
					>{/each}</Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>{/each}
	<Questionnaire.Actions
		><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next><Questionnaire.Submit
			>Terminar plan</Questionnaire.Submit
		></Questionnaire.Actions
	>
</Questionnaire.Root>
