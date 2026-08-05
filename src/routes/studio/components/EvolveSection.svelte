<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import WandIcon from "@lucide/svelte/icons/wand-sparkles";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import CheckIcon from "@lucide/svelte/icons/check";

	type FileChange = { path: string; before: string; after: string };
	type EvolveOp = Record<string, unknown> & { kind: string };
	type Proposal = { kind: string; title: string; summary: string; changes: FileChange[]; op: EvolveOp };

	let { tenant, agent }: { tenant: string; agent: string } = $props();

	const EXAMPLES = [
		"Crea una skill que explique cómo interpretar el sugerido de compra por almacén.",
		"En instrucciones, pide siempre confirmar antes de generar una orden de compra.",
		"Restringe el kernel de este agente a cxp, prov y compra.",
	];

	let intent = $state("");
	let drafting = $state(false);
	let applying = $state(false);
	let applied = $state(false);
	let error = $state<string | null>(null);
	let proposal = $state<Proposal | null>(null);

	async function draft() {
		if (!intent.trim()) return;
		drafting = true;
		error = null;
		proposal = null;
		applied = false;
		try {
			const res = await fetch("/studio/api/agent/evolve", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "draft", tenant, agent, intent }),
			});
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { proposal: Proposal };
			proposal = data.proposal;
		} catch (err) {
			error = err instanceof Error ? err.message : "Error al draftear";
		} finally {
			drafting = false;
		}
	}

	async function apply() {
		if (!proposal) return;
		applying = true;
		error = null;
		try {
			const res = await fetch("/studio/api/agent/evolve", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "apply", tenant, agent, op: proposal.op }),
			});
			if (!res.ok) throw new Error(await res.text());
			applied = true;
		} catch (err) {
			error = err instanceof Error ? err.message : "Error al aplicar";
		} finally {
			applying = false;
		}
	}

	function reset() {
		proposal = null;
		applied = false;
		error = null;
	}

	// Diff por líneas, muy simple: marca líneas presentes solo en after (+) o solo en before (-).
	function diffLines(before: string, after: string): { sign: " " | "+" | "-"; text: string }[] {
		const b = new Set(before.split("\n"));
		const a = new Set(after.split("\n"));
		const out: { sign: " " | "+" | "-"; text: string }[] = [];
		for (const line of before.split("\n")) if (!a.has(line)) out.push({ sign: "-", text: line });
		for (const line of after.split("\n")) out.push({ sign: b.has(line) ? " " : "+", text: line });
		return out;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
		<WandIcon class="size-4 text-muted-foreground" />
		<span class="text-sm font-medium">Evolve</span>
		<span class="text-[11px] text-muted-foreground">— describe un cambio y revísalo antes de aplicar</span>
		<div class="flex-1"></div>
		{#if proposal}
			<Button variant="ghost" size="sm" onclick={reset}>Empezar de nuevo</Button>
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-4">
		<div class="mx-auto max-w-2xl space-y-4">
			{#if !proposal}
				<textarea
					bind:value={intent}
					rows="4"
					placeholder="Describe el cambio para {agent}…"
					class="w-full resize-y rounded-lg border border-border bg-background p-3 text-[13px] outline-none focus:border-emerald-500"
				></textarea>
				<div class="flex flex-wrap gap-1.5">
					{#each EXAMPLES as ex (ex)}
						<button
							type="button"
							onclick={() => (intent = ex)}
							class="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/50"
						>
							{ex}
						</button>
					{/each}
				</div>
				<Button onclick={draft} disabled={drafting || !intent.trim()}>
					{#if drafting}<Loader2Icon class="size-4 animate-spin" /> Drafteando…{:else}<WandIcon class="size-4" /> Draftear propuesta{/if}
				</Button>
			{:else}
				<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3">
					<div class="flex items-center gap-2">
						<span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-600">{proposal.kind}</span>
						<span class="text-[13px] font-medium">{proposal.title}</span>
					</div>
					{#if proposal.summary}<p class="mt-1 text-[12px] text-muted-foreground">{proposal.summary}</p>{/if}
				</div>

				{#each proposal.changes as ch (ch.path)}
					<div class="overflow-hidden rounded-lg border border-border">
						<div class="border-b border-border bg-muted/40 px-3 py-1.5 font-mono text-[11px]">{ch.path}</div>
						<pre class="max-h-80 overflow-auto text-[11px] leading-relaxed">{#each diffLines(ch.before, ch.after) as l}<div class={l.sign === "+" ? "bg-emerald-500/10 text-emerald-700" : l.sign === "-" ? "bg-red-500/10 text-red-600" : ""}><span class="select-none px-2 text-muted-foreground">{l.sign}</span>{l.text}</div>{/each}</pre>
					</div>
				{/each}

				<div class="flex items-center gap-2">
					{#if applied}
						<span class="flex items-center gap-1.5 text-[13px] text-emerald-500"><CheckIcon class="size-4" /> Aplicado a disco. Se levanta en la próxima sesión.</span>
					{:else}
						<Button onclick={apply} disabled={applying}>
							{#if applying}<Loader2Icon class="size-4 animate-spin" /> Aplicando…{:else}<CheckIcon class="size-4" /> Aplicar cambios{/if}
						</Button>
						<Button variant="ghost" onclick={reset}>Descartar</Button>
					{/if}
				</div>
			{/if}

			{#if error}
				<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div>
			{/if}
		</div>
	</div>
</div>
