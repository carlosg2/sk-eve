import { defineHook } from "eve/hooks";
import { recordLearning } from "../lib/twin-memory.js";

// Meta-fábrica (forma mínima): captura errores de las tools del ERP y los
// registra como aprendizajes en el Company Twin. La próxima sesión los lee
// (vía agent/instructions/memory.ts) y evita repetir el error.
//
// Solo captura errores ACCIONABLES (validación, operador no soportado, campo
// requerido) para no llenar el store de ruido.

const CONNECTION_PREFIX = "intelisis-dab__";

// Extrae el mensaje de error del evento. Eve proyecta el error estructurado
// en data.error; si no, el output del tool puede ser texto JSON con "message".
function extractMessage(
  error: { code: string; message: string } | undefined,
  output: unknown,
): string | undefined {
  if (error?.message) return error.message;
  // Los tools MCP devuelven el error dentro del output (texto JSON).
  const text = typeof output === "string" ? output : JSON.stringify(output ?? "");
  const m = text.match(/"message":\s*"([^"]+)"/);
  return m?.[1];
}

// Deriva una clave estable + regla legible de patrones conocidos.
function deriveLearning(toolName: string, message: string): { key: string; text: string } | null {
  const short = toolName.replace(CONNECTION_PREFIX, "");
  const missing = message.match(/Missing field in body:\s*([A-Za-z0-9_]+)/i);
  if (missing) {
    return {
      key: `req-${short}-${missing[1]}`,
      text: `Al usar ${short}, el campo '${missing[1]}' es requerido en el body.`,
    };
  }
  // Ninguna función de texto OData está soportada en este binario sigma-dab:
  // contains(), startswith(), endswith(), regex → todos fallan con "not well formed".
  if (/not supported|no soportad|not well formed/i.test(message) && /contains|startswith|endswith|regex/i.test(message)) {
    return {
      key: "odata-text-functions",
      text: `Funciones de texto OData no soportadas en DAB (${message}). Usa eq/ne/gt/ge/lt/le y filtra texto parcial client-side.`,
    };
  }
  if (/ValidationFailed|Invalid request/i.test(message)) {
    return {
      key: `val-${short}-${message.slice(0, 24).replace(/\W+/g, "-").toLowerCase()}`,
      text: `Validación fallida en ${short}: ${message.slice(0, 160)}`,
    };
  }
  return null; // no accionable → no registrar
}

export default defineHook({
  events: {
    async "action.result"(event) {
      const { result, status, error } = event.data;

      // Solo procesar tool calls de nuestra conexión MCP.
      // RuntimeActionResult es un union; narrowing por kind para acceder a toolName.
      if (result.kind !== "tool-result") return;
      if (!result.toolName.startsWith(CONNECTION_PREFIX)) return;

      // "rejected" = gate HITL denegó, tool nunca ejecutó → no es aprendizaje.
      const failed = status === "failed" || result.isError === true;
      if (!failed) return;

      const message = extractMessage(error, result.output);
      if (!message) return;

      const learning = deriveLearning(result.toolName, message);
      if (!learning) return;

      try {
        await recordLearning(learning.key, learning.text);
      } catch {
        // No romper el turno por un fallo de escritura del store.
      }
    },
  },
});
