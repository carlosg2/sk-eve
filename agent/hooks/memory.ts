import { defineHook } from "eve/hooks";
import { recordLearning } from "../lib/twin-memory.js";

// Meta-fábrica (forma mínima): captura errores de las tools del ERP y los
// registra como aprendizajes en el Company Twin. La próxima sesión los lee
// (vía agent/instructions/memory.ts) y evita repetir el error.
//
// Solo captura errores ACCIONABLES (validación, operador no soportado, campo
// requerido) para no llenar el store de ruido.

const CONNECTION_PREFIX = "intelisis-dab__";

// Extrae type + message del error del evento. Eve proyecta el error
// estructurado en data.error; si no, el output del tool es JSON con
// `{ toolName, status, error: { type, message } }` (errores embebidos de DAB),
// a veces envuelto en `{ error: "<json string>" }` (MCP). Se normaliza todo a
// un objeto { type, message }.
function extractError(
  error: { code?: string; type?: string; message?: string } | undefined,
  output: unknown,
): { type: string; message: string } {
  if (error?.message || error?.type) {
    return { type: error.type ?? "", message: error.message ?? "" };
  }

  // Des-envolver { error: "<json string>" } / { error: {type,message} } /
  // { status: "error", error: {...} } antes de parsear.
  let value: unknown = output;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.error === "string") {
      value = obj.error;
    } else if (obj.error && typeof obj.error === "object") {
      const inner = obj.error as Record<string, unknown>;
      return { type: String(inner.type ?? ""), message: String(inner.message ?? "") };
    } else if (typeof obj.status === "string" && obj.status !== "success") {
      value = obj;
    }
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as {
        error?: { type?: string; message?: string } | string;
        type?: string;
        message?: string;
      };
      const inner = parsed?.error;
      if (inner && typeof inner === "object") {
        return { type: inner.type ?? "", message: inner.message ?? "" };
      }
      if (parsed?.type || parsed?.message) {
        return { type: parsed.type ?? "", message: parsed.message ?? "" };
      }
    } catch {
      // no es JSON plano; seguir con regex
    }
    const t = value.match(/"type":\s*"([^"]+)"/);
    const m = value.match(/"message":\s*"([^"]+)"/);
    return { type: t?.[1] ?? "", message: m?.[1] ?? "" };
  }
  return { type: "", message: "" };
}

// Deriva una clave estable + regla legible de patrones conocidos.
// Cubre errores de USO (campo requerido, OData) y de SCHEMA (entidad que no
// existe, campo que no existe, case UPPERCASE) — los más frecuentes en runtime.
function deriveLearning(
  toolName: string,
  err: { type: string; message: string },
  entity: string,
): { key: string; text: string } | null {
  const short = toolName.replace(CONNECTION_PREFIX, "");
  const type = err.type ?? "";
  const message = err.message ?? "";

  // 1) Entidad inexistente (EntityNotFound) — el nombre vive en skills/twin stale.
  if (type === "EntityNotFound" || /entity\s*.*not\s*found/i.test(message)) {
    const ent =
      entity || message.match(/entity\s+'?([A-Za-z0-9_]+)'?/i)?.[1] || short;
    return {
      key: `ent-inexistente-${ent}`,
      text: `La entidad '${ent}' NO existe en el MCP del tenant activo (${type}). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.`,
    };
  }

  // 2) Campo inexistente en select / filter / orderby / groupby (BadRequest).
  const field =
    message.match(/Invalid field to be returned requested:\s*([A-Za-z0-9_]+)/i)?.[1] ??
    message.match(/Invalid field to be used in (?:filter|orderby|groupby)[^:]*:\s*([A-Za-z0-9_]+)/i)?.[1];
  if (field) {
    const isLowercase = field !== field.toUpperCase();
    const hint = isLowercase
      ? ` Los campos DAB/Intelisis son UPPERCASE: usar '${field.toUpperCase()}', no '${field}'.`
      : ` Quitar el campo del select o usar la vista correcta (ej. ArtDisponibleDesc en vez de ArtDisponible para Descripcion1).`;
    return {
      key: `fld-${short}-${field.toLowerCase()}`,
      text: `El campo '${field}' no existe en '${entity || short}' (${type}).${hint}`,
    };
  }

  // 3) Campo requerido faltante en el body (create/update).
  const missing = message.match(/Missing field in body:\s*([A-Za-z0-9_]+)/i);
  if (missing) {
    return {
      key: `req-${short}-${missing[1]}`,
      text: `Al usar ${short}, el campo '${missing[1]}' es requerido en el body.`,
    };
  }

  // 4) Funciones de texto OData no soportadas en este binario sigma-dab.
  if (/not supported|no soportad|not well formed/i.test(message) && /contains|startswith|endswith|regex/i.test(message)) {
    return {
      key: "odata-text-functions",
      text: `Funciones de texto OData no soportadas en DAB (${message}). Usa eq/ne/gt/ge/lt/le y filtra texto parcial client-side.`,
    };
  }

  // 5) Validación genérica.
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
      // ⚠️ Blindado con try/catch: este hook corre JUSTO DESPUÉS de cada error
      // de tool. Si lanza (shape de error inesperado), crashearía el runtime de
      // Eve (turno fallido → el dev server puede recargar la página = "refresh
      // como HMR" tras un error de tool call). NUNCA debe romper el turno.
      try {
        const { result, status, error } = event.data;

        // Solo procesar tool calls de nuestra conexión MCP.
        // RuntimeActionResult es un union; narrowing por kind para acceder a toolName.
        if (result.kind !== "tool-result") return;
        if (!result.toolName.startsWith(CONNECTION_PREFIX)) return;

        // "rejected" = gate HITL denegó, tool nunca ejecutó → no es aprendizaje.
        // DAB devuelve los errores como resultado "exitoso" del RPC con el error
        // EMBEBIDO en el output (`{ status: "error", error: { type, message } }`)
        // sin marcar `isError` — por eso también se detecta con extractError.
        const err = extractError(error, result.output);
        const failed = status === "failed" || result.isError === true || !!err.type || !!err.message;
        if (!failed) return;
        if (!err.type && !err.message) return;

        const input = (result.input ?? {}) as Record<string, unknown>;
        const entity = String(input.entity ?? input.entidad ?? "");

        const learning = deriveLearning(result.toolName, err, entity);
        if (!learning) return;

        await recordLearning(learning.key, learning.text);
      } catch {
        // Nunca romper el turno por un fallo del hook de memoria.
      }
    },
  },
});
