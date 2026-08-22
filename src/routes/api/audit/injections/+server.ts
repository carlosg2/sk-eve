import { json } from "@sveltejs/kit";
import {
  deriveSystemPromptLayers,
  listPromptInjections,
  type PromptInjectionRecord,
  type SystemPromptLayer,
} from "../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Radiografía COMPLETA de inyecciones de contexto, por sesión:
//   1. `layers` — capas del SYSTEM PROMPT (derivadas de llm_inputs.instructions,
//      que captura el prompt compilado PRE-middleware): base, framework, agente
//      activo, mapa de ruteo y empresa activa. Cada una con su ORIGEN.
//   2. `injections` — inyecciones POR-TURNO registradas por el middleware
//      (context-budget.ts): plan de contexto, memoria episódica, anti-duplicados
//      y compactación de tool-results.
// `items` fusiona ambas cronológicamente (las capas arrancan en el primer input).
// GET /api/audit/injections?session=<sessionId>&kind=<opcional>&limit=<n>
export const GET: RequestHandler = async ({ url }) => {
  const session = url.searchParams.get("session") ?? url.searchParams.get("sessionId") ?? undefined;
  const kindRaw = url.searchParams.get("kind");
  const kind = kindRaw?.trim() || undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));

  const injections: PromptInjectionRecord[] = session
    ? await listPromptInjections({ sessionId: session, kind, limit })
    : [];
  const layers: SystemPromptLayer[] = session ? deriveSystemPromptLayers(session) : [];

  const items: Array<PromptInjectionRecord & { label?: string }> = [
    ...layers,
    ...injections,
  ].sort((a, b) => a.at.localeCompare(b.at));

  return json({
    sessionId: session ?? null,
    count: items.length,
    layers,
    injections,
    items,
  });
};
