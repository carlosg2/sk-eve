import { json } from "@sveltejs/kit";
import { listLlmInputs } from "../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Endpoint dev-only: sirve el input real al LLM capturado por la instrumentación.
// El navegador lo consulta por sessionId y lo renderiza en el panel DevTools.
//
// ⚠️ 2026-08-06 (consolidación de traslapes): antes leía `.eve/llm-io.jsonl`
// (efímero, se perdía con el purge). Ahora lee la MISMA fuente durable que
// `/api/audit/llm` (tabla `llm_inputs` en `.data/sessions.sqlite3`) — un solo
// backend de datos para DevTools y auditoría. Se preserva la forma de respuesta
// `{ records }` y el ORDEN cronológico ASC (más viejos primero) que el DevTools
// usa para correlacionar por orden. Solo lectura.
export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get("session") ?? undefined;
  // listLlmInputs devuelve DESC (más recientes primero); el DevTools espera
  // orden cronológico ASC para correlacionar por orden.
  const inputs = await listLlmInputs({ sessionId, limit: 500 });
  const records = inputs.slice().reverse();
  return json({ records });
};
