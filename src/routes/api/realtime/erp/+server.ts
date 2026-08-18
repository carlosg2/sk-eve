import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { askEveAgent } from "../../../../lib/server/realtime/eve-agent.js";

// Única tool que la sesión de voz puede llamar: `ask_agent` delega la pregunta
// al agente Eve de /chat (Company Twin + tools del ERP) en background. La voz
// NO ejecuta el ERP por su cuenta — es un orquestador delgado.
const ALLOWED = new Set(["ask_agent"]);

/**
 * Server-backed tool endpoint de la sesión realtime de voz.
 * `ask_agent` → llama al agente real de /chat vía HTTP interno (POST
 * /eve/v1/session), espera a que el turno cierre en background y devuelve la
 * respuesta completa del agente, que la voz re-interpreta hablada.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json().catch(() => ({}))) as {
			toolName?: unknown;
			args?: unknown;
		};
		const toolName = String(body.toolName ?? "");
		if (!ALLOWED.has(toolName)) {
			return json({ result: { ok: false, error: `tool "${toolName}" no permitido` } });
		}
		const args =
			body.args && typeof body.args === "object" && !Array.isArray(body.args)
				? (body.args as Record<string, unknown>)
				: {};
		const question = typeof args.question === "string" ? args.question : "";
		// El cliente inyecta un UUID por conexión de voz para mantener la
		// continuidad de la conversación en la MISMA sesión Eve.
		const voiceSessionId =
			typeof args.__voiceSessionId === "string" ? args.__voiceSessionId : "";
		if (!question.trim()) {
			return json({ result: { ok: false, error: "pregunta vacía" } });
		}
		// Self-call con el origen del request (agnóstico de puerto 5173/5174).
		const origin = new URL(request.url).origin;
		const result = await askEveAgent(origin, voiceSessionId, question.trim());
		return json({ result });
	} catch (err) {
		return json({
			result: { ok: false, error: err instanceof Error ? err.message : String(err) },
		});
	}
};
