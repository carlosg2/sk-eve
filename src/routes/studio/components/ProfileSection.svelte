<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import SaveIcon from "@lucide/svelte/icons/save";
	import PlugIcon from "@lucide/svelte/icons/plug";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import CheckCircle2Icon from "@lucide/svelte/icons/circle-check";
	import XCircleIcon from "@lucide/svelte/icons/circle-x";

	type Props = { path: string; tenantSlug: string };
	let { path, tenantSlug }: Props = $props();

	let raw = $state("");
	let companyName = $state("");
	let erpCompany = $state("");
	let mcpUrl = $state("");
	let loading = $state(true);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);

	type Ping = { ok: boolean; status?: number; detail: string };
	let ping = $state<Ping | null>(null);
	let pinging = $state(false);

	function field(key: string): string {
		return new RegExp(`^${key}:\\s*(.*)$`, "m").exec(raw)?.[1]?.trim() ?? "";
	}

	function setField(source: string, key: string, value: string): string {
		const re = new RegExp(`^(${key}:\\s*).*$`, "m");
		if (re.test(source)) return source.replace(re, `$1${value}`);
		// Insertar antes del cierre del frontmatter.
		const end = source.indexOf("\n---", 3);
		if (source.startsWith("---") && end !== -1) {
			return `${source.slice(0, end)}\n${key}: ${value}${source.slice(end)}`;
		}
		return source;
	}

	async function load() {
		loading = true;
		errorMsg = null;
		ping = null;
		try {
			const res = await fetch(`/studio/api/file?path=${encodeURIComponent(path)}`);
			if (!res.ok) throw new Error(await res.text());
			raw = ((await res.json()) as { content: string }).content;
			companyName = field("company_name");
			erpCompany = field("erp_company");
			mcpUrl = field("mcp_url");
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
			let next = raw;
			next = setField(next, "company_name", companyName);
			next = setField(next, "erp_company", erpCompany);
			next = setField(next, "mcp_url", mcpUrl);
			const res = await fetch("/studio/api/file", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ path, content: next }),
			});
			if (!res.ok) throw new Error(await res.text());
			raw = next;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : "Error de escritura";
		} finally {
			saving = false;
		}
	}

	async function testMcp() {
		pinging = true;
		ping = null;
		try {
			const res = await fetch("/studio/api/mcp-ping", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url: mcpUrl }),
			});
			ping = (await res.json()) as Ping;
		} catch (err) {
			ping = { ok: false, detail: err instanceof Error ? err.message : "Fallo de red" };
		} finally {
			pinging = false;
		}
	}

	$effect(() => {
		path;
		load();
	});
</script>

<div class="flex h-full min-h-0 flex-col overflow-y-auto">
	<div class="flex items-center gap-3 border-b border-border px-4 py-2.5">
		<div class="min-w-0">
			<div class="text-sm font-medium text-foreground">Perfil / MCP</div>
			<div class="truncate font-mono text-[11px] text-muted-foreground">{path}</div>
		</div>
		<div class="flex-1"></div>
		<Button size="sm" onclick={save} disabled={saving || loading}>
			{#if saving}<Loader2Icon class="size-3.5 animate-spin" />{:else}<SaveIcon class="size-3.5" />{/if}
			Guardar
		</Button>
	</div>

	{#if errorMsg}
		<div class="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">{errorMsg}</div>
	{/if}

	{#if loading}
		<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
			<Loader2Icon class="mr-2 size-4 animate-spin" /> Cargando…
		</div>
	{:else}
		<div class="mx-auto w-full max-w-2xl space-y-6 p-6">
			<div class="space-y-1.5">
				<label class="text-xs font-medium text-muted-foreground" for="pf-name">Nombre de la empresa</label>
				<Input id="pf-name" bind:value={companyName} placeholder="Industrias Campo Fresco" />
			</div>
			<div class="space-y-1.5">
				<label class="text-xs font-medium text-muted-foreground" for="pf-erp">Empresa ERP (clave Intelisis)</label>
				<Input id="pf-erp" bind:value={erpCompany} placeholder="INCF" class="font-mono" />
			</div>
			<div class="space-y-1.5">
				<label class="text-xs font-medium text-muted-foreground" for="pf-mcp">URL del MCP (ERP DAB)</label>
				<div class="flex gap-2">
					<Input id="pf-mcp" bind:value={mcpUrl} placeholder="https://api2.maserp.mx/icf/mcp" class="font-mono" />
					<Button variant="secondary" size="sm" onclick={testMcp} disabled={pinging || !mcpUrl}>
						{#if pinging}<Loader2Icon class="size-3.5 animate-spin" />{:else}<PlugIcon class="size-3.5" />{/if}
						Probar
					</Button>
				</div>
				{#if ping}
					<div class="flex items-start gap-2 rounded-md border px-3 py-2 text-xs {ping.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-destructive/30 bg-destructive/10 text-destructive'}">
						{#if ping.ok}<CheckCircle2Icon class="mt-0.5 size-3.5 shrink-0" />{:else}<XCircleIcon class="mt-0.5 size-3.5 shrink-0" />{/if}
						<span class="font-mono break-all">{ping.detail}</span>
					</div>
				{/if}
			</div>
			<p class="text-[11px] text-muted-foreground">
				Estos campos son el frontmatter de <span class="font-mono">profile.md</span> del tenant
				<span class="font-mono">{tenantSlug}</span>. La conexión MCP del runtime deriva de
				<span class="font-mono">mcp_url</span>.
			</p>
		</div>
	{/if}
</div>
