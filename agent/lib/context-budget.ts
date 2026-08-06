import type { LanguageModelMiddleware } from "ai";
import { loadSearchProjections } from "./runtime-config.js";
import { planContextSync, planMarkdown, lastUserText } from "./context-planner.js";

// Reduce el contexto antes de cada llamada sin intervenir en prompt caching.
// Eve 0.29.2 administra nativamente los breakpoints de Anthropic para tools,
// system y conversación rolling.

// Límite defensivo: las descriptions de tools (o sus inputSchema) pueden crecer
// sin control si el MCP server embebe schemas detallados. 200k tokens ÷ ~10 tools
// deja ~20k tokens por tool; 8000 chars es ~2000 tokens, holgado pero seguro.
const MAX_TOOL_DESC_CHARS = 8_000;
const MAX_SCHEMA_DESC_CHARS = 4_000;
// Guard anti-paginación bruta: un tool-result de read_records con first alto
// (60k+ chars) se re-envía completo en CADA step e infla el contexto. Se trunca
// a este límite indicándolo al modelo (los datos grandes se resuelven con
// aggregate_records / buscar_registro, no trayendo filas completas).
const MAX_TOOL_RESULT_CHARS = 20_000;
// Observabilidad del lóbulo frontal: el log del plan inyectado se activa solo
// con SIGMA_DEBUG_PLAN=1 (por defecto silencioso para no ensuciar el terminal).
// Acceso a env sin depender de @types/node (los authored modules de Eve se
// type-chequean con tsconfigs distintos; globalThis con cast es robusto en ambos).
const DEBUG_PLAN =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SIGMA_DEBUG_PLAN === "1";

// Límite defensivo de filas para buscar_registro: si `primero` llega como string
// ("30" en vez de 30) el DAB no aplica el límite y devuelve cientos de filas
// (visto en vivo: ~211k chars). Proyectar + cortar a N filas evita inflar el
// contexto sin importar cómo llegue `primero`.
const MAX_SEARCH_ROWS = 50;
// read_records / aggregate_records: limitar a filas COMPLETAS (estructura preservada)
// en vez de truncar chars a cuchillo (perdía filas a mitad de campo). Las proyecciones
// por entidad viven en search-projections.json (extensión de la whitelist de buscar_registro).
const MAX_READ_ROWS = 100;

const SEARCH_RESULT_FIELDS = loadSearchProjections();

function projectRecord(record: unknown, fields: string[]): unknown {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const source = record as Record<string, unknown>;
  return Object.fromEntries(fields.filter((field) => field in source).map((field) => [field, source[field]]));
}

// Hash estable y barato (djb2) para detectar tool-results repetidos en la sesión.
function stableHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}

// Extrae los textos de un tool-result tolerando ambos envoltorios MCP:
// `output.value.content[*].text` (shape usado en este proyecto) y `output.content[*].text`.
function toolResultTexts(part: Record<string, any>): Array<{ content: Record<string, any>; text: string }> {
  const output = part?.output;
  const containers = [output?.value?.content, output?.content];
  const found: Array<{ content: Record<string, any>; text: string }> = [];
  for (const container of containers) {
    if (!Array.isArray(container)) continue;
    for (const content of container) {
      if (content?.type === "text" && typeof content.text === "string") {
        found.push({ content, text: content.text });
      }
    }
  }
  return found;
}

// Detecta el array de filas y la entidad en el JSON de un tool-result, tolerante a
// los shapes de buscar_registro (`value.value`), read_records (`value`),
// aggregate_records con first (`items`) y sin first (`result`).
type RowsExtract = { rows: unknown[] | null; kind: string; entity?: string };
function extractRows(payload: Record<string, any>): RowsExtract {
  const entity =
    typeof payload.entity === "string"
      ? payload.entity
      : typeof payload.parameters?.entidad === "string"
        ? payload.parameters.entidad
        : typeof payload.parameters?.entity === "string"
          ? payload.parameters.entity
          : undefined;
  if (payload?.value && typeof payload.value === "object" && Array.isArray(payload.value.value)) {
    return { rows: payload.value.value, kind: "search", entity };
  }
  if (Array.isArray(payload?.value)) return { rows: payload.value, kind: "value", entity };
  if (Array.isArray(payload?.items)) return { rows: payload.items, kind: "items", entity };
  if (Array.isArray(payload?.result)) return { rows: payload.result, kind: "result", entity };
  return { rows: null, kind: "none", entity };
}

// Proyecta un resultado de read/aggregate/buscar a campos útiles y limita filas,
// conservando estructura y avisando del recorte al modelo.
function compactToolResultText(text: string): string {
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(text);
  } catch {
    return text;
  }
  const { rows, kind, entity } = extractRows(payload);
  if (!rows || rows.length === 0) return text;

  const maxRows = kind === "search" ? MAX_SEARCH_ROWS : MAX_READ_ROWS;
  // Campos objetivo: whitelist por entidad, o el `select` pedido si viene en parameters.
  const selectParam = payload.parameters?.select;
  const selectFields: string[] | null =
    typeof selectParam === "string" && selectParam.trim()
      ? selectParam.split(",").map((s) => s.trim()).filter(Boolean)
      : Array.isArray(selectParam) && selectParam.length
        ? selectParam.map(String)
        : null;
  const fields = (entity && SEARCH_RESULT_FIELDS[entity]) || selectFields || null;

  const projected = fields
    ? rows.slice(0, maxRows).map((r) => projectRecord(r, fields))
    : rows.slice(0, maxRows);
  const truncated = rows.length > maxRows;

  const next = { ...payload };
  if (kind === "search") next.value = { ...next.value, value: projected };
  else if (kind === "value") next.value = projected;
  else if (kind === "items") next.items = projected;
  else if (kind === "result") next.result = projected;

  if (truncated) {
    next._context = {
      totalRows: rows.length,
      returnedRows: projected.length,
      hint: `Limitado a ${maxRows} filas de ${rows.length}. Para agregados usa aggregate_records (groupby) o filtra server-side.`,
    };
  }
  return JSON.stringify(next);
}

// Compacta tool-results de leer (read_records/aggregate_records/buscar_registro):
// proyecta a campos útiles y acota filas, en vez de truncar chars a cuchillo.
function compactToolResults(prompt: Array<{ role?: string; content?: unknown }>): void {
  for (const message of prompt) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content as Array<Record<string, any>>) {
      if (part.type !== "tool-result") continue;
      const toolName = String(part.toolName ?? "");
      const isRead = /__read_records$|__aggregate_records$|__buscar_registro$/.test(toolName);
      if (!isRead) continue;
      for (const { content } of toolResultTexts(part)) {
        content.text = compactToolResultText(content.text);
      }
    }
  }
}

// Caché de resultados repetidos dentro de la sesión: si el MISMO resultado (texto
// normalizado) ya apareció en un tool-result anterior, la repetición se reemplaza por
// un placeholder-resumen (el modelo ya lo tiene en el historial del prompt).
function dedupeRepeatedResults(prompt: Array<{ role?: string; content?: unknown }>): void {
  const seen = new Map<string, { index: number; toolName: string; rows: number }>();
  let index = 0;
  for (const message of prompt) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content as Array<Record<string, any>>) {
      if (part.type !== "tool-result") continue;
      for (const { content, text } of toolResultTexts(part)) {
        const normalized = text.replace(/\s+/g, " ").trim();
        const hash = stableHash(normalized.slice(0, 4000));
        const prev = seen.get(hash);
        if (prev) {
          content.text =
            `[Resultado idéntico al del tool-result #${prev.index} (${prev.toolName}). ` +
            `No se repite: usa el resultado anterior del historial.` +
            (prev.rows ? ` Resumen: ${prev.rows} filas.` : "") +
            `]`;
        } else {
          const rows = Number(text.match(/"totalRows":\s*(\d+)/)?.[1] ?? 0);
          seen.set(hash, { index, toolName: String(part.toolName ?? ""), rows });
        }
      }
      index++;
    }
  }
}

// Trunca tool-results MCP excesivamente grandes (paginación bruta) a un tope
// seguro, avisando al modelo para que no repita la lectura masiva.
function truncateLargeToolResults(prompt: Array<{ role?: string; content?: unknown }>): void {
	for (const message of prompt) {
		if (message.role !== "tool" || !Array.isArray(message.content)) continue;
		for (const part of message.content as Array<Record<string, any>>) {
			if (part.type !== "tool-result") continue;
			const contents = part.output?.value?.content;
			if (!Array.isArray(contents)) continue;
			for (const content of contents) {
				if (content?.type === "text" && typeof content.text === "string" && content.text.length > MAX_TOOL_RESULT_CHARS) {
					const kept = content.text.slice(0, MAX_TOOL_RESULT_CHARS);
					content.text =
						kept +
						`\n… [TRUNCADO: resultado de ${content.text.length} chars; limitado a ${MAX_TOOL_RESULT_CHARS}. ` +
						`No reintentar la lectura masiva: usa aggregate_records (groupby) o buscar_registro (LIKE en servidor).]`;
				}
			}
		}
	}
}

// "Lóbulo frontal" (fase B — por mensaje): el middleware ve el prompt completo de
// cada llamada, incluyendo el mensaje del usuario. En la primera llamada del turno
// calcula el plan de contexto (qué skills y qué schemas del Company Twin se van a
// necesitar) y lo inyecta como mensaje system al inicio del prompt. En llamadas
// posteriores el tag `[plan:<hash>]` ya está en el prompt → no se duplica.
const PLAN_TAG_PREFIX = "[plan:";

// Eve arma el prompt fresco en cada step, así que el tag no persiste entre
// llamadas de un mismo turno. Este flag de módulo evita re-inyectar el plan
// del MISMO mensaje en steps posteriores; un mensaje nuevo cambia el hash.
let lastPlanTag: string | undefined;

function injectContextPlan(prompt: Array<{ role?: string; content?: unknown }>): void {
  try {
    const message = lastUserText(prompt as ReadonlyArray<{ role?: string; content?: unknown }>);
    if (!message.trim()) return;
    const plan = planContextSync(message);
    const markdown = planMarkdown(plan);
    if (!markdown) return;
    const tag = `${PLAN_TAG_PREFIX}${(Number(stableHash(message)) >>> 0).toString(16).slice(0, 8)}]`;
    if (lastPlanTag === tag) return; // mismo turno: ya inyectado
    if (JSON.stringify(prompt).includes(tag)) return; // ya inyectado para este mensaje
    if (DEBUG_PLAN) console.log(`[context-budget] plan inyectado tag=${tag} chars=${markdown.length}`);
    lastPlanTag = tag;
    prompt.unshift({
      role: "system",
      content: `## Plan de contexto (precargado — evita rediscovery)\n${tag}\n${markdown}`,
    });
  } catch {
    // blindado: nunca romper la llamada al modelo
  }
}

// Anti-duplicados de tool calls (trasladado de agent/instructions/duplicates.ts,
// que usaba step.started — evento NO permitido para instrucciones en Eve 0.29.2,
// se ignoraba silenciosamente y el módulo nunca funcionó). Aquí el middleware SÍ
// ve el prompt completo con las tool-calls del historial y puede avisar al modelo
// si repite el mismo tool con el mismo input en un mismo turno.
let lastDupWarning: string | undefined;

function warnRepeatedToolCalls(prompt: Array<{ role?: string; content?: unknown }>): void {
  try {
    const counts = new Map<string, number>();
    for (const message of prompt) {
      if (!Array.isArray(message.content)) continue;
      for (const part of message.content as Array<Record<string, any>>) {
        if (part?.type !== "tool-call" || !part.toolName) continue;
        // El part tool-call real expone los argumentos en `input` (verificado en
        // llm-io.jsonl: type/toolCallId/toolName/input).
        const args = part.input ?? part.args ?? part.arguments ?? {};
        const key = `${part.toolName}:${JSON.stringify(args)}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const dups = [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([key]) => key);
    if (!dups.length) return;
    const warnKey = stableHash(dups.join("|"));
    if (lastDupWarning === warnKey) return; // ya avisado para este turno
    lastDupWarning = warnKey;
    prompt.unshift({
      role: "system",
      content:
        "## ⚠️ Duplicados detectados (auto)\n" +
        "Repetiste tool calls con el MISMO input en este turno:\n\n" +
        dups.map((k) => `- ${k}`).join("\n") +
        "\n\nReutiliza el resultado previo del historial. No vuelvas a invocar el mismo tool con el mismo filtro/select.",
    });
  } catch {
    // nunca romper la llamada al modelo por el detector de duplicados
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
      // ⚠️ Blindado: si la compactación lanza (shape de tool-result inesperado),
      // el middleware crashearía la llamada al modelo (el ReferenceError de
      // truncateSchemaDescriptions causó exactamente eso → refresh de página).
      try {
        compactToolResults(prompt);
        dedupeRepeatedResults(prompt);
        warnRepeatedToolCalls(prompt);
        injectContextPlan(prompt);
        truncateLargeToolResults(prompt);
      } catch {
        // nunca romper la llamada al modelo por el guard de contexto
      }
    }

    return params;
  },
};