<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as NativeSelect from "$lib/components/ui/native-select/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import type { QuestionnaireShortcutMode } from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{
			choices: [{ value: "pp-0021" }, { value: "pp-0016" }, { value: "pp-0137" }],
			name: "proveedor",
			required: true,
		},
	];
	let shortcuts = $state<QuestionnaireShortcutMode | undefined>("numbers");
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const proveedor = new FormData(event.currentTarget as HTMLFormElement).get("proveedor");
		toast("Proveedor asignado a la requisición", {
			description: `Proveedor: ${proveedor ?? "—"} · Atajos: ${shortcuts ?? "ninguno"}`,
		});
	}
</script>

<div class="relative mx-auto flex h-full w-full max-w-md flex-col">
	<NativeSelect.Root
		aria-label="Estilo de atajo"
		class="absolute end-0 top-0"
		value={shortcuts ?? "none"}
		onchange={(event) => {
			const value = event.currentTarget.value;
			shortcuts = value === "letters" || value === "numbers" ? value : undefined;
		}}
	>
		<NativeSelect.Option value="none">Sin atajos</NativeSelect.Option><NativeSelect.Option
			value="letters">Letras</NativeSelect.Option
		><NativeSelect.Option value="numbers">Números</NativeSelect.Option>
	</NativeSelect.Root>
	<Questionnaire.Root class="mt-auto" {items} {shortcuts} onsubmit={submit}>
		<Questionnaire.Item name="proveedor" required
			><Questionnaire.Title>¿Con qué proveedor cotizamos el FRIJOL MEDIA OREJA?</Questionnaire.Title
			><Questionnaire.Description
				>El agente sugiere según el historial real de compras de julio 2026.</Questionnaire.Description
			><Questionnaire.Choices
				><Questionnaire.Choice value="pp-0021"
					><span class="font-medium">RG COMPAÑIA BENEFICIADORA</span><span class="text-muted-foreground"
						>PP-0021 · $27.2M en julio · granos</span
					></Questionnaire.Choice
				><Questionnaire.Choice value="pp-0016"
					><span class="font-medium">COMERCIALIZADORA DE GRANOS LOS ARBOLITOS</span><span class="text-muted-foreground"
						>PP-0016 · $9.3M en julio · granos</span
					></Questionnaire.Choice
				><Questionnaire.Choice value="pp-0137"
					><span class="font-medium">PULSES DEL BAJIO</span><span class="text-muted-foreground"
						>PP-0137 · $1.5M en julio · leguminosas</span
					></Questionnaire.Choice
				></Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Actions
			><Questionnaire.Submit>Asignar proveedor</Questionnaire.Submit></Questionnaire.Actions
		>
	</Questionnaire.Root>
</div>
