import { json, error } from "@sveltejs/kit";
import { createCatalogSkill, listCatalogSkills } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Catálogo completo de skills (`agent/skill-library/<slug>/SKILL.md`), sin filtrar
// por tenant. Las universales tienen `tenant: null`; el resto declara su tenant.
export const GET: RequestHandler = async () => {
	return json({ skills: await listCatalogSkills() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		name?: string;
		description?: string;
		tenant?: string | null;
		bodyText?: string;
	};
	if (!body.name) throw error(400, "Se requiere 'name'.");
	try {
		const skill = await createCatalogSkill({
			name: body.name,
			description: body.description ?? "",
			tenant: body.tenant ?? null,
			body: body.bodyText,
		});
		return json({ ok: true, skill });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el skill");
	}
};
