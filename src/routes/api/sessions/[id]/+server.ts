import { error, json } from "@sveltejs/kit";
import { Client } from "eve/client";
import { deleteSession, listEvents, setSessionArchived } from "../../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Rehidrata una sesión pasada. Dos caminos:
//   1. Camino feliz: Eve todavía tiene el estado durable (SDK `eve/client`,
//      `session.stream({ follow: false })` — lectura acotada, se detiene
//      sola en el tail en vez de seguir el stream en vivo). Devuelve el
//      `continuationToken` real: la conversación se puede seguir enviando
//      mensajes nuevos sobre la MISMA sesión física de Eve.
//   2. Fallback (`recovered: true`): Eve ya perdió el estado (típicamente
//      tras un `rm -rf .eve`, que borra `.eve/.workflow-data`) — se
//      reconstruye el historial desde nuestro propio espejo en
//      `.data/sessions.sqlite3` (tabla `events`, alimentada por
//      agent/hooks/session-log.ts en cada evento). El `session` devuelto
//      OMITE `sessionId` a propósito: el cliente (`eve/client`) solo intenta
//      "continuar" una sesión física cuando `sessionId` está presente, así
//      que sin él, el próximo `agent.send()` simplemente abre una sesión
//      nueva en Eve en vez de fallar contra una que ya no existe. El
//      historial visible sigue siendo el completo; ChatSession.svelte le
//      inyecta ese historial como `clientContext` efímero del primer
//      mensaje para que el modelo continúe con naturalidad.
export const GET: RequestHandler = async ({ params, url }) => {
  const sessionId = params.id;

  try {
    const client = new Client({ host: url.origin });
    const clientSession = client.session({ sessionId, streamIndex: 0 });
    const events: unknown[] = [];
    for await (const event of clientSession.stream({ startIndex: 0, follow: false })) {
      events.push(event);
    }
    if (events.length > 0) {
      return json({ session: clientSession.state, events, recovered: false });
    }
  } catch {
    // Eve ya no tiene el estado durable de esta sesión — cae al fallback.
  }

  const events = await listEvents(sessionId);
  if (events.length === 0) throw error(404, "Sesión no encontrada");
  return json({
    session: { streamIndex: events.length },
    events,
    recovered: true,
  });
};

// Archiva/desarchiva (`{ archived: boolean }`) — solo cambia el flag del
// índice, no toca el estado durable de Eve ni el espejo de eventos.
export const PATCH: RequestHandler = async ({ params, request }) => {
  const body = (await request.json().catch(() => ({}))) as { archived?: unknown };
  if (typeof body.archived !== "boolean") throw error(400, "Falta 'archived' (boolean)");
  await setSessionArchived(params.id, body.archived);
  return json({ ok: true });
};

// Elimina la sesión del índice y su espejo de eventos. Irreversible: no
// borra el estado durable de Eve (si aún existe), solo nuestro registro
// propio — la sesión simplemente deja de aparecer en el sidebar.
export const DELETE: RequestHandler = async ({ params }) => {
  await deleteSession(params.id);
  return json({ ok: true });
};
