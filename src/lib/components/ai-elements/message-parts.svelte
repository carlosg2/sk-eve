<script lang="ts">
	import type { EveMessage } from 'eve/svelte';
	import type { InputResponse } from 'eve/client';
	import Authorization from './authorization/authorization.svelte';
	import InputRequest from './input-request/input-request.svelte';
	import InputRequestGroup from './input-request/input-request-group.svelte';

	// Renderiza los parts NO textuales de un mensaje assistant que la UI principal
	// (MessageAnimated) no dibuja: `authorization` (retos OAuth) y `dynamic-tool`
	// con input request (las gates HITL de ask/approval). Cada part vive DENTRO
	// del transcript, en la posición del mensaje que lo emitió.
	//
	// Cuando un mismo mensaje trae VARIAS gates pendientes (el agente preguntó
	// todas a la vez en un solo turno), se agrupan en un `InputRequestGroup`
	// multistep: una pregunta por paso, con navegación y progreso, y las
	// respuestas se envían TODAS JUNTAS en un solo `inputResponses` al completar
	// los pasos (nunca una por una: eso descartaría las preguntas aún no
	// respondidas). Las gates ya respondidas (turnos previos) se renderizan
	// individuales como resumen Q/A persistente.
	let {
		message,
		canRespond = true,
		onInputResponse,
		onRespondAll,
		class: className,
	}: {
		message: EveMessage;
		canRespond?: boolean;
		onInputResponse: (response: InputResponse) => void | Promise<void>;
		onRespondAll?: (responses: InputResponse[]) => void | Promise<void>;
		class?: string;
	} = $props();

	function partKey(part: EveMessage['parts'][number], index: number): string {
		switch (part.type) {
			case 'dynamic-tool':
				return `tool:${part.toolCallId}`;
			case 'authorization':
				return `auth:${part.turnId}:${part.stepIndex}`;
			case 'text':
			case 'reasoning':
				return `${part.type}:${part.stepIndex}`;
			default:
				return `${part.type}:${index}`;
		}
	}

	// Gates HITL pendientes en ESTE mensaje (mismo turno, sin responder aún).
	const pendingGates = $derived(
		message.parts
			.map((part, index) => ({ part, index }))
			.filter(
				({ part }) =>
					part.type === 'dynamic-tool' &&
					part.toolMetadata?.eve?.inputRequest &&
					!part.toolMetadata?.eve?.inputResponse
			)
	);
	const pendingFirstIndex = $derived(pendingGates[0]?.index ?? -1);
	const pendingRequests = $derived(
		pendingGates.map(({ part }) => part.toolMetadata.eve.inputRequest as never)
	);
</script>

<div class={className}>
	{#each message.parts as part, i (partKey(part, i))}
		{#if part.type === 'authorization'}
			<div class="mb-3">
				<Authorization {part} />
			</div>
		{:else if part.type === 'dynamic-tool' && part.toolMetadata?.eve?.inputRequest}
			{#if part.toolMetadata?.eve?.inputResponse}
				<!-- Gate respondida (turnos previos): resumen Q/A individual -->
				<div class="mb-3">
					<InputRequest
						request={part.toolMetadata.eve.inputRequest}
						response={part.toolMetadata.eve.inputResponse}
						{canRespond}
						onRespond={onInputResponse}
					/>
				</div>
			{:else if pendingGates.length > 1 && i === pendingFirstIndex}
				<!-- Varias gates pendientes del mismo turno: grupo multistep (envío único) -->
				<div class="mb-3">
					<InputRequestGroup
						requests={pendingRequests}
						{canRespond}
						onRespondAll={
							onRespondAll ?? ((responses: InputResponse[]) => responses.forEach(onInputResponse))
						}
					/>
				</div>
			{:else if pendingGates.length <= 1}
				<!-- Una sola gate pendiente: individual -->
				<div class="mb-3">
					<InputRequest
						request={part.toolMetadata.eve.inputRequest}
						{canRespond}
						onRespond={onInputResponse}
					/>
				</div>
			{/if}
		{/if}
	{/each}
</div>
