<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{ name: "material", required: true },
		{ name: "proveedor", required: true },
		{ name: "entrega", required: true },
	];
	const itemClass =
		"data-active:animate-in data-active:fade-in-0 data-active:slide-in-from-bottom-2 data-active:duration-300 motion-reduce:animate-none";
	const questions = [
		{
			name: "material",
			title: "¿Qué material va en la orden de compra?",
			description: "Faltantes detectados en la explosión de materiales de julio.",
			choices: [
				["frijol-2024", "FRIJOL MEDIA OREJA 2024 — 22,689 kg"],
				["frijol-2021", "FRIJOL MEDIA OREJA 2021 — 22,688 kg"],
				["tarima", "TARIMA CHEP — 25 pz"],
			],
		},
		{
			name: "proveedor",
			title: "¿Con qué proveedor se finca la OC?",
			description: "Origen y lead time (nacional 4 días / importación 9).",
			choices: [
				["pp-0021", "RG COMPAÑIA BENEFICIADORA — nacional"],
				["pp-0016", "GRANOS LOS ARBOLITOS — nacional"],
				["pp-0137", "PULSES DEL BAJIO — nacional"],
			],
		},
		{
			name: "entrega",
			title: "¿Cuándo se compromete la entrega?",
			description: "No prometemos fechas imposibles.",
			choices: [
				["esta-semana", "Esta semana"],
				["2-semanas", "En 2 semanas"],
				["coordinar", "Coordinar con proveedor"],
			],
		},
	];
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Orden de compra en alta", {
			description: `Material: ${data.get("material") ?? "—"} · Proveedor: ${data.get("proveedor") ?? "—"} · Entrega: ${data.get("entrega") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" defaultItem="material" {items} onsubmit={submit}>
	<Questionnaire.Progress />
	{#each questions as question (question.name)}
		<Questionnaire.Item class={itemClass} name={question.name} required>
			<Questionnaire.Title>{question.title}</Questionnaire.Title>
			<Questionnaire.Description>{question.description}</Questionnaire.Description>
			<Questionnaire.Choices
				>{#each question.choices as choice (choice[0])}<Questionnaire.Choice value={choice[0]}
						>{choice[1]}</Questionnaire.Choice
					>{/each}</Questionnaire.Choices
			>
			<Questionnaire.Error />
		</Questionnaire.Item>
	{/each}
	<Questionnaire.Actions
		><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next><Questionnaire.Submit
			>Confirmar alta de OC</Questionnaire.Submit
		></Questionnaire.Actions
	>
</Questionnaire.Root>
