import { defineHook } from "eve/hooks";
import { recordLearning, isLearningCanonical } from "../lib/twin-memory.js";
import { getCurrentSessionId } from "../lib/current-session.js";

// BANDEJA runtime → fábrica (rediseño 2026-08-19): el runtime ANEXA señales de
// error accionables al buffer `state/learnings.md`; el runtime YA NO lo inyecta
// al prompt. La fábrica (promote-learnings) promueve cada señal a su hogar
// canónico (twin/kernel/skills/instructions) y vacía el buffer. Promover RÁPIDO
// es lo que hace que el agente aprenda.
//
// Coordinación (2026-08-19):
//  - Si el hecho YA está canónico (isLearningCanonical), NO se escribe un
//    duplicado al buffer — el error que persiste a pesar de estar canónico es
//    un problema de RUTEO, y esa señal la agrega el tablero de la fábrica
//    (scripts/check-cycle.ts) sobre la radiografía, no el buffer.
//  - recordLearning cuenta recurrencias `[×N]` para que la fábrica priorice.
//
// Solo captura errores ACCIONABLES (validación, operador no soportado, campo
// requerido) para no llenar el store de ruido.

const CONNECTION_PREFIX = "intelisis-dab__";

// Normaliza un nombre a slug de clave de learning (sin acentos, sin rutas).
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

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
    // query_company_twin devuelve { error: "Concepto 'X' no encontrado..." }
    if (typeof obj.error === "string" && obj.error.startsWith("Concepto")) {
      return { type: "NotFound", message: obj.error };
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

  // read_parallel: errores embebidos en results[] (cada operación del lote
  // devuelve {tool, ok, data|error}). El top-level es ok:true, así que sin este
  // escaneo los fallos internos del lote serían invisibles para la radiografía
  // y el buffer de learnings (verificado en vivo: read_records con campo
  // inexistente dentro de read_parallel → turno reportó 0 errores).
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const results = (value as Record<string, unknown>).results;
    if (Array.isArray(results)) {
      for (const item of results) {
        if (!item || typeof item !== "object") continue;
        const it = item as Record<string, unknown>;
        if (it.ok !== false) continue;
        if (typeof it.error === "string") {
          const t = it.error.match(/"type":\s*"([^"]+)"/);
          const m = it.error.match(/"message":\s*"([^"]+)"/);
          return { type: t?.[1] ?? "ToolError", message: m?.[1] ?? it.error };
        }
        if (it.error && typeof it.error === "object") {
          const e = it.error as Record<string, unknown>;
          return { type: String(e.type ?? "ToolError"), message: String(e.message ?? "") };
        }
      }
    }
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
  sessionId: string,
): { key: string; text: string; canonical?: boolean } | null {
  const short = toolName.replace(CONNECTION_PREFIX, "");
  const type = err.type ?? "";
  const message = err.message ?? "";
  const ref = sessionId ? ` (sesión ${sessionId})` : "";

  // 1) Entidad inexistente (EntityNotFound) — el nombre vive en skills/twin stale.
  if (type === "EntityNotFound" || /entity\s*.*not\s*found/i.test(message)) {
    const ent =
      entity || message.match(/entity\s+'?([A-Za-z0-9_]+)'?/i)?.[1] || short;
    return {
      key: `ent-inexistente-${ent.replace(/_/g, "").toLowerCase()}`,
      text: `La entidad '${ent}' NO existe en el MCP de esta empresa (${type}). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.${ref}`,
      canonical: isLearningCanonical("entity", ent),
    };
  }

  // 2) Campo inexistente en select / filter / orderby / groupby (BadRequest).
  //    ⚠️ DAB usa 2 shapes: "Invalid field to be returned/used..." y
  //    "Could not find a property named 'X' on type '...'" (vista UPPERCASE,
  //    verificado 2026-08-06 con ForecastPlanProduccion: `Semana eq 31` →
  //    BadRequest, `SEMANA eq 31` → OK).
  const field =
    message.match(/Invalid field to be returned requested:\s*([A-Za-z0-9_]+)/i)?.[1] ??
    message.match(/Invalid field to be used in (?:filter|orderby|groupby)[^:]*:\s*([A-Za-z0-9_]+)/i)?.[1] ??
    message.match(/Could not find a property named '?([A-Za-z0-9_]+)'?/i)?.[1];
  if (field) {
    // ⚠️ GOTCHA: result.input NO expone la entidad (RuntimeToolResultActionResult),
    // pero el mensaje DAB "...on type '...Compra'" SÍ la trae. Sin ella la entrada
    // decía "no existe en 'read_records'" (ambiguo).
    const typeEnt = message.match(/on type '?([A-Za-z0-9_.]+)'?/i)?.[1];
    // Fallback: solo usar el tool name si es una entidad válida (no "read_records");
    // si no hay entidad confirmada, omitir el hint de read_records (ruido).
    const ent = entity || (typeEnt ? typeEnt.replace(/^\.+/, "").split(".").pop()! : "");
    const isLowercase = field !== field.toUpperCase();
    // ⚠️ El hint UPPERCASE es genérico y puede inducir a error (casos reales:
    // 'FAMILIACF' → real `FamiliaCF`, 'ANO' → real `Ano`, 'FECHAEMISION' → real
    // `FechaEmision` — todos camelCase). Solo sugerir UPPERCASE cuando el campo
    // que falló es camelCase; si ya es UPPERCASE, apuntar al twin del entidad.
    const refEnt = ent ? ` en '${ent}'` : "";
    const hint = isLowercase
      ? ` El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records(first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).`
      : ` El UPPERCASE es ESPECÍFICO de vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA — verificar el nombre real del campo en erp-kernel/casing.md (puede ser camelCase o requerir otra vista, ej. ArtDisponibleDesc en vez de ArtDisponible).`;
    return {
      key: `fld-${short}-${field.toLowerCase()}`,
      text: `El campo '${field}' no existe${refEnt} (${type}).${hint}${ref}`,
      canonical: isLearningCanonical("field", field),
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

  // 3b) Parámetro requerido faltante en un stored proc del portal (ExecutionError).
  //     "Procedure or function 'spX' expects parameter '@Semana', which was not supplied."
  //     → el skill/kernel debe documentar la firma del SP (parámetros obligatorios).
  const spParam = message.match(/expects parameter\s+'?@?([A-Za-z0-9_]+)'?/i);
  if (spParam) {
    const sp = message.match(/(?:function|procedure)\s+'?([A-Za-z0-9_]+)'?/i)?.[1] ?? short;
    return {
      key: `req-${short}-${spParam[1].toLowerCase()}`,
      text: `Al llamar ${short} (SP '${sp}'), falta el parámetro '@${spParam[1]}' (requerido). Documentar la firma del SP en el skill/kernel para que el modelo pase los parámetros obligatorios.${ref}`,
    };
  }

  // 3c) Conversión de fecha inválida en un SP (ExecutionError).
  //     "The conversion of a varchar data type to a datetime data type resulted in an out-of-range value."
  //     → el modelo pasó una fecha en formato que el SP no acepta (formato esperado no documentado).
  if (/conversion of a varchar data type to a datetime/.test(message)) {
    return {
      key: `fecha-${short}`,
      text: `${short} rechazó el formato de fecha enviado (${message.slice(0, 90)}). Documentar en el skill/kernel el formato de fecha exacto que espera el SP (probablemente ISO 'YYYY-MM-DD' sin hora, no ISO completo).${ref}`,
    };
  }

  // 3d) Filtro OData mal formado / operadores incompatibles (BadRequest).
  //     "A binary operator with incompatible types..." / "$filter query parameter is not well formed"
  //     → el modelo construyó un filtro inválido (tipos o sintaxis); regla de motor → kernel.
  if (/incompatible types|not well formed|is not valid at position/i.test(message)) {
    return {
      key: `odata-${short}`,
      text: `Filtro OData inválido en ${short}: ${message.slice(0, 120)}. Revisar la construcción del $filter (tipos compatibles, sintaxis, comillas en fechas).${ref}`,
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

  // ── 6-8) Fallos de DESCUBRIMIENTO/NOMENCLATURA (2026-08-20): el modelo intentó
  // cargar/leer un nombre que no existe porque confunde skill ↔ concepto del twin
  // ↔ archivo. Son señales de RUTEO/nomenclatura: el fix es de instrucciones
  // (catálogo exhaustivo + neutralizar wikilinks), no de conocimiento declarativo.

  // 6) load_skill con nombre inexistente → "No skill named "X""
  if (toolName === "load_skill") {
    const name = message.match(/No skill named "([^"]+)"/i)?.[1];
    if (name) {
      return {
        key: `skill-inexistente-${slugify(name)}`,
        text: `El modelo intentó cargar con load_skill un nombre que NO es skill: '${name}' (probablemente un concepto del Company Twin o un documento). Solo los slugs del catálogo del agente (agent.md → skills) son skills.${ref}`,
        canonical: false,
      };
    }
  }

  // 7) query_company_twin con concepto inexistente → "Concepto 'X' no encontrado"
  if (toolName === "query_company_twin") {
    const concept = message.match(/Concepto '([^']+)' no encontrado/i)?.[1];
    if (concept) {
      return {
        key: `concepto-inexistente-${slugify(concept.split("/").pop() ?? concept)}`,
        text: `query_company_twin('${concept}') → concepto no encontrado. El modelo infirió un concepto que no existe en el twin de esta empresa; verificar el nombre real (OKF index) o crearlo.${ref}`,
        canonical: false,
      };
    }
  }

  // 8) read_file con archivo inexistente → "File not found: <path>"
  if (toolName === "read_file") {
    const path = message.match(/File not found: ([^\s]+)/i)?.[1] ?? "";
    if (path) {
      return {
        key: `archivo-inexistente-${slugify(path.split("/").pop() ?? path)}`,
        text: `read_file('${path}') → archivo no encontrado. El conocimiento se lee con query_company_twin / load_skill, no con read_file (paths del sandbox no accesibles).${ref}`,
        canonical: false,
      };
    }
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

        // Procesar tool calls de nuestra conexión MCP + los tools de
        // descubrimiento de conocimiento (load_skill/query_company_twin/read_file),
        // cuyos fallos de nomenclatura son señales de RUTEO para la fábrica.
        // RuntimeActionResult es un union; narrowing por kind para acceder a toolName.
        if (result.kind !== "tool-result") return;
        const isDab = result.toolName.startsWith(CONNECTION_PREFIX);
        const isDiscovery = ["load_skill", "query_company_twin", "read_file"].includes(result.toolName);
        if (!isDab && !isDiscovery) return;

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
        const sessionId = getCurrentSessionId() ?? "";

        const learning = deriveLearning(result.toolName, err, entity, sessionId);
        if (!learning) return;

        // Coordinación: si el hecho ya vive en su hogar canónico, no duplicar en
        // el buffer (la recurrencia de errores canónicos = señal de RUTEO, la
        // agrega el tablero de la fábrica sobre la radiografía).
        if (learning.canonical) return;

        await recordLearning(learning.key, learning.text);
      } catch {
        // Nunca romper el turno por un fallo del hook de memoria.
      }
    },
  },
});
