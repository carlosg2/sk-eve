import { json } from "@sveltejs/kit";
import { FRAMEWORK_TOOLS, listRuntimeTools } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Tools que el agente puede llamar además del MCP:
//   runtime   — agent/tools/*.ts (defineTool), compilados por Eve
//   framework — tools que Eve inyecta por defecto (sin sandbox)
export const GET: RequestHandler = async () => {
	return json({ tools: await listRuntimeTools(), framework: FRAMEWORK_TOOLS });
};
