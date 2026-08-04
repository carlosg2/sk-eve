import { json } from "@sveltejs/kit";
import { listMcpTools, tenantMcpUrl } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Descubre los tools que expone el MCP del tenant (DAB). Resuelve la URL desde
// el profile.md server-side; el cliente solo pasa el slug del tenant.
export const GET: RequestHandler = async ({ url }) => {
	const tenant = url.searchParams.get("tenant");
	if (!tenant) return json({ ok: false, detail: "Falta el parámetro tenant." }, { status: 400 });

	const mcpUrl = await tenantMcpUrl(tenant);
	if (!mcpUrl) return json({ ok: false, detail: "El tenant no tiene mcp_url en su profile." }, { status: 404 });

	const result = await listMcpTools(mcpUrl);
	return json({ url: mcpUrl, ...result });
};
