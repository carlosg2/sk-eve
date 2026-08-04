<script lang="ts">
	import Self from "./TreeItems.svelte";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import FileTextIcon from "@lucide/svelte/icons/file-text";

	type Node = { name: string; path: string; kind: "dir" | "file"; children?: Node[] };
	type Props = {
		nodes: Node[];
		selected: string | null;
		onSelect: (path: string) => void;
		depth?: number;
	};
	let { nodes, selected, onSelect, depth = 0 }: Props = $props();
</script>

{#each nodes as node (node.path)}
	{#if node.kind === "dir"}
		<div>
			<div
				class="flex items-center gap-1.5 px-2 py-1 text-[13px] text-muted-foreground"
				style="padding-left: {depth * 12 + 8}px"
			>
				<FolderIcon class="size-3.5 shrink-0" />
				<span class="truncate">{node.name}</span>
			</div>
			{#if node.children}
				<Self nodes={node.children} {selected} {onSelect} depth={depth + 1} />
			{/if}
		</div>
	{:else}
		<button
			type="button"
			onclick={() => onSelect(node.path)}
			class="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[13px] hover:bg-muted/60 {selected === node.path ? 'bg-muted text-foreground' : 'text-muted-foreground'}"
			style="padding-left: {depth * 12 + 8}px"
		>
			<FileTextIcon class="size-3.5 shrink-0" />
			<span class="truncate">{node.name}</span>
		</button>
	{/if}
{/each}
