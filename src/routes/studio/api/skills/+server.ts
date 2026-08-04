import { json, error } from "@sveltejs/kit";
import { createAgentSkill, listAgentSkills } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Lista y crea los skills load-on-demand de un agente
// (`companies/<tenant>/agents/<agent>/skills/<slug>/SKILL.md`).
export const GET: RequestHandler = async ({ url }) => {
	const tenant = url.searchParams.get("tenant");
	const agent = url.searchParams.get("agent");
	if (!tenant || !agent) throw error(400, "Se requieren 'tenant' y 'agent'.");
	return json({ skills: await listAgentSkills(tenant, agent) });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		tenant?: string;
		agent?: string;
		name?: string;
		description?: string;
		bodyText?: string;
	};
	if (!body.tenant || !body.agent || !body.name) {
		throw error(400, "Se requieren 'tenant', 'agent' y 'name'.");
	}
	try {
		const skill = await createAgentSkill({
			tenant: body.tenant,
			agent: body.agent,
			name: body.name,
			description: body.description ?? "",
			body: body.bodyText,
		});
		return json({ ok: true, skill });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el skill");
	}
};
