<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Markdown } from "$lib/components/ai/markdown/index.js";
	import SaveIcon from "@lucide/svelte/icons/save";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import PencilIcon from "@lucide/svelte/icons/pencil";

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
	/** Modo de visualización: por defecto la vista previa renderizada; el editor solo al pulsar "Editar". */
	let mode = $state<"preview" | "edit">("preview");

	const dirty = $derived(content !== original);

	/**
	 * Separa el frontmatter YAML (`--- ... ---`) del cuerpo. En la vista previa el
	 * frontmatter se muestra como bloque de código YAML (estilo Obsidian) para no
	 * romper la lectura del contenido. Si no hay frontmatter, se devuelve el texto tal cual.
	 */
	function splitFrontmatter(source: string): { frontmatter: string | null; body: string } {
		const match = /^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(source);
		if (!match) return { frontmatter: null, body: source };
		return { frontmatter: match[1], body: source.slice(match[0].length) };
	}

	/** Fuente del markdown renderizado en la vista previa (con frontmatter como bloque YAML). */
	const previewSource = $derived.by(() => {
		const { frontmatter, body } = splitFrontmatter(content);
		if (!frontmatter) return body;
		return `\`\`\`yaml\n---\n${frontmatter}\n---\n\`\`\`\n\n${body}`;
	});

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
		} else if (e.key === "Escape") {
			// Escape en el editor vuelve a la vista previa.
			mode = "preview";
		}
	}
</script>

<div class="flex h-full min-h-0 min-w-0 flex-col">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
		<div class="min-w-0">
			<div class="truncate text-sm font-medium text-foreground">{label ?? path}</div>
			<div class="truncate font-mono text-[11px] text-muted-foreground">
				{path}{!exists ? " · (nuevo)" : ""}
			</div>
		</div>
		<div class="flex-1"></div>
		{#if dirty}
			<span class="text-[11px] text-amber-500">sin guardar</span>
		{:else if savedAt}
			<span class="text-[11px] text-muted-foreground">guardado</span>
		{/if}

		<!-- Toggle vista previa / edición -->
		<div class="flex shrink-0 items-center rounded-md border border-border bg-background p-0.5">
			<button
				type="button"
				onclick={() => (mode = "preview")}
				title="Vista previa renderizada"
				aria-label="Vista previa renderizada"
				class="flex items-center gap-1.5 rounded px-2 py-1 text-xs {mode === 'preview' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}"
			>
				<EyeIcon class="size-3.5" />
				<span class="hidden lg:inline">Vista</span>
			</button>
			<button
				type="button"
				onclick={() => (mode = "edit")}
				title="Editar (Escape para volver a la vista)"
				aria-label="Editar (Escape para volver a la vista)"
				class="flex items-center gap-1.5 rounded px-2 py-1 text-xs {mode === 'edit' ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}"
			>
				<PencilIcon class="size-3.5" />
				<span class="hidden lg:inline">Editar</span>
			</button>
		</div>

		<Button variant="ghost" size="sm" onclick={load} disabled={loading || saving} title="Recargar" aria-label="Recargar">
			<RotateCwIcon class="size-3.5" />
		</Button>
		<Button size="sm" onclick={save} disabled={!dirty || saving || loading} title="Guardar" aria-label="Guardar">
			{#if saving}
				<Loader2Icon class="size-3.5 animate-spin" />
			{:else}
				<SaveIcon class="size-3.5" />
			{/if}
			<span class="hidden lg:inline">Guardar</span>
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
		{:else if mode === "preview"}
			<!-- Vista previa: markdown renderizado por default -->
			<div class="preview-markdown h-full min-w-0 overflow-auto p-5">
				{#if previewSource.trim()}
					<Markdown content={previewSource} />
				{:else}
					<div class="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
						<span>Archivo {exists ? "vacío" : "nuevo"}.</span>
						<Button variant="secondary" size="sm" onclick={() => (mode = "edit")}>
							<PencilIcon class="size-3.5" /> Editar
						</Button>
					</div>
				{/if}
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

<style>
	/*
	 * En la vista previa, el código en línea (`code` de streamdown) debe poder
	 * partir la línea para no desbordar el panel en anchos angostos. Los bloques
	 * de código (dentro de <pre>) conservan su scroll horizontal.
	 */
	.preview-markdown :global(code) {
		overflow-wrap: anywhere;
		word-break: break-word;
	}
	.preview-markdown :global(pre code) {
		overflow-wrap: normal;
		word-break: normal;
		white-space: pre;
	}
</style>
