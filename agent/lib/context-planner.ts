import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadActiveAgent, loadScopedSkills, resolveCompanyTwinRoot, type ActiveAgent } from "./runtime-config.js";
import { cleanTwinBody, cleanTwinText } from "./twin-clean.js";

// ── "Lóbulo frontal": planificador de contexto ────────────────────────────────
// Construye un índice de ruteo (conceptos del Company Twin + skills del agente
// activo) y, dado el mensaje del usuario, decide QUÉ contexto precargar en
// paralelo para que el modelo no descubra schema uno por uno con
// `query_company_twin` ni tropiece con la skill equivocada.

// ── parser de frontmatter mínimo (mismo patrón que el resto del runtime) ─────
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

const asList = (v: string | string[] | null | undefined): string[] =>
  Array.isArray(v) ? v : typeof v === "string" && v.trim() ? [v.trim()] : [];

// ── índice de ruteo cacheado (construido al import, file-based) ──────────────
export type ConceptEntry = {
  id: string; // path relativo al twin root sin .md
  title: string;
  description: string;
  tags: string[];
  layer?: string;
  tenant?: string | null;
  // Ciclo de vida temporal (ADR-010 / acción A5): se evalúa en TIEMPO DE PLAN
  // (no al construir el índice) para que `stale_after`/`superseded_at` se
  // respeten aunque el índice esté cacheado a nivel de módulo.
  status?: string;
  staleAfter?: string;
  supersededAt?: string;
  supersededBy?: string;
};
export type SkillEntry = { slug: string; description: string };

const RESERVED = new Set(["index.md", "log.md"]);

function buildConceptIndex(): ConceptEntry[] {
  try {
    const root = resolveCompanyTwinRoot();
    const out: ConceptEntry[] = [];
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".md") && !RESERVED.has(entry.name)) files.push(full);
      }
    };
    walk(root);
    for (const full of files) {
      const { fm } = parseFrontmatter(readFileSync(full, "utf8"));
      if (!fm.type) continue;
      const rel = full.slice(root.length + 1).replace(/\.md$/, "");
      out.push({
        id: rel,
        title: typeof fm.title === "string" ? fm.title : rel,
        description: typeof fm.description === "string" ? fm.description : "",
        tags: asList(fm.tags),
        layer: typeof fm.layer === "string" ? fm.layer : undefined,
        tenant: fm.tenant as string | null | undefined,
        status: typeof fm.status === "string" ? fm.status : undefined,
        staleAfter: typeof fm.stale_after === "string" ? fm.stale_after : undefined,
        supersededAt: typeof fm.superseded_at === "string" ? fm.superseded_at : undefined,
        supersededBy: typeof fm.superseded_by === "string" ? fm.superseded_by : undefined,
      });
    }
    return out;
  } catch {
    return []; // blindado: si el índice falla, el plan queda vacío (no rompe el turno)
  }
}

const CONCEPTS = buildConceptIndex();

// ── Guard de contexto stale (acción A5, patrón RASTeR) ──────────────────────
// Un concepto superseded (ADR-010) o con `stale_after` vencido NO debe
// precargarse al prompt: el modelo descartaría conocimiento inactivo por
// contexto vencido (el bug ABIERTO→PENDIENTE es la evidencia de que ya pasó).
// Las fechas se evalúan en tiempo de plan (no al construir el índice).
export function isEntryActive(c: ConceptEntry, now: number = Date.now()): boolean {
  try {
    if (c.supersededAt) {
      const t = Date.parse(c.supersededAt);
      if (!Number.isNaN(t) && t <= now) return false;
    }
    const status = c.status?.trim().toLowerCase();
    if (status === "superseded" || status === "deprecated" || status === "archived") return false;
    if (c.staleAfter) {
      const t = Date.parse(c.staleAfter);
      if (!Number.isNaN(t) && t <= now) return false;
    }
    return true;
  } catch {
    return true; // blindado: ante cualquier error, tratar como activo
  }
}

function visibleFor(agent: ActiveAgent, c: ConceptEntry): boolean {
  // Visibilidad por tenant (null = universal) + kernel scope del agente activo.
  if (c.tenant !== null && c.tenant !== undefined && c.tenant !== agent.tenant) return false;
  if (c.layer === "erp-kernel" && agent.kernel !== "*") {
    const shortId = c.id.split("/").pop() ?? c.id;
    if (!agent.kernel.includes(shortId) && !agent.kernel.includes(c.id)) return false;
  }
  return true;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((t) => t.length > 2);
}

function scoreText(terms: string[], haystack: string): number {
  const h = haystack.toLowerCase();
  let s = 0;
  for (const t of terms) if (h.includes(t)) s += 1;
  return s;
}

// ── planificador ─────────────────────────────────────────────────────────────
const MAX_SKILLS = 2;
const MAX_CONCEPTS = 3;
const MAX_CONCEPT_BODY_CHARS = 3_500;
const MAX_PLAN_CHARS = 12_000;
// Filtro de relevancia: exige un mínimo absoluto y relativo al mejor match para
// no precargar ruido de cola (conceptos que comparten una palabra genérica).
const MIN_SCORE = 2;
const REL_SCORE = 0.5;

export type ContextPlan = {
  skills: { slug: string; description: string; score: number }[];
  concepts: { id: string; title: string; body: string; score: number }[];
};

export async function planContext(message: string): Promise<ContextPlan> {
  return planContextSync(message);
}

// Versión síncrona: el resolver de step.started de Eve se invoca SIN await
// (duplicates.ts es sync), así que el planificador no puede depender de promesas.
export function planContextSync(message: string): ContextPlan {
  try {
    const agent = loadActiveAgent();
    if (!agent) return { skills: [], concepts: [] };
    const terms = tokenize(message);
    if (terms.length === 0) return { skills: [], concepts: [] };

    // Skills del agente activo (membresía ∩ tenant) matcheadas contra el mensaje.
    const scoredSkills = loadScopedSkills(agent)
      .map((s) => ({
        slug: s.slug,
        description: s.description ?? "",
        score: scoreText(terms, `${s.slug} ${s.description}`),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    const skillTop = scoredSkills[0]?.score ?? 0;
    const skills = scoredSkills
      .filter((s) => s.score >= MIN_SCORE && s.score >= Math.ceil(skillTop * REL_SCORE))
      .slice(0, MAX_SKILLS);

    // Conceptos visibles y ACTIVOS (guard stale RASTeR) matcheados contra el mensaje.
    const ranked = CONCEPTS.filter((c) => visibleFor(agent, c) && isEntryActive(c))
      .map((c) => ({
        c,
        score: scoreText(terms, `${c.id} ${c.title} ${c.description} ${c.tags.join(" ")}`),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    const conceptTop = ranked[0]?.score ?? 0;
    const top = ranked
      .filter((x) => x.score >= MIN_SCORE && x.score >= Math.ceil(conceptTop * REL_SCORE))
      .slice(0, MAX_CONCEPTS);

    // Lee los bodies (pocos archivos, FS local) y construye el plan acotado.
    const root = resolveCompanyTwinRoot();
    const concepts: { id: string; title: string; body: string; score: number }[] = [];
    let budget = MAX_PLAN_CHARS;
    for (const { c, score } of top) {
      if (budget <= 0) break;
      try {
        const { fm, body } = parseFrontmatter(readFileSync(join(root, `${c.id}.md`), "utf8"));
        const clean = cleanTwinBody(body.trim()).slice(0, MAX_CONCEPT_BODY_CHARS);
        if (!clean) continue;
        const kept = clean.slice(0, budget);
        concepts.push({ id: c.id, title: cleanTwinText(typeof fm.title === "string" ? fm.title : c.id), body: kept, score });
        budget -= kept.length;
      } catch {
        // archivo ilegible: saltar este concepto
      }
    }

    return { skills, concepts };
  } catch {
    return { skills: [], concepts: [] }; // blindado: nunca romper el turno
  }
}

// Extrae el texto del último mensaje de usuario del historial visible.
export function lastUserText(messages: ReadonlyArray<{ role?: string; content?: unknown }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const text = (m.content as Array<Record<string, unknown>>)
        .filter((p) => p?.type === "text" && typeof p.text === "string")
        .map((p) => p.text as string)
        .join(" ");
      if (text.trim()) return text;
    }
  }
  return "";
}

// Arma el markdown del overlay a partir de un plan (null si no hay nada que precargar).
export function planMarkdown(plan: ContextPlan): string | null {
  if (!plan.skills.length && !plan.concepts.length) return null;
  const parts = ["## Plan de contexto (precargado — evita rediscovery)", ""];

  if (plan.skills.length) {
    parts.push(
      "Skills relevantes para esta consulta: " +
        plan.skills.map((s) => `\`${s.slug}\``).join(", ") +
        ". Si necesitas su playbook, cárgalo con `load_skill`; no explores otras skills.",
      "",
    );
  }

  for (const c of plan.concepts) {
    parts.push(`### ${c.title}`, "", c.body, "");
  }

  if (plan.concepts.length) {
    parts.push(
      "Los schemas anteriores ya están precargados — NO los vuelvas a consultar con " +
        "`query_company_twin`. Consulta los DATOS con `read_records`/`aggregate_records`/" +
        "`buscar_registro` del MCP.",
      "",
    );
  }

  return parts.join("\n");
}

// ── Mapa de ruteo estático (fase A del "lóbulo frontal") ─────────────────────
// Precarga en `session.started` el mapa de qué conceptos existen (título +
// descripción, SIN cuerpos) para que el modelo sepa QUÉ hay disponible y lea el
// concepto correcto en 1-2 llamadas dirigidas en vez de buscar a ciegas con
// query_company_twin.
const MAX_ROUTING_ENTRIES = 40;
const MAX_ROUTING_CHARS = 9_000;

export function buildRoutingMarkdown(): string | null {
  try {
    const agent = loadActiveAgent();
    if (!agent) return null;
    const visible = CONCEPTS.filter((c) => visibleFor(agent, c) && isEntryActive(c)).slice(0, MAX_ROUTING_ENTRIES);
    if (visible.length === 0) return null;

    const parts = [
      "## Mapa del Company Twin (ruteo — lo que existe)",
      "",
      "Conceptos disponibles (título — descripción). Cuando necesites schema o política," +
        " lee el concepto correcto con `query_company_twin` (usa su nombre o título); no busques a ciegas:",
      "",
    ];
    let budget = MAX_ROUTING_CHARS;
    for (const c of visible) {
      const line = `- ${cleanTwinText(c.title)} — ${cleanTwinText(c.description ?? "")}`;
      if (line.length > budget) break;
      parts.push(line);
      budget -= line.length;
    }
    parts.push(
      "",
      "Si un concepto de la empresa prohíbe o exige algo, gana sobre el conocimiento general del sistema.",
    );
    return parts.join("\n");
  } catch {
    return null; // blindado: nunca romper el turno
  }
}
