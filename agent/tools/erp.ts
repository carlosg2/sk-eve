import { defineDynamic, defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { loadActiveAgent, loadRuntimeConfig } from "../lib/runtime-config.js";
import { mcpCallTool, mcpListTools } from "../lib/mcp-client.js";

// Tools del ERP resueltos DINÁMICAMENTE por sesión contra el MCP del tenant
// ACTIVO (reemplaza la conexión estática `intelisis-dab`, cuyo `url` era fijo y
// obligaba a reiniciar al cambiar de tenant). Se advierten con el prefijo
// `intelisis-dab__<tool>` para preservar las referencias en skills, instructions
// y el hook de memoria. Las escrituras conservan el gate HITL (approval).
const WRITE_TOOL_RE = /(create|update|delete)_record|execute_entity|afectar|cambiar_situacion/;

export default defineDynamic({
  events: {
    "session.started": async () => {
      const tenant = loadRuntimeConfig();
      const agent = loadActiveAgent();
      const allow = new Set(agent?.mcpTools ?? []);

      let tools;
      try {
        tools = await mcpListTools(tenant.mcpUrl);
      } catch {
        return null; // MCP inalcanzable: sin tools esta sesión (degradación suave)
      }

      const entries = tools
        .filter((tool) => allow.size === 0 || allow.has(tool.name))
        .map((tool) => {
          // Capturado como closure (strings serializables) para sobrevivir replay.
          const url = tenant.mcpUrl;
          const name = tool.name;
          return [
            `intelisis-dab__${name}`,
            defineTool({
              description: tool.description ?? name,
              inputSchema: tool.inputSchema,
              ...(WRITE_TOOL_RE.test(name) ? { approval: always() } : {}),
              execute: (input: Record<string, unknown>) => mcpCallTool(url, name, input),
            }),
          ] as const;
        });

      return entries.length ? Object.fromEntries(entries) : null;
    },
  },
});
