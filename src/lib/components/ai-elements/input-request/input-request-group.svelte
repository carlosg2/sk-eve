<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import MessageCircleQuestionIcon from '@lucide/svelte/icons/message-circle-question';
	import ShieldQuestionIcon from '@lucide/svelte/icons/shield-question';
	import InputRequestStep from './input-request-step.svelte';
	import type { EveMessageInputRequest } from 'eve/svelte';
	import type { InputResponse } from 'eve/client';

	// Grupo multistep de decisiones (varias gates del mismo turno).
	// Contrato CRÍTICO: las respuestas se ACUMULAN localmente y se envían TODAS
	// JUNTAS en un solo `inputResponses` cuando todos los pasos están respondidos.
	// Si se enviara una por una, el turno podría continuar descartando las
	// preguntas aún no respondidas (batch parcial perdido).
	let {
		requests,
		canRespond = true,
		onRespondAll,
		class: className,
	}: {
		requests: EveMessageInputRequest[];
		canRespond?: boolean;
		onRespondAll: (responses: InputResponse[]) => void | Promise<void>;
		class?: string;
	} = $props();

	const total = $derived(requests.length);
	let current = $state(0);
	// respuestas acumuladas (no se envían hasta completar todos los pasos)
	let answered = $state<Record<string, InputResponse>>({});
	let sent = $state(false);

	const currentRequest = $derived(requests[current]);
	const currentAnswered = $derived(
		!!currentRequest && !!answered[currentRequest.requestId]
	);
	const isConfirmation = $derived(
		!!currentRequest && (currentRequest.options ?? []).some((o) => o.style === 'primary' || o.style === 'danger')
	);

	function respond(response: InputResponse) {
		if (!canRespond || sent || !currentRequest) return;
		answered = { ...answered, [response.requestId]: response };
		if (requests.every((r) => answered[r.requestId])) {
			// Todas respondidas: enviar TODAS juntas en un solo inputResponses
			sent = true;
			void onRespondAll(requests.map((r) => answered[r.requestId]));
			return;
		}
		// Avanzar al siguiente paso sin responder
		const next = requests.findIndex((r, i) => i > current && !answered[r.requestId]);
		if (next !== -1) current = next;
	}
</script>

<div
	class={cn(
		'rounded-xl border bg-card p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
		className
	)}
>
	<!-- Header del grupo -->
	<div class="mb-3 flex items-center justify-between gap-2">
		<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
			<MessageCircleQuestionIcon class="size-3.5" />
			Decisiones del agente
			<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums">
				{current + 1} / {total}
			</span>
		</p>
		<div class="flex items-center gap-1.5">
			{#each requests as r, i (r.requestId)}
				<span
					class={cn(
						'size-2 rounded-full transition-colors',
						answered[r.requestId]
							? 'bg-emerald-500'
							: i === current
								? 'bg-amber-500'
								: 'bg-muted-foreground/30'
					)}
					aria-label={answered[r.requestId] ? 'Respondida' : i === current ? 'Actual' : 'Pendiente'}
				></span>
			{/each}
		</div>
	</div>

	<!-- Paso actual -->
	{#if currentRequest}
		<InputRequestStep
			request={currentRequest}
			response={answered[currentRequest.requestId]}
			{canRespond}
			onRespond={respond}
		/>
	{/if}

	<!-- Navegación multistep -->
	<div class="mt-3 flex items-center justify-between gap-2">
		<Button
			variant="ghost"
			size="sm"
			disabled={current === 0}
			onclick={() => (current -= 1)}
		>
			<ChevronLeftIcon class="size-3.5" /> Anterior
		</Button>
		<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
			{#if sent}
				<span class="inline-flex items-center gap-1 font-medium text-emerald-600">
					<CheckIcon class="size-3.5" /> Todas respondidas
				</span>
			{:else}
				<span>{isConfirmation ? 'Confirmación' : 'Pregunta'} {current + 1} de {total}</span>
			{/if}
		</p>
		<Button
			variant="ghost"
			size="sm"
			disabled={current === total - 1 || !currentAnswered}
			onclick={() => (current += 1)}
		>
			Siguiente <ChevronRightIcon class="size-3.5" />
		</Button>
	</div>
</div>
