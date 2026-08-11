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

	type Section = { id: string; title: string; note?: string; component: Component; minH?: string };

	const sections: Section[] = [
		{
			id: "demo",
			title: "Principal",
			note: "Elección única, elección múltiple, respuesta libre, atajos, omitir y navegación en un solo flujo.",
			component: Demo,
			minH: "560px",
		},
		{
			id: "multiple",
			title: "Selección múltiple",
			note: "Usa multiple en un elemento para aceptar más de una respuesta fija (checkboxes nativos).",
			component: Multiple,
			minH: "420px",
		},
		{
			id: "freeform",
			title: "Respuesta libre",
			note: "Combina Questionnaire.Input con opciones fijas cuando el usuario puede dar otra respuesta.",
			component: Freeform,
			minH: "420px",
		},
		{
			id: "skip",
			title: "Omitir explícitamente",
			note: "Agrega Questionnaire.Skip cuando un elemento opcional puede quedar intencionalmente sin responder.",
			component: Skip,
			minH: "520px",
		},
		{
			id: "shortcuts",
			title: "Atajos",
			note: "Asigna una letra o un número a cada respuesta con shortcuts.",
			component: Shortcuts,
			minH: "480px",
		},
		{
			id: "validation",
			title: "Validación personalizada",
			note: "Combina navegación controlada con un esquema externo (Zod) para regresar a un elemento inválido.",
			component: Validation,
			minH: "520px",
		},
		{
			id: "controlled",
			title: "Controlado",
			note: "Controla el elemento activo desde el estado del host, por ejemplo para volver a un paso inválido.",
			component: Controlled,
			minH: "520px",
		},
		{
			id: "resume",
			title: "Reanudar",
			note: "Restaura un elemento activo guardado y las respuestas por defecto, y luego restablece los cambios a ese estado.",
			component: Resume,
			minH: "520px",
		},
		{
			id: "conditional",
			title: "Elementos condicionales",
			note: "Deshabilita los elementos que no aplican según las respuestas anteriores del usuario.",
			component: Conditional,
			minH: "520px",
		},
		{
			id: "navigation-state",
			title: "Estado de navegación",
			note: "Lee el estado de cada elemento para optar por navegación deshabilitada y estilos de acción personalizados.",
			component: NavigationState,
			minH: "480px",
		},
		{
			id: "progress",
			title: "Progreso personalizado",
			note: "Usa el estado del snippet Progress para construir un indicador de progreso personalizado.",
			component: Progress,
			minH: "520px",
		},
		{
			id: "animated",
			title: "Elementos animados",
			note: "Anima el elemento activo mientras el progreso y la navegación permanecen fijos.",
			component: Animated,
			minH: "520px",
		},
		{
			id: "card",
			title: "Tarjeta",
			note: "Combina Questionnaire con los slots de Card manteniendo el título y la descripción semánticos.",
			component: CardDemo,
			minH: "560px",
		},
		{
			id: "dialog",
			title: "Diálogo",
			note: "Combina Questionnaire dentro de un Dialog manteniendo la cancelación y el cierre controlados por el host.",
			component: DialogDemo,
			minH: "320px",
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
			Componente multi-paso para flujos de preguntas (single/multiple choice, freeform, skip,
			shortcuts, validación, navegación controlada). Portado del PR de shadcn-svelte
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
