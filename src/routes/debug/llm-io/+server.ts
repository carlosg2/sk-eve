import { json } from "@sveltejs/kit";
import { readModelInputs } from "../../../../agent/lib/llm-io.js";
import type { RequestHandler } from "./$types";

// Endpoint dev-only: sirve el input real al LLM capturado por la instrumentación
// (agent/instrumentation.ts). El navegador lo consulta por sessionId y lo
// renderiza en el panel DevTools. Solo lectura.
export const GET: RequestHandler = async ({ url }) => {
  const sessionId = url.searchParams.get("session") ?? undefined;
  const records = await readModelInputs(sessionId);
  return json({ records });
};
