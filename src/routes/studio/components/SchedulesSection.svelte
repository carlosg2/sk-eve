<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import PlayIcon from "@lucide/svelte/icons/play";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import SaveIcon from "@lucide/svelte/icons/save";
	import XIcon from "@lucide/svelte/icons/x";

	// Pantalla "Schedules" replicada de eve-studio: lista de tareas cron con
	// cron legible + badge, botón "Probar" (dispara una vez en desarrollo),
	// modal para crear (name/cron/prompt → agent/schedules/<name>.ts) y editor
	// de archivo para ver/editar/eliminar el source.

	type Schedule = {
		name: string;
		path: string;
		cron: string;
		prompt: string;
		kind: "ts" | "md";
	};

	let schedules = $state<Schedule[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Crear
	let addOpen = $state(false);
	let newName = $state("");
	let newCron = $state("0 9 * * *");
	let newPrompt = $state("");
	let creating = $state(false);
	let createError = $state<string | null>(null);
	let createDone = $state<string | null>(null);

	// Editar / eliminar
	let editing = $state<Schedule | null>(null);
	let editSource = $state("");
	let editOriginal = $state("");
	let editLoading = $state(false);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let savedAt = $state<number | null>(null);
	let deleteBusy = $state(false);

	// Probar (disparo manual en dev)
	let testing = $state<string | null>(null);
	let testMsg = $state<{ ok: boolean; text: string } | null>(null);

	const editDirty = $derived(editSource !== editOriginal);

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch("/studio/api/schedules");
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { schedules: Schedule[] };
			schedules = data.schedules ?? [];
		} catch (err) {
			error = err instanceof Error ? err.message : "Error al cargar schedules";
		} finally {
			loading = false;
		}
	}
	void load();

	/** Convierte un cron de 5 campos en una frase humana (best-effort, en español). */
	function describeCron(cron: string): string | null {
		const parts = cron.trim().split(/\s+/);
		if (parts.length < 5) return null;
		const [min, hr, dom, , dow] = parts;
		const at =
			/^\d+$/.test(hr) && /^\d+$/.test(min)
				? `${hr.padStart(2, "0")}:${min.padStart(2, "0")}`
				: null;
		const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
		if (dow !== "*" && /^\d$/.test(dow)) {
			return `Semanal los ${days[Number(dow)]}${at ? ` a las ${at}` : ""}`;
		}
		if (dom === "*" && at) return `Diario a las ${at}`;
		return null;
	}

	function openAdd() {
		addOpen = true;
		newName = "";
		newCron = "0 9 * * *";
		newPrompt = "";
		createError = null;
		createDone = null;
	}

	async function create() {
		if (!newName.trim() || !newCron.trim()) return;
		creating = true;
		createError = null;
		try {
			const res = await fetch("/studio/api/schedules", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: newName, cron: newCron, prompt: newPrompt }),
			});
			if (!res.ok) throw new Error(await res.text());
			const { schedule } = (await res.json()) as { schedule: Schedule };
			createDone = schedule.path;
			await load();
		} catch (err) {
			createError = err instanceof Error ? err.message : "Error al crear el schedule";
		} finally {
			creating = false;
		}
	}

	async function openEdit(s: Schedule) {
		editing = s;
		editSource = "";
		editOriginal = "";
		editLoading = true;
		saveError = null;
		savedAt = null;
		try {
			const res = await fetch(`/studio/api/file?path=${encodeURIComponent(s.path)}`);
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { content: string; exists: boolean };
			editSource = data.content;
			editOriginal = data.content;
		} catch (err) {
			saveError = err instanceof Error ? err.message : "Error al leer el schedule";
		} finally {
			editLoading = false;
		}
	}

	async function saveEdit() {
		if (!editing) return;
		saving = true;
		saveError = null;
		try {
			const res = await fetch("/studio/api/file", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ path: editing.path, content: editSource }),
			});
			if (!res.ok) throw new Error(await res.text());
			editOriginal = editSource;
			savedAt = Date.now();
			await load();
		} catch (err) {
			saveError = err instanceof Error ? err.message : "Error al guardar";
		} finally {
			saving = false;
		}
	}

	async function removeSchedule() {
		if (!editing) return;
		deleteBusy = true;
		saveError = null;
		try {
			const res = await fetch("/studio/api/schedules", {
				method: "DELETE",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: editing.name }),
			});
			if (!res.ok) throw new Error(await res.text());
			editing = null;
			await load();
		} catch (err) {
			saveError = err instanceof Error ? err.message : "Error al eliminar";
		} finally {
			deleteBusy = false;
		}
	}

	/** Dispara el schedule una vez (solo desarrollo) vía /api/schedules. */
	async function runTest(name: string) {
		testing = name;
		testMsg = null;
		try {
			const res = await fetch("/api/schedules", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: name }),
			});
			if (res.ok) {
				testMsg = {
					ok: true,
					text: `Se disparó "${name}" una vez — revisa dónde entrega. En producción Eve lo dispara solo por su cron; este botón es de desarrollo.`,
				};
			} else {
				const body = (await res.json().catch(() => null)) as { message?: string } | null;
				testMsg = { ok: false, text: body?.message ?? `No se pudo ejecutar "${name}".` };
			}
		} catch (err) {
			testMsg = { ok: false, text: err instanceof Error ? err.message : "Error al ejecutar" };
		} finally {
			testing = null;
		}
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- Cabecera -->
	<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
		<CalendarIcon class="size-4 text-muted-foreground" />
		<span class="text-sm font-medium">Schedules</span>
		<span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
			{schedules.length}
		</span>
		<div class="flex-1"></div>
		<Button variant="default" size="sm" onclick={openAdd}>
			<PlusIcon class="size-3.5" /> Nuevo
		</Button>
		<Button variant="ghost" size="sm" onclick={load} disabled={loading} title="Recargar">
			{#if loading}<Loader2Icon class="size-4 animate-spin" />{:else}<RotateCwIcon class="size-4" />{/if}
		</Button>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto">
		{#if testMsg}
			<div class="mx-auto max-w-2xl px-4 pt-4">
				<div
					class="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs {testMsg.ok
						? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
						: 'border-red-500/30 bg-red-500/10 text-red-600'}"
				>
					<span class="leading-relaxed">{testMsg.text}</span>
					<button class="shrink-0 opacity-70 hover:opacity-100" onclick={() => (testMsg = null)}>
						<XIcon class="size-3.5" />
					</button>
				</div>
			</div>
		{/if}

		{#if loading && schedules.length === 0}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				<Loader2Icon class="size-5 animate-spin" />
			</div>
		{:else if error}
			<div class="mx-auto max-w-2xl px-4 py-4 text-xs text-red-600">{error}</div>
		{:else if schedules.length === 0}
			<div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
				<CalendarIcon class="size-6 text-muted-foreground" />
				<div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					Schedules
				</div>
				<div class="text-sm font-medium">No schedules</div>
				<p class="max-w-xs text-xs text-muted-foreground">
					Los trabajos programados despiertan al agente con un cron (solo agente raíz).
				</p>
				<Button variant="default" size="sm" onclick={openAdd}>
					<PlusIcon class="size-3.5" /> Nuevo schedule
				</Button>
			</div>
		{:else}
			<div class="mx-auto max-w-2xl px-4 py-4">
				<ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
					{#each schedules as s (s.name)}
						<li
							class="group flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-muted/50"
							onclick={() => openEdit(s)}
							title="Editar schedule"
						>
							<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
							<div class="min-w-0 flex-1">
								<div class="truncate text-[13px] font-medium">{s.name}</div>
								{#if describeCron(s.cron)}
									<div class="truncate text-xs text-muted-foreground">{describeCron(s.cron)}</div>
								{/if}
							</div>
							<Badge variant="outline" class="shrink-0 whitespace-nowrap font-mono text-[11px]">{s.cron}</Badge>
							<Button
								variant="secondary"
								size="sm"
								disabled={testing === s.name}
								onclick={(e) => {
									e.stopPropagation();
									void runTest(s.name);
								}}
								title="Disparar este schedule una vez ahora (desarrollo)"
							>
								{#if testing === s.name}
									<Loader2Icon class="size-3.5 animate-spin" />
								{:else}
									<PlayIcon class="size-3.5" />
								{/if}
								Probar
							</Button>
							<ChevronRightIcon
								class="size-4 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100"
							/>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>

<!-- Modal: nuevo schedule -->
<Dialog.Root
	open={addOpen}
	onOpenChange={(o) => {
		if (!o) addOpen = false;
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nuevo schedule</Dialog.Title>
			<Dialog.Description>
				Se crea en <code class="font-mono text-xs">agent/schedules/&lt;nombre&gt;.ts</code>
			</Dialog.Description>
		</Dialog.Header>
		{#if createDone}
			<div class="space-y-3 px-6 pb-6">
				<div class="rounded-lg bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-600">
					Creado <span class="font-mono">{createDone}</span>.
				</div>
				<p class="text-xs leading-relaxed text-muted-foreground">
					El cron corre en UTC en Vercel. Reinicia el agente para registrarlo; en desarrollo,
					dispáralo una vez con el botón "Probar".
				</p>
				<div class="flex justify-end">
					<Button variant="default" onclick={() => (addOpen = false)}>Listo</Button>
				</div>
			</div>
		{:else}
			<div class="space-y-3 px-6 pb-6">
				<div>
					<div class="mb-1 text-xs font-medium text-muted-foreground">
						Name <span class="opacity-70">— se vuelve schedules/&lt;nombre&gt;.ts</span>
					</div>
					<Input value={newName} oninput={(e) => (newName = e.currentTarget.value)} placeholder="daily-summary" class="font-mono" />
				</div>
				<div>
					<div class="mb-1 text-xs font-medium text-muted-foreground">
						Cron <span class="opacity-70">— 5 campos, UTC (min hora dom mes dow)</span>
					</div>
					<Input value={newCron} oninput={(e) => (newCron = e.currentTarget.value)} placeholder="0 9 * * *" class="font-mono" />
				</div>
				<div>
					<div class="mb-1 text-xs font-medium text-muted-foreground">
						Prompt <span class="opacity-70">— tarea fire-and-forget que ejecuta el agente</span>
					</div>
					<Textarea
						bind:value={newPrompt}
						rows={3}
						placeholder="Trae los issues abiertos y publica un resumen en el endpoint de métricas."
					/>
				</div>
				{#if createError}
					<div class="text-xs text-red-600">{createError}</div>
				{/if}
				<div class="flex justify-end gap-2 pt-1">
					<Button variant="ghost" onclick={() => (addOpen = false)}>Cancelar</Button>
					<Button
						variant="default"
						onclick={create}
						disabled={creating || !newName.trim() || !newCron.trim()}
					>
						{creating ? "Creando…" : "Crear schedule"}
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Modal: editar / eliminar schedule -->
<Dialog.Root
	open={editing !== null}
	onOpenChange={(o) => {
		if (!o) editing = null;
	}}
>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-mono">{editing?.path ?? ""}</Dialog.Title>
			<Dialog.Description>
				{#if editing}
					{editing.cron}
					{editing.kind === "md" ? "· schedule markdown (frontmatter cron)" : "· defineSchedule"}
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-3 px-6 pb-6">
			{#if editLoading}
				<div class="flex justify-center py-10 text-muted-foreground">
					<Loader2Icon class="size-5 animate-spin" />
				</div>
			{:else}
				<textarea
					value={editSource}
					oninput={(e) => (editSource = e.currentTarget.value)}
					rows={18}
					spellcheck="false"
					class="w-full resize-y rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus:border-foreground/30"
				></textarea>
				{#if saveError}
					<div class="text-xs text-red-600">{saveError}</div>
				{/if}
				<div class="flex items-center justify-between gap-2">
					<Button
						variant="destructive"
						size="sm"
						onclick={removeSchedule}
						disabled={deleteBusy}
						title="Eliminar este schedule"
					>
						<Trash2Icon class="size-3.5" /> Eliminar
					</Button>
					<div class="flex items-center gap-2">
						{#if savedAt}
							<span class="text-xs text-emerald-600">Guardado</span>
						{:else if editDirty}
							<span class="text-xs text-amber-600">Sin guardar</span>
						{/if}
						<Button variant="ghost" size="sm" onclick={() => (editing = null)}>Cerrar</Button>
						<Button
							variant="default"
							size="sm"
							onclick={saveEdit}
							disabled={saving || !editDirty}
						>
							<SaveIcon class="size-3.5" />
							{saving ? "Guardando…" : "Guardar"}
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
