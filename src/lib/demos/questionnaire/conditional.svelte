<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	let planta = $state("avc");
	let items = $derived([
		{ name: "planta", required: true },
		{ disabled: planta !== "avc", name: "arribo", required: true },
		{ name: "aviso", required: true },
	]);
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Aviso de desviación programado", {
			description: `Planta: ${data.get("planta") ?? "—"} · Arribo AVC: ${data.get("arribo") ?? "No aplica"} · Aviso: ${data.get("aviso") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" defaultItem="planta" {items} onsubmit={submit}>
	<Questionnaire.Progress />
	<Questionnaire.Item name="planta" required
		><Questionnaire.Title>¿En qué planta se detectó el faltante?</Questionnaire.Title
		><Questionnaire.Description
			>Revisamos el faltante y los arribos en tránsito por planta (AVC/PBC).</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice
				checked={planta === "avc"}
				onchange={() => (planta = "avc")}
				value="avc">Planta AVC</Questionnaire.Choice
			><Questionnaire.Choice
				checked={planta === "pbc"}
				onchange={() => (planta = "pbc")}
				value="pbc">Planta PBC</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item disabled={planta !== "avc"} name="arribo" required
		><Questionnaire.Title>¿Hay un arribo en camino hacia AVC?</Questionnaire.Title
		><Questionnaire.Description
			>Si hay un arribo en tránsito hacia AVC, el faltante se cubre con él.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="si">Sí, arribo en tránsito</Questionnaire.Choice><Questionnaire.Choice
				value="no">No, requiere compra</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item name="aviso" required
		><Questionnaire.Title>¿Generamos el aviso de desviación al proveedor?</Questionnaire.Title
		><Questionnaire.Description
			>Un arribo que cambia de fecha detona la comunicación al proveedor.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="ahora">Sí, detonar ahora</Questionnaire.Choice
			><Questionnaire.Choice value="compras">En revisión de compras</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next><Questionnaire.Submit
			>Programar aviso</Questionnaire.Submit
		></Questionnaire.Actions
	>
</Questionnaire.Root>
