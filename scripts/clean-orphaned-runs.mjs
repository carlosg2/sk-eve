#!/usr/bin/env node
/**
 * Limpia corridas huérfanas del store local de workflow de Eve (.data/eve-workflow).
 *
 * Qué es una "corrida huérfana": un run con `status: "running"`. Con el dev server
 * DETENIDO, ningún run "running" tiene un proceso que lo esté ejecutando — son turnos
 * interrumpidos (recarga durante un turno, Ctrl+C a mitad, crash) que quedaron atorados.
 * Son los que en cada boot reinician sus mensajes de cola y producen el flood:
 *   [world-local] Queue message failed (attempt 1, HTTP 503) ...
 *   handlerError: '{"error":"The development server is still starting."}'
 * Ese flood es lo que hace el arranque lentísimo (~120s) y frágil (borde del timeout).
 *
 * Qué PRESERVA (a propósito):
 *   - Las conversaciones: viven en .data/sessions.sqlite3 (sidebar + auditoría + espejo),
 *     NO aquí. No se tocan.
 *   - Los runs con status "completed": sesiones con turno terminado siguen continuables.
 *
 * Qué borra, por cada run huérfano (respaldo previo en .data/eve-workflow-backups/<ts>/):
 *   - runs/<runId>.json
 *   - steps/<runId>-*, events/<runId>-*, waits/<runId>-*
 *   - hooks/by-run/<runId>-* y hooks/hook_*.json (raíz) cuyo runId coincida
 *   - streams/runs/<runId>.json y streams/chunks/strm_<runId>_*
 *   - locks asociados en .locks/{runs,steps,waits,hooks}
 *
 * Requisito: correr con el dev server DETENIDO (nunca con `npm run dev` activo).
 *
 * Uso: node scripts/clean-orphaned-runs.mjs
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";

const WF = join(process.cwd(), ".data", "eve-workflow");
const runsDir = join(WF, "runs");
if (!existsSync(runsDir)) {
  console.error(`No existe el store en ${WF}. Corre esto desde la raíz del repo.`);
  process.exit(1);
}

const locked = [];
const lockedBy = (fn) => {
  try {
    locked.push(fn);
    fn();
  } catch (err) {
    console.error(`  ⚠️ ${err.message}`);
  }
};

// 1) Identificar corridas huérfanas: runs con status "running".
const orphanRunIds = [];
for (const f of readdirSync(runsDir)) {
  if (!f.endsWith(".json")) continue;
  let data;
  try {
    data = JSON.parse(readFileSync(join(runsDir, f), "utf8"));
  } catch {
    continue;
  }
  if (data?.status === "running") orphanRunIds.push(data.runId || f.slice(0, -5));
}

if (orphanRunIds.length === 0) {
  console.log("Sin corridas huérfanas. Nada que limpiar.");
  process.exit(0);
}
console.log(`Corridas huérfanas detectadas: ${orphanRunIds.length}`);

// 2) Respaldo (todo lo que se borre se copia antes a .data/eve-workflow-backups/<ts>/).
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = join(process.cwd(), ".data", "eve-workflow-backups", stamp);
const backup = (relPath, absPath) => {
  const dest = join(backupRoot, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(absPath, dest);
};

// 3) Construir la lista de archivos a eliminar (rutas relativas a WF).
const listDir = (dir) => (existsSync(dir) ? readdirSync(dir) : []);
const startsWith = (prefix) => (name) => name.startsWith(prefix);
const targets = new Map(); // relPath -> absPath (dedup automático)

const addTarget = (rel, abs) => {
  if (existsSync(abs)) targets.set(rel, abs);
};

const orphanSet = new Set(orphanRunIds);
const rootHookRunIds = new Set();

for (const id of orphanRunIds) {
  addTarget(`runs/${id}.json`, join(WF, "runs", `${id}.json`));

  for (const [sub, match] of [
    ["steps", startsWith(`${id}-`)],
    ["events", startsWith(`${id}-`)],
    ["waits", startsWith(`${id}-`)],
    ["hooks/by-run", startsWith(`${id}-`)],
  ]) {
    for (const n of listDir(join(WF, sub))) {
      if (match(n)) addTarget(`${sub}/${n}`, join(WF, sub, n));
    }
  }

  addTarget(`streams/runs/${id}.json`, join(WF, "streams", "runs", `${id}.json`));
  for (const n of listDir(join(WF, "streams", "chunks"))) {
    if (n.startsWith(`strm_${id}_`)) addTarget(`streams/chunks/${n}`, join(WF, "streams", "chunks", n));
  }

  for (const d of ["runs", "steps", "waits"]) {
    for (const n of listDir(join(WF, ".locks", d))) {
      if (n.startsWith(id)) addTarget(`.locks/${d}/${n}`, join(WF, ".locks", d, n));
    }
  }
}

// Hooks raíz: se matchean leyendo su contenido (campo runId) + sus locks por hookId.
for (const n of listDir(join(WF, "hooks"))) {
  if (!n.startsWith("hook_") || !n.endsWith(".json")) continue;
  let data;
  try {
    data = JSON.parse(readFileSync(join(WF, "hooks", n), "utf8"));
  } catch {
    continue;
  }
  if (data?.runId && orphanSet.has(data.runId)) {
    addTarget(`hooks/${n}`, join(WF, "hooks", n));
    if (data.hookId) rootHookRunIds.add(data.hookId);
  }
}
for (const hookId of rootHookRunIds) {
  for (const n of listDir(join(WF, ".locks", "hooks"))) {
    if (n.startsWith(hookId)) addTarget(`.locks/hooks/${n}`, join(WF, ".locks", "hooks", n));
  }
}

// 4) Respaldo + eliminación.
console.log(`Archivos a limpiar: ${targets.size}`);
const byDir = {};
for (const [rel, abs] of targets) {
  const dir = rel.split("/")[0];
  byDir[dir] = (byDir[dir] || 0) + 1;
  lockedBy(() => backup(rel, abs));
  lockedBy(() => rmSync(abs, { force: true }));
}
console.log("Respaldo en:", backupRoot);
console.log("Limpieza por directorio:", Object.entries(byDir).map(([k, v]) => `${k}: ${v}`).join(" · "));

// 5) Resumen.
console.log("\nRunIds limpiados:");
for (const id of orphanRunIds) console.log(`  - ${id}`);
console.log("\nListo. El historial de conversaciones en .data/sessions.sqlite3 no se tocó.");
console.log("Sesiones con turno interrumpido quedarán en modo 'recuperada' (historial visible).");
