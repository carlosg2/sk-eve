<script lang="ts">
	import { pushState } from "$app/navigation";
	import { browser } from "$app/environment";
	import { Button } from "$lib/components/ui/button/index.js";
	import FileEditor from "./FileEditor.svelte";
	import FolderSection from "./FolderSection.svelte";
	import ProfileSection from "./ProfileSection.svelte";
	import McpToolsSection from "./McpToolsSection.svelte";
	import SkillsSection from "./SkillsSection.svelte";
	import CapabilitiesSection from "./CapabilitiesSection.svelte";
	import EvolveSection from "./EvolveSection.svelte";
	import BuildingIcon from "@lucide/svelte/icons/building-2";
	import BotIcon from "@lucide/svelte/icons/bot";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import CircleDotIcon from "@lucide/svelte/icons/circle-dot";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import SlidersIcon from "@lucide/svelte/icons/sliders-horizontal";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import DatabaseIcon from "@lucide/svelte/icons/database";
	import BookIcon from "@lucide/svelte/icons/book-open";
	import WrenchIcon from "@lucide/svelte/icons/wrench";
	import PlugIcon from "@lucide/svelte/icons/plug";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import RocketIcon from "@lucide/svelte/icons/rocket";
	import CheckIcon from "@lucide/svelte/icons/check";
	import MessageSquareIcon from "@lucide/svelte/icons/message-square";
	import CpuIcon from "@lucide/svelte/icons/cpu";
	import ToggleRightIcon from "@lucide/svelte/icons/toggle-right";
	import WandIcon from "@lucide/svelte/icons/wand-sparkles";

	type Agent = {
		slug: string;
		tenant: string;
		name: string;
		model: string | null;
		description: string | null;
		defPath: string;
		active: boolean;
	};
	type Tenant = {
		slug: string;
		companyName: string;
		erpCompany: string;
		mcpUrl: string;
		profilePath: string;
		agents: Agent[];
		active: boolean;
	};
	type StudioData = {
		tenants: Tenant[];
		runtime: { activeTenant: string | null; activeAgent: string | null };
	};

	/**
	 * `deepLinkPath` es el segmento crudo después de `/studio/` (sin slash inicial),
	 * ej. `agent-skills/cxp/SKILL.md` o `companies/<tenant>/agents/<agent>/skills/<slug>/SKILL.md`.
	 * Viene de la ruta catch-all `/studio/[...path]`; en la ruta raíz `/studio` es `undefined`.
	 */
	let { data, deepLinkPath }: { data: StudioData; deepLinkPath?: string } = $props();

	type DeepLink = { tenantSlug: string; agentSlug: string; section: string; openSkillPath: string };

	function resolveDeepLink(
		rawPath: string | undefined,
		tenantList: Tenant[],
		runtime: { activeTenant: string | null; activeAgent: string | null },
	): DeepLink | null {
		const path = (rawPath ?? "").replace(/^\/+|\/+$/g, "");
		if (!path) return null;
		const segments = path.split("/");

		if (segments[0] === "agent-skills") {
			// Skill GLOBAL: no está atada a un tenant/agente, así que usamos el activo
			// (o el primero disponible) sólo para tener un contexto de navegación.
			const t = tenantList.find((x) => x.slug === runtime.activeTenant) ?? tenantList[0] ?? null;
			const a = t?.agents.find((x) => x.slug === runtime.activeAgent) ?? t?.agents[0] ?? null;
			if (!t || !a) return null;
			return { tenantSlug: t.slug, agentSlug: a.slug, section: "skills", openSkillPath: path };
		}

		if (segments[0] === "companies" && segments[2] === "agents" && segments[4] === "skills") {
			return { tenantSlug: segments[1], agentSlug: segments[3], section: "skills", openSkillPath: path };
		}

		return null;
	}

	const deepLink = resolveDeepLink(deepLinkPath, data.tenants as Tenant[], data.runtime);

	let tenants = $state<Tenant[]>(data.tenants as Tenant[]);
	let activeTenant = $state<string | null>(data.runtime.activeTenant);
	let activeAgent = $state<string | null>(data.runtime.activeAgent);

	let selectedTenant = $state<string | null>(deepLink?.tenantSlug ?? tenants[0]?.slug ?? null);
	let selectedAgent = $state<string | null>(deepLink?.agentSlug ?? null);
	let section = $state<string>(deepLink?.section ?? "perfil");
	let expanded = $state<Set<string>>(new Set(tenants.map((t) => t.slug)));

	// Ruta del skill a auto-abrir en el primer render de esta instancia (deep-link).
	// No es reactiva: sólo importa en el montaje inicial del `{#key}` correspondiente.
	const initialOpenSkillPath = deepLink?.openSkillPath ?? null;

	const tenant = $derived(tenants.find((t) => t.slug === selectedTenant) ?? null);
	const agent = $derived(tenant?.agents.find((a) => a.slug === selectedAgent) ?? null);

	const TENANT_SECTIONS = [
		{ id: "perfil", label: "Perfil / MCP", icon: SlidersIcon },
		{ id: "twin", label: "Company Twin", icon: DatabaseIcon },
		{ id: "kernel", label: "ERP Kernel · compartido", icon: BookIcon },
	];
	const AGENT_SECTIONS = [
		{ id: "modelo", label: "Modelo", icon: CpuIcon, ready: true },
		{ id: "instructions", label: "Instructions", icon: FileTextIcon, ready: true },
		{ id: "skills", label: "Skills", icon: BookIcon, ready: true },
		{ id: "capabilities", label: "Capabilities", icon: ToggleRightIcon, ready: true },
		{ id: "evolve", label: "Evolve", icon: WandIcon, ready: true },
		{ id: "tools", label: "Tools", icon: WrenchIcon, ready: true },
		{ id: "connections", label: "Connections", icon: PlugIcon, ready: false },
		{ id: "channels", label: "Channels", icon: RadioIcon, ready: false },
		{ id: "schedules", label: "Schedules", icon: CalendarIcon, ready: false },
		{ id: "deploy", label: "Deploy", icon: RocketIcon, ready: false },
		{ id: "evals", label: "Evals", icon: CheckIcon, ready: false },
		{ id: "chat", label: "Chat", icon: MessageSquareIcon, ready: true },
	];

	function toggle(slug: string) {
		const next = new Set(expanded);
		if (next.has(slug)) next.delete(slug);
		else next.add(slug);
		expanded = next;
	}

	function pickTenant(slug: string) {
		selectedTenant = slug;
		selectedAgent = null;
		section = "perfil";
	}
	function pickAgent(tenantSlug: string, agentSlug: string) {
		selectedTenant = tenantSlug;
		selectedAgent = agentSlug;
		section = "instructions";
	}

	async function activate(tenantSlug: string, agentSlug: string | null) {
		const res = await fetch("/studio/api/activate", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ activeTenant: tenantSlug, activeAgent: agentSlug }),
		});
		if (res.ok) {
			const body = (await res.json()) as { runtime: { activeTenant: string | null; activeAgent: string | null } };
			activeTenant = body.runtime.activeTenant;
			activeAgent = body.runtime.activeAgent;
			await loadPreview();
		}
	}

	type ActivePreview = {
		tenant: string;
		slug: string;
		name: string;
		model: string | null;
		instructions: string;
		exists: boolean;
	};
	let preview = $state<ActivePreview | null>(null);
	let previewLoading = $state(false);

	async function loadPreview() {
		previewLoading = true;
		try {
			const res = await fetch("/studio/api/preview");
			const body = (await res.json()) as { active: ActivePreview | null };
			preview = body.active;
		} finally {
			previewLoading = false;
		}
	}

	async function newTenant() {
		const companyName = prompt("Nombre de la empresa:");
		if (!companyName) return;
		const erpCompany = prompt("Empresa ERP (clave Intelisis):", "") ?? "";
		const mcpUrl = prompt("URL del MCP:", "https://") ?? "";
		const res = await fetch("/studio/api/tenant", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ companyName, erpCompany, mcpUrl }),
		});
		if (!res.ok) {
			alert(await res.text());
			return;
		}
		const { tenant: created } = (await res.json()) as { tenant: Tenant };
		tenants = [...tenants, created].sort((a, b) => a.companyName.localeCompare(b.companyName));
		pickTenant(created.slug);
	}

	async function newAgent(tenantSlug: string) {
		const name = prompt("Nombre del agente:");
		if (!name) return;
		const model = prompt("Modelo:", "anthropic/claude-sonnet-4-5") ?? "";
		const description = prompt("Descripción (opcional):", "") ?? "";
		const res = await fetch("/studio/api/agent", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ tenant: tenantSlug, name, model, description }),
		});
		if (!res.ok) {
			alert(await res.text());
			return;
		}
		const { agent: created } = (await res.json()) as { agent: Agent };
		tenants = tenants.map((t) =>
			t.slug === tenantSlug ? { ...t, agents: [...t.agents, created].sort((a, b) => a.slug.localeCompare(b.slug)) } : t,
		);
		expanded = new Set(expanded).add(tenantSlug);
		pickAgent(tenantSlug, created.slug);
	}

	const agentBase = $derived(
		tenant && agent ? `companies/${tenant.slug}/agents/${agent.slug}` : null,
	);

	$effect(() => {
		if (section === "chat" && !preview && !previewLoading) void loadPreview();
	});

	/** Actualiza la barra de direcciones (shallow, sin remount) al abrir/cerrar un skill. */
	function syncSkillUrl(path: string | null) {
		if (!browser) return;
		const target = path ? `/studio/${path}` : "/studio";
		if (window.location.pathname !== target) pushState(target, {});
	}

	// Si el usuario se mueve a otra sección distinta de "skills", la URL ya no debe
	// seguir apuntando a un archivo de skill (evita rutas que mientan sobre lo mostrado).
	$effect(() => {
		if (section !== "skills") syncSkillUrl(null);
	});
</script>

<div class="grid h-screen grid-cols-[260px_200px_1fr] overflow-hidden bg-background text-foreground">
	<!-- Rail: tenants + agentes -->
	<aside class="flex min-h-0 flex-col border-r border-border">
		<div class="flex items-center gap-2 border-b border-border px-4 py-3">
			<BuildingIcon class="size-4" />
			<span class="text-sm font-semibold">Studio</span>
			<div class="flex-1"></div>
			<Button variant="ghost" size="sm" onclick={newTenant} title="Nuevo tenant">
				<PlusIcon class="size-4" />
			</Button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto py-1">
			{#each tenants as t (t.slug)}
				<div>
					<div
						class="group flex items-center gap-1 px-2 py-1.5 {selectedTenant === t.slug && !selectedAgent ? 'bg-muted' : ''}"
					>
						<button type="button" class="text-muted-foreground" onclick={() => toggle(t.slug)}>
							{#if expanded.has(t.slug)}<ChevronDownIcon class="size-3.5" />{:else}<ChevronRightIcon class="size-3.5" />{/if}
						</button>
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-1.5 text-left"
							onclick={() => pickTenant(t.slug)}
						>
							<span class="truncate text-[13px] font-medium">{t.companyName}</span>
							{#if activeTenant === t.slug}
								<CircleDotIcon class="size-3 shrink-0 text-emerald-500" />
							{/if}
						</button>
						<button
							type="button"
							class="opacity-0 group-hover:opacity-100"
							title="Nuevo agente"
							onclick={() => newAgent(t.slug)}
						>
							<PlusIcon class="size-3.5 text-muted-foreground" />
						</button>
					</div>
					{#if expanded.has(t.slug)}
						{#each t.agents as a (a.slug)}
							<button
								type="button"
								onclick={() => pickAgent(t.slug, a.slug)}
								class="flex w-full items-center gap-1.5 py-1 pl-9 pr-2 text-left text-[13px] hover:bg-muted/60 {selectedAgent === a.slug && selectedTenant === t.slug ? 'bg-muted text-foreground' : 'text-muted-foreground'}"
							>
								<BotIcon class="size-3.5 shrink-0" />
								<span class="truncate">{a.name}</span>
								{#if activeTenant === t.slug && activeAgent === a.slug}
									<CircleDotIcon class="size-3 shrink-0 text-emerald-500" />
								{/if}
							</button>
						{:else}
							<div class="py-1 pl-9 pr-2 text-[12px] text-muted-foreground">Sin agentes</div>
						{/each}
					{/if}
				</div>
			{:else}
				<div class="px-4 py-3 text-xs text-muted-foreground">
					No hay tenants. Crea uno con +.
				</div>
			{/each}
		</div>
	</aside>

	<!-- Nav de secciones -->
	<nav class="flex min-h-0 flex-col overflow-y-auto border-r border-border py-2">
		{#if tenant}
			<div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{tenant.companyName}
			</div>
			{#each TENANT_SECTIONS as s (s.id)}
				<button
					type="button"
					onclick={() => (section = s.id)}
					class="mx-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] {section === s.id && !selectedAgent ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}"
				>
					<s.icon class="size-3.5" />
					<span class="truncate">{s.label}</span>
				</button>
			{/each}

			{#if agent}
				<div class="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					<BotIcon class="size-3.5" />
					{agent.name}
				</div>
				{#each AGENT_SECTIONS as s (s.id)}
					<button
						type="button"
						onclick={() => (section = s.id)}
						disabled={!s.ready}
						class="mx-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] {section === s.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'} {!s.ready ? 'opacity-40' : ''}"
					>
						<s.icon class="size-3.5" />
						<span class="truncate">{s.label}</span>
						{#if !s.ready}<span class="ml-auto text-[9px] uppercase">pronto</span>{/if}
					</button>
				{/each}
			{/if}
		{/if}
	</nav>

	<!-- Contenido -->
	<main class="flex min-h-0 flex-col">
		{#if !tenant}
			<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Selecciona o crea un tenant.
			</div>
		{:else}
			<!-- Cabecera de contexto -->
			<div class="flex items-center gap-3 border-b border-border px-4 py-2.5">
				<div class="min-w-0">
					<div class="flex items-center gap-2 text-sm">
						<span class="font-medium">{tenant.companyName}</span>
						{#if agent}
							<ChevronRightIcon class="size-3.5 text-muted-foreground" />
							<span class="font-medium">{agent.name}</span>
						{/if}
					</div>
					<div class="font-mono text-[11px] text-muted-foreground">
						{tenant.erpCompany || "sin ERP"} · {agent?.model ?? "—"}
					</div>
				</div>
				<div class="flex-1"></div>
				<Button
					variant={activeTenant === tenant.slug && activeAgent === (agent?.slug ?? null) ? "secondary" : "default"}
					size="sm"
					onclick={() => activate(tenant.slug, agent?.slug ?? null)}
				>
					<CircleDotIcon class="size-3.5" />
					{activeTenant === tenant.slug && activeAgent === (agent?.slug ?? null) ? "Activo" : "Activar"}
				</Button>
				<Button variant="ghost" size="sm" href="/chat" title="Abrir chat">
					<ExternalLinkIcon class="size-3.5" /> Chat
				</Button>
			</div>

			<div class="min-h-0 flex-1">
				{#key `${selectedTenant}/${selectedAgent}/${section}`}
					{#if !agent}
						<!-- Secciones a nivel tenant -->
						{#if section === "perfil"}
							<ProfileSection path={tenant.profilePath} tenantSlug={tenant.slug} />
						{:else if section === "twin"}
							<FolderSection base={`companies/${tenant.slug}`} label="Company Twin" newFileName="concepto.md" />
						{:else if section === "kernel"}
							<FolderSection base="erp-kernel" label="ERP Kernel (compartido)" newFileName="concepto.md" />
						{/if}
					{:else if agentBase}
						<!-- Secciones a nivel agente -->
						{#if section === "modelo"}
							<FileEditor path={`${agentBase}/agent.md`} label="agent.md — modelo y metadatos" />
						{:else if section === "instructions"}
							<FileEditor
								path={`${agentBase}/instructions.md`}
								label="Instructions"
								placeholder="# Instrucciones del agente…"
							/>
						{:else if section === "skills"}
							<SkillsSection
								tenant={tenant.slug}
								agent={agent.slug}
								initialOpenPath={initialOpenSkillPath}
								onOpenSkill={syncSkillUrl}
							/>					{:else if section === "capabilities"}
						<CapabilitiesSection tenant={tenant.slug} agent={agent.slug} />
					{:else if section === "evolve"}
						<EvolveSection tenant={tenant.slug} agent={agent.slug} />						{:else if section === "tools"}
							<McpToolsSection tenant={tenant.slug} />
						{:else if section === "chat"}
							{@const isActive = activeTenant === tenant.slug && activeAgent === agent.slug}
							<div class="flex h-full flex-col gap-4 overflow-y-auto p-6">
								<div class="flex items-center gap-2">
									<CpuIcon class="size-4 text-muted-foreground" />
									<span class="text-sm font-semibold">Runtime</span>
								</div>
								<p class="max-w-prose text-sm text-muted-foreground">
									El chat usa el agente <em>activo</em> de <code class="text-xs">runtime.json</code>. Al activar
									este agente, su <code class="text-xs">instructions.md</code> se inyecta en el system prompt
									en el próximo arranque de sesión de <code class="text-xs">/chat</code>.
								</p>

								<div class="flex flex-wrap items-center gap-2">
									<Button size="sm" variant={isActive ? "secondary" : "default"} onclick={() => activate(tenant.slug, agent.slug)}>
										<CircleDotIcon class="size-3.5" />
										{isActive ? "Agente activo" : "Activar este agente"}
									</Button>
									<Button variant="ghost" size="sm" onclick={loadPreview}>
										Refrescar preview
									</Button>
									<Button variant="secondary" size="sm" href="/chat">
										<ExternalLinkIcon class="size-3.5" /> Abrir /chat
									</Button>
								</div>

								<div class="rounded-lg border border-border">
									<div class="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										<RocketIcon class="size-3.5" />
										Se cargará en runtime
									</div>
									<div class="p-3">
										{#if previewLoading}
											<div class="text-sm text-muted-foreground">Cargando…</div>
										{:else if !preview}
											<div class="text-sm text-muted-foreground">
												No hay agente activo. Activa uno para componer el runtime.
											</div>
										{:else}
											<div class="mb-2 flex items-center gap-2 text-[13px]">
												<BotIcon class="size-3.5 text-emerald-500" />
												<span class="font-medium">{preview.name}</span>
												<span class="font-mono text-[11px] text-muted-foreground">
													{preview.tenant}/{preview.slug} · {preview.model ?? "—"}
												</span>
												{#if isActive && preview.slug !== agent.slug}
													<span class="text-[11px] text-amber-500">(otro agente está activo)</span>
												{/if}
											</div>
											{#if preview.exists && preview.instructions.trim()}
												<pre class="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[12px] leading-relaxed">{preview.instructions}</pre>
											{:else}
												<div class="text-sm text-muted-foreground">
													Este agente no tiene <code class="text-xs">instructions.md</code>. Edítalo en la sección Instructions.
												</div>
											{/if}
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
							Sección «{section}» — próximamente.
						</div>
					{/if}
				{/key}
			</div>
		{/if}
	</main>
</div>
