import { json } from "@sveltejs/kit";
import { createGateway } from "@ai-sdk/gateway";
// `$env/static/private` se carga desde los .env en tiempo de build/dev; el
// runtime SSR NO expone `.env.local` en `process.env` (la lib del gateway lee
// `process.env.AI_GATEWAY_API_KEY` y por eso hay que pasarla explícitamente).
import { AI_GATEWAY_API_KEY } from "$env/static/private";
import type { Experimental_RealtimeToolDefinition } from "ai";
import type { RequestHandler } from "./$types";
import {
	loadActiveAgent,
	loadRuntimeConfig,
} from "../../../../../agent/lib/runtime-config.js";

// Modelo realtime de voz (speech→speech) vía AI Gateway de Vercel.
// Referencia: https://vercel.com/ai-gateway/models/grok-voice-think-fast-2.0
//
// IMPORTANTE: este modelo NO es un LLM de texto — es una sesión realtime
// full-duplex. NO se puede poner en el campo `model` de `agent.md` (el loop
// de texto de Eve usa `doGenerate`/`doStream`); se integra como canal de voz
// aparte, minting un token corto y abriendo un WebSocket desde el navegador.
const REALTIME_MODEL = "xai/grok-voice-think-fast-2.0";

// Provider con la key inyectada explícitamente (ver comentario del import).
const gw = createGateway({ apiKey: AI_GATEWAY_API_KEY });

// ── Arquitectura: la voz es un ORQUESTADOR DELGADO ───────────────────────────
// La sesión de voz NO ejecuta el ERP ni consulta el Company Twin por su cuenta.
// Expone UNA sola tool (`ask_agent`) que delega la pregunta al agente real de
// /chat (skills + Company Twin + tools MCP + memory) que corre en background.
// La voz recibe la respuesta COMPLETA del agente y la re-interpreta hablada.
const ASK_AGENT_TOOL: Experimental_RealtimeToolDefinition = {
	type: "function",
	name: "ask_agent",
	description:
		"Consulta al agente del ERP (el mismo de /chat). El agente consulta el conocimiento de la empresa (Company Twin) y ejecuta las tools del ERP en background, y devuelve la respuesta completa. Pásale SIEMPRE la pregunta del usuario tal cual (verbatim), en español. No intentes consultar el ERP tú: el agente lo hace por ti.",
	parameters: {
		type: "object",
		properties: {
			question: {
				type: "string",
				description: "La pregunta del usuario, verbatim, en español.",
			},
		},
		required: ["question"],
	},
};

function buildInstructions(): string {
	const rt = loadRuntimeConfig();
	const agent = loadActiveAgent();
	const identity = `Eres la interfaz de voz del Asistente ERP de ${rt.companyName}${
		rt.erpCompany ? ` (código ${rt.erpCompany})` : ""
	}${agent?.name ? `, "${agent.name}"` : ""}.`;
	return [
		identity,
		"",
		"Tu trabajo es ORQUESTAR, no consultar datos tú:",
		"- Cuando el usuario pregunte algo, llama SIEMPRE a la tool `ask_agent` con su pregunta exacta (verbatim).",
		"- El agente (el mismo de /chat) consulta el Company Twin y ejecuta las tools del ERP en background y te devuelve la respuesta completa.",
		"",
		"Cuando recibas la respuesta de `ask_agent`:",
		"- Reinterprétala en voz alta, en español, de forma natural y concisa (2-4 frases salvo que el usuario pida detalle).",
		"- NO inventes datos, números ni módulos: usa exactamente lo que diga la respuesta.",
		"- Si la respuesta trae números clave (cantidades, montos, estatus), lidéralos.",
		"- Si la respuesta dice «Dato no disponible», dilo igual, sin probar variantes.",
		"",
		"No consultes el ERP directamente: no tienes tools de ERP; el agente lo hace por ti en background.",
	]
		.filter((line) => line !== "")
		.join("\n");
}

/**
 * Setup de la sesión realtime de voz:
 *   1. Minta un client-secret (`vcst_`) de un solo uso (la key larga vive SOLO
 *      en el servidor — este endpoint es la única vía del navegador).
 *   2. Adjunta la tool `ask_agent` (delegación al agente de /chat en background)
 *      y las instrucciones de orquestación.
 * La UI aplica todo en `session-update` tras abrir el WebSocket.
 */
export const POST: RequestHandler = async () => {
	try {
		const { token, url, expiresAt } = await gw.experimental_realtime.getToken({
			model: REALTIME_MODEL,
		});
		return json({
			token,
			url,
			expiresAt,
			sessionConfig: {
				instructions: buildInstructions(),
				outputModalities: ["audio", "text"],
				inputAudioFormat: { type: "audio/pcm", rate: 24000 },
				outputAudioFormat: { type: "audio/pcm", rate: 24000 },
				turnDetection: { type: "server-vad" },
				inputAudioTranscription: { model: "xai/grok-stt", language: "es" },
				tools: [ASK_AGENT_TOOL],
			},
		});
	} catch (err) {
		console.error("[realtime/token] fallo:", err);
		return json(
			{ error: err instanceof Error ? err.message : "No se pudo obtener el token de voz" },
			{ status: 500 },
		);
	}
};
