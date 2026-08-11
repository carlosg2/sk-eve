<script lang="ts">
	import { cn } from '$lib/utils.js';
	import MessageCircleQuestionIcon from '@lucide/svelte/icons/message-circle-question';
	import ShieldQuestionIcon from '@lucide/svelte/icons/shield-question';
	import type { EveMessageInputRequest } from 'eve/svelte';
	import type { InputResponse } from 'eve/client';
	import InputRequestStep from './input-request-step.svelte';

	// Gate HITL del chat REAL para UNA decisión (contrato Eve: input.requested →
	// part dynamic-tool). Visual ALINEADO con el Atlas (/chat/hitl-atlas): card +
	// header con badge de estado. La lógica de opciones/responder vive en
	// InputRequestStep (compartida con el grupo multistep). Al responder, la
	// reducer pone `response` y la gate colapsa a "Respondido: X".
	let {
		request,
		response,
		canRespond = true,
		onRespond,
		class: className,
	}: {
		request: EveMessageInputRequest;
		response?: InputResponse;
		canRespond?: boolean;
		onRespond: (response: InputResponse) => void | Promise<void>;
		class?: string;
	} = $props();

	const options = $derived(request.options ?? []);
	const isConfirmation = $derived(options.some((o) => o.style === 'danger' || o.style === 'primary'));
</script>

<div class={cn('rounded-xl border bg-card p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300', className)}>
	<!-- Header de la gate (igual que el Atlas) -->
	<div class="mb-3 flex items-center justify-between gap-2">
		<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
			{#if isConfirmation}
				<ShieldQuestionIcon class="size-3.5" />
				Confirmación del agente
			{:else}
				<MessageCircleQuestionIcon class="size-3.5" />
				Pregunta del agente
			{/if}
		</p>
		<div class="flex items-center gap-1.5">
			{#if response}
				<span
					class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600"
					>Respondida</span
				>
			{:else}
				<span
					class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600"
					>Turno pausado</span
				>
			{/if}
		</div>
	</div>

	<InputRequestStep {request} {response} {canRespond} {onRespond} />
</div>
