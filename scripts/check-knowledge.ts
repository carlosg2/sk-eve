// Linter de conocimiento: valida que las entidades/campos documentados en
// skills y Company Twin existan de verdad en el MCP DAB del tenant activo.
// Detecta skills/twin desactualizados ANTES de que el modelo falle en runtime
// (ej. `ResumenPlaneacionCF` documentada pero inexistente → EntityNotFound).
//
// Uso:
//   node --experimental-strip-types scripts/check-knowledge.ts
// (Node ≥23.6 con type-stripping; el proyecto corre en Node 24)
//
// Salida: reporte con nivel CRÍTICO (entidades usadas en tool calls que no
// existen), WARN (referencias sueltas inexistentes) y campos inválidos.
// Exit code 0 = sin críticos; 1 = hay críticos.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
// Import con extensión .ts (Node 24 type-stripping). runtime-config y mcp-client
// son autocontenidos (solo imports de node:*), así que se resuelven sin bundler.
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";
import { mcpCallTool } from "../agent/lib/mcp-client.ts";

// ── utilidades ─────────────────────────────────────────────────────────────

function walkFiles(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) walkFiles(full, out);
		else if (/\.(md|ts)$/.test(entry.name)) out.push(full);
	}
	return out;
}

function rootDir(): string {
	let dir = process.cwd();
	for (let i = 0; i < 8; i++) {
		if (existsSync(join(dir, "package.json"))) return dir;
		const parent = join(dir, "..");
		if (parent === dir) break;
		dir = parent;
	}
	return process.cwd();
}

// ── extracción desde markdown ──────────────────────────────────────────────

// Captura el primer argumento de read_records/aggregate_records: literal
// (`read_records(Entidad, ...)`) o named (`read_records(entity: "Entidad")`).
const CALL_ENT_RE = /(?:read_records|aggregate_records)\(\s*(?:entity\s*:\s*"?([A-Za-z0-9_]+)"?|([A-Za-z0-9_]+))/g;
// Entidades por "señal fuerte": headings de sección (`## Ent`) y links [Ent](...)
const HEADING_RE = /^#{2,4}\s+`?([A-Z][A-Za-z0-9_]{2,})`?\s*$/gm;
const LINK_RE = /\[`?([A-Z][A-Za-z0-9_]{2,})`?\]\(([^)]+)\)/g;
const SELECT_RE = /select\s*:\s*"([^"]+)"/g;
const FILTER_FIELD_RE = /([A-Za-z0-9_]+)\s+(?:eq|ne|gt|ge|lt|le|in)\s+/g;

// Parámetros de tool que no deben tratarse como entidades (falsos positivos
// cuando la llamada usa args named: read_records(entity: "X", first: 1)).
const PARAM_STOPLIST = new Set([
	"entity", "entidad", "first", "select", "filter", "orderby", "after", "groupby",
	"function", "field", "distinct", "fieldname", "modo", "termino", "campo",
	"primero", "ordenar", "before", "skip", "top", "where",
]);

/** Extrae el error DAB embebido de un resultado de mcpCallTool, si lo hay. */
function extractError(out: unknown): { type: string; message: string } | null {
	if (!out || typeof out !== "object") return null;
	const obj = out as Record<string, unknown>;
	if (typeof obj.error === "string") {
		try {
			const parsed = JSON.parse(obj.error) as { error?: { type?: string; message?: string }; type?: string; message?: string };
			const inner = parsed?.error;
			if (inner && typeof inner === "object") return { type: inner.type ?? "", message: inner.message ?? "" };
			return { type: parsed?.type ?? "", message: parsed?.message ?? "" };
		} catch {
			return { type: "", message: obj.error };
		}
	}
	const e = obj.error as { type?: string; message?: string } | undefined;
	if (e && typeof e === "object") return { type: e.type ?? "", message: e.message ?? "" };
	if (obj.status === "error") return { type: "", message: JSON.stringify(obj).slice(0, 120) };
	return null;
}

type SkillScan = {
	callEntities: Set<string>; // entidades usadas en tool calls (crítico si no existen)
	backtickEntities: Set<string>; // referencias sueltas (warn)
	fieldsByEntity: Map<string, Set<string>>; // campos por entidad (desde select/filter)
};

function scanMarkdown(text: string): SkillScan {
	const scan: SkillScan = {
		callEntities: new Set(),
		backtickEntities: new Set(),
		fieldsByEntity: new Map(),
	};
	// tool calls con entidad (read_records(X / aggregate_records(X / buscar_registro)
	for (const m of text.matchAll(CALL_ENT_RE)) {
		const ent = m[1] ?? m[2];
		if (ent && !PARAM_STOPLIST.has(ent)) scan.callEntities.add(ent);
	}
	for (const m of text.matchAll(/buscar_registro\(\s*\{[^}]*?entidad\s*:\s*"?([A-Za-z0-9_]+)/g)) scan.callEntities.add(m[1]);
	// entidades por señal fuerte (headings de sección y links), no backticks sueltos
	for (const m of text.matchAll(HEADING_RE)) scan.backtickEntities.add(m[1]);
	for (const m of text.matchAll(LINK_RE)) scan.backtickEntities.add(m[1]);
	// bloques de código (fences) → entidades + campos asociados
	const fences = text.match(/```[a-z]*\n[\s\S]*?```/g) ?? [];
	for (const fence of fences) {
		const entities = [...fence.matchAll(CALL_ENT_RE)].map((m) => m[1] ?? m[2]);
		const fields = new Set<string>();
		for (const sel of fence.matchAll(SELECT_RE)) for (const f of sel[1].split(",")) fields.add(f.trim());
		for (const filt of fence.matchAll(FILTER_FIELD_RE)) fields.add(filt[1]);
		for (const ent of entities) {
			if (!scan.fieldsByEntity.has(ent)) scan.fieldsByEntity.set(ent, new Set());
			for (const f of fields) scan.fieldsByEntity.get(ent)!.add(f);
		}
	}
	return scan;
}

// ── scoping por tenant y estados conocidos ────────────────────────────────

// Un skill con `tenant:` explícito en frontmatter solo aplica a esos tenants.
// `tenant: null` (o ausente) = universal → aplica a todos. Los skills de otros
// tenants NO deben validarse contra el MCP del tenant activo (ej. sugerido-
// compra es de marmoles; validarlo contra ICF produce falsos críticos).
function appliesToTenant(file: string, activeTenant: string): boolean {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^tenant\s*:\s*(.+)$/m);
  if (!m) return true;
  const raw = m[1].trim();
  if (raw === "null" || raw === "~") return true;
  const list = raw.replace(/[[\]"']/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(activeTenant);
}

// Entidades documentadas como "No disponible" para un tenant en su twin
// (companies/<tenant>/modulos.md u otro concepto). Un EntityNotFound de una
// entidad AQUÍ listada es estado CONOCIDO (el agente responde "Dato no
// disponible"), no un skill roto.
function readUnavailableEntities(tenantDir: string): Set<string> {
  const out = new Set<string>();
  const files = walkFiles(tenantDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    // Solo secciones que hablan de no-disponibilidad/EntityNotFound.
    const sections = text.split(/\n(?=#{1,4}\s)/);
    for (const section of sections) {
      if (!/no disponible|no est[áa]|EntityNotFound|no (se )?publica/i.test(section)) continue;
      for (const m of section.matchAll(/`([A-Za-z][A-Za-z0-9_]{1,})`/g)) out.add(m[1]);
    }
  }
  return out;
}

// Un skill puede DECLARAR su propio gap (sección "Limitaciones": "X no existe /
// no está publicado / no hay ninguna entidad X"). Si la entidad aparece cerca de
// esa declaración (en CUALQUIER ocurrencia), el EntityNotFound es esperado y
// documentado → WARN, no CRÍTICO.
function skillDeclaresGap(text: string, ent: string): boolean {
  let idx = text.indexOf(ent);
  while (idx !== -1) {
    const around = text.slice(Math.max(0, idx - 250), Math.min(text.length, idx + ent.length + 350));
    if (
      /no existe|no est[áa]|no disponible|EntityNotFound|no (se )?publica|limitaci[oó]n|no hay (ninguna )?entidad|sin entidad/i.test(
        around
      )
    )
      return true;
    idx = text.indexOf(ent, idx + ent.length);
  }
  return false;
}

// ── main ───────────────────────────────────────────────────────────────────

const root = rootDir();
const cfg = loadRuntimeConfig();

// 1) Entidades reales del MCP del tenant activo.
let realEntities = new Set<string>();
try {
	const out = (await mcpCallTool(cfg.mcpUrl, "describe_entities", {})) as {
		entities?: { name: string }[];
	};
	realEntities = new Set((out?.entities ?? []).map((e) => e.name));
} catch (err) {
	console.error(`⚠️ No se pudo consultar describe_entities (${(err as Error).message})`);
	process.exit(2);
}

// 2) Escanear skills y twin.
const skills = walkFiles(join(root, "agent", "skill-library")).filter((f) => f.endsWith(".md"));
const twin = walkFiles(join(root, "company-twin")).filter((f) => f.endsWith(".md"));

const skillScans = new Map<string, SkillScan>();
for (const file of skills) skillScans.set(file, scanMarkdown(readFileSync(file, "utf8")));
const twinScan = scanMarkdown(twin.map((f) => readFileSync(f, "utf8")).join("\n"));

// 3) Validar entidades con la VERDAD DE RUNTIME: `read_records(ent, first:1)`.
// describe_entities es un catálogo incompleto (UV_QV_PPTOCOMPRA funciona en
// read pero no aparece en describe), así que la disponibilidad real la decide
// el propio tool que ejecuta el modelo.
let critical = 0;
console.log(`\n=== Linter de conocimiento · tenant ${cfg.tenant} ===`);
console.log(`Catálogo describe_entities: ${realEntities.size} entidades (incompleto; la verdad es read_records)`);

// Entidades usadas en tool calls por skills + twin. Solo skills que aplican al
// tenant activo (scoping por frontmatter `tenant:`).
const callEntities = new Set<string>();
for (const [file, scan] of skillScans) if (appliesToTenant(file, cfg.tenant)) for (const e of scan.callEntities) callEntities.add(e);
for (const e of twinScan.callEntities) callEntities.add(e);

const fieldsByEntity = new Map<string, Set<string>>();
for (const scan of skillScans.values())
	for (const [ent, fields] of scan.fieldsByEntity) {
		if (!fieldsByEntity.has(ent)) fieldsByEntity.set(ent, new Set());
		for (const f of fields) fieldsByEntity.get(ent)!.add(f);
	}

const tested = new Set<string>();
for (const ent of [...callEntities].sort()) {
	if (tested.has(ent)) continue;
	tested.add(ent);
	const where = [...skillScans.entries()].filter(([, s]) => s.callEntities.has(ent)).map(([f]) => f.replace(root + "/", ""));
	const sources = where.length ? where.join(", ") : "company-twin";

	let out: unknown;
	try {
		out = await mcpCallTool(cfg.mcpUrl, "read_records", { entity: ent, first: 1 });
	} catch (err) {
		console.log(`🔴 CRÍTICO · '${ent}' falló en read_records (red): ${(err as Error).message} (${sources})`);
		critical++;
		continue;
	}

	const err = extractError(out);
	if (err) {
		// Estado CONOCIDO: la entidad está documentada como no disponible en el
		// twin del tenant, o un skill del tenant activo declara su gap
		// (Limitaciones). En ambos casos el EntityNotFound es esperado → WARN.
		const unavailable = readUnavailableEntities(join(root, "company-twin", "companies", cfg.tenant));
		const fromActiveSkill = [...skillScans.entries()].some(
			([f, s]) => appliesToTenant(f, cfg.tenant) && s.callEntities.has(ent)
		);
		const declaredGap = [...skillScans.entries()].some(
			([f, s]) => appliesToTenant(f, cfg.tenant) && s.callEntities.has(ent) && skillDeclaresGap(readFileSync(f, "utf8"), ent)
		);
		if (unavailable.has(ent) || declaredGap) {
			console.log(`🟡 CONOCIDO · '${ent}' no disponible en ${cfg.tenant} (documentado en twin/skill) (${sources})`);
			continue;
		}
		// El ERP Kernel es universal (Intelisis Core): documenta el schema de
		// tablas estándar aunque el MCP del tenant activo publique un subconjunto.
		// Entidad solo del twin (no usada por skills del tenant) = subconjunto,
		// no un bug de skill → WARN informativo, no CRÍTICO.
		if (!fromActiveSkill) {
			console.log(`🟡 KERNEL · '${ent}' del ERP Kernel universal no publicada en el MCP de ${cfg.tenant} (subconjunto) (${sources})`);
			continue;
		}
		console.log(
			`🔴 CRÍTICO · '${ent}' NO es usable en read: ${err.type} — ${err.message.slice(0, 90)} (${sources})`
		);
		critical++;
		continue;
	}

	// Entidad usable → validar campos documentados contra columnas reales.
	const item = (out as { items?: Record<string, unknown>[] })?.items?.[0];
	const columns = item ? Object.keys(item) : [];
	const fields = fieldsByEntity.get(ent);
	if (columns.length && fields) {
		const colSet = new Set(columns);
		for (const field of fields) {
			if (!colSet.has(field)) {
				console.log(
					`🔴 CRÍTICO · campo '${field}' no existe en '${ent}' (columnas reales: ${columns.slice(0, 10).join(", ")}…) (${sources})`
				);
				critical++;
			}
		}
	}
}

// WARN informativo: entidades referenciadas en el twin por señal fuerte que no
// están en el catálogo (pueden ser entidades no expuestas = conocimiento válido).
const missingBackticks = new Set<string>();
for (const ent of twinScan.backtickEntities) {
	if (!realEntities.has(ent) && !tested.has(ent) && !missingBackticks.has(ent)) {
		missingBackticks.add(ent);
		console.log(`🟡 WARN · '${ent}' referenciada en Company Twin no está en el catálogo describe_entities (¿no expuesta o twin stale?)`);
	}
}

console.log(`\n=== Resultado: ${critical} críticos ===`);
process.exit(critical > 0 ? 1 : 0);
