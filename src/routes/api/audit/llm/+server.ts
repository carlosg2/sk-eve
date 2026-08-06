import { json } from "@sveltejs/kit";
import { listLlmInputs } from "../../../../../agent/lib/session-store.js";

// Inputs reales al LLM (radiografía durable). Cada entrada es lo que el modelo
// recibió en un step: instructions (system resuelto) + messages (historial).
// Sobreviven al purge de .eve (viven en SQLite).
//
// GET /api/audit/llm?sessionId=...&limit=50
//   → [{ sessionId, turn, step, at, instructions, messages }]

export async function GET({ url }) {
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 100)));
  try {
    const inputs = await listLlmInputs({ sessionId, limit });
    return json({ inputs, count: inputs.length });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 500 });
  }
}
