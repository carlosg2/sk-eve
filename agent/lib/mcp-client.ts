// Cliente MCP (Streamable HTTP) mínimo para el runtime del agente. Permite que
// los tools del ERP se resuelvan dinámicamente contra el MCP del tenant ACTIVO
// (endpoint distinto por tenant), en vez de una conexión estática cacheada al
// arrancar — así cambiar de agente/tenant en /studio surte efecto sin reiniciar.
//
// No usa el cliente interno de Eve (`#runtime`, privado). Reimplementa el
// handshake JSON-RPC (initialize → notifications/initialized → tools/list →
// tools/call) con manejo de `mcp-session-id` y respuestas SSE, replicando la
// lógica ya probada del studio harness.

export type McpTool = {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown>;
};

type JsonRpcMsg = {
  id?: number;
  result?: { tools?: unknown[]; content?: unknown[]; isError?: boolean } & Record<string, unknown>;
  error?: { code?: number; message?: string } & Record<string, unknown>;
};

type Session = { id: string | null; initialized: boolean };

const sessions = new Map<string, Session>();
const toolsCache = new Map<string, { tools: McpTool[]; at: number }>();
const TOOLS_TTL_MS = 5 * 60_000;

/**
 * Extrae el mensaje JSON-RPC de una respuesta MCP (JSON plano o SSE
 * `event: message\ndata: {...}`). Busca el frame cuyo id coincide, o el primero
 * con result/error.
 */
function extractJsonRpc(text: string, contentType: string, id: number): JsonRpcMsg | null {
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(text) as JsonRpcMsg;
    } catch {
      return null;
    }
  }
  for (const frame of text.split(/\n\n/)) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) continue;
    try {
      const obj = JSON.parse(data) as JsonRpcMsg;
      if (obj.id === id || "result" in obj || "error" in obj) return obj;
    } catch {
      // frame parcial; seguir
    }
  }
  return null;
}

async function rpc(
  url: string,
  method: string,
  params: unknown,
  id: number,
  sessionId: string | null,
): Promise<{ msg: JsonRpcMsg | null; sessionId: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal: controller.signal,
    });
    const nextSession = res.headers.get("mcp-session-id") ?? sessionId;
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    return { msg: extractJsonRpc(text, ct, id), sessionId: nextSession };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureSession(url: string): Promise<string | null> {
  const existing = sessions.get(url);
  if (existing?.initialized) return existing.id;
  const init = await rpc(
    url,
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "sigma-eve", version: "0.1" },
    },
    1,
    null,
  );
  const sid = init.sessionId;
  // notificación sin respuesta (no id)
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sid ? { "mcp-session-id": sid } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  }).catch(() => {});
  sessions.set(url, { id: sid, initialized: true });
  return sid;
}

/** Descubre los tools del MCP del tenant activo. Cachea por url (TTL 5 min) y, si
 *  falla la red, devuelve la copia previa (stale) en vez de romper la sesión. */
export async function mcpListTools(url: string): Promise<McpTool[]> {
  const cached = toolsCache.get(url);
  if (cached && Date.now() - cached.at < TOOLS_TTL_MS) return cached.tools;
  try {
    const sid = await ensureSession(url);
    const { msg } = await rpc(url, "tools/list", {}, 2, sid);
    const raw = Array.isArray(msg?.result?.tools) ? (msg!.result!.tools as Record<string, unknown>[]) : [];
    const tools: McpTool[] = raw.map((t) => ({
      name: String(t.name),
      description: typeof t.description === "string" ? t.description : null,
      inputSchema:
        t.inputSchema && typeof t.inputSchema === "object"
          ? (t.inputSchema as Record<string, unknown>)
          : { type: "object" },
    }));
    toolsCache.set(url, { tools, at: Date.now() });
    return tools;
  } catch (err) {
    if (cached) return cached.tools;
    throw err;
  }
}

/** Ejecuta un tool del MCP. Reintenta una vez re-inicializando si la sesión caducó. */
export async function mcpCallTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const call = async () => {
    const sid = await ensureSession(url);
    return rpc(url, "tools/call", { name, arguments: args ?? {} }, Math.floor(Math.random() * 1e6) + 3, sid);
  };
  let { msg } = await call();
  if (!msg || (msg.error && /session|not.?initialized/i.test(JSON.stringify(msg.error)))) {
    sessions.delete(url);
    ({ msg } = await call());
  }
  if (msg?.error) return { error: msg.error.message ?? msg.error };
  const result = msg?.result ?? {};
  const content = Array.isArray(result.content) ? (result.content as Record<string, unknown>[]) : null;
  if (content) {
    const text = content
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string)
      .join("\n");
    if (result.isError) return { error: text || "Error del tool MCP" };
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return content;
  }
  return result;
}
