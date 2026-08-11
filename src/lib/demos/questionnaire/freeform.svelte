<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{
			choices: [{ value: "no" }, { value: "insumo" }, { value: "mp" }],
			name: "adicional",
			required: true,
		},
	];
	function submit(event: SubmitEvent) {
		event.preventDefault();
		toast("Compra directa registrada", {
			description: `Decisión: ${new FormData(event.currentTarget as HTMLFormElement).get("adicional") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" {items} shortcuts="letters" onsubmit={submit}>
	<Questionnaire.Item name="adicional" required
		><Questionnaire.Title>Además del faltante del MRP, ¿agregas algún material?</Questionnaire.Title
		><Questionnaire.Description
			>Compra directa no planificada: solo se compra lo que realmente falta en inventario.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="no">No, solo el faltante del MRP</Questionnaire.Choice
			><Questionnaire.Choice value="insumo">Sí, un insumo de empaque</Questionnaire.Choice
			><Questionnaire.Choice value="mp">Sí, materia prima adicional</Questionnaire.Choice
			><Questionnaire.Input
				aria-label="Material y cantidad"
				placeholder="Ej. Costal yute 60 kg — 500 pz…"
			/></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Submit>Usar esta lista</Questionnaire.Submit></Questionnaire.Actions
	>
</Questionnaire.Root>
