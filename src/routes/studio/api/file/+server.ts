import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { readTwinFile, writeTwinFile } from "$lib/server/studio/harness";

export const GET: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get("path");
	if (!path) throw error(400, "Falta el parámetro 'path'.");
	try {
		return json(await readTwinFile(path));
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error de lectura");
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { path?: string; content?: string };
	if (!body.path || typeof body.content !== "string") {
		throw error(400, "Se requieren 'path' y 'content'.");
	}
	try {
		await writeTwinFile(body.path, body.content);
		return json({ ok: true });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error de escritura");
	}
};
