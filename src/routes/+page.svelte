<script lang="ts">
  import { useEveAgent } from "eve/svelte";
  import type { HandleMessageStreamEvent } from "eve/svelte";

  const agent = useEveAgent();
  let message = $state("");
  let showLog = $state(false);
  let isBusy = $derived(agent.status === "submitted" || agent.status === "streaming");

  async function handleSubmit() {
    const text = message.trim();
    if (!text || isBusy) return;
    message = "";
    await agent.send({ message: text });
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
      const results = (d.results ?? []).map((r: any) => JSON.stringify(r.output).slice(0, 100)).join(", ");
      return `✅ tool result  ←  ${results}`;
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
</script>

<h1>Eve Agent</h1>

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

<form onsubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
  <input bind:value={message} disabled={isBusy} placeholder="Escribe un mensaje..." />
  <button type="submit" disabled={isBusy}>Enviar</button>
</form>

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
