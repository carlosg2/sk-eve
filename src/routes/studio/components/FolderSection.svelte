<script lang="ts">
	import TreeItems from "./TreeItems.svelte";
	import FileEditor from "./FileEditor.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import FilePlusIcon from "@lucide/svelte/icons/file-plus";

	type Node = { name: string; path: string; kind: "dir" | "file"; children?: Node[] };
	type Props = {
		/** Carpeta base relativa a company-twin/. */
		base: string;
		label: string;
		emptyHint?: string;
		/** Sugerencia de nombre para "nuevo archivo". */
		newFileName?: string;
	};
	let { base, label, emptyHint = "Sin archivos.", newFileName = "nuevo.md" }: Props = $props();

	let nodes = $state<Node[]>([]);
	let loading = $state(true);
	let errorMsg = $state<string | null>(null);
	let selected = $state<string | null>(null);

	async function loadTree() {
		loading = true;
		errorMsg = null;
		try {
			const res = await fetch(`/studio/api/tree?path=${encodeURIComponent(base)}`);
			if (!res.ok) throw new Error(await res.text());
			nodes = ((await res.json()) as { nodes: Node[] }).nodes;
			if (selected && !containsPath(nodes, selected)) selected = null;
			if (!selected) selected = firstFile(nodes);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Error al leer el árbol";
		} finally {
			loading = false;
		}
	}

	function firstFile(list: Node[]): string | null {
		for (const n of list) {
			if (n.kind === "file") return n.path;
			if (n.children) {
				const found = firstFile(n.children);
				if (found) return found;
			}
		}
		return null;
	}

	function containsPath(list: Node[], path: string): boolean {
		for (const n of list) {
			if (n.path === path) return true;
			if (n.children && containsPath(n.children, path)) return true;
		}
		return false;
	}

	async function newFile() {
		const name = prompt("Nombre del archivo (relativo a la carpeta):", newFileName);
		if (!name) return;
		const path = `${base}/${name}`.replace(/\/+/g, "/");
		const res = await fetch("/studio/api/file", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ path, content: "" }),
		});
		if (!res.ok) {
			errorMsg = await res.text();
			return;
		}
		await loadTree();
		selected = path;
	}

	$effect(() => {
		base;
		loadTree();
	});
</script>

<div class="grid h-full min-h-0 grid-cols-[minmax(180px,240px)_1fr]">
	<div class="flex min-h-0 flex-col border-r border-border">
		<div class="flex items-center gap-1 border-b border-border px-3 py-2">
			<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
			<div class="flex-1"></div>
			<Button variant="ghost" size="sm" onclick={newFile} title="Nuevo archivo">
				<FilePlusIcon class="size-3.5" />
			</Button>
			<Button variant="ghost" size="sm" onclick={loadTree} title="Recargar">
				<RotateCwIcon class="size-3.5" />
			</Button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto py-1">
			{#if loading}
				<div class="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
					<Loader2Icon class="size-3.5 animate-spin" /> Cargando…
				</div>
			{:else if errorMsg}
				<div class="px-3 py-2 text-xs text-destructive">{errorMsg}</div>
			{:else if nodes.length === 0}
				<div class="px-3 py-2 text-xs text-muted-foreground">{emptyHint}</div>
			{:else}
				<TreeItems {nodes} {selected} onSelect={(p) => (selected = p)} />
			{/if}
		</div>
	</div>

	<div class="min-h-0">
		{#if selected}
			{#key selected}
				<FileEditor path={selected} label={selected.split("/").pop()} />
			{/key}
		{:else}
			<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
				Selecciona un archivo o crea uno nuevo.
			</div>
		{/if}
	</div>
</div>
