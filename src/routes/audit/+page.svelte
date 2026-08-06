<script lang="ts">
  import { onMount } from "svelte";

  // Vista holística de la radiografía: elige sesión → turnos → y ve TODO lo
  // que pasó en la SECUENCIA real (timeline): razonamiento por paso, tool
  // calls con su input/output y duración, tokens por step, mensajes, HITL.
  // Fuente: /api/audit/* (SQLite durable).

  type Session = { id: string; title: string; updatedAt: string };
  type TurnRow = {
    turn: number; turnId: string; at: string | null; turnMs: number | null;
    steps: number; toolCalls: number; inputTok: number; cacheHit: number;
    errors: number; status: string; question: string | null; planTag: string | null;
  };
  type TlItem = {
    kind: string; stepIndex: number; at: string; t: number;
    label?: string; name?: string; input?: unknown; output?: unknown;
    state?: string; text?: string; meta?: Record<string, unknown>;
  };
  type TurnDetail = {
    turnId: string; at: string | null; turnMs: number | null; status: string; warnings: number;
    steps: number; toolCalls: number; inputTok: number; outputTok: number;
    cacheHit: number; errors: number; question: string | null; answer: string | null;
    reasoning: string; planTag: string | null; hitl: string[];
    timeline: TlItem[];
  };

  let sessions = $state<Session[]>([]);
  let selectedSession = $state<string | null>(null);
  let turns = $state<TurnRow[]>([]);
  let selectedTurnId = $state<string | null>(null);
  let detail = $state<TurnDetail | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let expanded = $state<Set<number>>(new Set());

  function fmt(ms: number | null | undefined): string {
    if (ms == null) return "—";
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  }
  function fmtK(n: number | null | undefined): string {
    if (n == null) return "—";
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }
  function trunc(s: string | null | undefined, n: number): string {
    if (!s) return "";
    return s.length > n ? s.slice(0, n) + "…" : s;
  }
  function toggle(i: number) {
    const next = new Set(expanded);
    next.has(i) ? next.delete(i) : next.add(i);
    expanded = next;
  }

  const KIND_BADGE: Record<string, string> = {
    step: "bg-sky-950 text-sky-300 border-sky-700/60",
    reasoning: "bg-violet-950 text-violet-300 border-violet-700/60",
    "tool-call": "bg-cyan-950 text-cyan-300 border-cyan-700/60",
    "tool-result": "bg-emerald-950 text-emerald-300 border-emerald-700/60",
    "tool-result-error": "bg-red-950 text-red-300 border-red-700/60",
    message: "bg-amber-950 text-amber-300 border-amber-700/60",
    hitl: "bg-yellow-950 text-yellow-300 border-yellow-700/60",
    "step-done": "bg-zinc-900 text-zinc-400 border-zinc-700/60",
  };
  const KIND_DOT: Record<string, string> = {
    step: "bg-sky-500",
    reasoning: "bg-violet-500",
    "tool-call": "bg-cyan-500",
    "tool-result": "bg-emerald-500",
    "tool-result-error": "bg-red-500",
    message: "bg-amber-500",
    hitl: "bg-yellow-500",
    "step-done": "bg-zinc-600",
  };
  function badgeClass(item: TlItem): string {
    if (item.kind === "tool-result" && item.state === "error") return KIND_BADGE["tool-result-error"];
    return KIND_BADGE[item.kind] ?? "bg-zinc-900 text-zinc-400 border-zinc-700/60";
  }
  function dotClass(item: TlItem): string {
    if (item.kind === "tool-result" && item.state === "error") return KIND_DOT["tool-result-error"];
    return KIND_DOT[item.kind] ?? "bg-zinc-600";
  }
  function labelOf(item: TlItem): string {
    switch (item.kind) {
      case "step": return item.label ?? `Paso ${item.stepIndex + 1}`;
      case "reasoning": return `Razonamiento · ${fmtK((item.meta?.chars as number) ?? 0)} chars`;
      case "tool-call": return `→ ${item.name ?? "(tool)"}`;
      case "tool-result": return `← ${item.name ?? "(tool)"} · ${item.state === "error" ? "ERROR" : "ok"}`;
      case "message": return item.label ?? "mensaje";
      case "hitl": return "Aprobación / pregunta humana";
      case "step-done": return `Fin paso ${item.stepIndex + 1}`;
      default: return item.kind;
    }
  }
  function isLong(text: string | undefined | null, n = 500): boolean {
    return (text?.length ?? 0) > n;
  }

  async function loadSessions() {
    try {
      const res = await fetch("/api/sessions");
      const j = await res.json();
      sessions = (j.sessions ?? []).map((s: any) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt }));
      if (sessions.length && !selectedSession) selectedSession = sessions[0].id;
    } catch {
      error = "No se pudo cargar /api/sessions";
    }
  }

  async function loadTurns() {
    if (!selectedSession) return;
    loading = true;
    error = null;
    try {
      const res = await fetch(`/api/audit/turns?sessionId=${encodeURIComponent(selectedSession)}&limit=100`);
      const j = await res.json();
      turns = (j.turns ?? []).map((t: any) => ({
        turn: t.turn, turnId: t.turnId, at: t.at, turnMs: t.turnMs, steps: t.steps, toolCalls: t.toolCalls,
        inputTok: t.inputTok, cacheHit: t.cacheHit, errors: t.errors, status: t.status,
        question: t.question, planTag: t.planTag,
      }));
      if (turns.length) selectedTurnId = turns[turns.length - 1].turnId;
      else selectedTurnId = null;
      detail = null;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  async function loadDetail(turnId: string) {
    if (!selectedSession) return;
    selectedTurnId = turnId;
    loading = true;
    error = null;
    expanded = new Set();
    try {
      const res = await fetch(`/api/audit/turn?sessionId=${encodeURIComponent(selectedSession)}&turnId=${encodeURIComponent(turnId)}`);
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      detail = j;
    } catch (e) {
      error = String(e);
      detail = null;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadSessions();
  });

  $effect(() => {
    if (selectedSession) void loadTurns();
  });
</script>

<svelte:head><title>Auditoría — radiografía</title></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-200">
  <!-- Header -->
  <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
    <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 text-lg">◉</div>
        <div>
          <h1 class="text-sm font-semibold text-zinc-50 leading-tight">Auditoría — radiografía</h1>
          <p class="text-[11px] text-zinc-500">qué pensó · cómo ejecutó · en qué falló · cuánto costó</p>
        </div>
      </div>
      <div class="flex items-center gap-3 text-xs text-zinc-400">
        <span class="hidden sm:inline">{sessions.length} sesiones espejadas</span>
        <a href="/chat" class="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900 transition-colors">← chat</a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-[1600px] px-6 py-6">
    {#if error}
      <div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
    {/if}

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <!-- Sidebar: sesiones + turnos -->
      <aside class="space-y-5">
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <label class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sesión</label>
          <select
            bind:value={selectedSession}
            class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          >
            {#each sessions as s}
              <option value={s.id}>{trunc(s.title, 48)} · {s.id.slice(-8)}</option>
            {/each}
          </select>
        </div>

        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Turnos {turns.length ? `(${turns.length})` : ""}
          </h2>
          {#if turns.length}
            <ul class="max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
              {#each turns as t, i (t.turnId)}
                <li>
                  <button
                    class="w-full rounded-lg border px-3 py-2 text-left transition-colors ${selectedTurnId === t.turnId ? 'border-cyan-700 bg-cyan-950/40' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/70'}"
                    onclick={() => loadDetail(t.turnId)}
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-[13px] text-zinc-100">{t.question ? trunc(t.question, 55) : "(sin pregunta)"}</span>
                      <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.errors ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}">
                        {t.errors ? `${t.errors} err` : "ok"}
                      </span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-x-2 text-[10px] text-zinc-500">
                      <span>{fmt(t.turnMs)}</span>
                      <span>{t.steps} pasos</span>
                      <span>{t.toolCalls} calls</span>
                      <span>{fmtK(t.inputTok)} tok</span>
                      <span>cache {t.cacheHit}%</span>
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
          {:else if !loading}
            <p class="py-4 text-center text-xs text-zinc-600">Sin turnos espejados para esta sesión.</p>
          {/if}
        </div>
      </aside>

      <!-- Detalle del turno -->
      <section class="min-w-0">
        {#if loading}
          <div class="flex h-64 items-center justify-center text-sm text-zinc-500">Cargando turno…</div>
        {:else if detail}
          <!-- Métricas -->
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-cyan-300">{detail.turnId}</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs ${detail.status === 'error' ? 'text-red-400' : detail.status === 'waiting' ? 'text-yellow-300' : 'text-emerald-300'}">{detail.status}</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">⏱ {fmt(detail.turnMs)}</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">{detail.steps} pasos</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">{detail.toolCalls} calls</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">in {fmtK(detail.inputTok)}</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">out {fmtK(detail.outputTok)}</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">cache {detail.cacheHit}%</span>
            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2.5 py-1 text-xs ${detail.errors ? 'text-red-400' : 'text-emerald-300'}">{detail.errors} err</span>
            {#if detail.planTag}
              <span class="rounded-md bg-violet-950 border border-violet-800 px-2.5 py-1 text-xs text-violet-300">plan:{detail.planTag}</span>
            {/if}
            {#if detail.at}
              <span class="rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-600">{new Date(detail.at).toLocaleTimeString()}</span>
            {/if}
          </div>

          <div class="space-y-5">
            <!-- Pregunta / respuesta -->
            {#if detail.question}
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div class="border-b border-zinc-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Pregunta</div>
                <div class="px-4 py-3 text-sm whitespace-pre-wrap">{detail.question}</div>
              </div>
            {/if}
            {#if detail.answer}
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div class="border-b border-zinc-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Respuesta</div>
                <div class="px-4 py-3 text-sm whitespace-pre-wrap max-h-72 overflow-y-auto">{detail.answer}</div>
              </div>
            {/if}

            <!-- Timeline: trayectoria secuencial -->
            <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                <h2 class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Trayectoria del turno ({detail.timeline.length} eventos)</h2>
                <button class="text-[11px] text-cyan-400 hover:underline" onclick={() => (expanded = new Set())}>colapsar todo</button>
              </div>
              <div class="relative ml-5 border-l-2 border-zinc-800 py-4 pl-6">
                <div class="space-y-4">
                  {#each detail.timeline as item, i (i)}
                    <div class="relative">
                      <span class="absolute -left-[31px] top-[7px] h-3 w-3 rounded-full ${dotClass(item)} ring-4 ring-zinc-950"></span>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeClass(item)}">{labelOf(item)}</span>
                        <span class="text-[10px] tabular-nums text-zinc-500">t+{fmt(item.t)}</span>
                        {#if item.kind === "tool-result" && item.meta?.durMs != null}
                          <span class="text-[10px] tabular-nums text-zinc-600">· {fmt(item.meta.durMs as number)}</span>
                        {/if}
                        {#if item.kind === "step-done"}
                          <span class="text-[10px] tabular-nums text-zinc-500">
                            in {fmtK(item.meta?.inputTok as number)} · out {fmtK(item.meta?.outputTok as number)} · cache {item.meta?.cacheRead as number > 0 ? Math.round(((item.meta?.cacheRead as number) / Math.max(1, item.meta?.inputTok as number)) * 100) + '%' : '0%'}
                          </span>
                        {/if}
                      </div>

                      <div class="mt-1.5">
                        {#if item.kind === "reasoning" && item.text}
                          <button class="text-[11px] text-violet-400 hover:underline" onclick={() => toggle(i)}>
                            {expanded.has(i) ? "▾ ocultar" : "▸ ver razonamiento"}
                          </button>
                          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-black/60 border border-violet-900/40 p-3 text-[12px] leading-relaxed text-violet-100/90 ${expanded.has(i) ? 'max-h-[45vh] overflow-y-auto' : 'max-h-28 overflow-hidden'}">{expanded.has(i) ? item.text : trunc(item.text, 700)}</pre>
                        {:else if item.kind === "tool-call"}
                          <pre class="whitespace-pre-wrap rounded-lg bg-black/60 border border-zinc-800 p-2.5 text-[11px] text-cyan-200/80 max-h-40 overflow-y-auto">{JSON.stringify(item.input ?? null, null, 2)}</pre>
                        {:else if item.kind === "tool-result"}
                          <button class="text-[11px] text-zinc-400 hover:underline" onclick={() => toggle(i)}>
                            {expanded.has(i) ? "▾ ocultar output" : "▸ ver output"}
                          </button>
                          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-black/60 border border-zinc-800 p-2.5 text-[11px] text-zinc-300 ${expanded.has(i) ? 'max-h-[45vh] overflow-y-auto' : 'max-h-24 overflow-hidden'}">{expanded.has(i) ? item.output : trunc(String(item.output ?? ""), 600)}</pre>
                        {:else if item.kind === "message" && item.text}
                          <div class="rounded-lg bg-black/40 border border-zinc-800/70 px-3 py-2 text-[12px] text-zinc-200 whitespace-pre-wrap max-h-44 overflow-y-auto">{item.text}</div>
                        {:else if item.kind === "hitl" && item.text}
                          <div class="rounded-lg bg-yellow-950/20 border border-yellow-800/50 px-3 py-2 text-[12px] text-yellow-100/90 whitespace-pre-wrap">{item.text}</div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex h-64 items-center justify-center text-sm text-zinc-600">Selecciona una sesión y un turno para ver la trayectoria completa.</div>
        {/if}
      </section>
    </div>
  </main>
</div>
