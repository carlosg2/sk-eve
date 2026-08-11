import { json } from "@sveltejs/kit";
import { listPromptInjections } from "../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Radiografía de inyecciones de contexto (lóbulo frontal + memoria episódica).
// llm_inputs captura el prompt PRE-middleware (por eso planTag sale null); estas
// inyecciones las registra el propio middleware (agent/lib/context-budget.ts)
// al inyectar, para que sean analizables/evaluables en el tiempo: qué se
// inyectó, cuándo, cuánto pesó y de qué sesiones previas salió la memoria.
export const GET: RequestHandler = async ({ url }) => {
  const session = url.searchParams.get("session") ?? undefined;
  const kindRaw = url.searchParams.get("kind");
  const kind = kindRaw === "plan" || kindRaw === "memory" ? kindRaw : undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));
  const injections = await listPromptInjections({ sessionId: session, kind, limit });
  return json({ injections, count: injections.length });
};
