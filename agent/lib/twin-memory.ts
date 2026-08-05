import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadRuntimeConfig } from "./runtime-config.js";

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

// Store de aprendizajes del tenant ACTIVO (parte del Company Twin, capa state).
// Se resuelve fresco por llamada para seguir al tenant activo sin reiniciar.
function learningsPath(): string {
  return join(resolveBundleRoot(), "companies", loadRuntimeConfig().tenant, "state", "learnings.md");
}

/** Lee el contenido completo del store de aprendizajes (o "" si no existe). */
export async function readLearnings(): Promise<string> {
  try {
    return await readFile(learningsPath(), "utf8");
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
  const path = learningsPath();
  await mkdir(dirname(path), { recursive: true });
  const stamp = new Date().toISOString();
  await appendFile(path, `- [${key}] ${text} _(${stamp})_\n`);
}
