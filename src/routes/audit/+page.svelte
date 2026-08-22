<script lang="ts">
  import { onMount } from "svelte";

  // Auditoría SECUENCIAL de la sesión COMPLETA: línea de tiempo cronológica que
  // fusiona TODO lo que sucedió en una sesión — voz (voice_events: mic, VAD,
  // STT, transcripciones, playback, respuestas, idle, AEC), inyecciones de
  // contexto (lóbulo frontal + memoria episódica) y los turnos del agente
  // (pregunta, razonamiento, tool calls con input/output, respuesta, HITL).
  // Fuente: /api/audit/session (SQLite durable).

  type Session = { id: string; title: string; updatedAt: string };
  type TurnInfo = {
    turnId: string; turnIndex: number; question: string | null; answer: string | null;
    at: string | null; turnMs: number | null; steps: number; toolCalls: number;
    inputTok: number; outputTok: number; cacheRead: number; cacheHit: number;
    errors: number; status: string; warnings: number;
  };
  type TlItem = {
    seq: number; source: "voice" | "injection" | "turn"; at: string; t: number;
    turnId?: string; turnIndex?: number; isTurnHeader?: boolean;
    kind?: string; stepIndex?: number; label?: string; name?: string;
    input?: unknown; output?: unknown; state?: string; text?: string; meta?: Record<string, unknown>;
    question?: string | null; turn?: TurnInfo;
    voiceType?: string; voiceData?: unknown;
    injKind?: string; injOrigin?: string; injTag?: string; injChars?: number; injHits?: number;
    injMessage?: string; injSources?: Array<{ sessionId: string; type: string }>; injBody?: string;
  };
  type SessionData = {
    sessionId: string; turnCount: number; voiceCount: number; injectionCount: number;
    firstAt: string | null; lastAt: string | null; durationMs: number | null;
    turns: TurnInfo[]; timeline: TlItem[];
  };
  // Evaluaciones de CALIDAD (fábrica, para graduación de skills).
  type Evaluacion = {
    id: number; at: string; caso: string; skill: string; pregunta: string;
    sessionId: string; turnId: string; status: string; errors: number;
    steps: number; toolCalls: number; inputTok: number; outputTok: number;
    cacheHit: number; warnings: number; turnMs: number;
    exactitud: number; congruencia: number | null;
    invariantes: Array<{
      clave: string; etiqueta: string;
      esperado: string | number | null; hallado: string | number | null;
      acierto: boolean; cobertura: boolean;
    }>;
    hallazgos: Array<{
      tipo: string; invariante: string;
      esperado: string | number | null; hallado: string | number | null;
      detalle: string;
    }>;
    respuesta: string;
  };
  type Tendencia = {
    caso: string; n: number; exactitudMedia: number; congruenciaPct: number | null;
    pasosProm: number; callsProm: number; tokInProm: number; tokOutProm: number;
    errProm: number; duracionPromMs: number; hallazgosTotal: number;
  };
  // Item del tab "Inyecciones": capas del system prompt (derivadas de
  // llm_inputs) + inyecciones por-turno del middleware, cada una con ORIGEN.
  type InjItem = {
    sessionId: string; at: string; kind: string; origin?: string; tag: string;
    chars: number; hits?: number; message?: string;
    sources?: Array<{ sessionId: string; type: string }>;
    body?: string; step?: number; label?: string;
  };
  const INJ_GROUP = (k: string): "system" | "middleware" =>
    ["base", "framework", "agent", "routing", "tenant"].includes(k) ? "system" : "middleware";
  const INJ_META: Record<string, { label: string; badge: string }> = {
    base: { label: "Base — instructions globales", badge: "bg-sky-950 text-sky-300 border-sky-700/60" },
    framework: { label: "Framework Eve", badge: "bg-zinc-900 text-zinc-400 border-zinc-700" },
    agent: { label: "Agente activo", badge: "bg-violet-950 text-violet-300 border-violet-700/60" },
    routing: { label: "Mapa de ruteo (Company Twin)", badge: "bg-indigo-950 text-indigo-300 border-indigo-700/60" },
    tenant: { label: "Empresa activa", badge: "bg-teal-950 text-teal-300 border-teal-700/60" },
    plan: { label: "Plan de contexto (lóbulo frontal)", badge: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700/60" },
    memory: { label: "Memoria episódica", badge: "bg-cyan-950 text-cyan-300 border-cyan-700/60" },
    duplicates: { label: "Anti-duplicados", badge: "bg-amber-950 text-amber-300 border-amber-700/60" },
    compact: { label: "Compactación tool-results", badge: "bg-emerald-950 text-emerald-300 border-emerald-700/60" },
  };

  let sessions = $state<Session[]>([]);
  let selectedSession = $state<string | null>(null);
  let data = $state<SessionData | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  // Filtros por fuente + tope defensivo de eventos de voz para el DOM.
  let showVoice = $state(true);
  let showInjection = $state(true);
  let showTurn = $state(true);
  const VOICE_RENDER_CAP = 400;
  let voiceCap = $state(VOICE_RENDER_CAP);
  let expanded = $state<Set<number>>(new Set());
  let expandedInj = $state<Set<number>>(new Set());
  let expandedVoice = $state<Set<number>>(new Set());
  // Vista + evaluaciones de calidad.
  let view = $state<"radiografia" | "inyecciones" | "evaluaciones">("radiografia");
  let evaluaciones = $state<Evaluacion[]>([]);
  let tendencia = $state<Tendencia[]>([]);
  let evalLoading = $state(false);
  let evalError = $state<string | null>(null);
  let expandedEval = $state<Set<number>>(new Set());
  // Tab "Inyecciones": lista completa con origen.
  let inyecciones = $state<InjItem[]>([]);
  let injLoading = $state(false);
  let injError = $state<string | null>(null);
  let expandedInjTab = $state<Set<number>>(new Set());
  let injFilter = $state<"todos" | "system" | "middleware">("todos");

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
  function toggle(key: number) {
    const next = new Set(expanded);
    next.has(key) ? next.delete(key) : next.add(key);
    expanded = next;
  }
  function toggleInj(key: number) {
    const next = new Set(expandedInj);
    next.has(key) ? next.delete(key) : next.add(key);
    expandedInj = next;
  }
  function toggleVoice(key: number) {
    const next = new Set(expandedVoice);
    next.has(key) ? next.delete(key) : next.add(key);
    expandedVoice = next;
  }
  function toggleEval(i: number) {
    const next = new Set(expandedEval);
    next.has(i) ? next.delete(i) : next.add(i);
    expandedEval = next;
  }
  function isLong(text: string | undefined | null, n = 500): boolean {
    return (text?.length ?? 0) > n;
  }

  // ── Estilos por tipo de item de turno ──────────────────────────────────────
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
    return KIND_BADGE[item.kind ?? ""] ?? "bg-zinc-900 text-zinc-400 border-zinc-700/60";
  }
  function dotClass(item: TlItem): string {
    if (item.kind === "tool-result" && item.state === "error") return KIND_DOT["tool-result-error"];
    return KIND_DOT[item.kind ?? ""] ?? "bg-zinc-600";
  }
  function labelOf(item: TlItem): string {
    switch (item.kind) {
      case "step": return item.label ?? `Paso ${(item.stepIndex ?? 0) + 1}`;
      case "reasoning": return `Razonamiento · ${fmtK((item.meta?.chars as number) ?? 0)} chars`;
      case "tool-call": return `→ ${item.name ?? "(tool)"}`;
      case "tool-result": return `← ${item.name ?? "(tool)"} · ${item.state === "error" ? "ERROR" : "ok"}`;
      case "message": return item.label ?? "mensaje";
      case "hitl": return "Aprobación / pregunta humana";
      case "step-done": return `Fin paso ${(item.stepIndex ?? 0) + 1}`;
      default: return item.kind ?? "";
    }
  }

  // ── Voz: etiquetas + agrupación para la UI ────────────────────────────────
  const VOICE_LABELS: Record<string, string> = {
    mic_start: "Micrófono activado",
    mic_stop: "Micrófono desactivado",
    mic_error: "Error de micrófono",
    mic_drop: "Audio descartado (barge-in/eco)",
    ws_open: "WebSocket abierto",
    ws_close: "WebSocket cerrado",
    ws_error: "Error WebSocket",
    connect_error: "Error de conexión",
    event_error: "Error de evento",
    vad_speech: "Voz en curso",
    vad_commit: "Voz detectada (commit)",
    vad_server_fallback: "VAD servidor (fallback)",
    vad_server_stop: "VAD servidor detenido",
    stt: "Transcripción (STT)",
    commit_no_transcript: "Voz sin transcripción",
    commit_retry: "Reintento de commit",
    commit_reappend: "Re-anexado de audio",
    commit_gave_up: "Commit abandonado",
    transcript_decision: "Decisión del transcript",
    transcript_duplicate: "Transcript duplicado (dedupe)",
    echo_reject_intent: "Eco rechazado (intención)",
    echo_reject_assistant: "Eco rechazado (asistente)",
    echo_reject_vad: "Eco rechazado (VAD)",
    unclear_audio: "Audio poco claro",
    speak: "Asistente habla",
    speak_answer: "Respuesta leída en voz alta",
    speak_queue_cleared: "Cola de habla vaciada",
    speak_item: "Item de habla confirmado",
    play_start: "Playback iniciado",
    play_end: "Playback terminado",
    play_stop: "Playback detenido",
    play_cut: "Playback cortado (barge-in)",
    resp_created: "Respuesta creada",
    resp_auto_cancel: "Respuesta automática cancelada",
    resp_cancel: "Respuesta cancelada",
    resp_done: "Respuesta completada",
    barge_in: "Interrupción (barge-in)",
    barge_in_ignored: "Interrupción ignorada",
    idle_tier1: "Inactividad nivel 1",
    idle_tier2: "Inactividad nivel 2",
    idle_tier1_ui: "UI inactividad nivel 1",
    idle_timeout_ui: "Timeout de inactividad",
    aec_status: "Estado AEC",
    aec_downgrade: "AEC degradado",
    aec_ui: "Cambio AEC en UI",
    session_mode: "Modo de sesión",
    session_resync: "Re-sync de sesión",
    session_recycle: "Reciclaje de sesión",
    session_recycled: "Sesión reciclada",
    session_recycle_failed: "Reciclaje fallido",
    session_recover: "Recuperación de sesión",
    session_recovered: "Sesión recuperada",
    session_recover_failed: "Recuperación fallida",
    overlay_commit: "Overlay commiteado",
    overlay_discard: "Overlay descartado",
    narration_echo_question: "Eco de narración (pregunta)",
    narration_duplicate: "Narración duplicada",
    post_answer_auto_off: "Auto-apagado post-respuesta",
  };
  function voiceGroup(type: string): string {
    if (type.startsWith("mic_")) return "mic";
    if (type === "ws_open" || type === "ws_close" || type === "ws_error" || type === "connect_error" || type === "event_error") return "conexion";
    if (type.startsWith("vad_") || type === "stt" || type.startsWith("commit_")) return "stt";
    if (type.startsWith("transcript_") || type.startsWith("echo_reject_") || type === "unclear_audio") return "transcripcion";
    if (type.startsWith("speak") || type.startsWith("play_")) return "habla";
    if (type.startsWith("resp_") || type.startsWith("barge_in")) return "respuesta";
    if (type.startsWith("idle_")) return "idle";
    if (type.startsWith("aec_")) return "aec";
    if (type.startsWith("session_")) return "sesion";
    if (type.startsWith("overlay_")) return "overlay";
    if (type.startsWith("narration_")) return "narracion";
    if (type === "post_answer_auto_off") return "autooff";
    return "otro";
  }
  const VOICE_GROUP_LABEL: Record<string, string> = {
    mic: "mic", conexion: "conexión", stt: "STT", transcripcion: "transcripción",
    habla: "habla", respuesta: "respuesta", idle: "idle", aec: "AEC",
    sesion: "sesión", overlay: "overlay", narracion: "narración", autooff: "auto-off", otro: "voz",
  };
  const VOICE_GROUP_BADGE: Record<string, string> = {
    mic: "bg-zinc-900 text-zinc-300 border-zinc-700",
    conexion: "bg-zinc-900 text-zinc-400 border-zinc-700",
    stt: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-700/60",
    transcripcion: "bg-pink-950 text-pink-300 border-pink-700/60",
    habla: "bg-rose-950 text-rose-300 border-rose-700/60",
    respuesta: "bg-purple-950 text-purple-300 border-purple-700/60",
    idle: "bg-amber-950 text-amber-300 border-amber-700/60",
    aec: "bg-teal-950 text-teal-300 border-teal-700/60",
    sesion: "bg-orange-950 text-orange-300 border-orange-700/60",
    overlay: "bg-indigo-950 text-indigo-300 border-indigo-700/60",
    narracion: "bg-lime-950 text-lime-300 border-lime-700/60",
    autooff: "bg-cyan-950 text-cyan-300 border-cyan-700/60",
    otro: "bg-zinc-900 text-zinc-400 border-zinc-700",
  };
  const VOICE_GROUP_DOT: Record<string, string> = {
    mic: "bg-zinc-400", conexion: "bg-zinc-500", stt: "bg-fuchsia-500",
    transcripcion: "bg-pink-500", habla: "bg-rose-500", respuesta: "bg-purple-500",
    idle: "bg-amber-500", aec: "bg-teal-500", sesion: "bg-orange-500",
    overlay: "bg-indigo-500", narracion: "bg-lime-500", autooff: "bg-cyan-500", otro: "bg-zinc-500",
  };
  function voiceBadge(item: TlItem): string {
    return VOICE_GROUP_BADGE[voiceGroup(item.voiceType ?? "")] ?? VOICE_GROUP_BADGE["otro"];
  }
  function voiceDot(item: TlItem): string {
    return VOICE_GROUP_DOT[voiceGroup(item.voiceType ?? "")] ?? VOICE_GROUP_DOT["otro"];
  }
  function voiceLabel(item: TlItem): string {
    return VOICE_LABELS[item.voiceType ?? ""] ?? item.voiceType ?? "voz";
  }
  function voiceSummary(d: unknown): string {
    if (d == null) return "";
    const obj = typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
    if (obj) {
      if (typeof obj.text === "string") return String(obj.text);
      if (typeof obj.path === "string") return `→ ${obj.path}`;
      if (typeof obj.reason === "string") return obj.reason;
      if (typeof obj.mode === "string") return `mode=${obj.mode}`;
      if (typeof obj.rms === "number") return `rms=${obj.rms}`;
      if (typeof obj.hits === "number") return `${obj.hits} hits`;
    }
    const s = JSON.stringify(d);
    return s && s.length > 160 ? s.slice(0, 160) + "…" : (s ?? "");
  }

  // ── Carga de datos ────────────────────────────────────────────────────────
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

  async function loadSession() {
    if (!selectedSession) return;
    loading = true;
    error = null;
    expanded = new Set();
    expandedInj = new Set();
    expandedVoice = new Set();
    voiceCap = VOICE_RENDER_CAP;
    try {
      const res = await fetch(`/api/audit/session?sessionId=${encodeURIComponent(selectedSession)}`);
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      const raw = (j.timeline ?? []) as Array<Record<string, unknown>>;
      const timeline = raw.map((item, i) => ({ ...item, seq: i })) as unknown as TlItem[];
      data = { ...j, timeline } as SessionData;
    } catch (e) {
      error = String(e);
      data = null;
    } finally {
      loading = false;
    }
  }

  async function loadEvaluaciones() {
    evalLoading = true;
    evalError = null;
    try {
      const res = await fetch("/api/audit/evaluaciones?limit=200");
      const j = await res.json();
      evaluaciones = j.evaluaciones ?? [];
      tendencia = j.tendencia ?? [];
    } catch (e) {
      evalError = String(e);
    } finally {
      evalLoading = false;
    }
  }

  // Tab "Inyecciones": todo lo inyectado al runtime, con origen.
  async function loadInyecciones() {
    if (!selectedSession) return;
    injLoading = true;
    injError = null;
    expandedInjTab = new Set();
    try {
      const res = await fetch(`/api/audit/injections?session=${encodeURIComponent(selectedSession)}&limit=500`);
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      inyecciones = (j.items ?? []) as InjItem[];
    } catch (e) {
      injError = String(e);
      inyecciones = [];
    } finally {
      injLoading = false;
    }
  }

  function toggleInjTab(i: number) {
    const next = new Set(expandedInjTab);
    next.has(i) ? next.delete(i) : next.add(i);
    expandedInjTab = next;
  }

  const injCounts = $derived({
    system: inyecciones.filter((i) => INJ_GROUP(i.kind) === "system").length,
    middleware: inyecciones.filter((i) => INJ_GROUP(i.kind) === "middleware").length,
  });
  const filteredInj = $derived(
    inyecciones.filter((i) => injFilter === "todos" || INJ_GROUP(i.kind) === injFilter),
  );

  // Línea de tiempo filtrada por fuente + tope defensivo de voz.
  const filtered = $derived.by(() => {
    if (!data) return [];
    const out: TlItem[] = [];
    let voiceSeen = 0;
    for (const item of data.timeline) {
      if (item.source === "voice") {
        if (!showVoice) continue;
        if (voiceSeen >= voiceCap) continue;
        voiceSeen++;
      }
      if (item.source === "injection" && !showInjection) continue;
      if (item.source === "turn" && !showTurn) continue;
      out.push(item);
    }
    return out;
  });

  function scrollToTurn(turnIndex: number) {
    try {
      document.getElementById(`audit-turn-${turnIndex}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // noop
    }
  }

  onMount(() => {
    void loadSessions();
    void loadEvaluaciones();
  });

  $effect(() => {
    if (selectedSession) {
      void loadSession();
      if (view === "inyecciones") void loadInyecciones();
    }
  });
</script>

<svelte:head><title>Auditoría — radiografía</title></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-200">
  <!-- Header -->
  <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
    <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 text-lg">◉</div>
        <div class="flex flex-col gap-2">
          <div>
            <h1 class="text-sm font-semibold text-zinc-50 leading-tight">Auditoría — radiografía</h1>
            <p class="text-[11px] text-zinc-500">todo lo que pasó en la sesión · voz · contexto · turnos</p>
          </div>
          <div class="flex w-fit items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
            <button
              class="rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === 'radiografia' ? 'bg-cyan-600/20 text-cyan-300' : 'text-zinc-400 hover:text-zinc-200'}"
              onclick={() => (view = "radiografia")}
            >Radiografía</button>
            <button
              class="rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === 'evaluaciones' ? 'bg-emerald-600/20 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'}"
              onclick={() => (view = "evaluaciones")}
            >Evaluaciones {tendencia.length ? `(${tendencia.length})` : ""}</button>
            <button
              class="rounded-md px-3 py-1 text-xs font-medium transition-colors ${view === 'inyecciones' ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:text-zinc-200'}"
              onclick={() => (view = "inyecciones")}
            >Inyecciones</button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3 text-xs text-zinc-400">
        <span class="hidden sm:inline">{sessions.length} sesiones espejadas</span>
        <a href="/chat" class="rounded-lg border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900 transition-colors">← chat</a>
      </div>
    </div>
  </header>

  <main class="mx-auto max-w-[1600px] px-6 py-6">
    {#if error && view === "radiografia"}
      <div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
    {/if}
    {#if evalError && view === "evaluaciones"}
      <div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{evalError}</div>
    {/if}

    {#if view === "radiografia"}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <!-- Sidebar: sesión + resumen + navegación por turnos -->
      <aside class="space-y-5">
        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <label for="audit-session-select" class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sesión</label>
          <select
            id="audit-session-select"
            bind:value={selectedSession}
            class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm focus:border-cyan-600 focus:outline-none"
          >
            {#each sessions as s}
              <option value={s.id}>{trunc(s.title, 48)} · {s.id.slice(-8)}</option>
            {/each}
          </select>
        </div>

        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sesión</h2>
          {#if data}
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-cyan-300">{data.turnCount}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">turnos</div>
              </div>
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-fuchsia-300">{data.voiceCount}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">eventos voz</div>
              </div>
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-violet-300">{data.injectionCount}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">inyecciones</div>
              </div>
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-zinc-200">{fmt(data.durationMs)}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">duración</div>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-500">
              {#if data.firstAt}<span>inicio {new Date(data.firstAt).toLocaleString()}</span>{/if}
              {#if data.lastAt}<span>· fin {new Date(data.lastAt).toLocaleTimeString()}</span>{/if}
            </div>
          {:else}
            <p class="py-3 text-center text-[11px] text-zinc-600">Cargando…</p>
          {/if}
        </div>

        <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Turnos {data?.turns.length ? `(${data.turns.length})` : ""}
          </h2>
          {#if data?.turns.length}
            <ul class="max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
              {#each data.turns as t (t.turnId)}
                <li>
                  <button
                    class="w-full rounded-lg border px-3 py-2 text-left transition-colors border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/70"
                    onclick={() => scrollToTurn(t.turnIndex)}
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
          {:else if loading}
            <p class="py-3 text-center text-[11px] text-zinc-600">Cargando…</p>
          {:else}
            <p class="py-3 text-center text-[11px] text-zinc-600">Sin turnos espejados para esta sesión.</p>
          {/if}
        </div>
      </aside>

      <!-- Main: línea de tiempo secuencial de la sesión -->
      <section class="min-w-0">
        {#if loading}
          <div class="flex h-64 items-center justify-center text-sm text-zinc-500">Cargando línea de tiempo…</div>
        {:else if data}
          <!-- Filtros + métricas -->
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${showTurn ? 'border-cyan-700 bg-cyan-950/50 text-cyan-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (showTurn = !showTurn)}
            >turnos ({data.turnCount})</button>
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${showVoice ? 'border-fuchsia-700 bg-fuchsia-950/50 text-fuchsia-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (showVoice = !showVoice)}
            >voz ({data.voiceCount})</button>
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${showInjection ? 'border-violet-700 bg-violet-950/50 text-violet-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (showInjection = !showInjection)}
            >inyecciones ({data.injectionCount})</button>
            <span class="ml-auto text-[10px] tabular-nums text-zinc-600">{filtered.length} eventos visibles</span>
          </div>

          <!-- Timeline secuencial -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <h2 class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Línea de tiempo de la sesión ({filtered.length} eventos · secuencial)
              </h2>
              <button class="text-[11px] text-cyan-400 hover:underline" onclick={() => { expanded = new Set(); expandedInj = new Set(); expandedVoice = new Set(); }}>colapsar todo</button>
            </div>
            <div class="relative ml-5 border-l-2 border-zinc-800 py-4 pl-6">
              <div class="space-y-4">
                {#each filtered as item (item.seq)}
                  {#if item.source === "turn" && item.isTurnHeader}
                    <!-- Cabecera de turno -->
                    <div id={`audit-turn-${item.turnIndex}`} class="relative -ml-1 scroll-mt-24">
                      <span class="absolute -left-[31px] top-[9px] h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-zinc-950"></span>
                      <div class="rounded-lg border border-cyan-800/70 bg-cyan-950/20 px-3 py-2">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="rounded-md bg-cyan-950 border border-cyan-800 px-2 py-0.5 text-[11px] font-bold text-cyan-300">TURNO {(item.turnIndex ?? 0) + 1}</span>
                          <span class="text-[10px] tabular-nums text-zinc-500">{item.at ? new Date(item.at).toLocaleTimeString() : ""}</span>
                          <span class="text-[10px] tabular-nums text-zinc-600">t+{fmt(item.t)}</span>
                          {#if item.turn}
                            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[10px] ${item.turn.errors ? 'text-red-400' : 'text-emerald-400'}">{item.turn.errors} err</span>
                            <span class="text-[10px] tabular-nums text-zinc-400">{item.turn.steps} pasos · {item.turn.toolCalls} calls · in {fmtK(item.turn.inputTok)} · cache {item.turn.cacheHit}% · {fmt(item.turn.turnMs)}</span>
                            <span class="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">{item.turn.status}</span>
                          {/if}
                        </div>
                        {#if item.question}
                          <p class="mt-1 text-[12px] whitespace-pre-wrap text-zinc-200">{item.question}</p>
                        {/if}
                      </div>
                    </div>
                  {:else if item.source === "voice"}
                    <!-- Evento de voz -->
                    <div class="relative">
                      <span class="absolute -left-[31px] top-[7px] h-3 w-3 rounded-full ${voiceDot(item)} ring-4 ring-zinc-950"></span>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-md border px-2 py-0.5 text-[11px] font-semibold ${voiceBadge(item)}">
                          <span class="font-mono text-[9px] opacity-70">{VOICE_GROUP_LABEL[voiceGroup(item.voiceType ?? "")]}</span> · {voiceLabel(item)}
                        </span>
                        <span class="text-[10px] tabular-nums text-zinc-500">t+{fmt(item.t)}</span>
                        {#if item.voiceType}<span class="font-mono text-[9px] text-zinc-600">{item.voiceType}</span>{/if}
                        {#if item.voiceData != null && isLong(JSON.stringify(item.voiceData), 120)}
                          <button class="text-[11px] text-zinc-400 hover:underline" onclick={() => toggleVoice(item.seq)}>
                            {expandedVoice.has(item.seq) ? "▾ ocultar datos" : "▸ ver datos"}
                          </button>
                        {/if}
                      </div>
                      {#if item.voiceData != null}
                        <div class="mt-1 text-[11px] text-zinc-400">{voiceSummary(item.voiceData)}</div>
                      {/if}
                      {#if expandedVoice.has(item.seq) && item.voiceData != null}
                        <pre class="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-fuchsia-900/40 bg-black/60 p-2.5 font-mono text-[10px] leading-relaxed text-fuchsia-100/80">{JSON.stringify(item.voiceData, null, 2)}</pre>
                      {/if}
                    </div>
                  {:else if item.source === "injection"}
                    <!-- Inyección de contexto -->
                    <div class="relative">
                      <span class="absolute -left-[31px] top-[7px] h-3 w-3 rounded-full bg-violet-500 ring-4 ring-zinc-950"></span>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-md border px-2 py-0.5 text-[11px] font-semibold ${INJ_META[item.injKind ?? '']?.badge ?? 'bg-violet-950 text-violet-300 border-violet-700/60'}">
                          {INJ_META[item.injKind ?? '']?.label ?? item.injKind ?? "inyección"}
                        </span>
                        <span class="font-mono text-[10px] text-zinc-500">{item.injTag}</span>
                        <span class="text-[10px] tabular-nums text-zinc-500">t+{fmt(item.t)}</span>
                        <span class="text-[10px] tabular-nums text-zinc-500">{fmtK(item.injChars)} chars</span>
                        {#if item.injKind === "memory" && item.injHits != null}
                          <span class="text-[10px] text-zinc-500">{item.injHits} hits</span>
                        {/if}
                        {#if item.injBody}
                          <button class="text-[11px] text-zinc-400 hover:underline" onclick={() => toggleInj(item.seq)}>
                            {expandedInj.has(item.seq) ? "▾ ocultar contenido" : "▸ ver contenido"}
                          </button>
                        {/if}
                      </div>
                      {#if item.injOrigin}
                        <div class="mt-1 font-mono text-[10px] text-zinc-600">↳ {item.injOrigin}</div>
                      {/if}
                      {#if item.injMessage}
                        <div class="mt-1 truncate text-[10px] text-zinc-600" title={item.injMessage}>↳ mensaje: {item.injMessage}</div>
                      {/if}
                      {#if item.injSources?.length}
                        <div class="mt-1 flex flex-wrap gap-1">
                          {#each item.injSources as src}
                            <span class="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[9px] text-zinc-400">{src.type}·{String(src.sessionId).slice(-8)}</span>
                          {/each}
                        </div>
                      {/if}
                      {#if expandedInj.has(item.seq) && item.injBody}
                        <pre class="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">{item.injBody}</pre>
                      {/if}
                    </div>
                  {:else}
                    <!-- Item de turno -->
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
                          <button class="text-[11px] text-violet-400 hover:underline" onclick={() => toggle(item.seq)}>
                            {expanded.has(item.seq) ? "▾ ocultar" : "▸ ver razonamiento"}
                          </button>
                          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-black/60 border border-violet-900/40 p-3 text-[12px] leading-relaxed text-violet-100/90 ${expanded.has(item.seq) ? 'max-h-[45vh] overflow-y-auto' : 'max-h-28 overflow-hidden'}">{expanded.has(item.seq) ? item.text : trunc(item.text, 700)}</pre>
                        {:else if item.kind === "tool-call"}
                          <pre class="whitespace-pre-wrap rounded-lg bg-black/60 border border-zinc-800 p-2.5 text-[11px] text-cyan-200/80 max-h-40 overflow-y-auto">{JSON.stringify(item.input ?? null, null, 2)}</pre>
                        {:else if item.kind === "tool-result"}
                          <button class="text-[11px] text-zinc-400 hover:underline" onclick={() => toggle(item.seq)}>
                            {expanded.has(item.seq) ? "▾ ocultar detalle" : "▸ ver detalle"}
                          </button>
                          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-black/60 border border-cyan-900/40 p-2.5 text-[11px] text-cyan-200/80 max-h-40 overflow-y-auto">{JSON.stringify(item.input ?? null, null, 2)}</pre>
                          <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-black/60 border border-zinc-800 p-2.5 text-[11px] text-zinc-300 ${expanded.has(item.seq) ? 'max-h-[45vh] overflow-y-auto' : 'max-h-24 overflow-hidden'}">{expanded.has(item.seq) ? item.output : trunc(String(item.output ?? ""), 600)}</pre>
                        {:else if item.kind === "message" && item.text}
                          <div class="rounded-lg bg-black/40 border border-zinc-800/70 px-3 py-2 text-[12px] text-zinc-200 whitespace-pre-wrap max-h-44 overflow-y-auto">{item.text}</div>
                        {:else if item.kind === "hitl" && item.text}
                          <div class="rounded-lg bg-yellow-950/20 border border-yellow-800/50 px-3 py-2 text-[12px] text-yellow-100/90 whitespace-pre-wrap">{item.text}</div>
                        {/if}
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
            {#if showVoice && data.voiceCount > VOICE_RENDER_CAP && voiceCap <= VOICE_RENDER_CAP}
              <div class="border-t border-zinc-800 px-4 py-3 text-center">
                <button
                  class="rounded-lg border border-fuchsia-800 bg-fuchsia-950/40 px-4 py-1.5 text-xs text-fuchsia-300 hover:bg-fuchsia-950/70"
                  onclick={() => (voiceCap = 10000)}
                >Mostrar los {data.voiceCount - VOICE_RENDER_CAP} eventos de voz restantes</button>
              </div>
            {/if}
          </div>
        {:else}
          <div class="flex h-64 items-center justify-center text-sm text-zinc-600">Selecciona una sesión para ver la línea de tiempo completa.</div>
        {/if}
      </section>
      </div>
    {:else if view === "inyecciones"}
      <!-- Tab Inyecciones: todo lo inyectado al runtime, con ORIGEN -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside class="space-y-5">
          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <label for="audit-inj-session" class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Sesión</label>
            <select
              id="audit-inj-session"
              bind:value={selectedSession}
              class="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm focus:border-violet-600 focus:outline-none"
            >
              {#each sessions as s}
                <option value={s.id}>{trunc(s.title, 48)} · {s.id.slice(-8)}</option>
              {/each}
            </select>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Inyecciones</h2>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-indigo-300">{injCounts.system}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">system prompt</div>
              </div>
              <div class="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
                <div class="text-lg font-bold text-fuchsia-300">{injCounts.middleware}</div>
                <div class="text-[9px] uppercase tracking-wider text-zinc-500">por-turno</div>
              </div>
            </div>
            <div class="mt-2 text-[10px] text-zinc-500">{inyecciones.length} inyecciones registradas</div>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Origen</h2>
            <div class="space-y-1.5 text-[10px] leading-relaxed text-zinc-500">
              <p><span class="text-sky-400">base</span> — agent/instructions.md</p>
              <p><span class="text-violet-400">agente</span> — agent-active.ts → company-twin/…/instructions.md</p>
              <p><span class="text-indigo-400">ruteo</span> — context-planner.ts (Company Twin)</p>
              <p><span class="text-teal-400">empresa</span> — tenant.ts → profile.md</p>
              <p><span class="text-fuchsia-400">plan</span> · <span class="text-cyan-400">memoria</span> · <span class="text-amber-400">dup</span> · <span class="text-emerald-400">compact</span> — context-budget.ts</p>
            </div>
          </div>
        </aside>

        <section class="min-w-0">
          {#if injError}
            <div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{injError}</div>
          {/if}

          <div class="mb-3 flex flex-wrap items-center gap-2">
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${injFilter === 'todos' ? 'border-zinc-500 bg-zinc-800 text-zinc-200' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (injFilter = "todos")}
            >todas ({inyecciones.length})</button>
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${injFilter === 'system' ? 'border-indigo-600 bg-indigo-950/50 text-indigo-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (injFilter = "system")}
            >system prompt ({injCounts.system})</button>
            <button
              class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${injFilter === 'middleware' ? 'border-fuchsia-700 bg-fuchsia-950/50 text-fuchsia-300' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300'}"
              onclick={() => (injFilter = "middleware")}
            >por-turno ({injCounts.middleware})</button>
          </div>

          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <h2 class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Todo lo inyectado al runtime ({filteredInj.length})</h2>
              <button class="text-[11px] text-cyan-400 hover:underline" onclick={() => (expandedInjTab = new Set())}>colapsar todo</button>
            </div>
            <div class="divide-y divide-zinc-800">
              {#if injLoading}
                <div class="px-4 py-10 text-center text-sm text-zinc-500">Cargando inyecciones…</div>
              {:else if !filteredInj.length}
                <div class="px-4 py-10 text-center text-sm text-zinc-500">Sin inyecciones registradas para esta sesión.</div>
              {:else}
                {#each filteredInj as inj, idx (inj.sessionId + inj.at + idx)}
                  <div class="px-4 py-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-md border px-2 py-0.5 text-[11px] font-semibold ${INJ_META[inj.kind]?.badge ?? 'bg-zinc-900 text-zinc-400 border-zinc-700'}">
                        {INJ_META[inj.kind]?.label ?? inj.kind}
                      </span>
                      <span class="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-400">
                        {INJ_GROUP(inj.kind)}
                      </span>
                      <span class="text-[10px] tabular-nums text-zinc-500">{new Date(inj.at).toLocaleTimeString()}</span>
                      <span class="text-[10px] tabular-nums text-zinc-500">{fmtK(inj.chars)} chars</span>
                      {#if inj.step != null}<span class="text-[10px] tabular-nums text-zinc-500">step {inj.step}</span>{/if}
                      {#if inj.tag}<span class="font-mono text-[9px] text-zinc-600">{inj.tag}</span>{/if}
                      {#if inj.kind === "memory" && inj.hits != null}<span class="text-[10px] text-zinc-500">{inj.hits} hits</span>{/if}
                      {#if inj.body}
                        <button class="ml-auto text-[11px] text-zinc-400 hover:underline" onclick={() => toggleInjTab(idx)}>
                          {expandedInjTab.has(idx) ? "▾ ocultar contenido" : "▸ ver contenido"}
                        </button>
                      {/if}
                    </div>
                    {#if inj.origin}
                      <div class="mt-1 font-mono text-[10px] text-zinc-600" title={inj.origin}>↳ {inj.origin}</div>
                    {/if}
                    {#if inj.message}
                      <div class="mt-1 truncate text-[10px] text-zinc-500" title={inj.message}>msg: {inj.message}</div>
                    {/if}
                    {#if inj.sources?.length}
                      <div class="mt-1 flex flex-wrap gap-1">
                        {#each inj.sources as src}
                          <span class="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[9px] text-zinc-400">{src.type}·{String(src.sessionId).slice(-8)}</span>
                        {/each}
                      </div>
                    {/if}
                    {#if expandedInjTab.has(idx) && inj.body}
                      <pre class="mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">{inj.body}</pre>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </section>
      </div>
    {:else}
      <!-- Evaluaciones de calidad (fábrica, para graduación de skills) -->
      <section class="min-w-0">
        {#if evalLoading}
          <div class="flex h-64 items-center justify-center text-sm text-zinc-500">Cargando evaluaciones…</div>
        {:else if !evaluaciones.length}
          <div class="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
            <p class="mb-2 text-3xl">🧪</p>
            <p>No hay evaluaciones todavía.</p>
            <p class="mt-1 text-xs text-zinc-600">
              Ejecuta <code class="text-cyan-400">node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/eval-calidad.ts</code>
              para correr una pregunta N veces en paralelo y medir exactitud + congruencia.
            </p>
          </div>
        {:else}
          <!-- Tendencia por caso (semáforo para graduar) -->
          <div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {#each tendencia as t}
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-semibold text-zinc-100">{t.caso}</span>
                  <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">{t.n} corridas</span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <div class="rounded-lg border border-zinc-800 bg-black/40 p-2.5 text-center">
                    <div class="text-[10px] uppercase tracking-wider text-zinc-500">Exactitud <span title="% de invariantes cuyo valor coincide con la verdad del MCP">(verdad)</span></div>
                    <div class="text-lg font-bold ${t.exactitudMedia >= 80 ? 'text-emerald-400' : t.exactitudMedia >= 60 ? 'text-amber-400' : 'text-red-400'}">{t.exactitudMedia}%</div>
                  </div>
                  <div class="rounded-lg border border-zinc-800 bg-black/40 p-2.5 text-center">
                    <div class="text-[10px] uppercase tracking-wider text-zinc-500">Congruencia</div>
                    <div class="text-lg font-bold ${t.congruenciaPct == null ? 'text-zinc-500' : t.congruenciaPct >= 80 ? 'text-emerald-400' : t.congruenciaPct >= 60 ? 'text-amber-400' : 'text-red-400'}">{t.congruenciaPct == null ? "—" : t.congruenciaPct + "%"}</div>
                  </div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                  <span>{t.pasosProm} pasos / {t.callsProm} calls prom.</span>
                  <span>{fmtK(t.tokInProm)} in / {fmtK(t.tokOutProm)} out</span>
                  <span>{t.errProm} err prom. · {fmt(t.duracionPromMs)}</span>
                  <span class="${t.hallazgosTotal ? 'text-amber-400' : 'text-zinc-600'}">{t.hallazgosTotal} hallazgo(s) de minería</span>
                </div>
              </div>
            {/each}
          </div>

          <!-- Corridas evaluadas -->
          <div class="rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div class="border-b border-zinc-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Corridas evaluadas ({evaluaciones.length})
            </div>
            <ul class="divide-y divide-zinc-800/70">
              {#each evaluaciones as e, i (e.id ?? i)}
                <li class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">{e.caso}</span>
                    <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">{e.skill}</span>
                    <span class="text-xs text-zinc-300">exactitud <b class="${e.exactitud * 100 >= 80 ? 'text-emerald-400' : e.exactitud * 100 >= 60 ? 'text-amber-400' : 'text-red-400'}">{Math.round(e.exactitud * 100)}%</b></span>
                    <span class="text-xs text-zinc-300">congruencia <b class="text-cyan-300">{e.congruencia == null ? "—" : Math.round(e.congruencia * 100) + "%"}</b></span>
                    <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">{e.steps} pasos</span>
                    <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">{e.toolCalls} calls</span>
                    <span class="text-[10px] text-zinc-500">{fmtK(e.inputTok)} in / {fmtK(e.outputTok)} out</span>
                    <span class="text-[10px] text-zinc-500">cache {e.cacheHit}%</span>
                    <span class="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] ${e.errors ? 'text-red-400' : 'text-emerald-400'}">{e.errors} err</span>
                    <span class="text-[10px] text-zinc-500">{fmt(e.turnMs)}</span>
                    <span class="ml-auto text-[10px] text-zinc-600">{new Date(e.at).toLocaleString()}</span>
                  </div>
                  <p class="mt-1.5 text-[13px] text-zinc-200">{e.pregunta}</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5">
                    {#each e.invariantes as inv}
                      <span
                        class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${inv.acierto ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300' : inv.cobertura ? 'border-red-800 bg-red-950/60 text-red-300' : 'border-amber-800 bg-amber-950/60 text-amber-300'}"
                        title="esperado: {inv.esperado ?? '—'} · reportado: {inv.hallado ?? '—'}"
                      >
                        {inv.acierto ? "✓" : "✗"} {inv.etiqueta}: {inv.hallado ?? "(no reportado)"} / {inv.esperado}
                      </span>
                    {/each}
                  </div>
                  {#if e.hallazgos.length}
                    <div class="mt-2 space-y-1">
                      {#each e.hallazgos as h}
                        <div class="rounded-lg border border-amber-900/50 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-100/90">
                          <b class="uppercase text-[9px] text-amber-400">{h.tipo}</b> — {h.detalle}
                        </div>
                      {/each}
                    </div>
                  {/if}
                  <div class="mt-2">
                    <button class="text-[11px] text-cyan-400 hover:underline" onclick={() => toggleEval(i)}>
                      {expandedEval.has(i) ? "▾ ocultar respuesta" : "▸ ver respuesta"}
                    </button>
                    {#if expandedEval.has(i)}
                      <pre class="mt-1.5 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/60 p-3 text-[12px] text-zinc-300">{e.respuesta}</pre>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </section>
    {/if}
  </main>
</div>
