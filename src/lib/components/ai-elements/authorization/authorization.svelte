<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import CheckCircleIcon from '@lucide/svelte/icons/circle-check';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import type { EveAuthorizationPart } from 'eve/svelte';

	// Renderiza el part `authorization` de Eve: un reto OAuth ("required" →
	// botón de inicio de sesión con código/URL) que al completarse se colapsa a
	// su resultado (conectado/rechazado/caducado/fallido).
	let { part, class: className }: { part: EveAuthorizationPart; class?: string } = $props();

	const done = $derived(part.state === 'completed');
	const authorized = $derived(part.state === 'completed' && part.outcome === 'authorized');

	const title = $derived(
		part.state === 'required'
			? `Conectar ${part.displayName}`
			: `${part.displayName} ${outcomeLabel(part.outcome)}`
	);

	const description = $derived(
		part.state === 'required'
			? part.description
			: `${part.displayName} ${outcomeLabel(part.outcome)}${part.reason ? ` (${part.reason})` : ''}.`
	);

	function outcomeLabel(outcome: NonNullable<EveAuthorizationPart['outcome']>): string {
		switch (outcome) {
			case 'authorized':
				return 'conectado';
			case 'declined':
				return 'rechazado';
			case 'timed-out':
				return 'caducado';
			case 'failed':
				return 'fallido';
		}
	}
</script>

<div
	class={cn(
		'space-y-3 rounded-lg border p-3',
		authorized
			? 'border-emerald-500/30 bg-emerald-500/5'
			: done
				? 'border-destructive/30 bg-destructive/5'
				: 'border-blue-500/30 bg-blue-500/5',
		className
	)}
>
	<div class="flex items-start gap-3">
		<span
			class={cn(
				'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
				authorized
					? 'bg-emerald-500/10 text-emerald-600'
					: done
						? 'bg-destructive/10 text-destructive'
						: 'bg-blue-500/10 text-blue-600'
			)}
		>
			{#if authorized}
				<CheckCircleIcon class="size-4" />
			{:else if done}
				<XCircleIcon class="size-4" />
			{:else}
				<KeyRoundIcon class="size-4" />
			{/if}
		</span>
		<div class="min-w-0 flex-1 space-y-2">
			<p class="text-sm font-medium">{title}</p>
			<p class="text-muted-foreground text-sm">{description}</p>
			{#if part.state === 'required' && part.authorization?.instructions && part.authorization.instructions !== part.description}
				<p class="text-muted-foreground text-sm">{part.authorization.instructions}</p>
			{/if}
			{#if part.state === 'required' && part.authorization?.userCode}
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<span class="text-muted-foreground">Código</span>
					<code class="rounded-md bg-background px-2 py-1 font-mono">{part.authorization.userCode}</code>
				</div>
			{/if}
			{#if part.state === 'required' && part.authorization?.url}
				<Button href={part.authorization.url} target="_blank" rel="noreferrer" size="sm">
					<ExternalLinkIcon class="size-4" />
					Iniciar sesión con {part.displayName}
				</Button>
			{/if}
		</div>
	</div>
</div>
