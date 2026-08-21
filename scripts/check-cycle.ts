// =============================================================================
// check-cycle.ts — TABLERO DEL CICLO DE RECURSIVE SELF-IMPROVEMENT (FÁBRICA)
// -----------------------------------------------------------------------------
// Coordina runtime ↔ fábrica: agrega el estado del ciclo para decidir QUÉ
// promover, QUÉ es ruteo y QUÉ está pendiente, sin SQL manual.
//
//  Uso:
//    nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//      --experimental-strip-types scripts/check-cycle.ts [--dias N]
//
//  Salida (4 secciones):
//    BANDEJA DEL RUNTIME   — pendientes del buffer state/learnings.md
//    RECURRENCIAS (espejo) — errores reales agregados por key (count + sesiones)
//    CRUCE CON CANÓNICO    — "ya canónico pero sigue fallando" = RUTEO
//                            (el modelo no consulta el twin: revisar ruteo/skills)
//    PRIORIDAD DE PROMOCIÓN — pendiente recurrente > aislado > sin buffer
//
//  Regla de separación: herramienta de la fábrica. El runtime NUNCA lo ejecuta.
// =============================================================================
import { DatabaseSync } from "node:sqlite";
import { readLearnings, isLearningCanonical, canonicalIndexText } from "../agent/lib/twin-memory.js";

const CONNECTION_PREFIX = "intelisis-dab__";
const DIAS_DEFAULT = 14;

const args = process.argv.slice(2);
const diasArg = args.find((a) => a.startsWith("--dias"));
const dias = diasArg ? parseInt(diasArg.split("=")[1] ?? diasArg.split(" ")[1], 10) : DIAS_DEFAULT;

// --- 1) Clasificar un error de tool a una key de learning (mismo esquema que el hook) ---
function classifyError(
  toolName: string,
  type: string,
  message: string,
): { key: string; kind: "entity" | "field" | "sp" | "fecha" | "odata"; name: string } | null {
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
  // Parámetro requerido faltante de un SP (ExecutionError) → req-<tool>-<param>
  const spParam = message.match(/expects parameter\s+'?@?([A-Za-z0-9_]+)'?/i)?.[1];
  if (spParam) return { key: `req-${short}-${spParam.toLowerCase()}`, kind: "sp", name: spParam };
  // Conversión de fecha inválida (ExecutionError) → fecha-<tool>
  if (/conversion of a varchar data type to a datetime/.test(message)) {
    return { key: `fecha-${short}`, kind: "fecha", name: "fecha" };
  }
  // Filtro OData mal formado / operadores incompatibles (BadRequest) → odata-<tool>
  if (/incompatible types|not well formed|is not valid at position/i.test(message)) {
    return { key: `odata-${short}`, kind: "odata", name: "odata" };
  }
  // Descubrimiento/nomenclatura (2026-08-20): el modelo confunde skill ↔ concepto
  // ↔ archivo. Claves skill-inexistente-/concepto-inexistente-/archivo-inexistente-.
  const slugify = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
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

// --- 2) Leer espejo: recurrencias de errores accionables ---
const db = new DatabaseSync(".data/sessions.sqlite3");
const cutoff = Date.now() - dias * 24 * 3600 * 1000;
const rows = db
  .prepare(
    "SELECT sessionId, emittedAt, data FROM events WHERE type = 'action.result' AND emittedAt >= ?",
  )
  .all(cutoff) as { sessionId: string; emittedAt: number; data: string }[];

const recurrencias = new Map<string, { count: number; sessions: string[]; kind: "entity" | "field" | "sp" | "fecha" | "odata"; name: string }>();
for (const r of rows) {
  let ev: { result?: { toolName?: string; isError?: boolean; output?: unknown }; status?: string; error?: unknown };
  try {
    ev = JSON.parse(r.data);
  } catch {
    continue;
  }
  const res = ev.result;
  if (!res || typeof res.toolName !== "string") continue;
  // Conexión MCP + tools de descubrimiento de conocimiento.
  const isDab = res.toolName.startsWith(CONNECTION_PREFIX);
  const isDiscovery = ["load_skill", "query_company_twin", "read_file"].includes(res.toolName);
  if (!isDab && !isDiscovery) continue;
  const err = extractError(ev.error, res.output);
  const failed = ev.status === "failed" || res.isError === true || !!err.type || !!err.message;
  if (!failed || (!err.type && !err.message)) continue;
  const cls = classifyError(res.toolName, err.type, err.message);
  if (!cls) continue;
  const cur = recurrencias.get(cls.key) ?? { count: 0, sessions: [], kind: cls.kind, name: cls.name };
  cur.count += 1;
  if (!cur.sessions.includes(r.sessionId)) cur.sessions.push(r.sessionId);
  recurrencias.set(cls.key, cur);
}

// --- 3) Buffer: pendientes del runtime ---
const buffer = await readLearnings();
const pendientes = buffer
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.startsWith("- [") && !l.startsWith("- [eval-"))
  .map((l) => {
    const m = l.match(/^-\s*\[([^\]]+)\]\s*(.*)$/);
    return m ? { key: m[1], text: m[2] } : null;
  })
  .filter(Boolean) as { key: string; text: string }[];

// --- 4) Reporte ---
const sep = "=".repeat(72);
console.log(sep);
console.log(`CICLO DE SELF-IMPROVEMENT — tablero de la fábrica (ventana: ${dias} días)`);
console.log(sep);
console.log("\n① BANDEJA DEL RUNTIME (pendientes en state/learnings.md)");
if (pendientes.length === 0) console.log("  (vacía — sin pendientes por promover)");
for (const p of pendientes) {
  const rec = recurrencias.get(p.key);
  const recTxt = rec ? ` ×${rec.count} en espejo` : " (sin recurrencia en ventana)";
  console.log(`  - [${p.key}]${recTxt}`);
  console.log(`      ${p.text.slice(0, 160)}`);
}

console.log("\n② RECURRENCIAS REALES (espejo events · action.result con error)");
if (recurrencias.size === 0) console.log("  (sin errores accionables en la ventana)");
const sorted = [...recurrencias.entries()].sort((a, b) => b[1].count - a[1].count);
// Canonicidad ampliada (2026-08-20): además de entity/field (isLearningCanonical),
// los kinds sp/fecha/odata son canónicos cuando su tool ya está documentado en el
// kernel (sp-reportes-mrp.md, mcp-tools.md, index.md — su hogar canónico).
// key → `req-<tool>-<param>` / `fecha-<tool>` / `odata-<tool>`: extraemos el tool.
const extractTool = (key: string, kind: string): string => {
  if (kind === "sp") {
    // req-programa_produccion_concentrado_centro-semana → quitar `req-` y `-<param>`
    const rest = key.replace(/^req-/, "");
    const tool = rest.replace(/-(?:semana|id|campo|ejercicio|periodo|usuario)$/i, "");
    return tool;
  }
  if (kind === "fecha" || kind === "odata") return key.replace(/^(fecha|odata)-/, "");
  return key;
};
const esCanonicoKey = (key: string, rec: { kind: string; name: string }): boolean => {
  if (rec.kind === "entity" || rec.kind === "field")
    return isLearningCanonical(rec.kind as "entity" | "field", rec.name);
  if (rec.kind === "sp" || rec.kind === "fecha" || rec.kind === "odata") {
    try {
      const tool = extractTool(key, rec.kind);
      if (!tool) return false;
      // El índice canónico del kernel ya incluye las firmas de SPs y reglas OData.
      const hay = canonicalIndexText();
      if (!hay) return false;
      const norm = (s: string) => s.replace(/_/g, "").toLowerCase();
      return norm(hay).includes(norm(tool));
    } catch {
      return false;
    }
  }
  return false;
};
for (const [key, rec] of sorted) {
  const enBuffer = pendientes.some((p) => p.key === key);
  // isLearningCanonical solo cubre entity/field; los nuevos kinds (sp/fecha/odata)
  // no tienen hogar canónico por defecto → tratar como no canónicos.
  const canonico = esCanonicoKey(key, rec);
  const marca = canonico ? "CANÓNICO → RUTEO ⚠️" : enBuffer ? "en buffer" : "SIN buffer 🔴";
  console.log(`  ${key.padEnd(42)} ×${String(rec.count).padEnd(3)} ${marca}`);
  console.log(`      sesiones: ${rec.sessions.slice(0, 4).join(", ")}${rec.sessions.length > 4 ? ` …(+${rec.sessions.length - 4})` : ""}`);
}

console.log("\n③ PRIORIDAD DE PROMOCIÓN (qué hacer primero)");
const esCanonico = (k: string, r: { kind: string; name: string }) => esCanonicoKey(k, r);
const ruteo = sorted.filter(([k, r]) => esCanonico(k, r));
const sinBuffer = sorted.filter(([k]) => !pendientes.some((p) => p.key === k));
const recurrentes = sorted.filter(([k, r]) => r.count >= 3 && !esCanonico(k, r));
console.log("  🔴 RUTEO (canónico pero sigue fallando — el modelo no consulta el twin):");
for (const [k, r] of ruteo) console.log(`     ${k} ×${r.count} → revisar ruteo/instructions/skills (el hecho ya está en su hogar)`);
if (ruteo.length === 0) console.log("     (ninguno)");
console.log("  🟠 PROMOVER PRONTO (recurrente y NO canónico — nueva entrada en el buffer o hecho no promovido):");
for (const [k, r] of recurrentes) console.log(`     ${k} ×${r.count} → /promote-learnings`);
if (recurrentes.length === 0) console.log("     (ninguno)");
console.log("  🟡 SIN ENTRADA EN BUFFER (el hook no lo clasificó — candidato a skill/instrucción):");
for (const [k, r] of sinBuffer.slice(0, 5)) console.log(`     ${k} ×${r.count}`);
if (sinBuffer.length === 0) console.log("     (ninguno)");

console.log(sep);
console.log("Sugerencia: si hay RUTEO, la causa es de descubrimiento (el agente no consultó");
console.log("query_company_twin/context-planner), NO de conocimiento. Revisar instructions.md.");
console.log("ANTES de promover: corrobora contra lo real — read_records(<Ent>, first:1) contra");
console.log("el MCP del tenant + INFORMATION_SCHEMA vía MCP-ICF (distinguir 'existe en BD pero");
console.log("no publicada' de 'no existe en absoluto'). Ver knowledge-hygiene §5 paso 0.");
console.log(sep);
