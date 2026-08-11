<script lang="ts">
	import { toast } from "svelte-sonner";
	import { z } from "zod";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	type ItemName = "tipo" | "presupuesto";
	const items = [
		{ name: "tipo", required: true },
		{ name: "presupuesto", required: true },
	];
	const schema = z
		.object({ tipo: z.enum(["urgente", "programada"]), presupuesto: z.enum(["si", "no"]) })
		.superRefine((answers, context) => {
			if (answers.tipo === "urgente" && answers.presupuesto === "no")
				context.addIssue({
					code: "custom",
					message: "Las compras urgentes sobre presupuesto requieren autorización extraordinaria de finanzas.",
					path: ["tipo"],
				});
			if (answers.tipo === "programada" && answers.presupuesto === "no")
				context.addIssue({
					code: "custom",
					message: "La compra programada no puede exceder el presupuesto. Ajusta el plan o solicita revisión.",
					path: ["tipo"],
				});
		});
	let item = $state("tipo");
	let errors = $state<Partial<Record<ItemName, string>>>({});
	function clearError(name: ItemName) {
		delete errors[name];
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const result = schema.safeParse(
			Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement))
		);
		if (result.success) {
			errors = {};
			toast("Compra autorizada por finanzas", {
				description: `Tipo: ${result.data.tipo} · Presupuesto: ${result.data.presupuesto}`,
			});
			return;
		}
		const next: Partial<Record<ItemName, string>> = {};
		for (const issue of result.error.issues) {
			const name = issue.path[0];
			if ((name === "tipo" || name === "presupuesto") && !next[name]) next[name] = issue.message;
		}
		errors = next;
		const first = result.error.issues[0]?.path[0];
		if (first === "tipo" || first === "presupuesto") item = first;
	}
</script>

{#snippet ValidationProgress()}<Questionnaire.Progress class="min-w-0"
		>{#snippet children(state)}{state.current} / {state.total}{/snippet}</Questionnaire.Progress
	>{/snippet}

<Questionnaire.Root class="mx-auto max-w-md" bind:item {items} onsubmit={submit}>
	<Card.Root class="w-full">
		<Questionnaire.Item invalid={Boolean(errors.tipo)} name="tipo" required
			><Card.Header
				><Questionnaire.Title>¿Qué tipo de compra es?</Questionnaire.Title
				><Questionnaire.Description>Adriana (finanzas) autoriza antes de operar.</Questionnaire.Description
				><Card.Action>{@render ValidationProgress()}</Card.Action></Card.Header
			><Card.Content
				><Questionnaire.Choices
					><Questionnaire.Choice value="urgente" onchange={() => clearError("tipo")}
						>Urgente por faltante de MP</Questionnaire.Choice
					><Questionnaire.Choice value="programada" onchange={() => clearError("tipo")}
						>Programada (plan de compras)</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error>{errors.tipo}</Questionnaire.Error></Card.Content
			></Questionnaire.Item
		>
		<Questionnaire.Item invalid={Boolean(errors.presupuesto)} name="presupuesto" required
			><Card.Header
				><Questionnaire.Title>¿Está dentro del presupuesto de julio?</Questionnaire.Title
				><Questionnaire.Description
					>El tope de compra se compara contra el presupuesto vigente del periodo.</Questionnaire.Description
				><Card.Action>{@render ValidationProgress()}</Card.Action></Card.Header
			><Card.Content
				><Questionnaire.Choices
					><Questionnaire.Choice value="si" onchange={() => clearError("presupuesto")}
						>Sí, hay tope disponible</Questionnaire.Choice
					><Questionnaire.Choice value="no" onchange={() => clearError("presupuesto")}
						>No, excede el tope</Questionnaire.Choice
					></Questionnaire.Choices
				><Questionnaire.Error>{errors.presupuesto}</Questionnaire.Error></Card.Content
			></Questionnaire.Item
		>
		<Card.Footer
			><Questionnaire.Actions
				><Questionnaire.Previous /><Questionnaire.Next>Siguiente</Questionnaire.Next
				><Questionnaire.Submit>Validar autorización</Questionnaire.Submit></Questionnaire.Actions
			></Card.Footer
		>
	</Card.Root>
</Questionnaire.Root>
