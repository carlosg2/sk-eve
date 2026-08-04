import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { setRuntime } from "$lib/server/studio/harness";

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		activeTenant?: string | null;
		activeAgent?: string | null;
	};
	try {
		const runtime = await setRuntime({
			activeTenant: body.activeTenant ?? undefined,
			activeAgent: body.activeAgent ?? undefined,
		});
		return json({ ok: true, runtime });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al activar");
	}
};
