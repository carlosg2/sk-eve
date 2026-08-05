import { json, error } from "@sveltejs/kit";
import { applyEvolveProposal, draftEvolveProposal, type EvolveOp } from "$lib/server/studio/evolve";
import type { RequestHandler } from "./$types";

// Motor Evolve: `action: "draft"` pide al modelo una propuesta de cambio;
// `action: "apply"` la ejecuta (escribe a disco). El apply recibe la operación
// estructurada devuelta por el draft, así no re-invoca al modelo.
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as {
		action?: "draft" | "apply";
		tenant?: string;
		agent?: string;
		intent?: string;
		op?: EvolveOp;
	};
	if (!body.tenant || !body.agent) throw error(400, "Se requieren 'tenant' y 'agent'.");

	try {
		if (body.action === "apply") {
			if (!body.op) throw error(400, "Falta la operación a aplicar.");
			await applyEvolveProposal({ tenant: body.tenant, agent: body.agent, op: body.op });
			return json({ ok: true });
		}
		if (!body.intent?.trim()) throw error(400, "Describe el cambio que quieres.");
		const proposal = await draftEvolveProposal({
			tenant: body.tenant,
			agent: body.agent,
			intent: body.intent,
		});
		return json({ ok: true, proposal });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : "Error en Evolve");
	}
};
