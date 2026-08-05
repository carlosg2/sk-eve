<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import BookIcon from "@lucide/svelte/icons/book-open";
	import DatabaseIcon from "@lucide/svelte/icons/database";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import CheckIcon from "@lucide/svelte/icons/check";

	type CatalogSkill = { slug: string; name: string; description: string | null; tenant: string[] | null };
	type KernelConcept = { id: string; title: string; description: string | null };
	type Manifest = { skills: string[]; kernel: string[] | "*"; mcpTools: string[] };
	type McpTool = { name: string; description: string | null };

	let { tenant, agent }: { tenant: string; agent: string } = $props();

	let loading = $state(true);
	let saving = $state(false);
	let savedAt = $state<number | null>(null);
	let error = $state<string | null>(null);

	let catalog = $state<CatalogSkill[]>([]);
	let kernel = $state<KernelConcept[]>([]);
	let manifest = $state<Manifest>({ skills: [], kernel: "*", mcpTools: [] });

	let mcpTools = $state<McpTool[]>([]);
	let mcpDetail = $state<string | null>(null);
	let mcpLoading = $state(false);

	const kernelAll = $derived(manifest.kernel === "*");

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch(
				`/studio/api/agent/capabilities?tenant=${encodeURIComponent(tenant)}&agent=${encodeURIComponent(agent)}`,
			);
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { manifest: Manifest; catalog: CatalogSkill[]; kernel: KernelConcept[] };
			manifest = data.manifest;
			catalog = data.catalog;
			kernel = data.kernel;
		} catch (err) {
			error = err instanceof Error ? err.message : "Error al cargar capacidades";
		} finally {
			loading = false;
		}
		void loadMcp();
	}

	async function loadMcp() {
		mcpLoading = true;
		mcpDetail = null;
		try {
			const res = await fetch(`/studio/api/mcp-tools?tenant=${encodeURIComponent(tenant)}`);
			const data = (await res.json()) as { ok?: boolean; detail?: string; tools?: McpTool[] };
			if (data.tools?.length) {
				mcpTools = data.tools.map((t) => ({ name: t.name, description: t.description ?? null }));
			} else {
				mcpTools = [];
				mcpDetail = data.detail ?? "El MCP no devolvió tools.";
			}
		} catch (err) {
			mcpTools = [];
			mcpDetail = err instanceof Error ? err.message : "MCP inalcanzable";
		} finally {
			mcpLoading = false;
		}
	}

	// Persiste el manifest completo en agent.md tras cada cambio (auto-save).
	async function persist(patch: Partial<Manifest>) {
		saving = true;
		error = null;
		try {
			const res = await fetch("/studio/api/agent/capabilities", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ tenant, agent, ...patch }),
			});
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { manifest: Manifest };
			manifest = data.manifest;
			savedAt = Date.now();
		} catch (err) {
			error = err instanceof Error ? err.message : "Error al guardar";
		} finally {
			saving = false;
		}
	}

	function toggleSkill(slug: string) {
		const has = manifest.skills.includes(slug);
		const next = has ? manifest.skills.filter((s) => s !== slug) : [...manifest.skills, slug];
		void persist({ skills: next });
	}

	function toggleKernelAll() {
		// "*" ⇄ lista explícita. Al restringir arranca con la selección actual materializada.
		if (kernelAll) void persist({ kernel: [] });
		else void persist({ kernel: "*" });
	}

	function toggleKernel(id: string) {
		if (kernelAll) return;
		const list = manifest.kernel as string[];
		const has = list.includes(id);
		const next = has ? list.filter((k) => k !== id) : [...list, id];
		void persist({ kernel: next });
	}

	function toggleMcp(name: string) {
		const has = manifest.mcpTools.includes(name);
		const next = has ? manifest.mcpTools.filter((t) => t !== name) : [...manifest.mcpTools, name];
		void persist({ mcpTools: next });
	}

	function kernelChecked(id: string): boolean {
		return kernelAll || (manifest.kernel as string[]).includes(id);
	}

	// Recarga al cambiar de agente.
	$effect(() => {
		void tenant;
		void agent;
		void load();
	});
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
		<span class="text-sm font-medium">Capabilities</span>
		<span class="text-[11px] text-muted-foreground">— qué levanta este agente al activarse</span>
		<div class="flex-1"></div>
		{#if saving}
			<span class="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2Icon class="size-3 animate-spin" /> guardando…</span>
		{:else if savedAt}
			<span class="flex items-center gap-1 text-[11px] text-emerald-500"><CheckIcon class="size-3" /> guardado en agent.md</span>
		{/if}
		<Button variant="ghost" size="sm" onclick={load} disabled={loading} title="Recargar">
			{#if loading}<Loader2Icon class="size-4 animate-spin" />{:else}<RotateCwIcon class="size-4" />{/if}
		</Button>
	</div>

	{#if error}
		<div class="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-[12px] text-destructive">{error}</div>
	{/if}

	<div class="min-h-0 flex-1 overflow-y-auto p-4">
		{#if loading}
			<div class="text-sm text-muted-foreground">Cargando…</div>
		{:else}
			<!-- Skills -->
			<section class="mb-6">
				<div class="mb-2 flex items-center gap-2">
					<BookIcon class="size-4 text-muted-foreground" />
					<h3 class="text-[13px] font-semibold">Skills del catálogo</h3>
					<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
						{manifest.skills.length}/{catalog.length}
					</span>
				</div>
				<p class="mb-2 text-[11px] text-muted-foreground">
					Visibles para <code>{tenant}</code>. Marcadas = el agente las puede cargar on-demand.
				</p>
				<div class="grid gap-1.5">
					{#each catalog as s (s.slug)}
						<label class="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 hover:bg-muted/40">
							<input
								type="checkbox"
								class="mt-0.5 size-4 accent-emerald-500"
								checked={manifest.skills.includes(s.slug)}
								onchange={() => toggleSkill(s.slug)}
							/>
							<div class="min-w-0">
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-[12px] font-medium">{s.slug}</span>
									<span class="rounded bg-muted px-1 py-0.5 text-[9px] uppercase text-muted-foreground">
										{s.tenant === null ? "universal" : s.tenant.join(", ")}
									</span>
								</div>
								{#if s.description}<div class="truncate text-[11px] text-muted-foreground">{s.description}</div>{/if}
							</div>
						</label>
					{:else}
						<div class="text-[12px] text-muted-foreground">No hay skills en el catálogo para este tenant.</div>
					{/each}
				</div>
			</section>

			<!-- Kernel -->
			<section class="mb-6">
				<div class="mb-2 flex items-center gap-2">
					<DatabaseIcon class="size-4 text-muted-foreground" />
					<h3 class="text-[13px] font-semibold">ERP Kernel en scope</h3>
				</div>
				<label class="mb-2 flex cursor-pointer items-center gap-2 text-[12px]">
					<input type="checkbox" class="size-4 accent-emerald-500" checked={kernelAll} onchange={toggleKernelAll} />
					<span>Todos los conceptos (<code>*</code>)</span>
				</label>
				<div class="grid gap-1.5" class:opacity-50={kernelAll}>
					{#each kernel as c (c.id)}
						<label class="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 hover:bg-muted/40">
							<input
								type="checkbox"
								class="mt-0.5 size-4 accent-emerald-500"
								checked={kernelChecked(c.id)}
								disabled={kernelAll}
								onchange={() => toggleKernel(c.id)}
							/>
							<div class="min-w-0">
								<span class="font-mono text-[12px] font-medium">{c.id}</span>
								{#if c.description}<div class="truncate text-[11px] text-muted-foreground">{c.description}</div>{/if}
							</div>
						</label>
					{/each}
				</div>
			</section>

			<!-- MCP tools -->
			<section>
				<div class="mb-2 flex items-center gap-2">
					<WrenchIcon class="size-4 text-muted-foreground" />
					<h3 class="text-[13px] font-semibold">Tools del ERP (MCP)</h3>
					<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{manifest.mcpTools.length}</span>
					{#if mcpLoading}<Loader2Icon class="size-3 animate-spin text-muted-foreground" />{/if}
				</div>
				<p class="mb-2 text-[11px] text-muted-foreground">
					Soft-gate: se le indica al modelo usar solo estas. Las escrituras siguen con aprobación HITL.
				</p>
				{#if mcpDetail}
					<div class="mb-2 text-[11px] text-amber-500">MCP: {mcpDetail}</div>
				{/if}
				<div class="grid gap-1.5">
					{#each mcpTools as t (t.name)}
						<label class="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 hover:bg-muted/40">
							<input
								type="checkbox"
								class="mt-0.5 size-4 accent-emerald-500"
								checked={manifest.mcpTools.includes(t.name)}
								onchange={() => toggleMcp(t.name)}
							/>
							<div class="min-w-0">
								<span class="font-mono text-[12px] font-medium">{t.name}</span>
								{#if t.description}<div class="truncate text-[11px] text-muted-foreground">{t.description}</div>{/if}
							</div>
						</label>
					{:else}
						{#if !mcpLoading && !mcpDetail}
							<div class="text-[12px] text-muted-foreground">Sin tools descubiertas.</div>
						{/if}
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>
