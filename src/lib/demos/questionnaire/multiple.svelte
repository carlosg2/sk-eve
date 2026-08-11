<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{
			choices: [
				{ value: "frijol-2021" },
				{ value: "frijol-2024" },
				{ value: "tarima" },
				{ value: "pimienta" },
			],
			name: "materiales",
			required: true,
		},
	];
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const values = new FormData(event.currentTarget as HTMLFormElement).getAll("materiales");
		toast("Requisición en preparación", {
			description: `Artículos: ${values.join(", ") || "Ninguno"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" {items} shortcuts="letters" onsubmit={submit}>
	<Questionnaire.Item name="materiales" multiple required
		><Questionnaire.Title>¿Qué artículos con faltante confirmas para la requisición?</Questionnaire.Title
		><Questionnaire.Description
			>El agente ya verificó existencias: ninguno de estos artículos tiene cobertura.</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Choice value="frijol-2021">FRIJOL MEDIA OREJA 2021 — faltan 22,688 kg</Questionnaire.Choice
			><Questionnaire.Choice value="frijol-2024">FRIJOL MEDIA OREJA 2024 — faltan 22,689 kg</Questionnaire.Choice
			><Questionnaire.Choice value="tarima">TARIMA CHEP — faltan 25 pz</Questionnaire.Choice
			><Questionnaire.Choice value="pimienta">PIMIENTA MOLIDA BLANCA — falta 1 bulto</Questionnaire.Choice
			></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Submit>Preparar requisición</Questionnaire.Submit></Questionnaire.Actions
	>
</Questionnaire.Root>
