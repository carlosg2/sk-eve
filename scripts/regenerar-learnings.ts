// =============================================================================
// regenerar-learnings.ts — REGENERA EL BUFFER state/learnings.md (FÁBRICA)
// -----------------------------------------------------------------------------
// Recorre la radiografía (`.data/sessions.sqlite3`, eventos `action.result`),
// clasifica TODOS los fallos con la misma lógica del hook (agent/hooks/memory.ts)
// y del tablero (scripts/check-cycle.ts) — incluidos los de descubrimiento
// (load_skill / query_company_twin / read_file) — y reescribe el buffer completo
// con recurrencias [×N] y última sesión. Preserva las entradas manuales que no
// provienen del espejo (ej. pendientes anotados a mano).
//
//  Uso:
//    nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//      --experimental-strip-types scripts/regenerar-learnings.ts [--dias N] [--dry-run]
//
// Regla de separación: herramienta de la fábrica. El runtime NUNCA lo ejecuta.
// =============================================================================
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import { readLearnings, isLearningCanonical } from "../agent/lib/twin-memory.js";

const CONNECTION_PREFIX = "intelisis-dab__";
const DIAS_DEFAULT = 30;

const args = process.argv.slice(2);
const diasArg = args.find((a) => a.startsWith("--dias"));
const dias = diasArg ? parseInt(diasArg.split("=")[1] ?? diasArg.split(" ")[1], 10) : DIAS_DEFAULT;
const dryRun = args.includes("--dry-run");

// --- 1) Clasificar (mismo esquema que hook/tablero) --------------------------
type Kind = "entity" | "field" | "sp" | "fecha" | "odata";
function classifyError(
  toolName: string,
  type: string,
  message: string,
): { key: string; kind: Kind; name: string } | null {
  const short = toolName.replace(CONNECTION_PREFIX, "");
  if (type === "EntityNotFound" || /entity\s*.*not\s*found/i.test(message)) {
    const ent = message.match(/entity\s+'?([A-Za-z0-9_]+)'?/i)?.[1] || short;
    return { key: `ent-inexistente-${ent.replace(/_/g, "").toLowerCase()}`, kind: "entity", name: ent };
  }
  const field =
    message.match(/Invalid field to be returned requested:\s*([A-Za-z0-9_]+)/i)?.[1] ??
    message.match(/Invalid field to be used in (?:filter|orderby|groupby)[^:]*:\s*([A-Za-z0-9_]+)/i)?.[1] ??
    message.match(/Could not find a property named '?([A-Za-z0-9_]+)'?/i)?.[1];
  if (field) return { key: `fld-${short}-${field.toLowerCase()}`, kind: "field", name: field };
  const spParam = message.match(/expects parameter\s+'?@?([A-Za-z0-9_]+)'?/i)?.[1];
  if (spParam) return { key: `req-${short}-${spParam.toLowerCase()}`, kind: "sp", name: spParam };
  if (/conversion of a varchar data type to a datetime/.test(message)) {
    return { key: `fecha-${short}`, kind: "fecha", name: "fecha" };
  }
  if (/incompatible types|not well formed|is not valid at position/i.test(message)) {
    return { key: `odata-${short}`, kind: "odata", name: "odata" };
  }
  if (toolName === "load_skill") {
    const name = message.match(/No skill named "([^"]+)"/i)?.[1];
    if (name) return { key: `skill-inexistente-${slugify(name)}`, kind: "sp", name };
  }
  if (toolName === "query_company_twin") {
    const concept = message.match(/Concepto '([^']+)' no encontrado/i)?.[1];
    if (concept)
      return { key: `concepto-inexistente-${slugify(concept.split("/").pop() ?? concept)}`, kind: "sp", name: concept };
  }
  if (toolName === "read_file") {
    const path = message.match(/File not found: ([^\s]+)/i)?.[1] ?? "";
    if (path)
      return { key: `archivo-inexistente-${slugify(path.split("/").pop() ?? path)}`, kind: "sp", name: path };
  }
  return null;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

function extractError(error: unknown, output: unknown): { type: string; message: string } {
  try {
    const e = error as { type?: string; message?: string } | undefined;
    if (e?.type || e?.message) return { type: e.type ?? "", message: e.message ?? "" };
    let value: unknown = output;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (typeof obj.error === "string") value = obj.error;
      else if (obj.error && typeof obj.error === "object") {
        const inner = obj.error as Record<string, unknown>;
        return { type: String(inner.type ?? ""), message: String(inner.message ?? "") };
      }
      // query_company_twin devuelve { error: "Concepto 'X' no encontrado..." }
      if (typeof obj.error === "string" && obj.error.startsWith("Concepto")) {
        return { type: "NotFound", message: obj.error };
      }
    }
    if (typeof value === "string") {
      const parsed = JSON.parse(value) as { error?: { type?: string; message?: string } | string; type?: string; message?: string };
      if (parsed.error && typeof parsed.error === "object") return { type: parsed.error.type ?? "", message: parsed.error.message ?? "" };
      if (parsed.type || parsed.message) return { type: parsed.type ?? "", message: parsed.message ?? "" };
    }
  } catch {
    /* no parseable */
  }
  return { type: "", message: "" };
}

// --- 2) Recorrer espejo ------------------------------------------------------
const db = new DatabaseSync(".data/sessions.sqlite3");
const cutoff = Date.now() - dias * 24 * 3600 * 1000;
const rows = db
  .prepare("SELECT sessionId, data FROM events WHERE type = 'action.result' AND emittedAt >= ?")
  .all(cutoff) as { sessionId: string; data: string }[];

const textFor = new Map<string, string>();
const canonicalMap = new Map<string, { kind: Kind; name: string }>();
const agg = new Map<string, { count: number; sessions: string[] }>();

for (const r of rows) {
  let ev: { result?: { toolName?: string; isError?: boolean; output?: unknown }; status?: string; error?: unknown };
  try {
    ev = JSON.parse(r.data);
  } catch {
    continue;
  }
  const res = ev.result;
  if (!res || typeof res.toolName !== "string") continue;
  const isDab = res.toolName.startsWith(CONNECTION_PREFIX);
  const isDiscovery = ["load_skill", "query_company_twin", "read_file"].includes(res.toolName);
  if (!isDab && !isDiscovery) continue;
  const err = extractError(ev.error, res.output);
  const failed = ev.status === "failed" || res.isError === true || !!err.type || !!err.message;
  if (!failed || (!err.type && !err.message)) continue;
  const cls = classifyError(res.toolName, err.type, err.message);
  if (!cls) continue;
  const cur = agg.get(cls.key) ?? { count: 0, sessions: [] };
  cur.count += 1;
  if (!cur.sessions.includes(r.sessionId)) cur.sessions.push(r.sessionId);
  agg.set(cls.key, cur);
  canonicalMap.set(cls.key, { kind: cls.kind, name: cls.name });
  if (!textFor.has(cls.key)) {
    textFor.set(cls.key, `[${cls.key}] ${describe(cls.key, cls.kind, cls.name, res.toolName, err.message)}`);
  }
}

function describe(key: string, kind: Kind, name: string, tool: string, message: string): string {
  const short = tool.replace(CONNECTION_PREFIX, "");
  const m = message.slice(0, 160);
  switch (true) {
    case key.startsWith("ent-inexistente-"):
      return `La entidad '${name}' NO existe en la fuente de datos de esta empresa (${m}). Verificar el nombre real en el Company Twin / config. Si un skill la documenta, está desactualizada.`;
    case key.startsWith("fld-"):
      return `El campo '${name}' no existe en ${short} (${m}). Verificar casing real en erp-kernel/casing.md o con read_records(first:1).`;
    case key.startsWith("req-"):
      return `Al llamar ${short} falta el parámetro requerido '@${name}' (${m}). Documentar la firma del SP en el skill/kernel para que el modelo pase los parámetros obligatorios.`;
    case key.startsWith("fecha-"):
      return `${short} rechazó el formato de fecha enviado (${m}). Documentar en el skill/kernel el formato de fecha exacto que espera el SP (probablemente ISO 'YYYY-MM-DD' sin hora).`;
    case key.startsWith("odata-"):
      return `Filtro OData inválido en ${short}: ${m}. Revisar la construcción del $filter (tipos compatibles, sintaxis, comillas en fechas).`;
    case key.startsWith("skill-inexistente-"):
      return `El modelo intentó cargar con load_skill un nombre que NO es skill: '${name}'. Solo los slugs del catálogo del agente (agent.md → skills) son skills; los demás nombres son conceptos del twin (query_company_twin).`;
    case key.startsWith("concepto-inexistente-"):
      return `query_company_twin('${name}') → concepto no encontrado. El modelo infirió un concepto que no existe en el twin; verificar el nombre real (OKF index) o crearlo.`;
    case key.startsWith("archivo-inexistente-"):
      return `read_file('${name}') → archivo no encontrado. El conocimiento se lee con query_company_twin / load_skill, no con read_file.`;
    default:
      return `Fallo en ${tool}: ${m}`;
  }
}

// --- 3) Escribir buffer ------------------------------------------------------
const existing = await readLearnings();
const lines = existing.split("\n");
// Extraer entradas manuales COMPLETAS (multilinea): desde una línea `- [` hasta
// la siguiente línea que empiece con `- [` o con `#` (fin de la entrada).
const manual: string[] = [];
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith("- [")) continue;
  const entry = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (l.startsWith("- [") || l.startsWith("#")) break;
    if (l.trim() === "") break;
    entry.push(l);
  }
  manual.push(entry.join("\n"));
}
// Conservar solo manuales que NO colisionan con claves regeneradas
const manualKeys = new Set(
  manual.map((l) => l.match(/^-\s*\[([^\]]+)\]/)?.[1]).filter(Boolean) as string[],
);
const regenerated = new Set(agg.keys());
const keptManual = manual.filter((l) => !regenerated.has(l.match(/^-\s*\[([^\]]+)\]/)?.[1] ?? ""));

const sep = "=".repeat(72);
console.log(sep);
console.log(`REGENERAR BUFFER DE APRENDIZAJES (ventana: ${dias} días)${dryRun ? " · DRY-RUN (no escribe)" : ""}`);
console.log(sep);
console.log(`Errores clasificados: ${[...agg.entries()].reduce((s, [, a]) => s + a.count, 0)} en ${agg.size} claves`);
console.log(`Manuales preservados: ${keptManual.length} (descartados ${manual.length - keptManual.length} por colisión)`);

const sorted = [...agg.entries()].sort((a, b) => b[1].count - a[1].count);
const outLines: string[] = [];
for (const [key, a] of sorted) {
  const { kind, name } = canonicalMap.get(key)!;
  const esCanonico = (kind === "entity" || kind === "field") && isLearningCanonical(kind, name);
  const ultimaSesion = a.sessions[a.sessions.length - 1];
  const sufijo = esCanonico ? " [CANÓNICO → RUTEO — no va al buffer]" : "";
  const text = textFor.get(key)!;
  const body = esCanonico
    ? `[${key}] (señal de RUTEO: hecho ya canónico pero sigue fallando — revisar instructions/ruteo)`
    : `${text} [×${a.count}] (sesión ${ultimaSesion})`;
  console.log(`  - ${key.padEnd(46)} ×${a.count}${sufijo}`);
  if (!esCanonico) outLines.push(`- ${body}`);
}

// Reconstruir el archivo (header fijo + manuales + nuevas)
const out = [
  "# ICF — Bandeja de aprendizajes del runtime (canal runtime → meta-fábrica)",
  "",
  "Buffer interno de **coordinación**: el runtime anexa señales de error accionables",
  "detectadas al consultar el MCP; la meta-fábrica las promueve a su hogar canónico",
  "(`modulos.md`, `casing.md`, kernel, skills) y vacía esta bandeja. **No se inyecta",
  "al prompt** (rediseño 2026-08-19): el conocimiento al agente llega por el hogar",
  "canónico (query_company_twin + context-planner).",
  "",
  "> Regenerado por la fábrica (scripts/regenerar-learnings.ts) con la radiografía",
  "> del espejo: TODOS los fallos de la ventana, incluidos los de descubrimiento",
  "> (load_skill / query_company_twin / read_file). Cada entrada lleva `[×N]`",
  "> = recurrencia observada (señal de prioridad).",
  "",
  "## Pendientes por promover",
  "",
  ...keptManual,
  ...(keptManual.length && outLines.length ? [""] : []),
  ...outLines,
  "",
].join("\n");

if (dryRun) {
  console.log(sep);
  console.log("DRY-RUN: el archivo NO se modificó.");
} else {
  await writeFile(
    "/Users/carlosgarzagarza/Documents/GitHub/sk-eve/company-twin/companies/icf/state/learnings.md",
    out,
    "utf8",
  );
  console.log(sep);
  console.log(`Escrito: company-twin/companies/icf/state/learnings.md (${outLines.length} entradas nuevas)`);
}
