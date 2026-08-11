<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{ name: "desviacion", required: true },
		{ name: "tope", required: true },
		{ name: "accion", required: true },
	];
	const labels: Record<string, string> = {
		desviacion: "Desviaciones",
		tope: "Tope de presupuesto",
		accion: "Acción",
	};
	let item = $state("desviacion");
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Decisión de finanzas registrada", {
			description: `Desviación: ${data.get("desviacion") ?? "—"} · Tope: ${data.get("tope") ?? "—"} · Acción: ${data.get("accion") ?? "—"}`,
		});
	}
</script>

<div class="relative mx-auto flex h-full w-full max-w-md flex-col">
	<p class="absolute end-0 top-0 text-sm text-muted-foreground" role="status">
		Revisando: {labels[item]}
	</p>
	<Questionnaire.Root class="mt-auto" bind:item {items} onsubmit={submit}>
		<Questionnaire.Progress />
		<Questionnaire.Item name="desviacion" required
			><Questionnaire.Title>¿Qué desviación del periodo revisamos?</Questionnaire.Title
			><Questionnaire.Description
				>Puedes volver a cualquier desviación en revisión antes de decidir.</Questionnaire.Description
			><Questionnaire.Choices
				><Questionnaire.Choice value="a5944">A5944 — BOLSA RETORTABLE BAYO (+447%)</Questionnaire.Choice
				><Questionnaire.Choice value="a6319">A6319 — BOLSA RETORTABLE CAMPO SANTO (+145%)</Questionnaire.Choice
				><Questionnaire.Choice value="a6539">A6539 — BOLSA ZIPPER ALMENDRA (+212%)</Questionnaire.Choice
				></Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Item name="tope" required
			><Questionnaire.Title>¿El tope de presupuesto se confirma?</Questionnaire.Title
			><Questionnaire.Choices
				><Questionnaire.Choice value="vigente">Sí, el tope sigue vigente</Questionnaire.Choice
				><Questionnaire.Choice value="revisar">No, requiere revisión de finanzas</Questionnaire.Choice
				></Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Item name="accion" required
			><Questionnaire.Title>¿Qué acción tomamos?</Questionnaire.Title
			><Questionnaire.Choices
				><Questionnaire.Choice value="aprobar">Aprobar desviación</Questionnaire.Choice
				><Questionnaire.Choice value="detener">Detener compra</Questionnaire.Choice
				><Questionnaire.Choice value="escalar">Escalar a dirección</Questionnaire.Choice
				></Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Actions
			><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next><Questionnaire.Submit
				>Registrar decisión</Questionnaire.Submit
			></Questionnaire.Actions
		>
	</Questionnaire.Root>
</div>
