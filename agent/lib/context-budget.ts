import type { LanguageModelMiddleware } from "ai";
import { loadSearchProjections } from "./runtime-config.js";

// Reduce el contexto antes de cada llamada sin intervenir en prompt caching.
// Eve 0.29.2 administra nativamente los breakpoints de Anthropic para tools,
// system y conversación rolling.

// Límite defensivo: las descriptions de tools (o sus inputSchema) pueden crecer
// sin control si el MCP server embebe schemas detallados. 200k tokens ÷ ~10 tools
// deja ~20k tokens por tool; 8000 chars es ~2000 tokens, holgado pero seguro.
const MAX_TOOL_DESC_CHARS = 8_000;
const MAX_SCHEMA_DESC_CHARS = 4_000;

const SEARCH_RESULT_FIELDS = loadSearchProjections();

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
  for (const [key, value] of Object.entries(obj)) {
    if (key === "description" && typeof value === "string" && value.length > MAX_SCHEMA_DESC_CHARS) {
      result[key] = value.slice(0, MAX_SCHEMA_DESC_CHARS) + "…";
    } else {
      result[key] = truncateSchemaDescriptions(value);
    }
  }
  return result;
}

export const contextBudgetMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }) => {
    const anyParams = params as unknown as {
      prompt?: Array<{ role?: string; content?: unknown }>;
      tools?: Array<{ description?: string; inputSchema?: unknown }>;
    };

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
    }

    return params;
  },
};