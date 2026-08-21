import { readFile, appendFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
 *
 * ⚠️ BANDEJA (canal runtime → fábrica, 2026-08-19): el runtime ANEXA señales de
 * error; la fábrica (promote-learnings) las promueve al hogar canónico y vacía.
 * Por eso aquí NO hay timestamps ISO (jerga): la trazabilidad es la sesión
 * `(sesión wrun_...)` + la radiografía `.data/sessions.sqlite3`.
 *
 * 🔁 RECURRENCIA (coordinación runtime↔fábrica): si la key ya existe, se
 * incrementa el contador `[×N]` y se refresca la última sesión en vez de
 * duplicar la línea. La frecuencia es la señal que la fábrica necesita para
 * priorizar (un error aislado compila distinto a un patrón que se repite).
 */
export async function recordLearning(key: string, text: string): Promise<void> {
  try {
    const path = learningsPath();
    await mkdir(dirname(path), { recursive: true });
    const existing = await readLearnings();
    const lines = existing.split("\n");
    const idx = lines.findIndex((l) => l.startsWith(`- [${key}]`));
    if (idx >= 0) {
      // Recurrencia: key ya existe → contador + refrescar última sesión.
      const cur = lines[idx];
      const m = cur.match(/\[×(\d+)\]/);
      const n = m ? parseInt(m[1], 10) + 1 : 2;
      const newSes = text.match(/\(sesión (\w+)\)/)?.[1];
      let next = cur
        .replace(/\[×\d+\]/g, "")
        .replace(/\s*\(sesión \w+\)/g, "")
        .replace(/\s*_\([^)]*\)_/g, "")
        .trimEnd();
      next = `${next} [×${n}]${newSes ? ` (sesión ${newSes})` : ""}`;
      lines[idx] = next;
      await writeFile(path, lines.join("\n"), "utf8");
      return;
    }
    await appendFile(path, `- [${key}] ${text}\n`);
  } catch {
    // Nunca romper el runtime por un fallo del buffer.
  }
}

// ---------------------------------------------------------------------------
// Guard de canonicidad — el runtime y la fábrica COMPARTEN el mismo mapa.
// Antes de escribir una entrada al buffer, el hook consulta el hogar canónico
// (casing.md, modulos.md, kernel, twin del tenant): si el hecho ya está
// promovido, NO escribe un duplicado. Un error que persiste a pesar de estar
// canónico es un problema de RUTEO (el modelo no consulta el twin), y esa señal
// la agrega el tablero de la fábrica (`scripts/check-cycle.ts`) sobre la
// radiografía — no el buffer.
// ---------------------------------------------------------------------------

let canonicalCache: { at: number; text: string } = { at: 0, text: "" };
const CANONICAL_TTL_MS = 30_000;

export function canonicalIndexText(): string {
  const now = Date.now();
  if (canonicalCache.text && now - canonicalCache.at < CANONICAL_TTL_MS) return canonicalCache.text;
  const parts: string[] = [];
  try {
    const root = resolveBundleRoot();
    const tenant = loadRuntimeConfig().tenant;
    const seeds = [
      `${root}/erp-kernel/casing.md`,
      `${root}/erp-kernel/index.md`,
      `${root}/companies/${tenant}/modulos.md`,
    ];
    for (const p of seeds) {
      if (existsSync(p)) parts.push(readFileSync(p, "utf8"));
    }
    // walk ligero del kernel + twin del tenant (excluye index/log/state).
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        if (name === "index.md" || name === "log.md" || name === "state" || name === ".DS_Store") continue;
        const full = `${dir}/${name}`;
        try {
          if (statSync(full).isDirectory()) walk(full);
          else if (name.endsWith(".md")) parts.push(readFileSync(full, "utf8"));
        } catch {
          /* ignorar */
        }
      }
    };
    walk(`${root}/erp-kernel`);
    walk(`${root}/companies/${tenant}`);
  } catch {
    /* blindado: sin índice canónico, el guard es permisivo */
  }
  canonicalCache = { at: now, text: parts.join("\n") };
  return canonicalCache.text;
}

/** ¿El hecho (entidad o campo) ya vive en su hogar canónico? */
export function isLearningCanonical(kind: "entity" | "field", name: string): boolean {
  try {
    const hay = canonicalIndexText();
    if (!hay || !name) return false;
    // Normalización (case + guiones bajos): DIM_TIEMPO_SEMANA ⇄ DimTiempoSemana,
    // CXP ⇄ cxp — sin esto el guard no ve el hogar canónico y deja pasar duplicados.
    const norm = (s: string) => s.replace(/_/g, "").toLowerCase();
    return norm(hay).includes(norm(name));
  } catch {
    return false;
  }
}
