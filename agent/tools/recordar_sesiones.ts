import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchEpisodicMemory } from "../lib/session-search.js";

// Tool de MEMORIA EPISÓDICA (P1 de stack-mastery/program.md).
// Permite al agente consultar su propio historial de sesiones (el espejo
// `events` en .data/sessions.sqlite3) con búsqueda FTS5, para no redescubrir
// contexto en turnos recurrentes ("¿cómo resolvimos X la semana pasada?").
//
// Experimento autoresearch/p1-memoria-episodica:
//   - Hipótesis: consultar el historial reduce tokens por turno en preguntas
//     recurrentes sin perder exactitud.
//   - Juez: eval de memoria + radiografía (tokIn por turno en preguntas
//     repetidas). Si no mejora o rompe algo, se revierte (git reset).

export default defineTool({
  description:
    "Busca en el historial de conversaciones PREVIAS del agente (memoria episódica). " +
    "ÚSALA SOLO cuando el usuario pida recordar explícitamente algo de una conversación " +
    "anterior ('¿cómo hicimos X la semana pasada?', '¿qué encontramos antes de Y?'). " +
    "NO la uses para preguntas sobre datos ACTUALES del ERP: esas se responden con " +
    "read_records/aggregate_records/buscar_registro del MCP, no con la memoria. " +
    "MÁXIMO 1-2 búsquedas por turno: si el primer intento no encuentra nada útil, " +
    "sigue con las tools del ERP. Devuelve fragmentos del historial con su sesión de origen.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Términos de búsqueda (2-8 palabras clave del tema a recordar, en español). Ej: 'faltantes frijol negro compra'.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(3)
      .optional()
      .describe("Máximo de fragmentos a devolver (default 3)."),
  }),
  async execute({ query, limit }, ctx) {
    // Excluir la sesión en curso: la memoria episódica es de sesiones PREVIAS.
    const currentSession = (ctx as { session?: { id?: string } } | undefined)?.session?.id;
    const hits = searchEpisodicMemory(query, {
      limit,
      excludeSessionId: currentSession,
    });
    if (hits.length === 0) {
      return {
        found: false,
        message:
          "No se encontraron conversaciones previas con esos términos. " +
          "No sigas buscando con otras palabras: si el dato es operativo (schema, " +
          "políticas, datos actuales), consulta el Company Twin con query_company_twin " +
          "o el ERP con read_records/aggregate_records.",
      };
    }
    return {
      found: true,
      count: hits.length,
      results: hits.map((h) => ({
        sessionId: h.sessionId,
        turnId: h.turnId,
        tipo: h.type,
        fragmento: h.snippet,
      })),
      nota: "No repitas esta búsqueda con otras palabras: usa este contexto y continúa " +
        "con las tools del ERP para los datos actuales.",
    };
  },
});
