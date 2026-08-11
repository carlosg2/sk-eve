// Track de la sesión actual para la memoria episódica (P1.5).
//
// El middleware de contexto (context-budget.ts) corre dentro de transformParams
// y NO tiene acceso a ctx.session (los hooks sí). Para excluir la sesión en
// curso de la memoria episódica (la sesión actual ya está en el prompt; la
// memoria es de sesiones PREVIAS), los hooks la registran aquí y el middleware
// la lee. Mismo patrón que el DEBUG_PLAN de context-budget (globalThis con cast,
// robusto a los distintos tsconfigs de Eve).
//
// Diseño: mecanismo INTERNO, invisible al usuario final.

const KEY = "__sigma_current_session";

export function setCurrentSessionId(sessionId: string | null | undefined): void {
  try {
    (globalThis as Record<string, unknown>)[KEY] = sessionId ?? null;
  } catch {
    // nunca romper el hook por el tracker
  }
}

export function getCurrentSessionId(): string | null {
  try {
    const v = (globalThis as Record<string, unknown>)[KEY];
    return typeof v === "string" && v ? v : null;
  } catch {
    return null;
  }
}
