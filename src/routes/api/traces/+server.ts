import { json } from "@sveltejs/kit";
import { appendTrace, computeTrend, readTraces, type TurnTrace } from "$lib/server/trace-store.js";

// API del trace store: POST guarda el resumen de un turno terminado; GET
// devuelve los últimos traces + tendencia para el DevTools / inspector.

export async function POST({ request }) {
	try {
		const rec = (await request.json()) as TurnTrace;
		if (!rec || typeof rec.turnMs !== "number" || typeof rec.steps !== "number") {
			return json({ ok: false }, { status: 400 });
		}
		await appendTrace(rec);
		return json({ ok: true });
	} catch {
		return json({ ok: false }, { status: 400 });
	}
}

export async function GET({ url }) {
	const limit = Number(url.searchParams.get("limit") ?? 50);
	const traces = await readTraces(Math.max(1, Math.min(500, limit)));
	return json({ traces, trend: computeTrend(traces) });
}
