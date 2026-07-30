<script lang="ts">
  import { useEveAgent } from "eve/svelte";

  type HandleMessageStreamEvent = {
    type: string;
    data?: Record<string, unknown>;
  };

  const agent = useEveAgent();
  let message = $state("");
  let showLog = $state(false);
  let isBusy = $derived(agent.status === "submitted" || agent.status === "streaming");

  // Inspector: refleja TODO el estado del agente como texto plano en el DOM.
  // Objetivo: que un agente externo (o yo) pueda leer la transcripción completa
  // vía el snapshot de accesibilidad del navegador SIN screenshots, y así iterar
  // rápido sobre el stack. Se renderiza en un <pre> always-on más abajo.
  let showInspector = $state(true);

  // --- HITL (Human-In-The-Loop): aprobaciones / preguntas del agente ---
  type InputOption = {
    id: string;
    label: string;
    description?: string;
    style?: "danger" | "default" | "primary";
  };
  type InputRequest = {
    requestId: string;
    prompt: string;
    display?: "confirmation" | "select" | "text";
    options?: InputOption[];
    allowFreeform?: boolean;
    action?: { callId: string; toolName: string; input: Record<string, unknown> };
  };

  let respondedRequestIds = $state(new Set<string>());
  let freeformText = $state<Record<string, string>>({});

  // Solicitudes de input pendientes: se derivan de los eventos input.requested
  // que aún no hemos respondido.
  let pendingInputs = $derived.by(() => {
    const out: InputRequest[] = [];
    for (const ev of agent.events as HandleMessageStreamEvent[]) {
      if (ev.type !== "input.requested") continue;
      const reqs = ((ev.data?.requests as InputRequest[]) ?? []);
      for (const r of reqs) {
        if (!respondedRequestIds.has(r.requestId)) out.push(r);
      }
    }
    return out;
  });

  async function respondInput(req: InputRequest, optionId?: string) {
    const text = freeformText[req.requestId]?.trim() || undefined;
    respondedRequestIds = new Set([...respondedRequestIds, req.requestId]);
    await agent.send({ inputResponses: [{ requestId: req.requestId, optionId, text }] });
  }

  async function handleSubmit() {
    const text = message.trim();
    if (!text || isBusy) return;
    message = "";
    await agent.send({ message: text });
  }

  function formatToolPayload(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
    try {
      const text = JSON.stringify(value, null, 2);
      return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
    } catch {
      return String(value);
    }
  }

  function eventLabel(e: HandleMessageStreamEvent): string {
    const t = e.type;
    const d = (e as any).data ?? {};
    if (t === "reasoning.appended")   return `🧠 reasoning  ${d.delta ?? ""}`;
    if (t === "reasoning.completed")  return `🧠 reasoning ✓  "${(d.text ?? "").slice(0, 120)}"`;
    if (t === "message.appended")     return `💬 message  ${d.delta ?? ""}`;
    if (t === "message.completed")    return `💬 message ✓  [${d.finishReason}]  "${(d.content ?? "").slice(0, 120)}"`;
    if (t === "actions.requested") {
      const calls = (d.actions ?? []).map((a: any) => {
        const name = a.name ?? a.toolName ?? a.tool ?? "tool";
        if (name === "connection_search") {
          const conn = a.input?.connection ? ` [${a.input.connection}]` : "";
          return `🔌 Inicializando conexión${conn}`;
        }
        return `${name}(${JSON.stringify(a.input ?? a.arguments ?? {}).slice(0, 80)})`;
      }).join(", ");
      return `🔧 tool call  →  ${calls}`;
    }
    if (t === "action.result") {
      // Eve envía: data.result.output (puede ser string o array)
      const result = d.result;
      if (!result) return `✅ tool result  ←  [sin datos]`;
      
      const toolName = result.toolName || result.name || "tool";
      const output = result.output;
      
      if (result.error) {
        return `✅ tool result  ←  ${toolName} error: ${formatToolPayload(result.error)}`;
      }
      
      return `✅ tool result  ←  ${toolName}: ${formatToolPayload(output)}`;
    }
    if (t === "step.completed")  return `📊 step done  [${d.finishReason}]  tokens: ${JSON.stringify(d.usage ?? {})}`;
    if (t === "step.failed")     return `❌ step failed  ${d.message}`;
    if (t === "turn.started")    return `▶️ turn started`;
    if (t === "turn.completed")  return `⏹️ turn completed`;
    if (t === "turn.failed")     return `❌ turn failed  ${d.message}`;
    if (t === "session.started") return `🟢 session started`;
    if (t === "session.waiting") return `⏳ waiting for input`;
    if (t === "session.completed") return `🏁 session completed`;
    if (t === "input.requested") return `👤 HITL input requested`;
    if (t === "subagent.called") return `🤖 subagent called  ${d.childSessionId}`;
    return `${t}`;
  }

  function eventColor(type: string): string {
    if (type.startsWith("reasoning"))  return "#7c3aed";
    if (type.startsWith("message"))    return "#0369a1";
    if (type === "actions.requested")  return "#b45309";
    if (type === "action.result")      return "#15803d";
    if (type.startsWith("step"))       return "#64748b";
    if (type.startsWith("turn"))       return "#334155";
    if (type.startsWith("session"))    return "#1e293b";
    return "#475569";
  }

  // --- Inspector as plain text ---------------------------------------------
  // Serializa mensajes + eventos a una transcripción legible por máquina que
  // vive en el DOM (un <pre>). Permite leer el estado completo del turno vía
  // el snapshot de accesibilidad del navegador, sin screenshots.

  function fullToolPayload(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // Des-anida el envoltorio MCP: los tools devuelven
  // { content: [{ type: "text", text: "<JSON string escapado>" }], isError }.
  // Extrae el `text` interno, lo re-parsea si es JSON, y devuelve datos limpios
  // (sin \n, \" ni \uXXXX). Si no es un envoltorio MCP, cae al payload normal.
  function unwrapMcpOutput(output: unknown): string {
    const content = (output as any)?.content;
    if (Array.isArray(content)) {
      const texts = content
        .filter((c) => c?.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string);
      if (texts.length) {
        return texts
          .map((t) => {
            try {
              return JSON.stringify(JSON.parse(t), null, 2);
            } catch {
              return t; // no era JSON: texto plano tal cual
            }
          })
          .join("\n");
      }
    }
    return fullToolPayload(output);
  }

  // Indenta cada línea de un bloque multilínea con 2 espacios, para que los
  // sub-bloques (input / result) queden visualmente anidados bajo su evento.
  function indentBlock(text: string, pad = "  "): string {
    return text
      .split("\n")
      .map((l) => pad + l)
      .join("\n");
  }

  // Suma de tokens de todos los step.completed del turno.
  let tokenTotals = $derived.by(() => {
    let input = 0, output = 0, total = 0;
    for (const ev of agent.events as HandleMessageStreamEvent[]) {
      if (ev.type !== "step.completed") continue;
      const u = (ev.data?.usage ?? {}) as Record<string, number>;
      input += u.inputTokens ?? u.promptTokens ?? 0;
      output += u.outputTokens ?? u.completionTokens ?? 0;
      total += u.totalTokens ?? 0;
    }
    if (!total) total = input + output;
    return { input, output, total };
  });

  // Transcripción chronological completa: cada evento significativo en una
  // línea (o bloque) de texto plano. Optimizado para lectura por agente.
  let traceText = $derived.by(() => {
    const lines: string[] = [];
    lines.push(`# AGENT INSPECTOR`);
    lines.push(`status: ${agent.status}`);
    lines.push(`events: ${agent.events.length}  ·  messages: ${agent.data.messages.length}`);
    lines.push(`tokens: in=${tokenTotals.input} out=${tokenTotals.output} total=${tokenTotals.total}`);
    if (pendingInputs.length > 0) {
      lines.push(`pending_hitl: ${pendingInputs.length} (requiere respuesta)`);
    }
    lines.push(``);
    lines.push(`## TRACE`);

    for (const ev of agent.events as HandleMessageStreamEvent[]) {
      const d = (ev as any).data ?? {};
      switch (ev.type) {
        case "session.started":
          lines.push(`[session.started]`);
          break;
        case "turn.started":
          lines.push(`[turn.started]`);
          break;
        case "reasoning.completed":
          if (d.text) lines.push(`[reasoning] ${d.text}`);
          break;
        case "message.completed":
          if (d.content) lines.push(`[assistant] ${d.content}`);
          break;
        case "actions.requested":
          for (const a of (d.actions ?? [])) {
            const name = a.name ?? a.toolName ?? a.tool ?? "tool";
            lines.push(`[tool.call] ${name}`);
            const input = a.input ?? a.arguments;
            if (input && Object.keys(input).length) {
              lines.push(indentBlock(`input:\n${fullToolPayload(input)}`));
            }
          }
          break;
        case "action.result": {
          const r = d.result;
          if (!r) { lines.push(`[tool.result] (sin datos)`); break; }
          const name = r.toolName || r.name || "tool";
          if (d.status === "rejected") {
            lines.push(`[tool.result] ${name} → RECHAZADO (HITL deny)`);
          } else if (d.error || r.isError) {
            lines.push(`[tool.result] ${name} → ERROR`);
            lines.push(indentBlock(unwrapMcpOutput(d.error ?? r.output)));
          } else {
            lines.push(`[tool.result] ${name} →`);
            lines.push(indentBlock(unwrapMcpOutput(r.output)));
          }
          break;
        }
        case "input.requested":
          for (const req of ((d.requests ?? []) as InputRequest[])) {
            const opts = (req.options ?? []).map((o) => o.id).join(" | ");
            lines.push(`[hitl.request] ${req.action?.toolName ?? ""} :: ${req.prompt}${opts ? `  opciones: [${opts}]` : ""}`);
          }
          break;
        case "step.completed":
          lines.push(`[step.completed] finish=${d.finishReason}`);
          break;
        case "step.failed":
          lines.push(`[step.failed] ${d.message}`);
          break;
        case "turn.completed":
          lines.push(`[turn.completed]`);
          break;
        case "turn.failed":
          lines.push(`[turn.failed] ${d.message}`);
          break;
        case "session.failed":
          lines.push(`[session.failed] ${d.message ?? ""}`);
          break;
        default:
          break;
      }
    }
    return lines.join("\n");
  });

  async function copyTrace() {
    try {
      await navigator.clipboard.writeText(traceText);
    } catch {
      /* clipboard no disponible; el texto igual está en el <pre> */
    }
  }

  // --- DevTools view (para humano) -----------------------------------------
  // Panel estilo Chrome DevTools: una fila por evento con timings (offset +
  // delta), badge de tipo, resumen de una línea y detalle expandible con el
  // payload completo (in/out) des-anidado. El inspector de texto de arriba
  // sigue siendo la fuente always-on para lectura por agente.

  let showDevtools = $state(true);
  let expandedRows = $state(new Set<number>());
  let devFilter = $state<"all" | "llm" | "tool" | "step" | "flow">("all");

  function toggleRow(idx: number) {
    const next = new Set(expandedRows);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    expandedRows = next;
  }

  // --- LLM I/O (input real al modelo) --------------------------------------
  // La instrumentación (agent/instrumentation.ts) captura el input final al LLM
  // (system prompt + mensajes + tools) en cada step y lo escribe a un archivo
  // puente. Aquí lo consultamos vía /debug/llm-io y lo correlacionamos por ORDEN:
  // el k-ésimo step.started del stream = k-ésimo record de la sesión.
  type LlmIoRecord = {
    sessionId: string;
    turn: number;
    step: number;
    at: string;
    instructions: unknown;
    messages: unknown;
  };
  let llmInputs = $state<LlmIoRecord[]>([]);
  let lastFetchedStepCount = $state(-1);

  // Tool definitions: cargadas una vez desde /debug/tools (3 capas).
  // Se muestran en la sección "── TOOLS ──" del panel LLM input.
  type ToolDef = { name: string; description: string; inputSchema?: unknown; file?: string };
  type ToolInventory = {
    mcp: { tools: ToolDef[]; total: number; connection: string };
    authored: { tools: ToolDef[] };
    framework: { tools: ToolDef[] };
  };
  let toolInventory = $state<ToolInventory | null>(null);

  async function loadToolDefs() {
    try {
      const res = await fetch("/debug/tools");
      if (!res.ok) return;
      toolInventory = (await res.json()) as ToolInventory;
    } catch { /* endpoint no disponible */ }
  }

  // Carga las tool definitions al montar el componente.
  $effect(() => { void loadToolDefs(); });

  async function refreshLlmIo() {
    const sid = agent.session.sessionId;
    if (!sid) return;
    try {
      const res = await fetch(`/debug/llm-io?session=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { records: LlmIoRecord[] };
      llmInputs = body.records ?? [];
    } catch {
      /* endpoint no disponible; el panel sigue funcionando sin LLM input */
    }
  }

  // Re-consulta cuando aparece un nuevo step.started (nuevo input al modelo) o
  // cuando el turno vuelve a 'ready' (para capturar el último step del turno).
  $effect(() => {
    const stepCount = (agent.events as HandleMessageStreamEvent[])
      .filter((e) => e.type === "step.started").length;
    const key = `${stepCount}:${agent.status}`;
    if (key === `${lastFetchedStepCount}:${agent.status}` && agent.status !== "ready") return;
    if (stepCount !== lastFetchedStepCount || agent.status === "ready") {
      lastFetchedStepCount = stepCount;
      void refreshLlmIo();
    }
  });

  // Formatea un record de LLM input a texto legible: system prompt + mensajes.
  function formatLlmInput(rec: LlmIoRecord | undefined): string {
    if (!rec) return "(esperando captura del input al modelo…)";
    const parts: string[] = [];
    parts.push(`turn ${rec.turn} · step ${rec.step} · ${rec.at}`);
    parts.push("");
    parts.push("── SYSTEM PROMPT ──");
    if (rec.instructions == null) {
      parts.push("(ninguno)");
    } else if (typeof rec.instructions === "string") {
      parts.push(rec.instructions);
    } else {
      parts.push(fullToolPayload(rec.instructions));
    }
    parts.push("");
    parts.push("── MESSAGES ──");
    parts.push(fullToolPayload(rec.messages));
    parts.push("");

    // ── TOOLS (3 capas) ──
    const inv = toolInventory;
    if (!inv) {
      parts.push("── TOOLS ── (cargando…)");
    } else {
      const mcpTools   = inv.mcp?.tools ?? [];
      const authored   = inv.authored?.tools ?? [];
      const framework  = inv.framework?.tools ?? [];
      const total = mcpTools.length + authored.length + framework.length;
      parts.push(`── TOOLS (${total} total) ──`);

      function renderToolList(label: string, tools: ToolDef[]) {
        if (!tools.length) return;
        parts.push(`\n┌─ ${label} (${tools.length})`);
        for (const t of tools) {
          const schema = t.inputSchema as any;
          const props = Object.keys(schema?.properties ?? {});
          const req: string[] = schema?.required ?? [];
          parts.push(`│ ▸ ${t.name}`);
          if (t.description) parts.push(`│   ${t.description.slice(0, 180)}`);
          if (props.length) {
            const paramStr = props.map((p) => req.includes(p) ? `*${p}` : p).join(", ");
            parts.push(`│   params: [${paramStr}]  (* = required)`);
          }
          if ((t as any).file) parts.push(`│   file: agent/tools/${(t as any).file}`);
        }
        parts.push("└─");
      }

      renderToolList(`MCP · ${inv.mcp?.connection ?? "dab"} (allow-listed)`, mcpTools);
      renderToolList("Authored · agent/tools/", authored);
      renderToolList("Framework · Eve built-in", framework);
    }
    return parts.join("\n");
  }

  // Hora de llegada por evento (cliente). Fallback cuando el evento no trae
  // meta.at del servidor. Se sincroniza con el crecimiento del stream.
  let eventTimings = $state<number[]>([]);
  $effect(() => {
    const n = agent.events.length;
    if (n < eventTimings.length) {
      // Se reinició la sesión → re-sellar todo con la hora actual.
      eventTimings = agent.events.map(() => Date.now());
    } else if (n > eventTimings.length) {
      const now = Date.now();
      const next = eventTimings.slice();
      while (next.length < n) next.push(now);
      eventTimings = next;
    }
  });

  // Timestamp (ms epoch) de un evento: prefiere meta.at (servidor), si no la
  // hora de llegada del cliente.
  function eventTs(ev: HandleMessageStreamEvent, idx: number): number {
    const at = (ev as any).meta?.at;
    if (at) {
      const p = Date.parse(at);
      if (!Number.isNaN(p)) return p;
    }
    return eventTimings[idx] ?? 0;
  }

  function categoryOf(type: string): "llm" | "tool" | "step" | "flow" {
    if (type === "step.started") return "llm";
    if (type.startsWith("reasoning") || type.startsWith("message")) return "llm";
    if (type === "actions.requested" || type === "action.result" || type === "input.requested") return "tool";
    if (type.startsWith("step")) return "step";
    return "flow";
  }

  type DevRow = {
    idx: number;
    type: string;
    category: "llm" | "tool" | "step" | "flow";
    badge: string;
    tOffset: number;   // ms desde el primer evento
    delta: number;     // ms desde el evento anterior
    summary: string;
    detail: string;
    isError: boolean;
  };

  let devRows = $derived.by<DevRow[]>(() => {
    const evs = agent.events as HandleMessageStreamEvent[];
    if (!evs.length) return [];
    const base = eventTs(evs[0], 0);
    const rows: DevRow[] = [];
    let stepStartedSeen = 0; // para correlacionar con llmInputs por orden

    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const d = (ev as any).data ?? {};
      const ts = eventTs(ev, i);
      const prevTs = i > 0 ? eventTs(evs[i - 1], i - 1) : ts;
      let summary = "";
      let detail = "";
      let badge = ev.type;
      let isError = false;

      switch (ev.type) {
        case "session.started": badge = "session"; summary = "sesión iniciada"; break;
        case "turn.started": badge = "turn"; summary = "turno iniciado"; break;
        case "step.started": {
          badge = "→ LLM input";
          const rec = llmInputs[stepStartedSeen];
          stepStartedSeen++;
          const msgCount = Array.isArray(rec?.messages) ? rec!.messages.length : 0;
          const hasSys = rec?.instructions != null;
          summary = rec
            ? `enviado al modelo · ${msgCount} mensajes${hasSys ? " + system prompt" : ""}`
            : "step iniciado (input no capturado aún)";
          detail = formatLlmInput(rec);
          break;
        }
        case "reasoning.completed":
          badge = "reasoning";
          summary = (d.text ?? "").slice(0, 100);
          detail = d.text ?? "";
          break;
        case "message.completed":
          badge = "assistant";
          summary = (d.content ?? "").slice(0, 100);
          detail = d.content ?? "";
          break;
        case "actions.requested": {
          badge = "→ tool call";
          const names = (d.actions ?? []).map((a: any) => a.name ?? a.toolName ?? a.tool ?? "tool");
          summary = names.join(", ");
          const blocks = (d.actions ?? []).map((a: any) => {
            const name = a.name ?? a.toolName ?? a.tool ?? "tool";
            const input = a.input ?? a.arguments;
            return `${name}\ninput:\n${fullToolPayload(input ?? {})}`;
          });
          detail = blocks.join("\n\n");
          break;
        }
        case "action.result": {
          badge = "← tool result";
          const r = d.result;
          const name = r?.toolName || r?.name || "tool";
          if (!r) { summary = "(sin datos)"; break; }
          if (d.status === "rejected") {
            summary = `${name} · RECHAZADO (HITL)`;
            detail = "El usuario rechazó la ejecución en el gate de aprobación.";
            isError = true;
          } else if (d.error || r.isError) {
            summary = `${name} · ERROR`;
            detail = unwrapMcpOutput(d.error ?? r.output);
            isError = true;
          } else {
            const clean = unwrapMcpOutput(r.output);
            summary = `${name} · ${clean.replace(/\s+/g, " ").slice(0, 90)}`;
            detail = clean;
          }
          break;
        }
        case "input.requested": {
          badge = "HITL";
          const reqs = (d.requests ?? []) as InputRequest[];
          summary = reqs.map((r) => r.prompt).join(" | ").slice(0, 100);
          detail = reqs.map((r) => {
            const opts = (r.options ?? []).map((o) => o.id).join(" | ");
            return `${r.action?.toolName ?? ""}\n${r.prompt}${opts ? `\nopciones: [${opts}]` : ""}`;
          }).join("\n\n");
          break;
        }
        case "step.completed": {
          badge = "step";
          const u = (d.usage ?? {}) as Record<string, number>;
          const inTok = u.inputTokens ?? u.promptTokens ?? 0;
          const outTok = u.outputTokens ?? u.completionTokens ?? 0;
          summary = `finish=${d.finishReason} · tokens in=${inTok} out=${outTok}`;
          detail = fullToolPayload(d.usage ?? {});
          break;
        }
        case "step.failed":
          badge = "step"; isError = true;
          summary = d.message ?? "step failed";
          detail = d.message ?? "";
          break;
        case "turn.completed": badge = "turn"; summary = "turno completado"; break;
        case "turn.failed":
          badge = "turn"; isError = true;
          summary = d.message ?? "turn failed"; detail = d.message ?? "";
          break;
        case "session.failed":
          badge = "session"; isError = true;
          summary = d.message ?? "session failed"; detail = d.message ?? "";
          break;
        default:
          summary = ev.type;
      }

      rows.push({
        idx: i,
        type: ev.type,
        category: categoryOf(ev.type),
        badge,
        tOffset: ts - base,
        delta: ts - prevTs,
        summary,
        detail,
        isError,
      });
    }
    return rows;
  });

  let filteredRows = $derived.by(() =>
    devFilter === "all" ? devRows : devRows.filter((r) => r.category === devFilter)
  );

  function fmtMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

</script>


<h1>Sigma Agent</h1>

<div class="messages">
  {#each agent.data.messages as msg}
    <div class="message {msg.role}">
      <strong>{msg.role}:</strong>
      {#each msg.parts as part}
        {#if part.type === "text"}{part.text}{/if}
      {/each}
    </div>
  {/each}
  {#if isBusy}
    <div class="message thinking">Pensando...</div>
  {/if}
</div>

{#if pendingInputs.length > 0}
  <div class="hitl">
    {#each pendingInputs as req (req.requestId)}
      <div class="hitl-card">
        <div class="hitl-head">
          👤 Aprobación requerida{req.action?.toolName ? ` · ${req.action.toolName}` : ""}
        </div>
        <div class="hitl-prompt">{req.prompt}</div>
        {#if req.options && req.options.length > 0}
          <div class="hitl-actions">
            {#each req.options as opt}
              <button
                class="hitl-btn {opt.style ?? 'default'}"
                title={opt.description ?? ""}
                onclick={() => respondInput(req, opt.id)}
              >{opt.label}</button>
            {/each}
          </div>
        {/if}
        {#if req.display === "text" || req.allowFreeform}
          <div class="hitl-free">
            <input
              bind:value={freeformText[req.requestId]}
              placeholder="Escribe tu respuesta..."
              onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); void respondInput(req); } }}
            />
            <button onclick={() => respondInput(req)}>Enviar</button>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<form onsubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
  <input bind:value={message} disabled={isBusy} placeholder="Escribe un mensaje..." />
  <button type="submit" disabled={isBusy}>Enviar</button>
</form>

<section class="inspector-section" aria-label="Agent inspector">
  <div class="inspector-bar">
    <button class="inspector-toggle" onclick={() => showInspector = !showInspector}>
      {showInspector ? "▼" : "▶"} Inspector (texto plano · sin screenshots)
    </button>
    <span class="inspector-meta">status: {agent.status} · {agent.events.length} eventos · {tokenTotals.total} tokens</span>
    <button class="inspector-copy" onclick={copyTrace}>Copiar</button>
  </div>
  {#if showInspector}
    <pre id="agent-trace" class="inspector-pre" data-status={agent.status} data-events={agent.events.length}>{traceText}</pre>
  {/if}
</section>

<section class="devtools" aria-label="Agent DevTools">
  <div class="dt-bar">
    <button class="dt-toggle" onclick={() => showDevtools = !showDevtools}>
      {showDevtools ? "▼" : "▶"} DevTools
    </button>
    <div class="dt-filters">
      {#each (["all", "llm", "tool", "step", "flow"] as const) as f}
        <button
          class="dt-chip {devFilter === f ? 'active' : ''}"
          onclick={() => devFilter = f}
        >{f}</button>
      {/each}
    </div>
    <span class="dt-summary">{filteredRows.length} / {devRows.length} eventos · {tokenTotals.total} tok</span>
    <div class="dt-expand-actions">
      <button class="dt-mini" onclick={() => expandedRows = new Set(devRows.map((r) => r.idx))}>expandir todo</button>
      <button class="dt-mini" onclick={() => expandedRows = new Set()}>colapsar</button>
    </div>
  </div>

  {#if showDevtools}
    <div class="dt-table" role="table">
      <div class="dt-head" role="row">
        <span class="dt-col-time">t</span>
        <span class="dt-col-delta">Δ</span>
        <span class="dt-col-badge">tipo</span>
        <span class="dt-col-summary">detalle</span>
      </div>
      {#if filteredRows.length === 0}
        <div class="dt-empty">Sin eventos. Envía un mensaje para ver el flujo.</div>
      {/if}
      {#each filteredRows as row (row.idx)}
        <div class="dt-row cat-{row.category} {row.isError ? 'is-error' : ''}" role="row">
          <button class="dt-rowbtn" onclick={() => toggleRow(row.idx)} aria-expanded={expandedRows.has(row.idx)}>
            <span class="dt-col-time">{fmtMs(row.tOffset)}</span>
            <span class="dt-col-delta">{row.delta > 0 ? `+${fmtMs(row.delta)}` : "—"}</span>
            <span class="dt-col-badge"><span class="dt-badge cat-{row.category}">{row.badge}</span></span>
            <span class="dt-col-summary">
              {#if row.detail}<span class="dt-caret">{expandedRows.has(row.idx) ? "▾" : "▸"}</span>{/if}
              {row.summary}
            </span>
          </button>
          {#if expandedRows.has(row.idx) && row.detail}
            <pre class="dt-detail">{row.detail}</pre>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<div class="log-section">
  <button class="log-toggle" onclick={() => showLog = !showLog}>
    {showLog ? "▼" : "▶"} Event log ({agent.events.length} eventos)
  </button>
  {#if showLog}
    <div class="log">
      {#if agent.events.length === 0}
        <span class="empty">Sin eventos aún. Envía un mensaje.</span>
      {/if}
      {#each agent.events as ev}
        <div class="log-line" style="color: {eventColor(ev.type)}">
          <span class="log-type">{ev.type}</span>
          <span class="log-detail">{eventLabel(ev)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .messages {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    min-height: 200px;
    border: 1px solid #ccc;
    padding: 1rem;
    border-radius: 4px;
  }
  .message { padding: 0.25rem 0; }
  .message.user { color: #0055cc; }
  .message.assistant { color: #333; }
  .message.thinking { color: #999; font-style: italic; }
  form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  input { flex: 1; padding: 0.5rem; }
  button { padding: 0.5rem 1rem; }

  /* HITL — panel de aprobación */
  .hitl {
    display: flex; flex-direction: column; gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .hitl-card {
    border: 1px solid #f59e0b; background: #fffbeb;
    border-radius: 6px; padding: 0.75rem 1rem;
  }
  .hitl-head {
    font-weight: 600; color: #b45309; font-size: 0.85rem;
    margin-bottom: 0.35rem;
  }
  .hitl-prompt { color: #334155; white-space: pre-wrap; margin-bottom: 0.6rem; }
  .hitl-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .hitl-btn {
    padding: 0.4rem 0.9rem; border-radius: 4px;
    border: 1px solid #cbd5e1; background: #fff; cursor: pointer;
    font-size: 0.85rem;
  }
  .hitl-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .hitl-btn.danger { background: #dc2626; color: #fff; border-color: #dc2626; }
  .hitl-free { display: flex; gap: 0.5rem; margin-top: 0.6rem; }

  /* Inspector — estado del agente como texto plano (sin screenshots) */
  .inspector-section { margin-top: 1rem; }
  .inspector-bar {
    display: flex; align-items: center; gap: 0.75rem;
    background: #0d9488; color: #f0fdfa;
    padding: 0.4rem 0.8rem; border-radius: 4px 4px 0 0;
    font-family: monospace; font-size: 0.8rem;
  }
  .inspector-toggle, .inspector-copy {
    background: transparent; color: #f0fdfa;
    border: 1px solid #5eead4; padding: 0.25rem 0.6rem;
    border-radius: 4px; cursor: pointer;
    font-family: monospace; font-size: 0.78rem;
  }
  .inspector-copy { margin-left: auto; }
  .inspector-meta { opacity: 0.85; }
  .inspector-pre {
    background: #042f2e; color: #99f6e4;
    font-family: monospace; font-size: 0.75rem; line-height: 1.5;
    padding: 0.75rem; border-radius: 0 0 4px 4px; margin: 0;
    max-height: 480px; overflow-y: auto;
    white-space: pre-wrap; word-break: break-word;
  }

  /* DevTools — panel visual estilo Chrome DevTools (para humano) */
  .devtools { margin-top: 1rem; }
  .dt-bar {
    display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    background: #1e293b; color: #e2e8f0;
    padding: 0.4rem 0.8rem; border-radius: 4px 4px 0 0;
    font-family: monospace; font-size: 0.78rem;
  }
  .dt-toggle {
    background: transparent; color: #e2e8f0;
    border: 1px solid #475569; padding: 0.25rem 0.6rem;
    border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 0.78rem;
  }
  .dt-filters { display: flex; gap: 0.25rem; }
  .dt-chip {
    background: #334155; color: #cbd5e1; border: 1px solid transparent;
    padding: 0.2rem 0.55rem; border-radius: 999px; cursor: pointer;
    font-family: monospace; font-size: 0.72rem; text-transform: uppercase;
  }
  .dt-chip.active { background: #2563eb; color: #fff; }
  .dt-summary { opacity: 0.8; }
  .dt-expand-actions { margin-left: auto; display: flex; gap: 0.25rem; }
  .dt-mini {
    background: transparent; color: #94a3b8; border: 1px solid #475569;
    padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer;
    font-family: monospace; font-size: 0.72rem;
  }
  .dt-table {
    background: #0f172a; border-radius: 0 0 4px 4px;
    max-height: 520px; overflow-y: auto;
    font-family: monospace; font-size: 0.76rem;
  }
  .dt-head, .dt-rowbtn {
    display: grid;
    grid-template-columns: 64px 72px 130px 1fr;
    gap: 0.5rem; align-items: baseline;
    width: 100%; text-align: left;
  }
  .dt-head {
    color: #64748b; padding: 0.35rem 0.8rem;
    border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: #0f172a;
    text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.05em;
  }
  .dt-row { border-bottom: 1px solid #172033; }
  .dt-row:hover { background: #131f36; }
  .dt-rowbtn {
    background: transparent; border: none; cursor: pointer;
    padding: 0.35rem 0.8rem; color: #cbd5e1; font-family: monospace; font-size: 0.76rem;
  }
  .dt-col-time { color: #64748b; }
  .dt-col-delta { color: #f59e0b; }
  .dt-badge {
    display: inline-block; padding: 0.05rem 0.45rem; border-radius: 4px;
    font-size: 0.7rem; white-space: nowrap;
  }
  .dt-badge.cat-llm  { background: #1e3a5f; color: #7dd3fc; }
  .dt-badge.cat-tool { background: #422006; color: #fbbf24; }
  .dt-badge.cat-step { background: #1e293b; color: #94a3b8; }
  .dt-badge.cat-flow { background: #172033; color: #64748b; }
  .dt-col-summary { color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; word-break: break-word; }
  .dt-caret { color: #64748b; margin-right: 0.25rem; }
  .dt-row.is-error .dt-col-summary { color: #fca5a5; }
  .dt-row.is-error { background: #2a1416; }
  .dt-detail {
    background: #020617; color: #99f6e4;
    margin: 0; padding: 0.6rem 0.8rem 0.8rem 1.6rem;
    font-size: 0.74rem; line-height: 1.5;
    white-space: pre-wrap; word-break: break-word;
    border-top: 1px dashed #1e293b;
  }
  .dt-empty { color: #475569; font-style: italic; padding: 0.75rem 0.8rem; }

  .log-section { margin-top: 1rem; }
  .log-toggle {
    background: #1e293b; color: #e2e8f0;
    border: none; padding: 0.4rem 0.8rem;
    border-radius: 4px; cursor: pointer;
    font-family: monospace; font-size: 0.8rem;
  }
  .log {
    background: #0f172a; color: #94a3b8;
    font-family: monospace; font-size: 0.75rem;
    padding: 0.75rem; border-radius: 0 0 4px 4px;
    max-height: 400px; overflow-y: auto;
    display: flex; flex-direction: column; gap: 2px;
  }
  .log-line { display: flex; gap: 0.5rem; line-height: 1.5; }
  .log-type { opacity: 0.5; min-width: 180px; flex-shrink: 0; }
  .log-detail { white-space: pre-wrap; word-break: break-all; }
  .empty { color: #475569; font-style: italic; }
</style>
