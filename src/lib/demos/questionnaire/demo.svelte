<script lang="ts">
	import { toast } from "svelte-sonner";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";

	const items = [
		{
			choices: [{ value: "mp-critica" }, { value: "insumos" }, { value: "todo" }],
			name: "prioridad",
			required: true,
		},
		{
			choices: [
				{ value: "frijol-2021" },
				{ value: "frijol-2024" },
				{ value: "tarima" },
				{ value: "pimienta" },
			],
			name: "materiales",
		},
		{
			choices: [{ value: "hoy" }, { value: "semana" }, { value: "compras" }],
			name: "urgencia",
			required: true,
		},
	] as const;

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		toast("Solicitud enviada a compras", {
			description: `Prioridad: ${data.get("prioridad") ?? "—"} · Materiales: ${data.getAll("materiales").join(", ") || "—"} · Urgencia: ${data.get("urgencia") ?? "—"}`,
		});
	}
</script>

<Questionnaire.Root
	class="mx-auto max-w-md"
	defaultItem="prioridad"
	{items}
	shortcuts="letters"
	onsubmit={handleSubmit}
>
	<Questionnaire.Progress />
	<Questionnaire.Item name="prioridad" required>
		<Questionnaire.Title>El MRP detectó faltante crítico: ¿qué priorizamos?</Questionnaire.Title>
		<Questionnaire.Description
			>La explosión de materiales de julio detectó faltantes. Elige el alcance de la requisición.</Questionnaire.Description
		>
		<Questionnaire.Choices>
			<Questionnaire.Choice value="mp-critica"
				><span class="font-medium">Materia prima crítica</span><span class="text-muted-foreground"
					>FRIJOL MEDIA OREJA — 22,689 kg requeridos, 0 en trámite.</span
				></Questionnaire.Choice
			>
			<Questionnaire.Choice value="insumos"
				><span class="font-medium">Insumos de producción</span><span class="text-muted-foreground"
					>TARIMA CHEP (25 pz) y PIMIENTA MOLIDA (1 bulto).</span
				></Questionnaire.Choice
			>
			<Questionnaire.Choice value="todo"
				><span class="font-medium">Todo el faltante del MRP</span><span class="text-muted-foreground"
					>Materia prima e insumos en una sola requisición.</span
				></Questionnaire.Choice
			>
			<Questionnaire.Input
				aria-label="Otro material o ajuste"
				placeholder="Agrega otro material o ajuste…"
			/>
		</Questionnaire.Choices>
		<Questionnaire.Error />
	</Questionnaire.Item>
	<Questionnaire.Item name="materiales" multiple>
		<Questionnaire.Title>¿Qué artículos con faltante incluimos?</Questionnaire.Title>
		<Questionnaire.Description
			>Selecciona todos los que apliquen, u omite esta pregunta.</Questionnaire.Description
		>
		<Questionnaire.Choices>
			<Questionnaire.Choice value="frijol-2021">FRIJOL MEDIA OREJA 2021 — faltan 22,688 kg</Questionnaire.Choice>
			<Questionnaire.Choice value="frijol-2024">FRIJOL MEDIA OREJA 2024 — faltan 22,689 kg</Questionnaire.Choice>
			<Questionnaire.Choice value="tarima">TARIMA CHEP — faltan 25 pz</Questionnaire.Choice>
			<Questionnaire.Choice value="pimienta">PIMIENTA MOLIDA BLANCA — falta 1 bulto</Questionnaire.Choice>
		</Questionnaire.Choices>
		<Questionnaire.Error />
	</Questionnaire.Item>
	<Questionnaire.Item name="urgencia" required>
		<Questionnaire.Title>¿Con qué urgencia la libera compras?</Questionnaire.Title>
		<Questionnaire.Description
			>El faltante de frijol no tiene traspaso ni préstamo en trámite.</Questionnaire.Description
		>
		<Questionnaire.Choices>
			<Questionnaire.Choice value="hoy">Hoy — riesgo de paro de línea</Questionnaire.Choice>
			<Questionnaire.Choice value="semana">Esta semana</Questionnaire.Choice>
			<Questionnaire.Choice value="compras">Coordinar con compras primero</Questionnaire.Choice>
		</Questionnaire.Choices>
		<Questionnaire.Error />
	</Questionnaire.Item>
	<Questionnaire.Actions>
		<Questionnaire.Previous />
		<Questionnaire.Skip />
		<Questionnaire.Next>Siguiente</Questionnaire.Next>
		<Questionnaire.Submit>Enviar solicitud</Questionnaire.Submit>
	</Questionnaire.Actions>
</Questionnaire.Root>
