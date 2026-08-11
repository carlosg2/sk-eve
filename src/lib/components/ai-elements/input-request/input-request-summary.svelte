<script lang="ts">
	import { cn } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MessageCircleQuestionIcon from '@lucide/svelte/icons/message-circle-question';
	import type { EveMessageInputRequest } from 'eve/svelte';
	import type { InputResponse } from 'eve/client';
	import InputRequestStep from './input-request-step.svelte';

	// Resumen agrupado de un batch de decisiones YA respondidas: cuando un mismo
	// mensaje trajo varias gates (ask_question) y el usuario las respondió todas,
	// en lugar de renderizar una tarjeta individual por gate (Q/A sueltas), se
	// agrupan en UNA sola tarjeta con todas las Q/A — espejo del InputRequestGroup
	// multistep con el que se preguntaron.
	let {
		items,
		class: className,
	}: {
		items: { request: EveMessageInputRequest; response: InputResponse }[];
		class?: string;
	} = $props();
</script>

<div
	class={cn(
		'rounded-xl border bg-card p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
		className
	)}
>
	<!-- Header del grupo resuelto -->
	<div class="mb-3 flex items-center justify-between gap-2">
		<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
			<MessageCircleQuestionIcon class="size-3.5" />
			Decisiones del agente
			<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">
				{items.length}
			</span>
		</p>
		<span
			class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"
		>
			<CheckIcon class="size-3" /> Respondidas
		</span>
	</div>

	// Todas las Q/A del batch en una sola lista
	<div class="flex flex-col divide-y divide-border">
		{#each items as item, i (item.request.requestId)}
			<div class="py-2 first:pt-0 last:pb-0">
				<InputRequestStep
					request={item.request}
					response={item.response}
					canRespond={false}
					onRespond={() => {}}
				/>
			</div>
		{/each}
	</div>
</div>
