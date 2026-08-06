<script lang="ts">
  import { onMount } from "svelte";

  // Vista holística de la radiografía: elige sesión → turnos → y ve TODO lo
  // que pasó: pregunta, respuesta, razonamiento reconstruido, tools con
  // input/output, errores, HITL y métricas. Fuente: /api/audit/* (SQLite
  // durable). Para diagnosticar qué pensó el agente y en qué se equivocó.

  type Session = { id: string; title: string; updatedAt: string };
  type TurnRow = { turn: number; turnId: string; at: string; turnMs: number; steps: number; toolCalls: number; inputTok: number; cacheHit: number; errors: number; status: string; question: string | null; answer: string | null; planTag: string | null };
  type TurnDetail = {
    turnId: string; at: string; turnMs: number; status: string; warnings: number;
    steps: number; toolCalls: number; inputTok: number; outputTok: number;
    cacheHit: number; errors: number; question: string | null; answer: string | null;
    reasoning: string; planTag: string | null; hitl: string[];
    tools: Array<{ name: string; input: unknown; output: unknown; state: string }>;
  };

  let sessions = $state<Session[]>([]);
  let selectedSession = $state<string | null>(null);
  let turns = $state<TurnRow[]>([]);
  let selectedTurnId = $state<string | null>(null);
  let detail = $state<TurnDetail | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let expandReasoning = $state(false);
  let expandedTools = $state<number[]>([]);

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
        question: t.question, answer: t.answer, planTag: t.planTag,
      }));
      // turnId real del endpoint (derivado del espejo de eventos)
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

  function toggleTool(i: number) {
    expandedTools = expandedTools.includes(i) ? expandedTools.filter((x) => x !== i) : [...expandedTools, i];
  }

  onMount(() => {
    void loadSessions();
  });

  $effect(() => {
    if (selectedSession) void loadTurns();
  });
</script>

<svelte:head><title>Auditoría — radiografía</title></svelte:head>

<main class="min-h-screen bg-zinc-950 text-zinc-200 p-6 font-mono text-sm">
  <header class="mb-6 flex flex-wrap items-center gap-4">
    <h1 class="text-lg font-bold text-zinc-50">Auditoría — radiografía del self-improvement</h1>
    <a href="/chat" class="text-cyan-400 hover:underline">← chat</a>
    <span class="text-zinc-500">Sesiones: {sessions.length}</span>
  </header>

  {#if error}<div class="mb-4 border border-red-700 bg-red-950/50 p-3 text-red-300">{error}</div>{/if}

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Columna: sesiones -->
    <section class="border border-zinc-800 rounded-lg p-3">
      <h2 class="font-bold text-zinc-400 mb-2">Sesiones</h2>
      <select bind:value={selectedSession} class="w-full bg-zinc-900 border border-zinc-700 rounded p-2 mb-3">
        {#each sessions as s}
          <option value={s.id}>{trunc(s.title, 50)} — {s.id.slice(-10)}</option>
        {/each}
      </select>
      {#if turns.length}
        <h2 class="font-bold text-zinc-400 mb-2 mt-4">Turnos ({turns.length})</h2>
        <ul class="space-y-1 max-h-[60vh] overflow-auto">
          {#each turns as t, i (t.turnId)}
            <li>
              <button
                class="w-full text-left px-2 py-1.5 rounded border ${selectedTurnId === t.turnId ? 'border-cyan-600 bg-cyan-950/40' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'} flex flex-col gap-0.5"
                onclick={() => loadDetail(t.turnId)}
              >
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-zinc-100">{t.question ? trunc(t.question, 60) : '(sin pregunta)'}</span>
                  <span class="shrink-0 text-[10px] {t.errors ? 'text-red-400' : 'text-emerald-400'}">{t.errors ? `${t.errors} err` : 'ok'}</span>
                </span>
                <span class="text-[10px] text-zinc-500">{fmt(t.turnMs)} · {t.steps}s · {t.toolCalls} calls · {fmtK(t.inputTok)} tok · cache {t.cacheHit}%</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else if !loading}
        <p class="text-zinc-600 text-xs">Sin turnos registrados para esta sesión (¿turno anterior a hoy?).</p>
      {/if}
    </section>

    <!-- Columna: detalle del turno -->
    <section class="lg:col-span-2 border border-zinc-800 rounded-lg p-4">
      {#if loading}
        <p class="text-zinc-500">cargando…</p>
      {:else if detail}
        <!-- métricas -->
        <div class="flex flex-wrap gap-2 mb-4 text-xs">
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">{detail.turnId}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">status: {detail.status}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">⏱ {fmt(detail.turnMs)}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">steps {detail.steps}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">calls {detail.toolCalls}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">in {fmtK(detail.inputTok)}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">out {fmtK(detail.outputTok)}</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">cache {detail.cacheHit}%</span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 {detail.errors ? 'text-red-400' : 'text-emerald-400'}">{detail.errors} err</span>
          {#if detail.planTag}<span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-violet-300">plan:{detail.planTag}</span>{/if}
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-500">{detail.at}</span>
        </div>

        <!-- pregunta / respuesta -->
        <div class="space-y-4">
          {#if detail.question}
            <div>
              <h3 class="text-[10px] uppercase text-zinc-500 mb-1">Pregunta</h3>
              <p class="whitespace-pre-wrap bg-zinc-900 border border-zinc-800 rounded p-3">{detail.question}</p>
            </div>
          {/if}
          {#if detail.answer}
            <div>
              <h3 class="text-[10px] uppercase text-zinc-500 mb-1">Respuesta</h3>
              <div class="whitespace-pre-wrap bg-zinc-900 border border-zinc-800 rounded p-3 max-h-64 overflow-auto">{detail.answer}</div>
            </div>
          {/if}

          <!-- razonamiento -->
          {#if detail.reasoning}
            <div>
              <h3 class="flex items-center gap-2 text-[10px] uppercase text-zinc-500 mb-1">
                Razonamiento reconstruido
                <span class="text-zinc-600 normal-case">({(detail.reasoning.length / 1000).toFixed(1)}k chars)</span>
              </h3>
              <button class="text-cyan-400 text-xs hover:underline mb-1" onclick={() => (expandReasoning = !expandReasoning)}>
                {expandReasoning ? '▾ colapsar' : '▸ expandir'}
              </button>
              {#if expandReasoning}
                <pre class="whitespace-pre-wrap bg-black border border-zinc-800 rounded p-3 max-h-[50vh] overflow-auto text-zinc-300">{detail.reasoning}</pre>
              {:else}
                <pre class="whitespace-pre-wrap bg-black border border-zinc-800 rounded p-3 max-h-24 overflow-hidden text-zinc-500">{trunc(detail.reasoning, 600)}</pre>
              {/if}
            </div>
          {/if}

          <!-- tools -->
          {#if detail.tools.length}
            <div>
              <h3 class="text-[10px] uppercase text-zinc-500 mb-1">Tool calls ({detail.tools.length})</h3>
              <ul class="space-y-2">
                {#each detail.tools as tool, i (i)}
                  <li class="border border-zinc-800 rounded overflow-hidden">
                    <button class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-left" onclick={() => toggleTool(i)}>
                      <span class="flex items-center gap-2">
                        <span class={tool.state === 'error' ? 'text-red-400' : 'text-emerald-400'}>{tool.state === 'error' ? '✗' : '✓'}</span>
                        <span class="text-cyan-300">{tool.name || '(sin nombre)'}</span>
                      </span>
                      <span class="text-[10px] text-zinc-500 truncate">{JSON.stringify(tool.input ?? '').slice(0, 80)}</span>
                    </button>
                    {#if expandedTools.includes(i)}
                      <div class="px-3 py-2 space-y-2 bg-black">
                        <div>
                          <div class="text-[10px] uppercase text-zinc-600">input</div>
                          <pre class="whitespace-pre-wrap text-xs text-zinc-300">{JSON.stringify(tool.input, null, 2)}</pre>
                        </div>
                        <div>
                          <div class="text-[10px] uppercase text-zinc-600">output</div>
                          <pre class="whitespace-pre-wrap text-xs text-zinc-300 max-h-64 overflow-auto">{typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2)}</pre>
                        </div>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- HITL -->
          {#if detail.hitl.length}
            <div>
              <h3 class="text-[10px] uppercase text-zinc-500 mb-1">HITL / aprobaciones ({detail.hitl.length})</h3>
              <ul class="space-y-1">
                {#each detail.hitl as p, i (i)}
                  <li class="bg-amber-950/40 border border-amber-800 rounded p-2 text-amber-200 text-xs">{p}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-zinc-600">Selecciona una sesión y un turno para ver la radiografía completa.</p>
      {/if}
    </section>
  </div>
</main>
