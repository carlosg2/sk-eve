// Track de la sesión actual para la memoria episódica (P1.5).
//
// El middleware de contexto (context-budget.ts) corre dentro de transformParams
// y NO tiene acceso a ctx.session (los hooks sí). Para excluir la sesión en
// curso de la memoria episódica (la sesión actual ya está en el prompt; la
// memoria es de sesiones PREVIAS), los hooks la registran aquí y el middleware
// la lee.
//
// ⚠️ REALMS: los authored modules de Eve (hooks/instructions vs. el middleware
// del modelo vía agent.ts) corren en realms distintos — el globalThis NO cruza
// (verificado en vivo: el hook fija el valor pero el middleware lee null). El
// punto común es el SQLite real (.data/sessions.sqlite3): los hooks escriben
// ahí y el middleware lee ahí. Cadena de resolución:
//   1. globalThis (fast-path si algún día comparten realm)
//   2. runtime_state (escrito por el hook vía setCurrentSessionId)
//   3. último session.started del espejo events (fuente más robusta: no
//      depende de tablas auxiliares que un bundle cacheado pueda no ver)
//
// Diseño: mecanismo INTERNO, invisible al usuario final.

import { setRuntimeState, getRuntimeState, getLastStartedSessionId } from "./session-store.js";

const KEY = "__sigma_current_session";
const STATE_KEY = "current_session_id";

export function setCurrentSessionId(sessionId: string | null | undefined): void {
  try {
    const id = sessionId ?? null;
    (globalThis as Record<string, unknown>)[KEY] = id;
    setRuntimeState(STATE_KEY, id);
  } catch {
    // nunca romper el hook por el tracker
  }
}

export function getCurrentSessionId(): string | null {
  try {
    const v = (globalThis as Record<string, unknown>)[KEY];
    if (typeof v === "string" && v) return v;
    return getRuntimeState(STATE_KEY) ?? getLastStartedSessionId();
  } catch {
    return null;
  }
}
