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
 *  falla la red, devuelve la copia previa (stale) en vez de romper la sesión.
 *  Si `tools/list` responde vacío o con error de sesión (la sesión del Map quedó
 *  caducada en el servidor MCP tras horas de proceso), se descarta la sesión y
 *  se reintenta UNA vez con sesión nueva — mismo patrón que `mcpCallTool`.
 *  Nunca se cachea una lista vacía. */
export async function mcpListTools(url: string): Promise<McpTool[]> {
  const cached = toolsCache.get(url);
  if (cached && Date.now() - cached.at < TOOLS_TTL_MS) return cached.tools;

  const listOnce = async (): Promise<McpTool[] | null> => {
    const sid = await ensureSession(url);
    const { msg } = await rpc(url, "tools/list", {}, 2, sid);
    if (msg?.error && /session|not.?initialized/i.test(JSON.stringify(msg.error))) return null;
    const raw = Array.isArray(msg?.result?.tools) ? (msg!.result!.tools as Record<string, unknown>[]) : null;
    if (!raw || raw.length === 0) return null;
    return raw.map((t) => ({
      name: String(t.name),
      description: typeof t.description === "string" ? t.description : null,
      inputSchema:
        t.inputSchema && typeof t.inputSchema === "object"
          ? (t.inputSchema as Record<string, unknown>)
          : { type: "object" },
    }));
  };

  try {
    let tools = await listOnce();
    if (!tools || tools.length === 0) {
      // Sesión caducada en el servidor MCP: re-inicializar con sesión nueva.
      sessions.delete(url);
      tools = await listOnce();
    }
    if (!tools || tools.length === 0) {
      // MCP alcanzable pero sin tools (o respuesta inválida): no cachear vacío.
      if (cached) return cached.tools;
      return [];
    }
    toolsCache.set(url, { tools, at: Date.now() });
    return tools;
  } catch (err) {
    if (cached) return cached.tools;
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hardening defensivo de parámetros (2026-08-06):
// El DAB NO limita filas si `first`/`primero` llega como STRING (visto en vivo:
// el modelo pasó "30" en vez de 30 y el tool devolvió ~524k chars en el turno
// frijol negro). Aquí se coacciona a número y se topa ANTES de ejecutar, en la
// fuente de verdad de todas las llamadas MCP (tools dinámicos, debug, evals).
// `select` también se acota a un número razonable de campos.
// ═══════════════════════════════════════════════════════════════════════════
const READ_LIMIT_TOOLS = /read_records|aggregate_records|buscar_registro/;
const MAX_LIMIT = 500;
const MAX_SELECT_FIELDS = 24;

/** Normaliza los args de tools de lectura antes de ejecutarlos. Nunca lanza. */
export function normalizeMcpArgs(name: string, args: Record<string, unknown>): Record<string, unknown> {
  try {
    if (!READ_LIMIT_TOOLS.test(name) || !args || typeof args !== "object") return args ?? {};
    const out: Record<string, unknown> = { ...args };
    for (const key of ["first", "primero"]) {
      if (!(key in out) || out[key] === undefined || out[key] === null) continue;
      const n = typeof out[key] === "number" ? (out[key] as number) : Number(out[key]);
      if (Number.isFinite(n)) {
        out[key] = Math.max(1, Math.min(Math.floor(n), MAX_LIMIT));
      } else {
        // Valor no numérico: nunca dejar sin límite (sería el bug original).
        out[key] = name.includes("buscar_registro") ? 50 : 100;
      }
    }
    if (typeof out.select === "string" && out.select.trim()) {
      const fields = out.select
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_SELECT_FIELDS);
      out.select = fields.join(",");
    }
    return out;
  } catch {
    return args ?? {};
  }
}

/** Ejecuta un tool del MCP. Reintenta una vez re-inicializando si la sesión caducó. */
export async function mcpCallTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const safeArgs = normalizeMcpArgs(name, args ?? {});
  const call = async () => {
    const sid = await ensureSession(url);
    return rpc(url, "tools/call", { name, arguments: safeArgs ?? {} }, Math.floor(Math.random() * 1e6) + 3, sid);
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
