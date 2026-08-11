<script lang="ts">
	import type { Component } from "svelte";
	import Demo from "$lib/demos/questionnaire/demo.svelte";
	import Multiple from "$lib/demos/questionnaire/multiple.svelte";
	import Freeform from "$lib/demos/questionnaire/freeform.svelte";
	import Skip from "$lib/demos/questionnaire/skip.svelte";
	import Shortcuts from "$lib/demos/questionnaire/shortcuts.svelte";
	import Validation from "$lib/demos/questionnaire/validation.svelte";
	import Controlled from "$lib/demos/questionnaire/controlled.svelte";
	import Resume from "$lib/demos/questionnaire/resume.svelte";
	import Conditional from "$lib/demos/questionnaire/conditional.svelte";
	import NavigationState from "$lib/demos/questionnaire/navigation-state.svelte";
	import Progress from "$lib/demos/questionnaire/progress.svelte";
	import Animated from "$lib/demos/questionnaire/animated.svelte";
	import CardDemo from "$lib/demos/questionnaire/card.svelte";
	import DialogDemo from "$lib/demos/questionnaire/dialog.svelte";
	import FormDemo from "$lib/demos/questionnaire/form.svelte";
	import TimeoutDemo from "$lib/demos/questionnaire/timeout.svelte";
	import AskResumeDemo from "$lib/demos/questionnaire/ask-resume.svelte";

	type Section = { id: string; title: string; note?: string; component: Component; minH?: string };

	const sections: Section[] = [
		{
			id: "demo",
			title: "Basic",
			note: "Use case: requisición por faltante. El agente detecta un faltante crítico de materia prima y confirma con el usuario la prioridad, los materiales y la urgencia antes de armar la requisición.",
			component: Demo,
			minH: "560px",
		},
		{
			id: "multiple",
			title: "Multiple",
			note: "Use case: selección de artículos. El usuario confirma cuáles de los faltantes reales de julio 2026 entran en la requisición (selección múltiple).",
			component: Multiple,
			minH: "420px",
		},
		{
			id: "freeform",
			title: "Freeform",
			note: "Use case: compra directa. El agente permite agregar por texto libre un material adicional fuera del faltante del MRP, además de las opciones.",
			component: Freeform,
			minH: "420px",
		},
		{
			id: "skip",
			title: "Skip",
			note: "Use case: autorización extraordinaria. El inventario defectuoso (gorgojo) se gestiona como desviación; el paso de autorización es opcional y se puede omitir.",
			component: Skip,
			minH: "520px",
		},
		{
			id: "shortcuts",
			title: "Shortcuts",
			note: "Use case: proveedor de granos. El usuario elige proveedor con atajos de teclado (letras o números) sobre el historial real de compras de julio.",
			component: Shortcuts,
			minH: "480px",
		},
		{
			id: "validation",
			title: "Validation",
			note: "Use case: autorización de presupuesto. Validación cruzada: una compra urgente sobre presupuesto requiere autorización extraordinaria de finanzas.",
			component: Validation,
			minH: "520px",
		},
		{
			id: "controlled",
			title: "Controlled",
			note: "Use case: revisión de desviaciones. El paso activo está controlado por el host para volver a cualquier desviación del periodo antes de decidir.",
			component: Controlled,
			minH: "520px",
		},
		{
			id: "resume",
			title: "Resume",
			note: "Use case: requisición guardada. Reanudar un borrador con selecciones y notas por defecto, y restablecer los cambios.",
			component: Resume,
			minH: "520px",
		},
		{
			id: "conditional",
			title: "Conditional",
			note: "Use case: faltante por planta. La pregunta de arribo solo aplica cuando la planta seleccionada es AVC; para PBC se omite.",
			component: Conditional,
			minH: "520px",
		},
		{
			id: "navigation-state",
			title: "Navigation state",
			note: "Use case: liberación del plan. Finanzas libera el plan de compras mes a mes; el siguiente paso queda deshabilitado hasta autorizar.",
			component: NavigationState,
			minH: "480px",
		},
		{
			id: "progress",
			title: "Progress",
			note: "Use case: plan a 3 meses. Progreso personalizado por mes en la liberación del plan de compras.",
			component: Progress,
			minH: "520px",
		},
		{
			id: "animated",
			title: "Animated",
			note: "Use case: alta de orden de compra. Flujo animado: material, proveedor y fecha de entrega comprometida.",
			component: Animated,
			minH: "520px",
		},
		{
			id: "card",
			title: "Card",
			note: "Use case: ficha de aprobación. Composición Card con el detalle del faltante y el monto estimado de la requisición.",
			component: CardDemo,
			minH: "560px",
		},
		{
			id: "dialog",
			title: "Dialog",
			note: "Use case: gate de escritura. Confirmación de escritura de una requisición dentro de un Dialog, con autorización de presupuesto.",
			component: DialogDemo,
			minH: "320px",
		},
		{
			id: "form",
			title: "Form",
			note: "Use case: captura estructurada (requestedSchema de ask_user). El agente necesita varios campos (material, cantidad, unidad, fecha) en una sola pregunta para fincar la orden.",
			component: FormDemo,
			minH: "560px",
		},
		{
			id: "timeout",
			title: "Timeout",
			note: "Use case: ventana de gracia (auto-cancel de Copilot). Si el usuario no responde antes de que expire la pregunta, el agente la cancela y continúa con la política por defecto.",
			component: TimeoutDemo,
			minH: "440px",
		},
		{
			id: "ask-resume",
			title: "Ask → Resume",
			note: "Use case: bucle cerrado del HITL. El agente pausa con ask_user, recibe la respuesta como resultado de la tool y reanuda el turno pre-llenando la requisición.",
			component: AskResumeDemo,
			minH: "520px",
		},
	];
</script>

<svelte:head>
	<title>Questionnaire — Demos</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-14 p-6 sm:p-10">
	<header class="flex flex-col gap-2">
		<h1 class="cn-font-heading text-2xl font-semibold">Questionnaire</h1>
		<p class="text-sm leading-relaxed text-muted-foreground">
			Demos HITL (human-in-the-loop) del agente Sigma para <strong>Industrias Campo Fresco</strong> (ICF):
			cada escenario es un momento real donde el mini-AGI proactivo propone y el usuario confirma —
			requisiciones por faltante, autorización de presupuesto, proveedores y gates de escritura.
			Datos reales de ICF (julio 2026). Componente Questionnaire portado del PR de shadcn-svelte
			<a
				class="underline underline-offset-3"
				href="https://github.com/huntabyte/shadcn-svelte/pull/2841"
				target="_blank"
				rel="noreferrer">#2841</a
			>
			(aún sin mergear). Primitives headless en
			<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">$lib/primitives/questionnaire</code>
			· Componente estilizado en
			<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">$lib/components/ui/questionnaire</code
			>.
		</p>
	</header>

	{#each sections as section (section.id)}
		{@const Component = section.component}
		<section class="flex flex-col gap-4">
			<h2 class="cn-font-heading text-lg font-medium">{section.title}</h2>
			{#if section.note}<p class="text-sm text-muted-foreground">{section.note}</p>{/if}
			<div class="rounded-xl border bg-card" style:min-height={section.minH}>
				<div class="flex min-h-full flex-col justify-center p-4 sm:p-8">
					<Component />
				</div>
			</div>
		</section>
	{/each}
</main>
