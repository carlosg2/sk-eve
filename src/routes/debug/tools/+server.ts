import { json } from "@sveltejs/kit";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RequestHandler } from "./$types";

// Dev endpoint: inventario COMPLETO de tools disponibles para el modelo.
// Devuelve 3 capas:
//   mcp       — tools del servidor DAB (filtradas por allow-list)
//   authored  — tools en agent/tools/*.ts (defineTool)
//   framework — framework tools de Eve activas sin sandbox

const MCP_URL = "https://api2.maserp.mx/icf/mcp";

async function initMcpSession(): Promise<string | null> {
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "devtools", version: "1" } },
      }),
    });
    const sessionId = res.headers.get("mcp-session-id");
    if (!sessionId) return null;
    await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream", "Mcp-Session-Id": sessionId },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    return sessionId;
  } catch {
    return null;
  }
}

async function parseSseText(res: Response): Promise<unknown> {
  const text = await res.text();
  for (const line of text.split("\n")) {
    const s = line.replace(/^data:\s*/, "").trim();
    if (!s) continue;
    try { return JSON.parse(s); } catch { /* skip */ }
  }
  return null;
}

// Tools de Eve framework activas sin sandbox en este agente.
// Sandbox tools (bash/glob/grep/read_file/write_file) no están disponibles
// porque agent.ts no configura sandbox.
const FRAMEWORK_TOOLS = [
  { name: "connection_search", description: "Discover and register tools from MCP connections. (Patched: eager preload — runs silently on session start, no round-trip needed.)" },
  { name: "load_skill",        description: "Dynamically load a skill by name. Skills inject focused instructions for a domain (e.g. CXP, tesorería)." },
  { name: "ask_question",      description: "Ask the user a question and wait for a response. Triggers a HITL input.requested event." },
  { name: "todo",              description: "Manage a durable task list for the current session. Survives compaction." },
  { name: "web_fetch",         description: "Fetch the content of a web URL. Returns text/HTML." },
  { name: "web_search",        description: "Search the web and return results." },
];

export const GET: RequestHandler = async () => {
  // 1. MCP tools (DAB)
  let mcpTools: Array<{ name: string; description: string; inputSchema: unknown }> = [];
  let mcpTotal = 0;
  const sessionId = await initMcpSession();
  if (sessionId) {
    try {
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream", "Mcp-Session-Id": sessionId },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      const body = (await parseSseText(res)) as any;
      const all: Array<{ name: string; description: string; inputSchema: unknown }> = body?.result?.tools ?? [];
      mcpTotal = all.length;
      const ALLOW = new Set(["describe_entities","read_records","aggregate_records","create_record","update_record","delete_record","execute_entity","buscar_registro","afectar","cambiar_situacion"]);
      mcpTools = all.filter((t) => ALLOW.has(t.name));
    } catch { /* DAB unavailable */ }
  }

  // 2. Authored tools (agent/tools/*.ts) — parseo de source para evitar import() dinámico de TS
  const agentToolsDir = resolve(process.cwd(), "agent/tools");
  const authoredTools: Array<{ name: string; file: string; description: string }> = [];
  try {
    const files = await readdir(agentToolsDir);
    for (const f of files) {
      if (!f.endsWith(".ts") && !f.endsWith(".js")) continue;
      const src = await readFile(join(agentToolsDir, f), "utf8");
      // Extraer nombre del tool: busca name: z.string().describe("...") en inputSchema
      // o más confiable: busca el patrón defineTool({ ... }) y extrae description
      const descMatch = src.match(/description:\s*["'`]([^"'`]{4,200})["'`]/);
      const nameMatch = src.match(/export default defineTool/) 
        ? f.replace(/\.(ts|js)$/, "").replace(/-/g, "_")
        : null;
      if (nameMatch || descMatch) {
        authoredTools.push({
          name: nameMatch ?? f.replace(/\.(ts|js)$/, ""),
          file: f,
          description: descMatch?.[1] ?? "",
        });
      }
    }
  } catch { /* dir not readable */ }

  // 3. Framework tools
  return json({
    mcp: { tools: mcpTools, total: mcpTotal, connection: "intelisis-dab" },
    authored: { tools: authoredTools },
    framework: { tools: FRAMEWORK_TOOLS },
  });
};

