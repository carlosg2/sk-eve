import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { pingMcp } from "$lib/server/studio/harness";

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { url?: string };
	if (!body.url) throw error(400, "Falta 'url'.");
	return json(await pingMcp(body.url));
};
