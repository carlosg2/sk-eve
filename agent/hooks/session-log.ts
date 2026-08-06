import { defineHook } from "eve/hooks";
import {
  touchSessionStarted,
  setSessionTitleFromFirstMessage,
  markTurnStarted,
  markSessionIdle,
  appendEvent,
} from "../lib/session-store.js";

// Registro de sesiones para el sidebar de "conversaciones anteriores" en
// /chat (observe-only, mismo patrón que agent/hooks/memory.ts — nunca
// inyecta contexto al modelo). El índice del sidebar IGNORA sesiones de
// subagentes (session.started con data.invocation.kind === "subagent") para
// no ensuciar la lista: session-store.ts solo crea una entrada nueva desde
// touchSessionStarted, así que basta con no llamarla para esos casos.
//
// El handler "*" espeja CADA evento del stream a `events` (session-store.ts)
// — patrón oficial de Eve para persistir a tu propia base de datos — así el
// historial completo sobrevive un `rm -rf .eve` y se acumula para minería.
// ⚠️ 2026-08-06: el espejo ahora incluye TAMBIÉN los subagentes (su
// razonamiento y tool calls son evidencia para diagnosticar qué pensó el
// agente y dónde se equivocó). El índice `sessions` (sidebar) los sigue
// filtrando — el espejo y el índice son dos cosas distintas.
//
// ⚠️ Blindado con try/catch en cada handler: un throw aquí rompería el turno
// (ver gotcha "self-improvement runtime a prueba de errores" en la memoria
// del repo).
const subagentSessions = new Set<string>();

export default defineHook({
  events: {
    async "session.started"(event, ctx) {
      try {
        const invocation = (event as { data?: { invocation?: { kind?: string } } }).data?.invocation;
        if (invocation?.kind === "subagent") {
          subagentSessions.add(ctx.session.id);
          return;
        }
        await touchSessionStarted(ctx.session.id);
      } catch {
        // nunca romper el turno por el registro de sesiones
      }
    },
    async "message.received"(event, ctx) {
      try {
        const text = String((event as { data?: { message?: string } }).data?.message ?? "");
        if (text.trim()) await setSessionTitleFromFirstMessage(ctx.session.id, text);
      } catch {
        // ignorar
      }
    },
    async "turn.started"(_event, ctx) {
      try {
        await markTurnStarted(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "turn.completed"(_event, ctx) {
      try {
        await markSessionIdle(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "turn.failed"(_event, ctx) {
      try {
        await markSessionIdle(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "turn.cancelled"(_event, ctx) {
      try {
        await markSessionIdle(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "session.completed"(_event, ctx) {
      try {
        await markSessionIdle(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "session.failed"(_event, ctx) {
      try {
        await markSessionIdle(ctx.session.id);
      } catch {
        // ignorar
      }
    },
    async "*"(event, ctx) {
      try {
        // Espejo COMPLETO del stream: TODAS las sesiones, incluidos subagentes.
        // El índice del sidebar (tabla sessions) sigue filtrándolos arriba.
        const ev = event as { type: string; data?: unknown; meta: { id: string; at: string } };
        await appendEvent(ctx.session.id, { type: ev.type, data: ev.data, meta: ev.meta });
      } catch {
        // nunca romper el turno por el espejo de eventos
      }
    },
  },
});
