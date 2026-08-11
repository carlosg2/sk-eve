<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";

	const items = [{ name: "accion", required: true }];
	const answers: Record<string, string> = {
		urgente: "Compra urgente hoy",
		coordinar: "Coordinar con compras",
		informar: "Solo informar",
	};
	let phase = $state<"gate" | "resuming" | "done">("gate");
	let answer = $state("");

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		answer = String(data.get("accion") ?? "");
		phase = "resuming";
		setTimeout(() => (phase = "done"), 1400);
	}
</script>

{#if phase === "gate"}
	<Questionnaire.Root class="mx-auto max-w-md" {items} onsubmit={submit}>
		<Questionnaire.Item name="accion" required
			><Questionnaire.Title>Faltante crítico: FRIJOL MEDIA OREJA 2024</Questionnaire.Title
			><Questionnaire.Description
				>22,689 kg requeridos y 0 en trámite. El agente pausó el turno hasta que
				decidas (ask_user).</Questionnaire.Description
			><Questionnaire.Choices
				><Questionnaire.Choice value="urgente">Compra urgente hoy</Questionnaire.Choice
				><Questionnaire.Choice value="coordinar">Coordinar con compras</Questionnaire.Choice
				><Questionnaire.Choice value="informar">Solo informar</Questionnaire.Choice
				></Questionnaire.Choices
			><Questionnaire.Error /></Questionnaire.Item
		>
		<Questionnaire.Actions
			><Questionnaire.Submit>Responder</Questionnaire.Submit></Questionnaire.Actions
		>
	</Questionnaire.Root>
{:else if phase === "resuming"}
	<div class="mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card p-4">
		<span class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
		<p class="text-sm text-muted-foreground">
			El agente recibió tu respuesta y <span class="font-medium">reanudó el turno</span>…
		</p>
	</div>
{:else}
	<div class="mx-auto max-w-md">
		<Card.Root>
			<Card.Header
				><Card.Title class="text-base">Requisición pre-llenada por el agente</Card.Title
				><Card.Description
					>Turno reanudado con la respuesta: <strong>{answers[answer] ?? answer}</strong
					>.</Card.Description
				></Card.Header
			>
			<Card.Content class="text-sm">
				<ul class="flex flex-col gap-1.5">
					<li>• <strong>FRIJOL MEDIA OREJA 2024</strong> — 22,689 kg</li>
					<li>• Origen: faltante del MRP de julio (sin trámite en curso)</li>
					<li>• {answers[answer] ?? answer}</li>
				</ul>
				<p class="mt-3 text-muted-foreground">
					La respuesta se entregó como resultado de la tool de pregunta; el modelo la
					consumió y siguió con el flujo (cierre del bucle ask → resume).
				</p>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
