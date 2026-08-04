<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import ServerIcon from "@lucide/svelte/icons/server";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import SearchIcon from "@lucide/svelte/icons/search";

	type Tool = { name: string; description: string | null; inputSchema: unknown };
	type Param = { name: string; type: string; required: boolean; description: string | null };
	type Result = {
		ok: boolean;
		detail: string;
		url?: string;
		status?: number;
		serverInfo?: { name?: string; version?: string } | null;
		tools?: Tool[];
	};

	type Props = { tenant: string };
	let { tenant }: Props = $props();

	let loading = $state(true);
	let result = $state<Result | null>(null);
	let query = $state("");
	let openTool = $state<string | null>(null);

	type RuntimeTool = { name: string; description: string | null; path: string };
	let runtimeTools = $state<RuntimeTool[]>([]);
	type FrameworkTool = { name: string; description: string };
	let frameworkTools = $state<FrameworkTool[]>([]);

	async function load() {
		loading = true;
		try {
			const [mcpRes, rtRes] = await Promise.all([
				fetch(`/studio/api/mcp-tools?tenant=${encodeURIComponent(tenant)}`),
				fetch("/studio/api/runtime-tools"),
			]);
			result = (await mcpRes.json()) as Result;
			const rt = (await rtRes.json()) as { tools: RuntimeTool[]; framework: FrameworkTool[] };
			runtimeTools = rt.tools ?? [];
			frameworkTools = rt.framework ?? [];
		} catch (err) {
			result = { ok: false, detail: err instanceof Error ? err.message : "Error de red" };
		} finally {
			loading = false;
		}
	}

	// Recarga al cambiar de tenant.
	$effect(() => {
		void tenant;
		void load();
	});

	function params(schema: unknown): Param[] {
		if (!schema || typeof schema !== "object") return [];
		const s = schema as { properties?: Record<string, unknown>; required?: string[] };
		if (!s.properties) return [];
		const required = new Set(s.required ?? []);
		return Object.entries(s.properties).map(([name, def]) => {
			const d = (def ?? {}) as { type?: string | string[]; description?: string; enum?: unknown[] };
			let type = Array.isArray(d.type) ? d.type.join(" | ") : d.type ?? "any";
			if (d.enum) type = d.enum.map((v) => JSON.stringify(v)).join(" | ");
			return {
				name,
				type,
				required: required.has(name),
				description: typeof d.description === "string" ? d.description : null,
			};
		});
	}

	const tools = $derived(result?.tools ?? []);
	const filtered = $derived(
		query.trim()
			? tools.filter((t) => {
					const q = query.toLowerCase();
					return t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
				})
			: tools,
	);

	const filteredRuntime = $derived(
		query.trim()
			? runtimeTools.filter((t) => {
					const q = query.toLowerCase();
					return t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
				})
			: runtimeTools,
	);

	const filteredFramework = $derived(
		query.trim()
			? frameworkTools.filter((t) => {
					const q = query.toLowerCase();
					return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
				})
			: frameworkTools,
	);

	function toggle(name: string) {
		openTool = openTool === name ? null : name;
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Cabecera -->
	<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
		<WrenchIcon class="size-4 text-muted-foreground" />
		<span class="text-sm font-medium">Tools del agente</span>
		{#if result?.ok}
			<span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
				{tools.length + runtimeTools.length + frameworkTools.length}
			</span>
		{/if}
		<div class="flex-1"></div>
		<Button variant="ghost" size="sm" onclick={load} disabled={loading} title="Recargar">
			{#if loading}<Loader2Icon class="size-4 animate-spin" />{:else}<RotateCwIcon class="size-4" />{/if}
		</Button>
	</div>

	<!-- Estado servidor -->
	<div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
		<span class="inline-flex items-center gap-1.5">
			<ServerIcon class="size-3.5" />
			{#if result?.serverInfo?.name}
				<span class="font-medium text-foreground">{result.serverInfo.name}</span>
				<span>v{result.serverInfo.version ?? "?"}</span>
			{:else}
				<span>Servidor MCP</span>
			{/if}
		</span>
		{#if result?.url}
			<span class="font-mono">{result.url}</span>
		{/if}
	</div>

	{#if !loading && result && !result.ok}
		<div class="m-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[13px] text-destructive">
			<AlertTriangleIcon class="mt-0.5 size-4 shrink-0" />
			<div>
				<div class="font-medium">No se pudieron listar los tools</div>
				<div class="mt-0.5 break-all text-destructive/80">{result.detail}</div>
			</div>
		</div>
	{/if}

	{#if result?.ok}
		<!-- Buscador -->
		<div class="border-b border-border px-4 py-2">
			<div class="relative">
				<SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input bind:value={query} placeholder="Filtrar tools…" class="h-8 pl-8 text-[13px]" />
			</div>
		</div>
	{/if}

	<!-- Lista -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if loading}
			<div class="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
				<Loader2Icon class="size-4 animate-spin" /> Conectando al MCP…
			</div>
		{:else}
			{#if filteredFramework.length}
				<div class="flex items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					Framework · Eve
					<span class="rounded bg-muted px-1 py-0.5 text-[10px]">{filteredFramework.length}</span>
				</div>
				<ul class="divide-y divide-border">
					{#each filteredFramework as tool (tool.name)}
						<li class="flex items-start gap-2 px-4 py-2.5 pl-9">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<code class="text-[13px] font-semibold">{tool.name}</code>
									<span class="rounded bg-violet-500/15 px-1 py-0.5 text-[9px] font-medium uppercase text-violet-600 dark:text-violet-400">framework</span>
								</div>
								{#if tool.description}
									<p class="mt-0.5 text-[12px] leading-snug text-muted-foreground">{tool.description}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#if filteredRuntime.length}
				<div class="flex items-center gap-1.5 border-b border-t border-border bg-muted/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					Runtime · agent/tools
					<span class="rounded bg-muted px-1 py-0.5 text-[10px]">{filteredRuntime.length}</span>
				</div>
				<ul class="divide-y divide-border">
					{#each filteredRuntime as tool (tool.name)}
						<li class="flex items-start gap-2 px-4 py-2.5 pl-9">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<code class="text-[13px] font-semibold">{tool.name}</code>
									<span class="rounded bg-sky-500/15 px-1 py-0.5 text-[9px] font-medium uppercase text-sky-600 dark:text-sky-400">runtime</span>
								</div>
								{#if tool.description}
									<p class="mt-0.5 text-[12px] leading-snug text-muted-foreground">{tool.description}</p>
								{/if}
								<code class="mt-0.5 block text-[10px] text-muted-foreground/70">{tool.path}</code>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#if result?.ok}
				<div class="flex items-center gap-1.5 border-b border-t border-border bg-muted/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					MCP · DAB
					<span class="rounded bg-muted px-1 py-0.5 text-[10px]">{tools.length}</span>
				</div>
			{/if}
			{#if result?.ok && filtered.length === 0 && filteredRuntime.length === 0 && filteredFramework.length === 0}
				<div class="px-4 py-6 text-sm text-muted-foreground">
					{tools.length === 0 ? "El MCP no expone tools." : "Ningún tool coincide con el filtro."}
				</div>
			{:else if result?.ok}
				<ul class="divide-y divide-border">
				{#each filtered as tool (tool.name)}
					{@const ps = params(tool.inputSchema)}
					{@const isOpen = openTool === tool.name}
					<li>
						<button
							type="button"
							onclick={() => toggle(tool.name)}
							class="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-muted/40"
						>
							{#if isOpen}
								<ChevronDownIcon class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
							{:else}
								<ChevronRightIcon class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
							{/if}
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<code class="text-[13px] font-semibold">{tool.name}</code>
									{#if ps.length}
										<span class="text-[10px] text-muted-foreground">{ps.length} param{ps.length === 1 ? "" : "s"}</span>
									{/if}
								</div>
								{#if tool.description}
									<p class="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
										{tool.description}
									</p>
								{/if}
							</div>
						</button>

						{#if isOpen}
							<div class="space-y-3 border-t border-border bg-muted/20 px-4 py-3 pl-9">
								{#if tool.description}
									<p class="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/90">{tool.description}</p>
								{/if}
								{#if ps.length}
									<div>
										<div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Parámetros</div>
										<div class="overflow-hidden rounded-md border border-border">
											<table class="w-full text-[12px]">
												<tbody class="divide-y divide-border">
													{#each ps as p (p.name)}
														<tr class="align-top">
															<td class="whitespace-nowrap px-2.5 py-1.5 font-mono font-medium">
																{p.name}{#if p.required}<span class="text-destructive">*</span>{/if}
															</td>
															<td class="whitespace-nowrap px-2.5 py-1.5 font-mono text-muted-foreground">{p.type}</td>
															<td class="px-2.5 py-1.5 text-muted-foreground">{p.description ?? ""}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{:else}
									<div class="text-[12px] text-muted-foreground">Sin parámetros.</div>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
			{/if}
		{/if}
	</div>
</div>
