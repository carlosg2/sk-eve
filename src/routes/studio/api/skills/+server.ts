import { json, error } from "@sveltejs/kit";
import { createCatalogSkill, listCatalogSkills } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Catálogo de skills visible para un tenant (`agent/skill-library/`, filtrado por
// frontmatter `tenant`). El parámetro `agent` se conserva por compatibilidad del
// cliente pero no afecta el listado (la membresía vive en el manifest del agente).
export const GET: RequestHandler = async ({ url }) => {
	const tenant = url.searchParams.get("tenant");
	if (!tenant) throw error(400, "Se requiere 'tenant'.");
	return json({ skills: await listCatalogSkills(tenant) });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		tenant?: string;
		name?: string;
		description?: string;
		bodyText?: string;
	};
	if (!body.tenant || !body.name) throw error(400, "Se requieren 'tenant' y 'name'.");
	try {
		const skill = await createCatalogSkill({
			name: body.name,
			description: body.description ?? "",
			tenant: body.tenant,
			body: body.bodyText,
		});
		return json({ ok: true, skill });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el skill");
	}
};
