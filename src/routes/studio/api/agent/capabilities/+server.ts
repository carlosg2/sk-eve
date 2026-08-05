import { json, error } from "@sveltejs/kit";
import {
	listCatalogSkills,
	listKernelConcepts,
	readAgentManifest,
	writeAgentManifest,
} from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Panel de capacidades de un agente: catálogo de skills visible para su tenant,
// conceptos de ERP Kernel, y el manifest actual (skills/kernel/mcp_tools de su
// agent.md). El listado de tools MCP se carga aparte vía /studio/api/mcp-tools.
export const GET: RequestHandler = async ({ url }) => {
	const tenant = url.searchParams.get("tenant");
	const agent = url.searchParams.get("agent");
	if (!tenant || !agent) throw error(400, "Se requieren 'tenant' y 'agent'.");
	const [manifest, catalog, kernel] = await Promise.all([
		readAgentManifest(tenant, agent),
		listCatalogSkills(tenant),
		listKernelConcepts(),
	]);
	return json({ manifest, catalog, kernel });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		tenant?: string;
		agent?: string;
		skills?: string[];
		kernel?: string[] | "*";
		mcpTools?: string[];
	};
	if (!body.tenant || !body.agent) throw error(400, "Se requieren 'tenant' y 'agent'.");
	try {
		const manifest = await writeAgentManifest(body.tenant, body.agent, {
			skills: body.skills,
			kernel: body.kernel,
			mcpTools: body.mcpTools,
		});
		return json({ ok: true, manifest });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al guardar el manifest");
	}
};
