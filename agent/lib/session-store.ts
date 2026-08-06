import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Registro de sesiones para el sidebar de "conversaciones anteriores" en
// /chat. Escrito por agent/hooks/session-log.ts (runtime), leído por
// src/routes/api/sessions/* (SvelteKit) — mismo patrón puente-por-proceso que
// agent/lib/llm-io.ts y agent/lib/trace-store.
//
// Persiste en `.data/sessions.sqlite3` (SQLite vía `node:sqlite`, built-in en
// Node 24, sin dependencias nuevas) — DELIBERADAMENTE fuera de `.eve/` para
// sobrevivir un `rm -rf .eve` (purga habitual de este repo tras crashes o
// actualizaciones de Eve, que borra `.eve/.workflow-data` y por tanto el
// estado durable REAL de Eve — ver nota en memoria de repo).
//
// Además del índice (`sessions`), espejamos el stream COMPLETO de eventos en
// la tabla `events` (patrón oficial de Eve: "Persist events to your own
// database", ver node_modules/eve/docs/guides/hooks.md) — así el historial
// de cada conversación (mensajes, razonamiento, tool calls) sobrevive un
// purge de `.eve/` y se acumula sin límite como corpus propio para minería
// futura (analítica, evals, fine-tuning). `events` NUNCA se trunca (a
// diferencia de `sessions`, que sí tiene MAX_SESSIONS).
//
// Se descartó DAB para esto: DAB expone entidades ERP de un tenant remoto
// específico (ICF, joyarock…) — este es dato propio del agente (no de
// negocio), no pertenece al esquema de ningún tenant, y tenants remotos
// (ICF) no son infraestructura nuestra para agregarles tablas.

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
const MAX_SESSIONS = 500; // tope duro: descarta las más viejas por updatedAt
// Un turno real refresca `updatedAt` al iniciar/cerrar; si `active=1` lleva
// más de 1h sin tocar nada, es un turno huérfano (proceso muerto a mitad de
// turno — ver gotcha "sesiones huérfanas") y se trata como inactivo.
const ACTIVE_STALE_MS = 60 * 60 * 1000;

export interface SessionRecord {
  readonly id: string;
  title: string;
  readonly createdAt: string;
  updatedAt: string;
  /** true mientras hay un turno en curso (respondiendo ahora mismo). */
  active: boolean;
  turns: number;
  /** true si el usuario la archivó — se oculta de la lista principal del sidebar. */
  archived: boolean;
}

let db: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      active INTEGER NOT NULL,
      turns INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_updatedAt ON sessions (updatedAt);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      type TEXT NOT NULL,
      emittedAt TEXT NOT NULL,
      data TEXT
    );
    CREATE INDEX IF NOT EXISTS events_session ON events (sessionId, id);

    -- Radiografía durable del self-improvement: el INPUT real al LLM (lo que
    -- se le mandó en cada step) y el resumen de cada turno. Viven AQUÍ (no en
    -- .eve/llm-io.jsonl ni .eve/traces.jsonl) para sobrevivir el purge
    -- habitual de .eve/. Sin tope (minería), como la tabla events.
    CREATE TABLE IF NOT EXISTS llm_inputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      turn INTEGER NOT NULL,
      step INTEGER NOT NULL,
      at TEXT NOT NULL,
      instructions TEXT,
      messages TEXT
    );
    CREATE INDEX IF NOT EXISTS llm_inputs_session ON llm_inputs (sessionId, id);

    CREATE TABLE IF NOT EXISTS turn_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      turn INTEGER NOT NULL,
      at TEXT NOT NULL,
      turnMs INTEGER NOT NULL,
      steps INTEGER NOT NULL,
      toolCalls INTEGER NOT NULL,
      inputTok INTEGER NOT NULL,
      outputTok INTEGER NOT NULL,
      cacheRead INTEGER NOT NULL,
      cacheHit REAL NOT NULL,
      errors INTEGER NOT NULL,
      warnings INTEGER NOT NULL,
      status TEXT NOT NULL,
      tools TEXT
    );
    CREATE INDEX IF NOT EXISTS turn_summaries_session ON turn_summaries (sessionId, id);
  `);
  // Migración: `archived` se añadió después de la creación original de la
  // tabla — SQLite no soporta `ADD COLUMN IF NOT EXISTS`, así que se checa
  // vía PRAGMA antes de alterar (idempotente entre reinicios).
  const cols = db.prepare("PRAGMA table_info(sessions)").all() as unknown as { name: string }[];
  if (!cols.some((c) => c.name === "archived")) {
    db.exec("ALTER TABLE sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }
  // Arranque del proceso: ningún turno puede estar corriendo en un proceso
  // recién creado, así que limpiar flags `active` huérfanos (un kill del dev
  // server a mitad de turno deja active=1 sin evento de cierre).
  db.exec("UPDATE sessions SET active = 0");
  return db;
}

interface SessionRow {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  active: number;
  turns: number;
  archived: number;
}

function toRecord(row: SessionRow): SessionRecord {
  return { ...row, active: row.active === 1, archived: row.archived === 1 };
}

function defaultRecord(id: string): SessionRecord {
  const now = new Date().toISOString();
  return { id, title: "Nueva conversación", createdAt: now, updatedAt: now, active: false, turns: 0, archived: false };
}

// Solo `touchSessionStarted` puede CREAR una fila nueva. El resto ignora
// silenciosamente ids desconocidos — así una sesión de subagente (nunca
// registrada por el hook) nunca aparece en el índice aunque emita
// turn.started/turn.completed propios. `node:sqlite` es síncrono: cada
// llamada corre en un solo tick de JS, sin necesidad de una cola de
// escritura para serializar accesos concurrentes.
function update(id: string, patch: (rec: SessionRecord) => SessionRecord, create: boolean): void {
  const conn = getDb();
  const existingRow = conn.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  if (!existingRow && !create) return;
  const next = patch(existingRow ? toRecord(existingRow) : defaultRecord(id));
  conn
    .prepare(
      `INSERT INTO sessions (id, title, createdAt, updatedAt, active, turns, archived) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, updatedAt = excluded.updatedAt,
         active = excluded.active, turns = excluded.turns, archived = excluded.archived`,
    )
    .run(next.id, next.title, next.createdAt, next.updatedAt, next.active ? 1 : 0, next.turns, next.archived ? 1 : 0);

  conn
    .prepare(
      `DELETE FROM sessions WHERE id NOT IN (SELECT id FROM sessions ORDER BY updatedAt DESC LIMIT ?)`,
    )
    .run(MAX_SESSIONS);
}

export async function touchSessionStarted(id: string): Promise<void> {
  update(id, (rec) => ({ ...rec, active: true, updatedAt: new Date().toISOString() }), true);
}

/** Fija el título con el primer mensaje del usuario; no lo vuelve a tocar. */
export async function setSessionTitleFromFirstMessage(id: string, text: string): Promise<void> {
  const title = text.trim().slice(0, 80);
  if (!title) return;
  update(
    id,
    (rec) => (rec.title !== "Nueva conversación" ? rec : { ...rec, title, updatedAt: new Date().toISOString() }),
    false,
  );
}

export async function markTurnStarted(id: string): Promise<void> {
  update(id, (rec) => ({ ...rec, active: true, turns: rec.turns + 1, updatedAt: new Date().toISOString() }), false);
}

export async function markSessionIdle(id: string): Promise<void> {
  update(id, (rec) => ({ ...rec, active: false, updatedAt: new Date().toISOString() }), false);
}

/** Lista más recientes primero (por updatedAt). Por defecto excluye archivadas. */
export async function listSessions(opts: { archived?: boolean } = {}): Promise<SessionRecord[]> {
  // Solo se reporta `active` si la última actividad es reciente; una sesión
  // "activa" sin tocar `updatedAt` en >1h es un turno huérfano y se lista
  // como inactiva (auto-curado si el proceso sigue vivo tras un crash).
  const cutoff = new Date(Date.now() - ACTIVE_STALE_MS).toISOString();
  const rows = getDb()
    .prepare(
      "SELECT * FROM sessions WHERE archived = ? AND (active = 0 OR updatedAt > ?) ORDER BY updatedAt DESC",
    )
    .all(opts.archived ? 1 : 0, cutoff) as unknown as SessionRow[];
  return rows.map(toRecord);
}

/** Archiva/desarchiva una sesión existente; no toca `updatedAt` (no reordena la lista). */
export async function setSessionArchived(id: string, archived: boolean): Promise<void> {
  update(id, (rec) => ({ ...rec, archived }), false);
}

/** Elimina una sesión y todos sus eventos/inputs/resúmenes espejados. Irreversible. */
export async function deleteSession(id: string): Promise<void> {
  const conn = getDb();
  conn.prepare("DELETE FROM events WHERE sessionId = ?").run(id);
  conn.prepare("DELETE FROM llm_inputs WHERE sessionId = ?").run(id);
  conn.prepare("DELETE FROM turn_summaries WHERE sessionId = ?").run(id);
  conn.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

// ── Espejo del stream completo (mineria) ──────────────────────────────────

export interface StoredEvent {
  readonly type: string;
  readonly data: unknown;
  readonly meta: { readonly id: string; readonly at: string };
}

interface EventRow {
  id: string;
  sessionId: string;
  type: string;
  emittedAt: string;
  data: string | null;
}

/**
 * Persiste un evento crudo del stream de Eve. `INSERT OR IGNORE` porque los
 * hooks son at-least-once (un evento puede reintentar) y `meta.id` ya es la
 * clave estable recomendada por Eve para deduplicar sin perder nada.
 */
export async function appendEvent(sessionId: string, event: StoredEvent): Promise<void> {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO events (id, sessionId, type, emittedAt, data) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(event.meta.id, sessionId, event.type, event.meta.at, JSON.stringify(event.data ?? null));
}

/** Eventos completos de una sesión, en orden de emisión (meta.id es ULID = ordenable). */
export async function listEvents(sessionId: string): Promise<StoredEvent[]> {
  const rows = getDb()
    .prepare("SELECT * FROM events WHERE sessionId = ? ORDER BY id ASC")
    .all(sessionId) as unknown as EventRow[];
  return rows.map((row) => ({
    type: row.type,
    data: row.data ? JSON.parse(row.data) : undefined,
    meta: { id: row.id, at: row.emittedAt },
  }));
}

// ── Radiografía durable (llm_inputs + turn_summaries) ─────────────────────
// Estas tablas viven en SQLite (`.data/sessions.sqlite3`), NO en `.eve/`, para
// que el input real al LLM y los resúmenes de turno sobrevivan el purge
// habitual (`rm -rf .eve`) y se acumulen sin tope como corpus de evaluación.

/** El INPUT real a una llamada del LLM (lo que el modelo recibió en un step). */
export interface LlmInputRecord {
  sessionId: string;
  turn: number;
  step: number;
  at: string;
  instructions: unknown;
  messages: unknown;
}

/** Persiste el input al LLM en SQLite (durable; .eve/llm-io.jsonl se pierde en el purge). */
export async function appendLlmInput(rec: LlmInputRecord): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO llm_inputs (sessionId, turn, step, at, instructions, messages) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rec.sessionId,
        rec.turn,
        rec.step,
        rec.at,
        JSON.stringify(rec.instructions ?? null),
        JSON.stringify(rec.messages ?? null),
      );
  } catch {
    // nunca romper el turno por un fallo de persistencia
  }
}

/** Lee inputs del LLM, más recientes primero. */
export async function listLlmInputs(
  opts: { sessionId?: string; limit?: number } = {},
): Promise<LlmInputRecord[]> {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  const rows = opts.sessionId
    ? getDb()
        .prepare("SELECT * FROM llm_inputs WHERE sessionId = ? ORDER BY id DESC LIMIT ?")
        .all(opts.sessionId, limit)
    : getDb().prepare("SELECT * FROM llm_inputs ORDER BY id DESC LIMIT ?").all(limit);
  return (rows as unknown as Array<Record<string, string | number>>).map((r) => ({
    sessionId: String(r.sessionId),
    turn: Number(r.turn),
    step: Number(r.step),
    at: String(r.at),
    instructions: r.instructions ? JSON.parse(String(r.instructions)) : null,
    messages: r.messages ? JSON.parse(String(r.messages)) : null,
  }));
}

/** Resumen de un turno terminado (misma forma que TurnTrace de trace-store). */
export interface TurnSummaryRecord {
  sessionId: string;
  turn: number;
  at: string;
  turnMs: number;
  steps: number;
  toolCalls: number;
  inputTok: number;
  outputTok: number;
  cacheRead: number;
  cacheHit: number;
  errors: number;
  warnings: number;
  status: string;
  tools: unknown;
}

/** Persiste el resumen del turno en SQLite (durable; .eve/traces.jsonl se pierde en el purge). */
export async function appendTurnSummary(rec: TurnSummaryRecord): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO turn_summaries (sessionId, turn, at, turnMs, steps, toolCalls, inputTok, outputTok, cacheRead, cacheHit, errors, warnings, status, tools)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rec.sessionId,
        rec.turn,
        rec.at,
        rec.turnMs,
        rec.steps,
        rec.toolCalls,
        rec.inputTok,
        rec.outputTok,
        rec.cacheRead,
        rec.cacheHit,
        rec.errors,
        rec.warnings,
        rec.status,
        JSON.stringify(rec.tools ?? []),
      );
  } catch {
    // nunca romper
  }
}

/** Lee resúmenes de turno, más recientes primero. */
export async function listTurnSummaries(
  opts: { sessionId?: string; limit?: number } = {},
): Promise<TurnSummaryRecord[]> {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 500));
  const rows = opts.sessionId
    ? getDb()
        .prepare("SELECT * FROM turn_summaries WHERE sessionId = ? ORDER BY id DESC LIMIT ?")
        .all(opts.sessionId, limit)
    : getDb().prepare("SELECT * FROM turn_summaries ORDER BY id DESC LIMIT ?").all(limit);
  return (rows as unknown as Array<Record<string, string | number>>).map((r) => ({
    sessionId: String(r.sessionId),
    turn: Number(r.turn),
    at: String(r.at),
    turnMs: Number(r.turnMs),
    steps: Number(r.steps),
    toolCalls: Number(r.toolCalls),
    inputTok: Number(r.inputTok),
    outputTok: Number(r.outputTok),
    cacheRead: Number(r.cacheRead),
    cacheHit: Number(r.cacheHit),
    errors: Number(r.errors),
    warnings: Number(r.warnings),
    status: String(r.status),
    tools: r.tools ? JSON.parse(String(r.tools)) : [],
  }));
}
