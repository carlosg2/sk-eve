import { json, error } from "@sveltejs/kit";
import { createGlobalSkill, listGlobalSkills } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Lista y crea los skills GLOBALES compilados (`agent/skills/<slug>/SKILL.md`),
// cargados on-demand vía `load_skill` para cualquier agente/tenant.
export const GET: RequestHandler = async () => {
	return json({ skills: await listGlobalSkills() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		name?: string;
		description?: string;
		bodyText?: string;
	};
	if (!body.name) throw error(400, "Se requiere 'name'.");
	try {
		const skill = await createGlobalSkill({
			name: body.name,
			description: body.description ?? "",
			body: body.bodyText,
		});
		return json({ ok: true, skill });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el skill");
	}
};
