import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// ── Supersession temporal en file system (ADR-010 + acción A5) ──────────────
// La regla ontológica de v1 (formalizada en ADR-010): el hecho nuevo que
// contradice a uno anterior lo INACTIVA (no conviven), con proveniencia y
// timestamp. Primero en file system (append + marca superseded); migra a DB
// cuando se cruce el trigger del ADR-010.
//
// Formato en frontmatter OKF (todos opcionales, consumidores permisivos):
//   status: stable | superseded | deprecated
//   stale_after: <ISO 8601>     # vence automáticamente en esa fecha
//   valid_from: <ISO 8601>      # inicio de la ventana de vigencia
//   superseded_at: <ISO 8601>   # cuándo quedó inactivo (lo pone supersedeConcept)
//   superseded_by: <id>         # id del concepto que lo reemplaza
//
// ⚠️ SEPARACIÓN DE PODERES (constitución §3): `supersedeConcept` ESCRIBE el
// twin — es herramienta de FÁBRICA (promote-learnings / meta-fábrica), el
// runtime NUNCA la llama. `getActiveConcepts` / `isConceptActive` son de SOLO
// LECTURA: el runtime (context-planner) las usa para no inyectar conocimiento
// inactivo/vencido al prompt. Todo blindado con try/catch: un fallo aquí
// nunca debe romper el turno ni el arranque.

function resolveTwinRoot(): string {
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

// Parser de frontmatter mínimo (mismo patrón que el resto del runtime):
// tolera escalares, listas inline y claves desconocidas (consumo permisivo OKF).
type Fm = Record<string, string | string[] | null>;
function parseFrontmatter(raw: string): { fm: Fm; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const block = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm: Fm = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[m[1]] = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (val === "null" || val === "") {
      fm[m[1]] = null;
    } else {
      fm[m[1]] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
}

const scalar = (v: string | string[] | null | undefined): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Ciclo de vida temporal de un concepto del Company Twin (OKF). */
export type ConceptLifecycle = {
  /** `status` del frontmatter OKF (`stable`/`superseded`/`deprecated`…). */
  status?: string | null;
  /** Ventana de vigencia: inicio (`valid_from`) y vencimiento (`stale_after`). */
  validFrom?: string | null;
  staleAfter?: string | null;
  /** Marcas de supersession: cuándo y por quién quedó inactivo. */
  supersededAt?: string | null;
  supersededBy?: string | null;
};

/** Concepto del twin con su ciclo de vida (para `getActiveConcepts`). */
export type ConceptWithLifecycle = {
  /** id = path relativo al twin root sin `.md`. */
  id: string;
  title: string;
  description: string;
  tags: string[];
  layer?: string;
  tenant?: string | null;
  /** Solo presente cuando `getActiveConcepts({ includeLifecycle: true })`. */
  lifecycle?: ConceptLifecycle;
};

const RESERVED = new Set(["index.md", "log.md"]);

/**
 * ¿El ciclo de vida está ACTIVO a la fecha `now` (ms)?
 * Reglas (RASTeR / ADR-010): superseded_at o status superseded/deprecated →
 * inactivo; stale_after ya vencido → inactivo; en cualquier otro caso activo.
 * Fechas no parseables se ignoran (consumo permisivo).
 */
export function isConceptActive(lifecycle: ConceptLifecycle, now: number = Date.now()): boolean {
  try {
    if (lifecycle.supersededAt) {
      const t = Date.parse(lifecycle.supersededAt);
      if (!Number.isNaN(t) && t <= now) return false;
    }
    const status = lifecycle.status?.trim().toLowerCase();
    if (status === "superseded" || status === "deprecated" || status === "archived") return false;
    if (lifecycle.staleAfter) {
      const t = Date.parse(lifecycle.staleAfter);
      if (!Number.isNaN(t) && t <= now) return false;
    }
    return true;
  } catch {
    return true; // blindado: ante cualquier error, no romper (se trata como activo)
  }
}

/**
 * Lista los conceptos ACTIVOS del twin (filtra superseded/stale).
 * Equivalente al índice de context-planner pero con ciclo de vida: NO se
 * cachea a nivel de módulo (el `stale_after` se evalúa en cada llamada), por
 * eso devuelve también los conceptos con su lifecycle para auditoría/fábrica.
 */
export function getActiveConcepts(
  opts: { now?: number; includeLifecycle?: boolean } = {},
): ConceptWithLifecycle[] {
  try {
    const root = resolveTwinRoot();
    const now = opts.now ?? Date.now();
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".md") && !RESERVED.has(entry.name)) files.push(full);
      }
    };
    walk(root);

    const out: ConceptWithLifecycle[] = [];
    for (const full of files) {
      try {
        const { fm } = parseFrontmatter(readFileSync(full, "utf8"));
        if (!fm.type) continue; // solo conceptos OKF
        const lifecycle: ConceptLifecycle = {
          status: scalar(fm.status),
          validFrom: scalar(fm.valid_from),
          staleAfter: scalar(fm.stale_after),
          supersededAt: scalar(fm.superseded_at),
          supersededBy: scalar(fm.superseded_by),
        };
        if (!isConceptActive(lifecycle, now)) continue; // filtro RASTeR
        const rel = full.slice(root.length + 1).replace(/\.md$/, "");
        out.push({
          id: rel,
          title: scalar(fm.title) ?? rel,
          description: scalar(fm.description) ?? "",
          tags: Array.isArray(fm.tags) ? fm.tags : typeof fm.tags === "string" && fm.tags.trim() ? [fm.tags.trim()] : [],
          layer: scalar(fm.layer) ?? undefined,
          tenant: fm.tenant as string | null | undefined,
          ...(opts.includeLifecycle ? { lifecycle } : {}),
        });
      } catch {
        // archivo ilegible: saltar
      }
    }
    return out;
  } catch {
    return []; // blindado: nunca romper el turno por el índice
  }
}

/**
 * Normaliza una ruta/id de concepto contra el twin root:
 * `companies/icf/x` · `companies/icf/x.md` · `/companies/icf/x.md` → path absoluto.
 * Devuelve null si la ruta no resuelve a un archivo existente.
 */
function resolveConceptPath(path: string): string | null {
  try {
    const root = resolveTwinRoot();
    const clean = path.trim().replace(/^\/+/, "").replace(/\.md$/, "");
    if (!clean || clean.includes("..")) return null; // anti path traversal
    const abs = join(root, `${clean}.md`);
    return existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

/**
 * Marca un concepto como superseded (ADR-010): inyecta en su frontmatter
 * `superseded_at` + `superseded_by` y normaliza `status: superseded`.
 * Idempotente: si ya está superseded, no vuelve a escribir.
 *
 * ⚠️ HERRAMIENTA DE FÁBRICA: escribe en el Company Twin. El runtime NUNCA la
 * llama (constitución §3 — la fábrica es la única que reorganiza el twin).
 */
export function supersedeConcept(
  path: string,
  supersededBy: string,
  opts: { supersededAt?: string } = {},
): boolean {
  try {
    const abs = resolveConceptPath(path);
    if (!abs || !supersededBy.trim()) return false;
    const raw = readFileSync(abs, "utf8");
    if (!raw.startsWith("---")) return false; // sin frontmatter: no marcable

    const { fm } = parseFrontmatter(raw);
    if (fm.superseded_at) return true; // ya superseded: no-op

    const at = opts.supersededAt ?? new Date().toISOString();
    const end = raw.indexOf("\n---", 3);
    const head = raw.slice(0, 3);
    const block = raw.slice(3, end);
    const tail = raw.slice(end);

    let next = block;
    // Normaliza `status:` si ya existe; si no, lo añade al final del bloque.
    if (/^status:\s*/m.test(next)) {
      next = next.replace(/^status:.*$/m, `status: superseded`);
    }
    next = `${next}\nsuperseded_at: ${at}\nsuperseded_by: ${supersededBy.trim()}`;

    writeFileSync(abs, `${head}${next}${tail}`, "utf8");
    return true;
  } catch {
    return false; // blindado: nunca romper por un fallo de supersession
  }
}
