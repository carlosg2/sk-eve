import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { createAgent, deleteAgent } from "$lib/server/studio/harness";

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		tenant?: string;
		slug?: string;
		name?: string;
		model?: string;
		description?: string;
	};
	if (!body.tenant || !body.name) throw error(400, "Se requieren 'tenant' y 'name'.");
	try {
		const agent = await createAgent({
			tenant: body.tenant,
			slug: body.slug ?? "",
			name: body.name,
			model: body.model ?? "",
			description: body.description ?? "",
		});
		return json({ ok: true, agent });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el agente");
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const tenant = url.searchParams.get("tenant");
	const slug = url.searchParams.get("slug");
	if (!tenant || !slug) throw error(400, "Se requieren 'tenant' y 'slug'.");
	try {
		await deleteAgent(tenant, slug);
		return json({ ok: true });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al borrar el agente");
	}
};
