import { json } from "@sveltejs/kit";
import { resolveActiveAgent } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Previsualiza qué agente y qué instrucciones se inyectarán en el runtime live
// para la sesión de /chat, según runtime.json.
export const GET: RequestHandler = async () => {
	const active = await resolveActiveAgent();
	return json({ active });
};
