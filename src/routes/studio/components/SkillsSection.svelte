<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import FileEditor from "./FileEditor.svelte";
	import BookIcon from "@lucide/svelte/icons/book-open";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";

	type Skill = { slug: string; name: string; description: string | null; path: string };
	type Props = {
		tenant: string;
		agent: string;
		/** Ruta (`path` de un Skill) a auto-abrir en el primer load, para deep-links (`/studio/agent-skills/...`). */
		initialOpenPath?: string | null;
		/** Notifica al contenedor cuándo se abre/cierra un skill, para que sincronice la URL. */
		onOpenSkill?: (path: string | null) => void;
	};
	let { tenant, agent, initialOpenPath = null, onOpenSkill }: Props = $props();
	let deepLinkConsumed = false;

	type Scope = "tenant" | "catalog";
	let scope = $state<Scope>("tenant");

	let skills = $state<Skill[]>([]);
	let globalSkills = $state<Skill[]>([]);
	let loading = $state(true);
	let editing = $state<Skill | null>(null);

	let adding = $state(false);
	let newName = $state("");
	let newDescription = $state("");
	let creating = $state(false);
	let createError = $state<string | null>(null);

	const visibleSkills = $derived(scope === "tenant" ? skills : globalSkills);

	async function load() {
		loading = true;
		editing = null;
		try {
			const [agentRes, globalRes] = await Promise.all([
				fetch(`/studio/api/skills?tenant=${encodeURIComponent(tenant)}&agent=${encodeURIComponent(agent)}`),
				fetch(`/studio/api/global-skills`),
			]);
			const agentData = (await agentRes.json()) as { skills: Skill[] };
			const globalData = (await globalRes.json()) as { skills: Skill[] };
			skills = agentData.skills ?? [];
			globalSkills = globalData.skills ?? [];

			if (initialOpenPath && !deepLinkConsumed) {
				deepLinkConsumed = true;
				const match = skills.find((s) => s.path === initialOpenPath) ?? globalSkills.find((s) => s.path === initialOpenPath);
				if (match) {
					// El deep-link abre el catálogo completo (contiene toda skill, de cualquier tenant).
					scope = "catalog";
					editing = match;
				}
			}
		} finally {
			loading = false;
		}
	}

	/** Abre (o cierra, con `null`) un skill en el editor y sincroniza la URL del navegador. */
	function openSkill(skill: Skill | null) {
		editing = skill;
		onOpenSkill?.(skill?.path ?? null);
	}

	// Recarga al cambiar de agente.
	$effect(() => {
		void tenant;
		void agent;
		void load();
	});

	async function create() {
		if (!newName.trim()) return;
		creating = true;
		createError = null;
		try {
			const endpoint = scope === "tenant" ? "/studio/api/skills" : "/studio/api/global-skills";
			const payload =
				scope === "tenant"
					? { tenant, name: newName, description: newDescription }
					: { name: newName, description: newDescription };
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(await res.text());
			const { skill } = (await res.json()) as { skill: Skill };
			if (scope === "tenant") {
				skills = [...skills, skill].sort((a, b) => a.slug.localeCompare(b.slug));
			} else {
				globalSkills = [...globalSkills, skill].sort((a, b) => a.slug.localeCompare(b.slug));
			}
			adding = false;
			newName = "";
			newDescription = "";
			openSkill(skill);
		} catch (err) {
			createError = err instanceof Error ? err.message : "Error al crear el skill";
		} finally {
			creating = false;
		}
	}
</script>

{#if editing}
	<div class="flex h-full min-h-0 flex-col">
		<div class="flex items-center gap-2 border-b border-border px-3 py-2">
			<Button variant="ghost" size="sm" onclick={() => openSkill(null)}>
				<ArrowLeftIcon class="size-3.5" /> Skills
			</Button>
			<ChevronRightIcon class="size-3.5 text-muted-foreground" />
			<span class="text-[13px] font-medium">{editing.name}</span>
			<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">skill</span>
		</div>
		<div class="min-h-0 flex-1">
			<FileEditor path={editing.path} label={editing.name} placeholder="---\ndescription: …\n---\n" />
		</div>
	</div>
{:else}
	<div class="flex h-full min-h-0 flex-col">
		<!-- Cabecera -->
		<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
			<BookIcon class="size-4 text-muted-foreground" />
			<span class="text-sm font-medium">Skills</span>
			<span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
				{visibleSkills.length}
			</span>
			<div class="flex-1"></div>
			<Button variant="default" size="sm" onclick={() => (adding = true)} disabled={adding}>
				<PlusIcon class="size-3.5" /> Nuevo
			</Button>
			<Button variant="ghost" size="sm" onclick={load} disabled={loading} title="Recargar">
				{#if loading}<Loader2Icon class="size-4 animate-spin" />{:else}<RotateCwIcon class="size-4" />{/if}
			</Button>
		</div>

		<!-- Selector de alcance -->
		<div class="flex items-center gap-1 border-b border-border px-4 py-2">
			<button
				type="button"
				onclick={() => (scope = "tenant")}
				class="rounded-md px-2.5 py-1 text-[12px] font-medium {scope === 'tenant'
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:bg-muted/50'}"
			>
				Del tenant ({skills.length})
			</button>
			<button
				type="button"
				onclick={() => (scope = "catalog")}
				class="rounded-md px-2.5 py-1 text-[12px] font-medium {scope === 'catalog'
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:bg-muted/50'}"
			>
				Catálogo completo ({globalSkills.length})
			</button>
		</div>

		<p class="border-b border-border px-4 py-2 text-[12px] leading-snug text-muted-foreground">
			{#if scope === "tenant"}
				Skills del catálogo visibles para <strong>{tenant}</strong> (<code>agent/skill-library/</code>, por
				frontmatter <code>tenant</code>). Qué skills carga <em>cada</em> agente se define con checks en el tab
				<strong>Capabilities</strong>.
			{:else}
				Todo el catálogo (<code>agent/skill-library/</code>), incluidas skills de otros tenants y las
				<strong>universales</strong> (<code>tenant: null</code>). Se cargan on-demand vía <code>load_skill</code>.
				Edítalas con cuidado.
			{/if}
		</p>

		{#if adding}
			<div class="space-y-2 border-b border-border bg-muted/20 px-4 py-3">
				<div>
					<label for="skill-name" class="mb-1 block text-[11px] font-medium text-muted-foreground">Nombre</label>
					<Input id="skill-name" bind:value={newName} placeholder="Consultar disponibilidad" class="h-8 text-[13px]" />
				</div>
				<div>
					<label for="skill-desc" class="mb-1 block text-[11px] font-medium text-muted-foreground">
						Descripción (hint de ruteo, para el modelo)
					</label>
					<Input
						id="skill-desc"
						bind:value={newDescription}
						placeholder="Usar cuando el usuario pregunte por stock o inventario."
						class="h-8 text-[13px]"
					/>
				</div>
				{#if createError}
					<div class="text-[12px] text-destructive">{createError}</div>
				{/if}
				<div class="flex justify-end gap-2 pt-1">
					<Button variant="ghost" size="sm" onclick={() => (adding = false)}>Cancelar</Button>
					<Button variant="default" size="sm" onclick={create} disabled={creating || !newName.trim()}>
						{creating ? "Creando…" : "Crear skill"}
					</Button>
				</div>
			</div>
		{/if}

		<!-- Lista -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if loading}
				<div class="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
					<Loader2Icon class="size-4 animate-spin" /> Cargando…
				</div>
			{:else if visibleSkills.length === 0}
				<div class="px-4 py-8 text-center text-sm text-muted-foreground">
					{#if scope === "tenant"}
						No hay skills en el catálogo visibles para <strong>{tenant}</strong>. Crea una con <strong>Nuevo</strong>.
					{:else}
						Catálogo vacío en <code>agent/skill-library/</code>.
					{/if}
				</div>
			{:else}
				<ul class="divide-y divide-border">
					{#each visibleSkills as skill (skill.slug)}
						<li>
							<button
								type="button"
								onclick={() => openSkill(skill)}
								class="group flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-muted/40"
							>
								<BookIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="text-[13px] font-semibold">{skill.name}</span>
										<code class="text-[10px] text-muted-foreground">{skill.slug}</code>
									</div>
									{#if skill.description}
										<p class="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
											{skill.description}
										</p>
									{:else}
										<p class="mt-0.5 text-[12px] italic text-muted-foreground/70">Sin descripción de ruteo.</p>
									{/if}
								</div>
								<ChevronRightIcon class="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}
