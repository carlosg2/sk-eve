<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import SaveIcon from "@lucide/svelte/icons/save";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";

	type Props = {
		/** Ruta relativa a company-twin/. */
		path: string;
		/** Etiqueta mostrada en la cabecera. */
		label?: string;
		/** Placeholder cuando el archivo aún no existe. */
		placeholder?: string;
	};

	let { path, label, placeholder = "" }: Props = $props();

	let content = $state("");
	let original = $state("");
	let exists = $state(true);
	let loading = $state(true);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);
	let savedAt = $state<number | null>(null);

	const dirty = $derived(content !== original);

	async function load() {
		loading = true;
		errorMsg = null;
		try {
			const res = await fetch(`/studio/api/file?path=${encodeURIComponent(path)}`);
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { content: string; exists: boolean };
			content = data.content;
			original = data.content;
			exists = data.exists;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Error de lectura";
		} finally {
			loading = false;
		}
	}

	async function save() {
		saving = true;
		errorMsg = null;
		try {
			const res = await fetch("/studio/api/file", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ path, content }),
			});
			if (!res.ok) throw new Error(await res.text());
			original = content;
			exists = true;
			savedAt = Date.now();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Error de escritura";
		} finally {
			saving = false;
		}
	}

	// Recargar cuando cambia la ruta.
	$effect(() => {
		path;
		load();
	});

	function onKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === "s") {
			e.preventDefault();
			if (dirty && !saving) save();
		}
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="flex items-center gap-3 border-b border-border px-4 py-2.5">
		<div class="min-w-0">
			<div class="truncate text-sm font-medium text-foreground">{label ?? path}</div>
			<div class="truncate font-mono text-[11px] text-muted-foreground">
				{path}{!exists ? " · (nuevo)" : ""}
			</div>
		</div>
		<div class="flex-1"></div>
		{#if savedAt && !dirty}
			<span class="text-[11px] text-muted-foreground">guardado</span>
		{/if}
		<Button variant="ghost" size="sm" onclick={load} disabled={loading || saving} title="Recargar">
			<RotateCwIcon class="size-3.5" />
		</Button>
		<Button size="sm" onclick={save} disabled={!dirty || saving || loading}>
			{#if saving}
				<Loader2Icon class="size-3.5 animate-spin" />
			{:else}
				<SaveIcon class="size-3.5" />
			{/if}
			Guardar
		</Button>
	</div>

	{#if errorMsg}
		<div class="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
			{errorMsg}
		</div>
	{/if}

	<div class="min-h-0 flex-1">
		{#if loading}
			<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
				<Loader2Icon class="mr-2 size-4 animate-spin" /> Cargando…
			</div>
		{:else}
			<textarea
				bind:value={content}
				onkeydown={onKeydown}
				spellcheck="false"
				{placeholder}
				class="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none"
			></textarea>
		{/if}
	</div>
</div>
