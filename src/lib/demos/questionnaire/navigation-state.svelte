<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import type { QuestionnaireItemStatus } from "$lib/components/ui/questionnaire/index.js";
	type ItemName = "mes1" | "mes2";
	const items = [
		{ name: "mes1", required: true },
		{ name: "mes2", required: true },
	];
	let item = $state<ItemName>("mes1");
	let statuses = $state<Record<ItemName, QuestionnaireItemStatus>>({
		mes1: "unanswered",
		mes2: "unanswered",
	});
	let sinLiberar = $derived(statuses[item] === "unanswered");
	function setStatus(name: ItemName, status: QuestionnaireItemStatus) {
		statuses[name] = status;
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Plan de compras liberado", {
			description: `Julio: ${data.get("mes1") ?? "—"} · Agosto: ${data.get("mes2") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" bind:item {items} onsubmit={submit}>
	<Questionnaire.Progress />
	<Questionnaire.Item
		name="mes1"
		required
		onStatusChange={(status) => setStatus("mes1", status)}
		><Questionnaire.Title>¿Autorizas la liberación de JULIO?</Questionnaire.Title><Questionnaire.Description
			>Finanzas libera el plan de compras mes a mes.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="autorizar">Autorizar presupuesto</Questionnaire.Choice><Questionnaire.Choice
				value="rechazar">Rechazar</Questionnaire.Choice
			><Questionnaire.Choice value="parcial">Autorizar parcial</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Item
		name="mes2"
		required
		onStatusChange={(status) => setStatus("mes2", status)}
		><Questionnaire.Title>¿Autorizas la liberación de AGOSTO?</Questionnaire.Title
		><Questionnaire.Choices
			><Questionnaire.Choice value="autorizar">Autorizar presupuesto</Questionnaire.Choice><Questionnaire.Choice
				value="rechazar">Rechazar</Questionnaire.Choice
			><Questionnaire.Choice value="parcial">Autorizar parcial</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Previous /><Questionnaire.Next
			class="data-[status=unanswered]:opacity-50"
			disabled={sinLiberar}
			variant="secondary">Siguiente</Questionnaire.Next
		><Questionnaire.Submit disabled={sinLiberar}>Liberar plan</Questionnaire.Submit
		></Questionnaire.Actions
	>
</Questionnaire.Root>
