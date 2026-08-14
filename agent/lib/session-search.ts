import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { cleanTwinText } from "./twin-clean.js";

// ── Memoria episódica recuperable (P1 del program.md de stack-mastery) ──────
// Hipótesis: el agente puede consultar su propio historial (el espejo `events`
// en .data/sessions.sqlite3) con búsqueda FTS5, reduciendo el redescubrimiento
// de contexto en turnos recurrentes ("¿cómo resolvimos X la semana pasada?").
//
// Experimentos autoresearch/p1-memoria-episodica:
//   - ANTES: el espejo solo se escribe, nunca se lee por el runtime.
//   - DESPUÉS: tool `recordar_sesiones` (FTS5 sobre events) + reindexado.
//   - Juez: eval de memoria (knowledge update) + turnos E2E recurrentes
//     (tokens por turno).

function resolveRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const DB_PATH = join(resolveRoot(), ".data", "sessions.sqlite3");

// Tipos de evento cuyo contenido es recuperable como "memoria episódica".
// Los deltas (*.appended) se excluyen (ruido transitorio, igual que session-store).
const SEARCHABLE_TYPES = new Set([
  "message.completed",
  "message.received",
  "reasoning.completed",
  "action.result",
  "actions.requested",
  "result.completed",
]);

let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  return db;
}

// Tabla FTS5 virtual sobre el contenido recuperable del espejo.
// content=events permite que FTS5 lea los cambios del espejo sin duplicar
// almacenamiento (external content table).
let ftsReady = false;

function ensureFts(): void {
  if (ftsReady) return;
  const conn = getDb();
  conn.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
      sessionId UNINDEXED,
      turnId UNINDEXED,
      type UNINDEXED,
      content,
      tokenize = 'unicode61'
    );
  `);
  ftsReady = true;
}

/**
 * Reindexa (o indexa incrementalmente) los eventos buscables en el FTS.
 * Idempotente: inserta solo los que no están (por meta.id).
 * Se llama al arrancar (lazy, primera búsqueda) y tras cada turno (hook).
 */
export function reindexSearchableEvents(): number {
  try {
    ensureFts();
    const conn = getDb();
    // Los ids de eventos son ULIDs ordenables; guardamos el último indexado
    // en una tabla de control para no re-escudriñar todo el espejo cada vez.
    conn.exec(`
      CREATE TABLE IF NOT EXISTS fts_cursor (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        lastEventId TEXT NOT NULL
      );
    `);
    const row = conn
      .prepare("SELECT lastEventId FROM fts_cursor WHERE id = 1")
      .get() as { lastEventId: string } | undefined;
    const lastId = row?.lastEventId ?? "";

    const rows = conn
      .prepare(
        `SELECT id, sessionId, type, data FROM events
         WHERE id > ? AND type IN (${[...SEARCHABLE_TYPES].map(() => "?").join(",")})
         ORDER BY id ASC LIMIT 2000`,
      )
      .all(lastId, ...SEARCHABLE_TYPES) as unknown as Array<{
      id: string;
      sessionId: string;
      type: string;
      data: string | null;
    }>;

    if (rows.length === 0) return 0;

    const insert = conn.prepare(
      `INSERT OR IGNORE INTO events_fts (sessionId, turnId, type, content)
       VALUES (?, ?, ?, ?)`,
    );
    let last = lastId;
    for (const r of rows) {
      if (!r.data) continue;
      let turnId = "";
      try {
        const d = JSON.parse(r.data) as { turnId?: string };
        turnId = d.turnId ?? "";
      } catch {
        // data no JSON: usar vacío
      }
      // Extraer el texto plano del contenido según tipo
      const content = extractContent(r.type, r.data);
      if (!content) continue;
      insert.run(r.sessionId, turnId, r.type, content);
      last = r.id;
    }
    conn
      .prepare(
        `INSERT INTO fts_cursor (id, lastEventId) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET lastEventId = excluded.lastEventId`,
      )
      .run(last);
    return rows.length;
  } catch {
    return 0; // nunca romper el turno por un fallo de indexación
  }
}

/** Extrae el texto plano indexable de un evento según su tipo. */
function extractContent(type: string, raw: string | null): string {
  if (!raw) return "";
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    switch (type) {
      case "message.completed":
      case "message.received": {
        const m = d.message;
        if (typeof m === "string") return m;
        if (Array.isArray(m)) {
          return (m as Array<Record<string, unknown>>)
            .filter((p) => p?.type === "text" && typeof p.text === "string")
            .map((p) => p.text as string)
            .join(" ");
        }
        return "";
      }
      case "reasoning.completed": {
        const r = d.reasoning;
        return typeof r === "string" ? r : "";
      }
      case "actions.requested": {
        const acts = (d.actions ?? []) as Array<Record<string, unknown>>;
        return acts
          .map((a) => `${a.name ?? a.toolName ?? ""} ${JSON.stringify(a.input ?? a.arguments ?? "")}`)
          .join("\n");
      }
      case "action.result": {
        const result = d.result as Record<string, unknown> | undefined;
        const toolName = String(result?.toolName ?? d.toolName ?? "");
        const output = result?.output ?? d.output;
        const outStr = typeof output === "string" ? output : JSON.stringify(output ?? "");
        return `${toolName} ${outStr}`.slice(0, 2000); // acotar resultados gigantes
      }
      case "result.completed": {
        return JSON.stringify(d);
      }
      default:
        return "";
    }
  } catch {
    return "";
  }
}

export interface MemoryHit {
  sessionId: string;
  turnId: string;
  type: string;
  snippet: string;
  score: number;
}

export interface EpisodicContext {
  sessionId: string;
  type: string;
  content: string;
  ageRank: number;
}

/**
 * Contexto episódico para inyección automática (P1.5): a diferencia de
 * searchEpisodicMemory (snippets truncados a 24 tokens, útiles para inspección),
 * devuelve el CONTENIDO COMPLETO de los hits relevantes (acotado por char) para
 * que el runtime lo inyecte al prompt como contexto de sesiones previas.
 * Diseño: la memoria episódica es un mecanismo INTERNO — el usuario nunca ve
 * estos fragmentos; solo ve la respuesta de negocio final.
 */
export function getEpisodicContext(
  query: string,
  opts: { limit?: number; maxChars?: number; excludeSessionId?: string } = {},
): EpisodicContext[] {
  try {
    ensureFts();
    reindexSearchableEvents();
    const limit = Math.max(1, Math.min(5, opts.limit ?? 3));
    const maxChars = opts.maxChars ?? 1_600;
    const conn = getDb();

    const terms = query
      .replace(/["']/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 8);
    if (terms.length === 0) return [];
    const ftsQuery = terms.map((t) => `"${t}"`).join(" AND ");

    const params: unknown[] = [ftsQuery];
    let excludeClause = "";
    if (opts.excludeSessionId) {
      excludeClause = " AND sessionId != ?";
      params.push(opts.excludeSessionId);
    }
    params.push(limit * 4); // traer más candidatos y filtrar por calidad

    const rows = conn
      .prepare(
        `SELECT sessionId, turnId, type, content FROM events_fts
         WHERE events_fts MATCH ?${excludeClause}
         ORDER BY rank
         LIMIT ?`,
      )
      .all(...params) as unknown as Array<{
      sessionId: string;
      turnId: string;
      type: string;
      content: string;
    }>;

    // La memoria episódica de VALOR es la de mensajes y razonamiento (cómo se
    // resolvió algo: schema, filtros, procedimiento). Los action.result/
    // actions.requested son JSON crudo de tool calls — ruido técnico, se filtran.
    const VALUE_TYPES = new Set(["message.completed", "reasoning.completed", "message.received"]);
    const ranked = rows
      .filter((r) => VALUE_TYPES.has(r.type) && r.content.length > 60)
      .slice(0, limit);

    return ranked.map((r, i) => ({
      sessionId: r.sessionId,
      type: r.type,
      // La memoria entra al prompt del modelo: se sanitiza igual que el twin
      // (nada de metadata de la fábrica — "tenant", rutas, capas, kernel — en
      // el contexto del runtime). Sesiones viejas (ej. prompts de evals) pueden
      // contener "en este tenant..."; aquí se neutralizan antes de inyectarse.
      content: cleanTwinText(r.content.slice(0, maxChars)),
      ageRank: i,
    }));
  } catch {
    return []; // blindado: nunca romper la llamada al modelo
  }
}

/**
 * Búsqueda de memoria episódica: top N fragmentos del historial que matchean.
 * Devuelve el contexto histórico relevante para el turno actual.
 * `excludeSessionId`: excluye la sesión en curso (la memoria episódica es de
 * sesiones PREVIAS; la actual ya está en el contexto del turno).
 */
export function searchEpisodicMemory(
  query: string,
  opts: { limit?: number; since?: string; excludeSessionId?: string } = {},
): MemoryHit[] {
  try {
    ensureFts();
    reindexSearchableEvents(); // indexar incremental antes de buscar
    const limit = Math.max(1, Math.min(20, opts.limit ?? 5));
    const conn = getDb();
    // FTS5 query: escapar comillas y construir una query de términos AND
    const terms = query
      .replace(/["']/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 8);
    if (terms.length === 0) return [];
    const ftsQuery = terms.map((t) => `"${t}"`).join(" AND ");

    const params: unknown[] = [ftsQuery];
    let excludeClause = "";
    if (opts.excludeSessionId) {
      excludeClause = " AND sessionId != ?";
      params.push(opts.excludeSessionId);
    }
    params.push(limit);

    const rows = conn
      .prepare(
        `SELECT sessionId, turnId, type, snippet(events_fts, 3, '[', ']', '…', 24) AS snippet
         FROM events_fts
         WHERE events_fts MATCH ?${excludeClause}
         ORDER BY rank
         LIMIT ?`,
      )
      .all(...params) as unknown as Array<{
      sessionId: string;
      turnId: string;
      type: string;
      snippet: string;
    }>;

    return rows.map((r, i) => ({
      sessionId: r.sessionId,
      turnId: r.turnId,
      type: r.type,
      snippet: r.snippet,
      score: 1 / (i + 1),
    }));
  } catch {
    return []; // nunca romper el turno por un fallo de búsqueda
  }
}
