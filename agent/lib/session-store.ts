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
// Retención de `llm_inputs` (el input real al LLM por step): es la tabla que
// más crece después de `events`. `events` NUNCA se trunca (corpus de minería,
// decisión explícita del usuario); `llm_inputs` SÍ tiene TTL configurable para
// producción vía SIGMA_LLM_RETENTION_DAYS (default 30 días).
const LLM_RETENTION_DAYS = (() => {
  const raw = process.env.SIGMA_LLM_RETENTION_DAYS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 30;
})();

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
  /** origen: "chat" (humano en /chat) | "eval" (harness e2e-demo / evals). */
  source: "chat" | "eval";
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
      turns INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'chat'
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

    -- Respuestas HITL (ask_question / approvals) enviadas por el usuario. El
    -- reducer del cliente marca una gate como respondida con el evento LOCAL
    -- 'client.input.responded', que NUNCA viaja por el stream de Eve ni llega
    -- a 'events' (ver eve-agent-store.js #x). Sin persistirlas aparte, al
    -- reabrir una sesión terminada el transcript se reconstruye desde 'events'
    -- y todas las gates vuelven a 'approval-requested' (parecen sin responder).
    -- GET /api/sessions/[id] re-inyecta estas respuestas como eventos
    -- sintéticos 'client.input.responded' después del 'input.requested'
    -- correspondiente para reconstruir fielmente el estado respondido.
    CREATE TABLE IF NOT EXISTS input_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      requestId TEXT NOT NULL,
      response TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS input_responses_session_request
      ON input_responses (sessionId, requestId);


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

    -- Estado mínimo del runtime CROSS-REALM: los authored modules de Eve (hooks/
    -- instructions vs. el middleware del modelo) corren en realms distintos
    -- (un tracker en globalThis NO cruza). SQLite es el punto común (ambos
    -- escriben/leen el MISMO .data/sessions.sqlite3), así que el sessionId
    -- actual se persiste aquí para que context-budget.ts lo lea (exclusión de
    -- la sesión actual + radiografía de inyecciones).
    CREATE TABLE IF NOT EXISTS runtime_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Radiografía de inyecciones de contexto (lóbulo frontal + memoria episódica).
    -- llm_inputs captura el prompt PRE-middleware (por eso planTag sale null); estas
    -- inyecciones las registra el propio middleware (context-budget.ts) al inyectar,
    -- para que sean analizables/evaluables en el tiempo: qué se inyectó, cuándo,
    -- cuánto pesó y de qué sesiones previas salió la memoria.
    CREATE TABLE IF NOT EXISTS prompt_injections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      at TEXT NOT NULL,
      kind TEXT NOT NULL,
      tag TEXT NOT NULL,
      chars INTEGER NOT NULL,
      hits INTEGER,
      message TEXT,
      sources TEXT
    );
    CREATE INDEX IF NOT EXISTS prompt_injections_session ON prompt_injections (sessionId, id);

    -- Evaluaciones de CALIDAD de respuestas (fábrica, para graduación): cada
    -- corrida de una pregunta evaluada guarda invariantes verificados,
    -- congruencia vs. otras corridas y métricas. Auditable: alimenta la
    -- tendencia de "¿un skill está listo para subir de etapa?" (tesis:
    -- eval-first). Escrita por scripts/eval-calidad.mjs, leída por
    -- /api/audit/evaluaciones.
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      caso TEXT NOT NULL,
      skill TEXT NOT NULL,
      pregunta TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      turnId TEXT NOT NULL,
      status TEXT NOT NULL,
      errors INTEGER NOT NULL,
      inputTok INTEGER NOT NULL,
      turnMs INTEGER NOT NULL,
      invariantes TEXT,
      exactitud REAL NOT NULL,
      congruencia REAL,
      respuesta TEXT
    );
    CREATE INDEX IF NOT EXISTS evaluaciones_caso ON evaluaciones (caso, id);
  `);
  // Migración: `archived` se añadió después de la creación original de la
  // tabla — SQLite no soporta `ADD COLUMN IF NOT EXISTS`, así que se checa
  // vía PRAGMA antes de alterar (idempotente entre reinicios).
  const cols = db.prepare("PRAGMA table_info(sessions)").all() as unknown as { name: string }[];
  if (!cols.some((c) => c.name === "archived")) {
    db.exec("ALTER TABLE sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.some((c) => c.name === "source")) {
    db.exec("ALTER TABLE sessions ADD COLUMN source TEXT NOT NULL DEFAULT 'chat'");
  }
  // Migración de `evaluaciones` (v2 del evaluador de calidad 2026-08-06):
  // columnas de métricas completas + hallazgos de minería.
  const ecols = db.prepare("PRAGMA table_info(evaluaciones)").all() as unknown as { name: string }[];
  const evalMigrations: Array<[string, string]> = [
    ["steps", "INTEGER NOT NULL DEFAULT 0"],
    ["toolCalls", "INTEGER NOT NULL DEFAULT 0"],
    ["outputTok", "INTEGER NOT NULL DEFAULT 0"],
    ["cacheHit", "REAL NOT NULL DEFAULT 0"],
    ["warnings", "INTEGER NOT NULL DEFAULT 0"],
    ["hallazgos", "TEXT"],
  ];
  for (const [name, def] of evalMigrations) {
    if (!ecols.some((c) => c.name === name)) {
      db.exec(`ALTER TABLE evaluaciones ADD COLUMN ${name} ${def}`);
    }
  }
  // Arranque del proceso: ningún turno puede estar corriendo en un proceso
  // recién creado, así que limpiar flags `active` huérfanos (un kill del dev
  // server a mitad de turno deja active=1 sin evento de cierre).
  db.exec("UPDATE sessions SET active = 0");
  pruneLlmInputs();
  return db;
}

// Solo corre 1 vez por proceso (el HMR de Vite re-ejecuta el módulo y
// re-dispara getDb; la poda no debe repetirse a mitad de trabajo).
let llmRetentionPruned = false;

/**
 * Poda de retención de `llm_inputs`: borra los inputs al LLM más viejos que
 * `LLM_RETENTION_DAYS`. No toca `events` (corpus de minería sin tope).
 */
export function pruneLlmInputs(): void {
  if (llmRetentionPruned) return;
  llmRetentionPruned = true;
  try {
    const cutoff = new Date(Date.now() - LLM_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const res = getDb().prepare("DELETE FROM llm_inputs WHERE at < ?").run(cutoff);
    if (res.changes > 0) {
      console.error(
        `[session-store] retención: ${res.changes} llm_inputs > ${LLM_RETENTION_DAYS} días eliminados`,
      );
    }
  } catch {
    // nunca romper el arranque por un fallo de poda
  }
}

interface SessionRow {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  active: number;
  turns: number;
  archived: number;
  source: string;
}

function toRecord(row: SessionRow): SessionRecord {
  return {
    ...row,
    active: row.active === 1,
    archived: row.archived === 1,
    source: row.source === "eval" ? "eval" : "chat",
  };
}

function defaultRecord(id: string): SessionRecord {
  const now = new Date().toISOString();
  return { id, title: "Nueva conversación", createdAt: now, updatedAt: now, active: false, turns: 0, archived: false, source: "chat" };
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
      `INSERT INTO sessions (id, title, createdAt, updatedAt, active, turns, archived, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, updatedAt = excluded.updatedAt,
         active = excluded.active, turns = excluded.turns, archived = excluded.archived, source = excluded.source`,
    )
    .run(next.id, next.title, next.createdAt, next.updatedAt, next.active ? 1 : 0, next.turns, next.archived ? 1 : 0, next.source);

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
export async function listSessions(
  opts: { archived?: boolean; source?: "chat" | "eval" } = {},
): Promise<SessionRecord[]> {
  // Solo se reporta `active` si la última actividad es reciente; una sesión
  // "activa" sin tocar `updatedAt` en >1h es un turno huérfano y se lista
  // como inactiva (auto-curado si el proceso sigue vivo tras un crash).
  const cutoff = new Date(Date.now() - ACTIVE_STALE_MS).toISOString();
  const conn = getDb();
  let sql = "SELECT * FROM sessions WHERE archived = ? AND (active = 0 OR updatedAt > ?)";
  const params: (string | number)[] = [opts.archived ? 1 : 0, cutoff];
  if (opts.source === "chat" || opts.source === "eval") {
    sql += " AND source = ?";
    params.push(opts.source);
  }
  sql += " ORDER BY updatedAt DESC";
  const rows = conn.prepare(sql).all(...params) as unknown as SessionRow[];
  return rows.map(toRecord);
}

/** Marca el origen de una sesión ("chat" humano en /chat | "eval" del harness). */
export async function setSessionSource(id: string, source: "chat" | "eval"): Promise<void> {
  try {
    getDb().prepare("UPDATE sessions SET source = ? WHERE id = ?").run(source, id);
  } catch {
    // nunca romper por un fallo de marcado
  }
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
 * Tipos de eventos de STREAMING que NO se persisten en el espejo: los deltas
 * (`reasoning.appended`/`message.appended`) son ruido transitorio — cada uno
 * traía `reasoningSoFar`/`messageSoFar` (TODO lo acumulado) y hacían crecer la
 * BD cuadráticamente (856MB de 920MB eran reasoning.appended). La info VITAL
 * para auditar vive en los eventos COMPLETADOS (`reasoning.completed` con el
 * razonamiento final, `message.completed` con el mensaje final) + `meta.at`
 * (tiempos) + `step.completed.usage` (tokens) + `actions.requested/action.result`
 * (tools con su duración). Los deltas siguen llegando por el stream EN VIVO
 * (para el feed en tiempo real), solo no se guardan.
 */
const STREAM_DELTA_EVENTS = new Set(["reasoning.appended", "message.appended"]);

/**
 * Persiste un evento crudo del stream de Eve. `INSERT OR IGNORE` porque los
 * hooks son at-least-once (un evento puede reintentar) y `meta.id` ya es la
 * clave estable recomendada por Eve para deduplicar sin perder nada.
 * Los eventos de streaming (deltas) se descartan: no aportan a la auditoría.
 */
export async function appendEvent(sessionId: string, event: StoredEvent): Promise<void> {
  if (STREAM_DELTA_EVENTS.has(event.type)) return;
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO events (id, sessionId, type, emittedAt, data) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(event.meta.id, sessionId, event.type, event.meta.at, JSON.stringify(event.data ?? null));
}

/** Eventos de una sesión, en orden de emisión (meta.id es ULID = ordenable). */
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

// ── Respuestas HITL (para reconstruir gates respondidas al reabrir) ────────
// El reducer del cliente marca una gate como respondida con `client.input.
// responded` (evento LOCAL, nunca llega al stream de Eve). Para que al reabrir
// una sesión terminada las preguntas respondidas NO vuelvan a `approval-
// requested`, se persisten aquí (desde un endpoint POST) y GET /api/sessions/
// [id] las re-inyecta como eventos sintéticos tras el `input.requested`.

export interface StoredInputResponse {
  requestId: string;
  optionId?: string;
  text?: string;
}

/** Persiste respuestas HITL (upsert por sessionId+requestId, idempotente). */
export async function appendInputResponses(
  sessionId: string,
  responses: StoredInputResponse[],
): Promise<void> {
  try {
    const stmt = getDb().prepare(
      `INSERT INTO input_responses (sessionId, requestId, response, createdAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (sessionId, requestId) DO UPDATE SET response = excluded.response`,
    );
    const now = new Date().toISOString();
    for (const r of responses) {
      stmt.run(sessionId, r.requestId, JSON.stringify(r), now);
    }
  } catch {
    // nunca romper el flujo por un fallo de persistencia
  }
}

/** Lee las respuestas HITL persistidas de una sesión, en orden de inserción. */
export async function listInputResponses(sessionId: string): Promise<StoredInputResponse[]> {
  try {
    const rows = getDb()
      .prepare("SELECT response FROM input_responses WHERE sessionId = ? ORDER BY id ASC")
      .all(sessionId) as unknown as Array<{ response: string }>;
    return rows.map((row) => JSON.parse(row.response) as StoredInputResponse);
  } catch {
    return [];
  }
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

// ── Estado mínimo del runtime (cross-realm) ────────────────────────────────
// Ver nota en el DDL de `runtime_state`. Tanto hooks como el middleware del
// modelo resuelven el MISMO archivo SQLite vía getDb() (resolveRoot()), por lo
// que este key-value cruza los realms sin importar dónde se escriba/lea.

export function setRuntimeState(key: string, value: string | null): void {
  try {
    if (value == null) {
      getDb().prepare("DELETE FROM runtime_state WHERE key = ?").run(key);
    } else {
      getDb()
        .prepare(
          "INSERT INTO runtime_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .run(key, value);
    }
  } catch {
    // nunca romper por el estado del runtime
  }
}

export function getRuntimeState(key: string): string | null {
  try {
    const row = getDb().prepare("SELECT value FROM runtime_state WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Última sesión que emitió `session.started` en el espejo de eventos. Fuente
 * CROSS-REALM confiable para el middleware de context-budget: el hook escribe
 * los eventos en el MISMO `.data/sessions.sqlite3` que lee el middleware, sin
 * depender de globalThis ni de tablas auxiliares que algún bundle pueda no ver.
 */
export function getLastStartedSessionId(): string | null {
  try {
    const row = getDb()
      .prepare("SELECT sessionId FROM events WHERE type = 'session.started' ORDER BY id DESC LIMIT 1")
      .get() as { sessionId: string } | undefined;
    return row?.sessionId ?? null;
  } catch {
    return null;
  }
}

/** Una inyección de contexto registrada por el middleware (plan o memoria). */
export interface PromptInjectionRecord {
  sessionId: string;
  at: string;
  kind: "plan" | "memory";
  tag: string;
  chars: number;
  hits?: number;
  message?: string;
  sources?: Array<{ sessionId: string; type: string }>;
}

/** Persiste una inyección de contexto (durable; llm_inputs no la captura). */
export async function appendPromptInjection(rec: PromptInjectionRecord): Promise<void> {
  try {
    getDb()
      .prepare(
        `INSERT INTO prompt_injections (sessionId, at, kind, tag, chars, hits, message, sources)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rec.sessionId,
        rec.at,
        rec.kind,
        rec.tag,
        rec.chars,
        rec.hits ?? null,
        rec.message ? String(rec.message).slice(0, 300) : null,
        rec.sources ? JSON.stringify(rec.sources) : null,
      );
  } catch {
    // nunca romper el turno por un fallo de persistencia
  }
}

/** Lee inyecciones de contexto, más recientes primero. */
export async function listPromptInjections(
  opts: { sessionId?: string; kind?: "plan" | "memory"; limit?: number } = {},
): Promise<PromptInjectionRecord[]> {
  const limit = Math.max(1, Math.min(500, opts.limit ?? 100));
  const where: string[] = [];
  const params: Array<string | number | null> = [];
  if (opts.sessionId) {
    where.push("sessionId = ?");
    params.push(opts.sessionId);
  }
  if (opts.kind) {
    where.push("kind = ?");
    params.push(opts.kind);
  }
  let sql = "SELECT * FROM prompt_injections";
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY id DESC LIMIT ?";
  params.push(limit);
  const rows = getDb().prepare(sql).all(...params) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    sessionId: String(r.sessionId),
    at: String(r.at),
    kind: String(r.kind) as "plan" | "memory",
    tag: String(r.tag),
    chars: Number(r.chars),
    hits: r.hits == null ? undefined : Number(r.hits),
    message: r.message == null ? undefined : String(r.message),
    sources: r.sources ? JSON.parse(String(r.sources)) : undefined,
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

// ── Evaluaciones de calidad (fábrica, para graduación) — v2 (2026-08-06) ──
// v2: invariantes con valor REAL esperado (probe MCP en vivo), valor hallado
// (extraído de la respuesta), acierto vs la verdad (no solo presencia), y
// hallazgos de minería (qué conocimiento falta → promote-learnings).

export interface EvaluacionInvariante {
  /** clave corta única (ej. "frijol-negro-piezas"). */
  clave: string;
  /** etiqueta humana (ej. "Frijol Negro · piezas"). */
  etiqueta: string;
  /** valor REAL esperado (del probe MCP del snapshot actual). */
  esperado: string | number | null;
  /** valor que el modelo reportó (extraído de la respuesta) o null. */
  hallado: string | number | null;
  /** ¿el valor reportado coincide con el esperado (tolerancia 2%)? */
  acierto: boolean;
  /** ¿la etiqueta/familia fue mencionada en la respuesta? */
  cobertura: boolean;
}

export interface EvaluacionHallazgo {
  tipo: "dato-faltante" | "dato-incorrecto" | "formato" | "skill";
  invariante: string;
  esperado: string | number | null;
  hallado: string | number | null;
  detalle: string;
}

export interface EvaluacionRecord {
  id?: number;
  at: string;
  caso: string;
  skill: string;
  pregunta: string;
  sessionId: string;
  turnId: string;
  status: string;
  errors: number;
  steps: number;
  toolCalls: number;
  inputTok: number;
  outputTok: number;
  cacheHit: number;
  warnings: number;
  turnMs: number;
  invariantes: EvaluacionInvariante[];
  /** Fracción de invariantes ACERTADOS vs la verdad (0..1). */
  exactitud: number;
  /** 1 si el set de valores EXTRAÍDOS coincide con el de otras corridas del mismo caso (null si sin referencia). */
  congruencia: number | null;
  hallazgos: EvaluacionHallazgo[];
  respuesta: string;
}

/** Persiste una evaluación de calidad (una corrida de una pregunta). */
export async function appendEvaluacion(rec: EvaluacionRecord): Promise<void> {
  getDb()
    .prepare(
      `INSERT INTO evaluaciones
        (at, caso, skill, pregunta, sessionId, turnId, status, errors, steps, toolCalls, inputTok, outputTok, cacheHit, warnings, turnMs, invariantes, exactitud, congruencia, hallazgos, respuesta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      rec.at,
      rec.caso,
      rec.skill,
      rec.pregunta,
      rec.sessionId,
      rec.turnId,
      rec.status,
      rec.errors,
      rec.steps,
      rec.toolCalls,
      rec.inputTok,
      rec.outputTok,
      rec.cacheHit,
      rec.warnings,
      rec.turnMs,
      JSON.stringify(rec.invariantes),
      rec.exactitud,
      rec.congruencia ?? null,
      JSON.stringify(rec.hallazgos ?? []),
      rec.respuesta,
    );
}

/** Lee evaluaciones, más recientes primero; opcional filtrar por caso. */
export async function listEvaluaciones(opts: { caso?: string; limit?: number } = {}): Promise<EvaluacionRecord[]> {
  const limit = Math.max(1, Math.min(1000, opts.limit ?? 500));
  const rows = opts.caso
    ? getDb()
        .prepare("SELECT * FROM evaluaciones WHERE caso = ? ORDER BY id DESC LIMIT ?")
        .all(opts.caso, limit)
    : getDb().prepare("SELECT * FROM evaluaciones ORDER BY id DESC LIMIT ?").all(limit);
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: Number(r.id),
    at: String(r.at),
    caso: String(r.caso),
    skill: String(r.skill),
    pregunta: String(r.pregunta),
    sessionId: String(r.sessionId),
    turnId: String(r.turnId),
    status: String(r.status),
    errors: Number(r.errors ?? 0),
    steps: Number(r.steps ?? 0),
    toolCalls: Number(r.toolCalls ?? 0),
    inputTok: Number(r.inputTok ?? 0),
    outputTok: Number(r.outputTok ?? 0),
    cacheHit: Number(r.cacheHit ?? 0),
    warnings: Number(r.warnings ?? 0),
    turnMs: Number(r.turnMs ?? 0),
    invariantes: r.invariantes ? JSON.parse(String(r.invariantes)) : [],
    exactitud: Number(r.exactitud ?? 0),
    congruencia: r.congruencia === null || r.congruencia === undefined ? null : Number(r.congruencia),
    hallazgos: r.hallazgos ? JSON.parse(String(r.hallazgos)) : [],
    respuesta: String(r.respuesta ?? ""),
  }));
}
