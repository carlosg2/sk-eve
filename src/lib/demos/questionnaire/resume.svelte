<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	const items = [
		{ name: "materiales", required: true },
		{ name: "proveedor", required: true },
		{ name: "notas" },
	];
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Borrador de requisición actualizado", {
			description: `Materiales: ${data.getAll("materiales").join(", ") || "Ninguno"} · Proveedor: ${data.get("proveedor") ?? "—"} · Notas: ${data.get("notas") || "—"}`,
		});
	}
</script>

<Questionnaire.Root
	class="mx-auto max-w-md"
	defaultItem="proveedor"
	{items}
	onreset={() => toast("Borrador de requisición restaurado")}
	onsubmit={submit}
>
	<Questionnaire.Progress />
	<Questionnaire.Item name="materiales" multiple required
		><Questionnaire.Title>¿Qué materiales mantiene la requisición?</Questionnaire.Title
		><Questionnaire.Description
			>Selección guardada en la sesión anterior (faltantes de julio).</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="frijol-2021" defaultChecked
				>FRIJOL MEDIA OREJA 2021 — 22,688 kg</Questionnaire.Choice
			><Questionnaire.Choice value="frijol-2024" defaultChecked
				>FRIJOL MEDIA OREJA 2024 — 22,689 kg</Questionnaire.Choice
			><Questionnaire.Choice value="tarima">TARIMA CHEP — 25 pz</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item name="proveedor" required
		><Questionnaire.Title>¿Con qué proveedor queda la requisición?</Questionnaire.Title
		><Questionnaire.Description
			>Proveedor guardado en la sesión anterior.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="pp-0021" defaultChecked
				>RG COMPAÑIA BENEFICIADORA</Questionnaire.Choice
			><Questionnaire.Choice value="pp-0016">COMERCIALIZADORA DE GRANOS LOS ARBOLITOS</Questionnaire.Choice
			><Questionnaire.Choice value="pp-0137">PULSES DEL BAJIO</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item name="notas"
		><Questionnaire.Title>¿Alguna nota para compras?</Questionnaire.Title
		><Questionnaire.Description>Esta nota se guardó con el borrador.</Questionnaire.Description
		><Questionnaire.Input
			aria-label="Nota de requisición"
			defaultValue="Priorizar frijol 2024: mayor rotación (BULTO 60 KG 2024)."
		/></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Button type="reset" variant="outline">Restablecer borrador</Button><Questionnaire.Previous
		/><Questionnaire.Next>Siguiente</Questionnaire.Next><Questionnaire.Submit
			>Guardar requisición</Questionnaire.Submit
		></Questionnaire.Actions
	>
</Questionnaire.Root>
