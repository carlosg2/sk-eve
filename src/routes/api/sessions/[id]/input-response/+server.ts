import { json } from "@sveltejs/kit";
import { appendInputResponses } from "../../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Persiste respuestas HITL de una sesión (gates respondidas) en
// `input_responses` (session-store.ts). El reducer del cliente marca la gate
// como respondida con `client.input.responded` (evento LOCAL, nunca llega al
// stream de Eve); sin persistirlas aparte, al reabrir la sesión las preguntas
// respondidas vuelven a "approval-requested". GET /api/sessions/[id] las
// re-inyecta como eventos sintéticos al rehidratar.
export const POST: RequestHandler = async ({ params, request }) => {
  const body = (await request.json().catch(() => ({}))) as {
    responses?: unknown;
  };
  if (!Array.isArray(body.responses) || body.responses.length === 0)
    return json({ ok: false, error: "Falta 'responses' (array)" }, { status: 400 });
  await appendInputResponses(
    params.id,
    body.responses as { requestId: string; optionId?: string; text?: string }[],
  );
  return json({ ok: true });
};
