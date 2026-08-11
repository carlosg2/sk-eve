<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import { buttonVariants } from "$lib/components/ui/button/index.js";
	const items = [
		{ name: "accion", required: true },
		{ name: "presupuesto", required: true },
	];
	let open = $state(false);
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		open = false;
		toast("Requisición REQ-2026-07-114 creada", {
			description: `Acción: ${data.get("accion") ?? "—"} · Presupuesto: ${data.get("presupuesto") ?? "—"} · Estatus: pendiente`,
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>Confirmar escritura en el ERP</Dialog.Trigger>
	<Dialog.Content>
		<Questionnaire.Root defaultItem="accion" {items} onsubmit={submit}>
			<Questionnaire.Item name="accion" required
				><Dialog.Header
					><Questionnaire.Progress /><Dialog.Title
						data-slot="questionnaire-title"
						class="cn-questionnaire-title cn-font-heading text-pretty"
						>¿Confirmas la escritura en el ERP?</Dialog.Title
					><Dialog.Description
						data-slot="questionnaire-description"
						class="cn-questionnaire-description text-pretty text-muted-foreground"
						>El agente quiere crear la requisición de FRIJOL MEDIA OREJA 2024 (22,689 kg).</Dialog.Description
					></Dialog.Header
				><Questionnaire.Choices
					><Questionnaire.Choice value="confirmar">Confirmar alta</Questionnaire.Choice
					><Questionnaire.Choice value="modificar">Modificar cantidades</Questionnaire.Choice
					><Questionnaire.Choice value="cancelar">Cancelar operación</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error /></Questionnaire.Item
			>
			<Questionnaire.Item name="presupuesto" required
				><Dialog.Header
					><Questionnaire.Progress /><Dialog.Title
						data-slot="questionnaire-title"
						class="cn-questionnaire-title cn-font-heading text-pretty"
						>¿Requiere autorización extraordinaria?</Dialog.Title
					><Dialog.Description
						data-slot="questionnaire-description"
						class="cn-questionnaire-description text-pretty text-muted-foreground"
						>Si el faltante supera el tope de compra, finanzas debe autorizar.</Dialog.Description
					></Dialog.Header
				><Questionnaire.Choices
					><Questionnaire.Choice value="si">Sí, autorización extraordinaria</Questionnaire.Choice
					><Questionnaire.Choice value="no">No, dentro del tope</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error /></Questionnaire.Item
			>
			<Dialog.Footer
				><Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancelar</Dialog.Close
				><Questionnaire.Actions
					><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next
					><Questionnaire.Submit>Confirmar y crear</Questionnaire.Submit></Questionnaire.Actions
				></Dialog.Footer
			>
		</Questionnaire.Root>
	</Dialog.Content>
</Dialog.Root>
