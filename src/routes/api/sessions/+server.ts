import { json } from "@sveltejs/kit";
import { listSessions } from "../../../../agent/lib/session-store.js";
import type { RequestHandler } from "./$types";

// Lista el índice de sesiones (para el sidebar de /chat). Escrito por
// agent/hooks/session-log.ts, leído aquí — solo lectura. `?archived=1`
// devuelve las archivadas en vez de las activas (son dos vistas separadas
// en el sidebar, nunca mezcladas). `?source=eval|chat|tarea` filtra por
// origen (harness e2e-demo, conversaciones humanas o tareas programadas).
export const GET: RequestHandler = async ({ url }) => {
  const archived = url.searchParams.get("archived") === "1";
  const raw = url.searchParams.get("source");
  const source = raw === "eval" ? "eval" : raw === "tarea" ? "tarea" : raw === "chat" ? "chat" : undefined;
  const sessions = await listSessions({ archived, source });
  return json({ sessions });
};
