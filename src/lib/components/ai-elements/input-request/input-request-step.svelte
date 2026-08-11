<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Questionnaire from '$lib/components/ui/questionnaire/index.js';
	import { cn } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { EveMessageInputRequest } from 'eve/svelte';
	import type { InputResponse } from 'eve/client';

	// Un PASO de decisión (un input request): prompt + opciones + responder.
	// Lo usan tanto la gate individual (input-request.svelte) como el grupo
	// multistep (input-request-group.svelte). Muestra el resumen Q/A si ya se
	// respondió. La card/header/navegación la aporta el contenedor.
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
	const hasOptions = $derived(options.length > 0);

	const items = $derived(
		isConfirmation || !hasOptions
			? []
			: [
					{
						name: 'respuesta',
						required: true,
						choices: options.map((o) => ({ value: o.id })),
					},
				],
	);

	const selectedOption = $derived(
		response?.optionId ? options.find((o) => o.id === response.optionId) : undefined
	);

	function submitOption(optionId: string) {
		if (!canRespond) return;
		void onRespond({ optionId, requestId: request.requestId });
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canRespond) return;
		const data = new FormData(event.currentTarget as HTMLFormElement);
		const value = String(data.get('respuesta') ?? '').trim();
		if (!value) return;
		const option = options.find((o) => o.id === value);
		if (option) void onRespond({ optionId: option.id, requestId: request.requestId });
		else void onRespond({ text: value, requestId: request.requestId });
	}
</script>

<div class={cn('min-w-0', className)}>
	{#if response}
		<!-- Colapsado: resumen Q/A persistente del paso -->
		<div data-slot="gate-summary" class="flex flex-col gap-1 text-sm">
			<p class="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
				<CheckIcon class="size-3.5" /> Respondido
			</p>
			<p>
				<span class="text-muted-foreground">Q:</span> <span class="font-medium">{request.prompt}</span>
			</p>
			<p>
				<span class="text-muted-foreground">A:</span>
				<strong>{selectedOption?.label ?? response.text ?? response.optionId}</strong>
			</p>
		</div>
	{:else}
		<!-- Prompt del paso -->
		<p class="mb-3 text-sm text-foreground/90">{request.prompt}</p>

		{#if isConfirmation && hasOptions}
			<!-- Approval/confirmación: botones (style primary/danger) -->
			<div class="flex flex-col gap-2">
				{#each options as option (option.id)}
					<Button
						disabled={!canRespond}
						type="button"
						variant={
							option.style === 'danger'
								? 'destructive'
								: option.style === 'primary'
									? 'default'
									: 'outline'
						}
						class="justify-start"
						onclick={() => submitOption(option.id)}
					>
						<span class="font-medium">{option.label}</span>
					</Button>
				{/each}
			</div>
		{:else if hasOptions}
			<!-- Pregunta con opciones: radios (igual que el Atlas single-select) + campo libre -->
			<Questionnaire.Root {items} autofocus={false} onsubmit={handleSubmit}>
				<Questionnaire.Item name="respuesta" required>
					<Questionnaire.Choices>
						{#each options as option (option.id)}
							<Questionnaire.Choice value={option.id}>
								<span class="font-medium">{option.label}</span>
							</Questionnaire.Choice>
						{/each}
						{#if request.allowFreeform}
							<Questionnaire.Input
								aria-label="Otra respuesta"
								name="respuesta"
								placeholder="Otra respuesta…"
							/>
						{/if}
					</Questionnaire.Choices>
					<Questionnaire.Error />
				</Questionnaire.Item>
				<Questionnaire.Actions>
					<Questionnaire.Submit disabled={!canRespond}>Responder</Questionnaire.Submit>
				</Questionnaire.Actions>
			</Questionnaire.Root>
		{:else}
			<!-- Solo texto libre -->
			<form onsubmit={handleSubmit} class="flex items-end gap-2">
				<textarea
					name="respuesta"
					rows={2}
					placeholder="Escribe tu respuesta…"
					class="min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				></textarea>
				<Button type="submit" disabled={!canRespond}>Responder</Button>
			</form>
		{/if}
	{/if}
</div>
