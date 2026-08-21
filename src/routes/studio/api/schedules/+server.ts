import { json, error } from "@sveltejs/kit";
import { createSchedule, deleteSchedule, listSchedules } from "$lib/server/studio/harness";
import type { RequestHandler } from "./$types";

// Schedules del agente (`agent/schedules/`) — la misma administración que la
// pantalla "Schedules" de eve-studio: listar, crear y eliminar tareas cron.
// GET    → lista los schedules (name/cron/prompt/path).
// POST   → crea `agent/schedules/<name>.ts` con `defineSchedule`.
// DELETE → elimina el archivo del schedule.
export const GET: RequestHandler = async () => {
	return json({ schedules: await listSchedules() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { name?: string; cron?: string; prompt?: string };
	if (!body.name || !body.cron) throw error(400, "Se requieren 'name' y 'cron'.");
	try {
		const schedule = await createSchedule({
			name: body.name,
			cron: body.cron,
			prompt: body.prompt ?? "",
		});
		return json({ ok: true, schedule });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error al crear el schedule");
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { name?: string };
	if (!body.name) throw error(400, "Se requiere 'name'.");
	const ok = await deleteSchedule(body.name);
	if (!ok) throw error(404, `Schedule '${body.name}' no encontrado.`);
	return json({ ok: true });
};
