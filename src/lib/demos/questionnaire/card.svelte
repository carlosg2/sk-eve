<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	const items = [
		{
			choices: [{ value: "frijol-2024" }, { value: "frijol-2021" }, { value: "ambos" }],
			name: "material",
			required: true,
		},
		{
			choices: [{ value: "confirmar" }, { value: "ajustar" }],
			name: "monto",
			required: true,
		},
	];
	const uid = $props.id();
	const materialTitleId = `${uid}-material-title`;
	const montoTitleId = `${uid}-monto-title`;
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Requisición confirmada", {
			description: `Material: ${data.get("material") ?? "—"} · Monto: ${data.get("monto") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root
	class="mx-auto max-w-md"
	defaultItem="material"
	{items}
	shortcuts="numbers"
	onsubmit={submit}
>
	<Card.Root>
		<Questionnaire.Item aria-labelledby={materialTitleId} name="material" required
			><Card.Header
				><Card.Title
					id={materialTitleId}
					data-slot="questionnaire-title"
					class="cn-questionnaire-title cn-font-heading text-pretty"
					>¿Qué material aprueba compras?</Card.Title
				><Card.Description
					data-slot="questionnaire-description"
					class="cn-questionnaire-description text-pretty text-muted-foreground"
					>Requisición por faltante de materia prima (julio 2026).</Card.Description
				><Card.Action><Questionnaire.Progress /></Card.Action></Card.Header
			><Card.Content
				><Questionnaire.Choices
					><Questionnaire.Choice value="frijol-2024">FRIJOL MEDIA OREJA 2024 — 22,689 kg</Questionnaire.Choice
					><Questionnaire.Choice value="frijol-2021">FRIJOL MEDIA OREJA 2021 — 22,688 kg</Questionnaire.Choice
					><Questionnaire.Choice value="ambos">Ambos lotes de frijol</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error /></Card.Content
			></Questionnaire.Item
		>
		<Questionnaire.Item aria-labelledby={montoTitleId} name="monto" required
			><Card.Header
				><Card.Title
					id={montoTitleId}
					data-slot="questionnaire-title"
					class="cn-questionnaire-title cn-font-heading text-pretty"
					>¿Confirmas el monto estimado de la requisición?</Card.Title
				><Card.Description
					data-slot="questionnaire-description"
					class="cn-questionnaire-description text-pretty text-muted-foreground"
					>≈ $1.9M por 22,689 kg de frijol (precio histórico del proveedor).</Card.Description
				><Card.Action><Questionnaire.Progress /></Card.Action></Card.Header
			><Card.Content
				><Questionnaire.Choices
					><Questionnaire.Choice value="confirmar">Confirmar monto</Questionnaire.Choice
					><Questionnaire.Choice value="ajustar">Ajustar cantidades</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error /></Card.Content
			></Questionnaire.Item
		>
		<Card.Footer
			><Questionnaire.Actions class="w-full"
				><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next
				><Questionnaire.Submit>Confirmar requisición</Questionnaire.Submit></Questionnaire.Actions
			></Card.Footer
		>
	</Card.Root>
</Questionnaire.Root>
