<script lang="ts">
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import CheckIcon from "@lucide/svelte/icons/check";

	type Choice = { value: string; label: string; hint?: string };

	let {
		title,
		description,
		choices,
		freeform = false,
		submitLabel = "Responder",
		onsubmit,
	}: {
		title: string;
		description: string;
		choices: Choice[];
		freeform?: boolean;
		submitLabel?: string;
		onsubmit: (data: FormData) => void;
	} = $props();

	const items = [{ name: "respuesta", required: true }];
	// Estado "usada": tras responder, la gate se colapsa a un resumen Q/A
	// persistente en el transcript (como el summary de Copilot).
	let submitted = $state(false);
	let summary = $state({ answer: "", freeform: "" });

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		// El campo libre comparte name="respuesta": es una ALTERNATIVA a las
		// opciones (al escribir, el root limpia la opción marcada y la respuesta
		// libre queda como valor del item) — así escribir libre cuenta como respuesta.
		const value = String(data.get("respuesta") ?? "");
		summary = {
			answer: choices.find((c) => c.value === value)?.label ?? value,
			freeform: "",
		};
		submitted = true;
		onsubmit(data);
	}
</script>

{#if submitted}
	<div data-slot="gate-summary" class="flex flex-col gap-1 text-sm">
		<p class="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
			<CheckIcon class="size-3.5" /> Pregunta respondida
		</p>
		<p>
			<span class="text-muted-foreground">Q:</span> <span class="font-medium">{title}</span>
		</p>
		<p>
			<span class="text-muted-foreground">A:</span> <strong>{summary.answer}</strong>
			{#if summary.freeform}<span class="text-muted-foreground"> — {summary.freeform}</span>{/if}
		</p>
	</div>
{:else}
	<Questionnaire.Root {items} onsubmit={handleSubmit} autofocus={false}>
		<Questionnaire.Item name="respuesta" required
			><Questionnaire.Title>{title}</Questionnaire.Title
			><Questionnaire.Description>{description}</Questionnaire.Description
			><Questionnaire.Choices
				>{#each choices as choice (choice.value)}<Questionnaire.Choice value={choice.value}
						><span class="font-medium">{choice.label}</span
						>{#if choice.hint}<span class="text-muted-foreground">{choice.hint}</span>{/if}
					</Questionnaire.Choice
				>{/each}
				{#if freeform}<Questionnaire.Input
						aria-label="Otra respuesta"
						name="respuesta"
						placeholder="Otra respuesta (texto libre)…"
					/>{/if}</Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Actions
			><Questionnaire.Submit>{submitLabel}</Questionnaire.Submit></Questionnaire.Actions
		>
	</Questionnaire.Root>
{/if}
