import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { runtimeConfig } from "./runtime-config.js";

// Localiza company-twin/ subiendo desde cwd (Eve bundlea, import.meta.url no sirve).
function resolveBundleRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "company-twin");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "company-twin");
}

// Store de aprendizajes del tenant activo (parte del Company Twin, capa state).
const LEARNINGS_PATH = join(
  resolveBundleRoot(),
  "companies",
  runtimeConfig.tenant,
  "state",
  "learnings.md",
);

/** Lee el contenido completo del store de aprendizajes (o "" si no existe). */
export async function readLearnings(): Promise<string> {
  try {
    return await readFile(LEARNINGS_PATH, "utf8");
  } catch {
    return "";
  }
}

/**
 * Añade un aprendizaje (append-only) si no existe ya uno con el mismo `key`.
 * Formato: `- [key] texto` para permitir dedupe simple por substring.
 */
export async function recordLearning(key: string, text: string): Promise<void> {
  const existing = await readLearnings();
  if (existing.includes(`[${key}]`)) return; // ya registrado
  await mkdir(dirname(LEARNINGS_PATH), { recursive: true });
  const stamp = new Date().toISOString();
  await appendFile(LEARNINGS_PATH, `- [${key}] ${text} _(${stamp})_\n`);
}
