<script lang="ts">
	import ChatSession from './ChatSession.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MessagesSquareIcon from '@lucide/svelte/icons/messages-square';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	// Índice de sesiones (para el sidebar) — GET /api/sessions, escrito por
	// agent/hooks/session-log.ts. Se refresca por polling: los eventos que
	// mueven `active` (turn.started/turn.completed/...) pueden venir de
	// cualquier canal (WhatsApp/Twilio, no solo esta pestaña), así que un
	// registro server-side + polling es la única forma honesta de reflejarlos.
	// `archived` separa dos vistas del mismo índice (nunca mezcladas): la
	// lista principal (activas) y la de archivadas, alternadas con
	// `showArchived`.
	type SessionListItem = {
		id: string;
		title: string;
		createdAt: string;
		updatedAt: string;
		active: boolean;
		turns: number;
	};

	let sessions = $state<SessionListItem[]>([]);
	let showArchived = $state(false);
	let selectedId = $state<string | null>(null);
	let newNonce = $state(0);
	let currentSessionId = $state<string | null>(null);
	// Overrides en vivo del estado "respondiendo" de la sesión ABIERTA en esta
	// pestaña — llega instantáneo por callback, sin esperar el próximo poll.
	let liveActive = $state<Record<string, boolean>>({});
	let loadedSession = $state<unknown>(undefined);
	let loadedEvents = $state<unknown[] | undefined>(undefined);
	let loadedRecovered = $state(false);
	let loadingSession = $state(false);
	let loadError = $state('');
	// id de la sesión a eliminar mientras el AlertDialog de confirmación está
	// abierto; null cuando el diálogo está cerrado.
	let pendingDeleteId = $state<string | null>(null);

	const sessionKey = $derived(selectedId ?? `new-${newNonce}`);

	async function refreshSessions() {
		try {
			const res = await fetch(`/api/sessions${showArchived ? '?archived=1' : ''}`);
			if (!res.ok) return;
			const body = (await res.json()) as { sessions?: SessionListItem[] };
			sessions = body.sessions ?? [];
		} catch {
			// silencioso: el sidebar simplemente no se actualiza este ciclo
		}
	}
	void refreshSessions();

	$effect(() => {
		// re-consulta de inmediato al alternar activas/archivadas
		void showArchived;
		void refreshSessions();
	});

	$effect(() => {
		const timer = window.setInterval(refreshSessions, 2500);
		return () => window.clearInterval(timer);
	});

	function toggleArchivedView() {
		showArchived = !showArchived;
	}

	async function setArchived(id: string, archived: boolean) {
		try {
			const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ archived })
			});
			if (!res.ok) throw new Error('No se pudo actualizar la sesión');
			// desaparece de la vista actual (activas <-> archivadas)
			sessions = sessions.filter((s) => s.id !== id);
		} catch {
			loadError = archived ? 'No se pudo archivar la conversación.' : 'No se pudo desarchivar la conversación.';
		}
	}

	function openDeleteConfirm(id: string) {
		pendingDeleteId = id;
	}

	async function confirmDeleteSession() {
		const id = pendingDeleteId;
		if (!id) return;
		pendingDeleteId = null;
		try {
			const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('No se pudo eliminar la sesión');
			sessions = sessions.filter((s) => s.id !== id);
			if (selectedId === id) startNewConversation();
		} catch {
			loadError = 'No se pudo eliminar la conversación.';
		}
	}

	function isActive(s: SessionListItem): boolean {
		if (s.id === currentSessionId && s.id in liveActive) return liveActive[s.id];
		return s.active;
	}

	async function openSession(id: string) {
		if (id === selectedId || loadingSession) return;
		loadingSession = true;
		loadError = '';
		try {
			const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`);
			if (!res.ok) throw new Error('No se pudo cargar la sesión');
			const body = (await res.json()) as { session: unknown; events: unknown[]; recovered?: boolean };
			loadedSession = body.session;
			loadedEvents = body.events;
			loadedRecovered = body.recovered ?? false;
			selectedId = id;
			currentSessionId = id;
		} catch {
			loadError = 'No se pudo abrir esa conversación.';
		} finally {
			loadingSession = false;
		}
	}

	function startNewConversation() {
		if (selectedId === null && !currentSessionId) return; // ya estamos en una nueva vacía
		selectedId = null;
		loadedSession = undefined;
		loadedEvents = undefined;
		loadedRecovered = false;
		currentSessionId = null;
		loadError = '';
		newNonce += 1;
	}

	function handleSessionId(id: string) {
		currentSessionId = id;
		void refreshSessions();
	}

	function handleStatusChange(id: string, busy: boolean) {
		liveActive = { ...liveActive, [id]: busy };
		if (!busy) void refreshSessions();
	}

	function formatRelative(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const min = Math.round(diffMs / 60000);
		if (min < 1) return 'ahora';
		if (min < 60) return `hace ${min} min`;
		const h = Math.round(min / 60);
		if (h < 24) return `hace ${h} h`;
		const d = Math.round(h / 24);
		return `hace ${d} d`;
	}
</script>

<Sidebar.Provider class="h-full min-h-0">
	<!-- Sidebar de sesiones: persistente en desktop, colapsado en overlay (Sheet) en mobile -->
	<Sidebar.Root collapsible="offcanvas">
		<Sidebar.Header class="gap-0 p-0">
			<div class="flex h-11 shrink-0 items-center justify-between px-3">
				<span class="flex items-center gap-2 text-sm font-medium">
					<MessagesSquareIcon class="text-muted-foreground size-4" />
					{showArchived ? 'Archivadas' : 'Conversaciones'}
				</span>
				<Button
					variant="ghost"
					size="icon"
					class="size-7"
					aria-label="Nueva conversación"
					onclick={startNewConversation}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<Separator />
		</Sidebar.Header>
		<Sidebar.Content class="gap-0 p-0">
			<ScrollArea.Root class="min-h-0 flex-1">
				<nav class="flex flex-col gap-0.5 p-1.5" aria-label="Historial de sesiones">
					{#if sessions.length === 0}
						<p class="text-muted-foreground px-2 py-3 text-xs">
							{showArchived ? 'Sin conversaciones archivadas.' : 'Sin conversaciones todavía.'}
						</p>
					{/if}
					{#each sessions as s (s.id)}
						<div
							class="group/session-item flex w-full items-start gap-0.5 rounded-md pr-1 text-sm transition-colors hover:bg-accent {s.id === selectedId ? 'bg-accent font-medium' : ''}"
						>
							<button
								type="button"
								class="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2 py-1.5 text-left"
								onclick={() => openSession(s.id)}
							>
								<span class="flex w-full items-center gap-1.5">
									{#if isActive(s)}
										<span
											class="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-blue-500"
											title="Respondiendo…"
										></span>
									{/if}
									<span class="truncate">{s.title}</span>
								</span>
								<span class="text-muted-foreground text-[0.7rem]">{formatRelative(s.updatedAt)}</span>
							</button>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<button
											{...props}
											type="button"
											aria-label="Opciones de la conversación"
											class="mt-1.5 shrink-0 rounded p-1 opacity-0 hover:bg-black/5 focus-visible:opacity-100 group-hover/session-item:opacity-100 dark:hover:bg-white/10"
										>
											<EllipsisVerticalIcon class="text-muted-foreground size-3.5" />
										</button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="start" class="w-44" portalProps={{ disabled: true }}>
									{#if showArchived}
										<DropdownMenu.Item onclick={() => setArchived(s.id, false)}>
											<ArchiveRestoreIcon />
											Desarchivar
										</DropdownMenu.Item>
									{:else}
										<DropdownMenu.Item onclick={() => setArchived(s.id, true)}>
											<ArchiveIcon />
											Archivar
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Separator />
									<DropdownMenu.Item variant="destructive" onclick={() => openDeleteConfirm(s.id)}>
										<Trash2Icon />
										Eliminar
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					{/each}
				</nav>
			</ScrollArea.Root>
		</Sidebar.Content>
		<Sidebar.Footer class="gap-0 p-0">
			<Separator />
			<button
				type="button"
				class="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs hover:bg-accent"
				onclick={toggleArchivedView}
			>
				{#if showArchived}
					<ArchiveRestoreIcon class="size-3.5" />
					Ver conversaciones activas
				{:else}
					<ArchiveIcon class="size-3.5" />
					Ver archivadas
				{/if}
			</button>
			{#if loadError}
				<p class="border-t px-3 py-2 text-xs text-red-500">{loadError}</p>
			{/if}
		</Sidebar.Footer>
	</Sidebar.Root>

	<AlertDialog.Root open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) pendingDeleteId = null; }}>
		<AlertDialog.Content portalProps={{ disabled: true }}>
			<AlertDialog.Header>
				<AlertDialog.Title>Eliminar conversación</AlertDialog.Title>
				<AlertDialog.Description>
					¿Eliminar esta conversación de forma permanente? No se puede deshacer.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
				<AlertDialog.Action variant="destructive" onclick={confirmDeleteSession}
					>Eliminar</AlertDialog.Action
				>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>

	<!-- Sesión activa -->
	<Sidebar.Inset class="min-w-0">
		<div class="flex h-9 shrink-0 items-center border-b px-2 md:hidden">
			<Sidebar.Trigger />
		</div>
		<!-- El chat usa `mx-auto max-w-3xl`; dentro del flex-col de Inset esos márgenes
		     automáticos impiden el stretch y colapsan su ancho, así que va en un
		     wrapper block que sí se estira (restaura el comportamiento previo). -->
		<div class="min-h-0 min-w-0 flex-1">
			{#key sessionKey}
				<ChatSession
					initialSession={loadedSession}
					initialEvents={loadedEvents}
					recovered={loadedRecovered}
					onSessionId={handleSessionId}
					onStatusChange={handleStatusChange}
				/>
			{/key}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
