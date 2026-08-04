import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { createTenant } from "$lib/server/studio/harness";

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		slug?: string;
		companyName?: string;
		erpCompany?: string;
		mcpUrl?: string;
	};
	if (!body.companyName) throw error(400, "Falta 'companyName'.");
	try {
		const tenant = await createTenant({
			slug: body.slug ?? "",
			companyName: body.companyName,
			erpCompany: body.erpCompany ?? "",
			mcpUrl: body.mcpUrl ?? "",
		});
		return json({ ok: true, tenant });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el tenant");
	}
};
