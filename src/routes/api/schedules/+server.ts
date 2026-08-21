import { error, json } from '@sveltejs/kit';
import { Client } from 'eve/client';
import type { RequestHandler } from './$types';

// Tareas programadas (cron) del agente Eve.
//
// Eve ejecuta schedules definidos en `agent/schedules/` (defineSchedule con
// `cron` + `markdown`/`run`, o archivos `.md` con frontmatter `cron`). Se leen
// del agent-info de Eve (`Client.info()` → `schedules`), que expone por cada
// schedule: `name`, `cron` (expresión 5 campos), `hasRun` (el handler tiene
// `run` y ya se ejecutó), `markdown` (prompt fire-and-forget) y `logicalPath`.
//
// GET  → lista los schedules + si el runtime es desarrollo (`devRoutes`).
// POST → dispara un schedule por nombre vía la ruta dev de dispatch
//        (`POST /eve/v1/dev/schedules/:scheduleId`). `eve dev` NUNCA dispara
//        los crons en cadencia; esta ruta es el único way de ejecutarlos en
//        desarrollo y no se monta en producción (de ahí el guard `devRoutes`).

type ScheduleEntry = {
	name: string;
	cron: string;
	hasRun: boolean;
	markdown?: string;
	logicalPath: string;
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const client = new Client({ host: url.origin });
		const info = await client.info();
		const schedules: ScheduleEntry[] = info.schedules.map((s) => ({
			name: s.name,
			cron: s.cron,
			hasRun: s.hasRun,
			markdown: s.markdown,
			logicalPath: s.logicalPath
		}));
		return json({ schedules, devRoutes: info.capabilities.devRoutes });
	} catch (e) {
		// El dev server de Eve puede estar caído (proxy /eve 502): se reporta
		// sin tirar el endpoint — el sidebar muestra el error.
		const msg = e instanceof Error ? e.message : String(e);
		return json({ schedules: [], devRoutes: false, error: msg }, { status: 502 });
	}
};

export const POST: RequestHandler = async ({ url, request }) => {
	const body = await request.json().catch(() => null);
	const id = body?.id;
	if (typeof id !== 'string' || id.length === 0) {
		throw error(400, 'Falta el id del schedule a ejecutar');
	}

	// La ruta dev de dispatch solo existe en desarrollo.
	let devRoutes = false;
	try {
		const client = new Client({ host: url.origin });
		const info = await client.info();
		devRoutes = info.capabilities.devRoutes;
	} catch {
		// sin devRoutes no se llega al dispatch
	}
	if (!devRoutes) {
		throw error(403, 'Ejecutar tareas a mano solo está disponible en desarrollo');
	}

	const res = await fetch(`${url.origin}/eve/v1/dev/schedules/${encodeURIComponent(id)}`, {
		method: 'POST'
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		// Desconocido → Eve responde 404 con `availableScheduleIds`.
		throw error(res.status, text || `No se pudo ejecutar la tarea "${id}"`);
	}
	return json(await res.json());
};
