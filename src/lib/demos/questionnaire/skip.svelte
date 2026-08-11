<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import type { QuestionnaireItemStatus } from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{ name: "material", required: true },
		{ name: "autorizacion" },
		{ name: "notifica", required: true },
	];
	let autorizacionStatus = $state<QuestionnaireItemStatus>("unanswered");
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Dictamen de calidad enviado", {
			description: `Material: ${data.get("material") ?? "—"} · Autorización: ${autorizacionStatus === "skipped" ? "No aplica (omitida)" : (data.get("autorizacion") ?? "Pendiente")} · Notifica: ${data.get("notifica") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" defaultItem="material" {items} onsubmit={submit}>
	<Questionnaire.Progress />
	<Questionnaire.Item name="material" required
		><Questionnaire.Title>¿Qué inventario defectuoso detectó el agente?</Questionnaire.Title
		><Questionnaire.Description
			>El inventario no utilizable (p. ej. grano con gorgojo) se gestiona como desviación con autorización extraordinaria.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="frijol">FRIJOL MEDIA OREJA — muestra con gorgojo</Questionnaire.Choice><Questionnaire.Choice
				value="tarima">TARIMA CHEP — daño estructural</Questionnaire.Choice
			><Questionnaire.Choice value="ninguno">Ninguno, inventario utilizable</Questionnaire.Choice></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item name="autorizacion" onStatusChange={(status) => (autorizacionStatus = status)}
		><Questionnaire.Title>¿Autorizas la compra extraordinaria de reemplazo?</Questionnaire.Title
		><Questionnaire.Description
			>Responde si aplica, u omite esta pregunta a propósito.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="si">Sí, autorizo reemplazo</Questionnaire.Choice
			><Questionnaire.Choice value="no">No, se da de baja</Questionnaire.Choice
			></Questionnaire.Choices
		></Questionnaire.Item
	>
	<Questionnaire.Item name="notifica" required
		><Questionnaire.Title>¿A quién notifica finanzas el dictamen?</Questionnaire.Title
		><Questionnaire.Description
			>La autorización extraordinaria deja evidencia en el presupuesto.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="compras">Compras</Questionnaire.Choice
			><Questionnaire.Choice value="direccion">Dirección</Questionnaire.Choice
			><Questionnaire.Choice value="ambos">Compras y dirección</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Previous /><Questionnaire.Skip /><Questionnaire.Next>Siguiente</Questionnaire.Next
		><Questionnaire.Submit>Enviar dictamen</Questionnaire.Submit></Questionnaire.Actions
	>
</Questionnaire.Root>
