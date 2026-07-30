import { appendFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Puente de observabilidad: la instrumentación (server, agent/instrumentation.ts)
// captura el INPUT REAL al LLM en cada step.started y lo anexa aquí; un endpoint
// SvelteKit (src/routes/debug/llm-io) lo lee y el navegador lo renderiza en el
// panel DevTools. Archivo porque Eve (runtime) y SvelteKit pueden vivir en
// contextos distintos del mismo proceso dev; un archivo cruza ese límite.

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

const LOG_PATH = join(resolveRoot(), ".eve", "llm-io.jsonl");
const MAX_RECORDS = 200; // ring buffer lógico al leer

export interface LlmIoRecord {
  sessionId: string;
  turn: number;
  step: number;
  at: string;
  /** System prompt resuelto (string, array de system messages, o null). */
  instructions: unknown;
  /** Historial de mensajes no-system enviado al modelo. */
  messages: unknown;
}

/** Anexa un snapshot del input al modelo (append-only, una línea JSON). */
export async function recordModelInput(rec: LlmIoRecord): Promise<void> {
  try {
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, JSON.stringify(rec) + "\n");
  } catch {
    // Nunca romper el turno por un fallo de escritura del log.
  }
}

/**
 * Lee los records recientes, opcionalmente filtrados por sesión. Devuelve los
 * últimos `MAX_RECORDS` como máximo (los más nuevos al final).
 */
export async function readModelInputs(sessionId?: string): Promise<LlmIoRecord[]> {
  let raw = "";
  try {
    raw = await readFile(LOG_PATH, "utf8");
  } catch {
    return [];
  }
  const out: LlmIoRecord[] = [];
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const rec = JSON.parse(s) as LlmIoRecord;
      if (!sessionId || rec.sessionId === sessionId) out.push(rec);
    } catch {
      // línea corrupta: ignorar
    }
  }
  return out.slice(-MAX_RECORDS);
}
