<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as NativeSelect from "$lib/components/ui/native-select/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";

	const items = [{ name: "datos", required: true }];

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Campos recibidos por el agente", {
			description: `Material: ${data.get("material") ?? "—"} · Cantidad: ${data.get("cantidad") ?? "—"} ${data.get("unidad") ?? "—"} · Requerida: ${data.get("fecha") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root class="mx-auto max-w-md" {items} onsubmit={submit}>
	<Questionnaire.Item name="datos" required
		><Questionnaire.Title>Captura los datos de la compra directa</Questionnaire.Title
		><Questionnaire.Description
			>El agente necesita estos campos para fincar la orden (formulario estructurado).</Questionnaire.Description
		><Questionnaire.Choices
			><Questionnaire.Input aria-label="Material" name="material" placeholder="Ej. FRIJOL MEDIA OREJA 2024…"
			/><Questionnaire.Input
				aria-label="Cantidad"
				name="cantidad"
				type="number"
				inputmode="numeric"
				min="1"
				placeholder="Ej. 22689"
			/><NativeSelect.Root aria-label="Unidad" name="unidad" class="w-full">
				<NativeSelect.Option value="">Unidad…</NativeSelect.Option><NativeSelect.Option
					value="kg">Kilogramo</NativeSelect.Option
				><NativeSelect.Option value="pz">Pieza</NativeSelect.Option
				><NativeSelect.Option value="bulto">Bulto</NativeSelect.Option
			></NativeSelect.Root><Questionnaire.Input
				aria-label="Fecha requerida"
				name="fecha"
				type="date"
			/></Questionnaire.Choices
		><Questionnaire.Error /></Questionnaire.Item
	>
	<Questionnaire.Actions
		><Questionnaire.Submit>Enviar datos al agente</Questionnaire.Submit></Questionnaire.Actions
	>
</Questionnaire.Root>
