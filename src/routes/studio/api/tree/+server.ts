import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { readTree } from "$lib/server/studio/harness";

export const GET: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get("path") ?? "";
	try {
		return json({ nodes: await readTree(path) });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al leer el árbol");
	}
};
