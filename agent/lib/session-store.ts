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
  `);
  // Migración: `archived` se añadió después de la creación original de la
  // tabla — SQLite no soporta `ADD COLUMN IF NOT EXISTS`, así que se checa
  // vía PRAGMA antes de alterar (idempotente entre reinicios).
  const cols = db.prepare("PRAGMA table_info(sessions)").all() as unknown as { name: string }[];
  if (!cols.some((c) => c.name === "archived")) {
    db.exec("ALTER TABLE sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }
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
  const rows = getDb()
    .prepare("SELECT * FROM sessions WHERE archived = ? ORDER BY updatedAt DESC")
    .all(opts.archived ? 1 : 0) as unknown as SessionRow[];
  return rows.map(toRecord);
}

/** Archiva/desarchiva una sesión existente; no toca `updatedAt` (no reordena la lista). */
export async function setSessionArchived(id: string, archived: boolean): Promise<void> {
  update(id, (rec) => ({ ...rec, archived }), false);
}

/** Elimina una sesión y todos sus eventos espejados. Irreversible. */
export async function deleteSession(id: string): Promise<void> {
  const conn = getDb();
  conn.prepare("DELETE FROM events WHERE sessionId = ?").run(id);
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
