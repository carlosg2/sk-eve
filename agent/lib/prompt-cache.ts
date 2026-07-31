import type { LanguageModelMiddleware } from "ai";

// Prompt caching de Anthropic para agentes multi-step. Sin esto, CADA step
// reprocesa el prompt completo (system + tools + historial) sin cachear: TTFT
// alto y ~10x costo. Eve ya inyecta breakpoints `cache_control` en las partes
// ESTÁTICAS del prompt (tools + los mensajes system). Este middleware añade el
// que falta: un breakpoint ROLLING en el último mensaje, que cachea el historial
// que crece entre steps.
//
// Anthropic impone un MÁXIMO DURO de 4 breakpoints. Como Eve ya consume ~3
// (1 en tools + 2 en los system), el middleware es consciente del presupuesto:
// cuenta los marcadores entrantes y solo añade el rolling si quedan <4 y el
// último mensaje no está ya marcado. Marcar de más hacía que la API descartara
// justo el breakpoint rolling (el más valioso), degradando el cache en silencio.

const EPHEMERAL = { anthropic: { cacheControl: { type: "ephemeral" as const } } };

// Límite defensivo: las descriptions de tools (o sus inputSchema) pueden crecer
// sin control si el MCP server embebe schemas detallados. 200k tokens ÷ ~10 tools
// deja ~20k tokens por tool; 8000 chars es ~2000 tokens, holgado pero seguro.
const MAX_TOOL_DESC_CHARS = 8_000;
const MAX_SCHEMA_DESC_CHARS = 4_000;

const SEARCH_RESULT_FIELDS: Record<string, string[]> = {
  Prov: ["Proveedor", "Nombre", "NombreCorto", "Estatus", "Condicion"],
  Cte: ["Cliente", "Nombre", "NombreCorto", "Estatus", "Condicion"],
  Art: ["Articulo", "Descripcion1", "Descripcion2", "Unidad", "Estatus", "Familia", "Categoria", "Grupo"],
  ArtDisponible: ["Empresa", "Articulo", "Almacen", "Disponible", "Apartado", "DispMenosApartado"],
  ArtDisponibleDesc: [
    "Empresa",
    "Articulo",
    "Descripcion1",
    "Descripcion2",
    "Almacen",
    "Disponible",
    "Apartado",
    "DispMenosApartado",
    "Unidad",
  ],
  Compra: ["ID", "Mov", "MovID", "FechaEmision", "Proveedor", "Importe", "Estatus", "Almacen", "Condicion"],
  Venta: ["ID", "Mov", "MovID", "FechaEmision", "Cliente", "Importe", "Estatus", "Almacen", "Condicion"],
  Inv: ["ID", "Mov", "MovID", "FechaEmision", "Estatus", "Almacen"],
  GastoT: ["ID", "Mov", "MovID", "FechaEmision", "Acreedor", "Importe", "Estatus"],
  MovTipo: ["Modulo", "Mov", "Clave", "Estatus"],
};

function projectRecord(record: unknown, fields: string[]): unknown {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const source = record as Record<string, unknown>;
  return Object.fromEntries(fields.filter((field) => field in source).map((field) => [field, source[field]]));
}

function compactSearchResultText(text: string): string {
  try {
    const payload = JSON.parse(text) as {
      entity?: string;
      parameters?: { entidad?: string };
      value?: { value?: unknown[] };
    };
    const entity = payload.parameters?.entidad;
    const records = payload.value?.value;
    const fields = entity ? SEARCH_RESULT_FIELDS[entity] : undefined;
    if (!fields || !Array.isArray(records)) return text;

    return JSON.stringify({
      entity: payload.entity,
      parameters: payload.parameters,
      value: { value: records.map((record) => projectRecord(record, fields)) },
    });
  } catch {
    return text;
  }
}

function compactSearchResults(prompt: Array<{ role?: string; content?: unknown }>): void {
  for (const message of prompt) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content as Array<Record<string, any>>) {
      if (part.type !== "tool-result" || !String(part.toolName).endsWith("__buscar_registro")) continue;
      const contents = part.output?.value?.content;
      if (!Array.isArray(contents)) continue;
      for (const content of contents) {
        if (content?.type === "text" && typeof content.text === "string") {
          content.text = compactSearchResultText(content.text);
        }
      }
    }
  }
}

function truncateSchemaDescriptions(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(truncateSchemaDescriptions);
  const obj = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "description" && typeof v === "string" && v.length > MAX_SCHEMA_DESC_CHARS) {
      result[k] = v.slice(0, MAX_SCHEMA_DESC_CHARS) + "…";
    } else {
      result[k] = truncateSchemaDescriptions(v);
    }
  }
  return result;
}

function markCacheable(target: { providerOptions?: Record<string, unknown> } | undefined): void {
  if (!target) return;
  target.providerOptions = { ...(target.providerOptions ?? {}), ...EPHEMERAL };
}

export const promptCacheMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    const anyParams = params as unknown as {
      prompt?: Array<{ role?: string; content?: unknown; providerOptions?: Record<string, unknown> }>;
      tools?: Array<{ description?: string; inputSchema?: unknown; providerOptions?: Record<string, unknown> }>;
    };

    // Truncar descriptions de tools para evitar context overflow con MCP servers
    // que embeben schemas de entidades completos (p.ej. DAB con 189 entidades).
    const tools = anyParams.tools;
    if (Array.isArray(tools)) {
      for (const tool of tools) {
        if (typeof tool.description === "string" && tool.description.length > MAX_TOOL_DESC_CHARS) {
          tool.description = tool.description.slice(0, MAX_TOOL_DESC_CHARS) + "…";
        }
        if (tool.inputSchema) {
          tool.inputSchema = truncateSchemaDescriptions(tool.inputSchema);
        }
      }
    }

    const prompt = anyParams.prompt;
    if (Array.isArray(prompt) && prompt.length > 0) {
      compactSearchResults(prompt);

      // Anthropic admite un MÁXIMO DURO de 4 breakpoints `cache_control`. Eve ya
      // inyecta los suyos (tools + los mensajes system), así que el middleware
      // NO debe volver a marcar esas partes: solo añade UN breakpoint rolling en
      // el último mensaje (cachea el historial que crece entre steps) y únicamente
      // si queda presupuesto. Marcar de más hacía que la API descartara justo el
      // breakpoint rolling — el más valioso en agentes multi-step.
      const hasMarker = (t: { providerOptions?: Record<string, unknown> } | undefined): boolean =>
        Boolean((t?.providerOptions as any)?.anthropic?.cacheControl);

      let markers = (tools ?? []).filter(hasMarker).length;
      for (const message of prompt) {
        if (hasMarker(message)) markers++;
        if (Array.isArray(message.content)) {
          markers += (message.content as Array<{ providerOptions?: Record<string, unknown> }>).filter(hasMarker)
            .length;
        }
      }

      const last = prompt[prompt.length - 1];
      if (!hasMarker(last) && markers < 4) {
        markCacheable(last);
      }
    }

    return params;
  },
};

