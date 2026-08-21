import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveCompanyTwinRoot } from "./runtime-config.js";

// ── Compilador de skills ─────────────────────────────────────────────────────
// Los skills del catálogo (`agent/skill-library/<slug>/SKILL.md`) son
// procedurales y NO llevan schema de entidades: el modelo, al ejecutar, hace
// 6+ llamadas `query_company_twin` por turno para descubrir el schema
// (rediscovery caro: cada consulta = 1 pasada LLM). El schema real YA existe,
// validado contra el MCP, en `company-twin/erp-kernel/<entidad>.md` (frontmatter
// + `# Resumen` + `# Schema` + `# Uso` + patrones).
//
// Este módulo compila, en `session.started`, el markdown final del skill =
// SKILL.md procedural + una sección "Vista operativa" con el body del kernel de
// cada entidad que el skill declara en su frontmatter (`entities: [...]`) + una
// sección "Contexto del Company Twin" con el body de cada concepto del tenant
// que declara en su frontmatter (`twin_concepts: [mrp/mrp-sesion-periodo]`).
//
// TODO el módulo es BLINDADO (try/catch): si algo falla devuelve el markdown
// original — jamás rompe un turno ni el resto del catálogo.

/** Tope de chars del body del kernel por entidad (para no inflar el prompt). */
const BODY_CHARS_PER_ENTITY = 4000;

// ── parser de frontmatter mínimo ────────────────────────────────────────────
// Mismo patrón que el resto del runtime (context-planner.ts / runtime-config.ts);
// no está exportado allí → se replica de forma minimalista.
type Fm = Record<string, string | string[] | null>;
export function parseFrontmatter(raw: string): { fm: Fm; body: string } {
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

/** Body de un archivo del kernel: todo lo que sigue al cierre `---`. */
function kernelBody(path: string): string | null {
  try {
    const raw = readFileSync(path, "utf8");
    if (!raw.startsWith("---")) return raw.trim();
    const end = raw.indexOf("\n---", 3);
    if (end === -1) return raw.trim();
    return raw.slice(end + 4).replace(/^\s*\n/, "").trim();
  } catch {
    return null; // ilegible/inexistente → se omite, no falla
  }
}

/**
 * Path del kernel de una entidad: `<twin>/erp-kernel/<entidad>.md`. Los
 * archivos del kernel usan el nombre de entidad en MINÚSCULAS (ej.
 * `ResumenPlaneacionCF` → `resumenplaneacioncf.md`); se prueba primero el
 * nombre exacto y luego el lowercase (defensivo).
 */
function kernelPathFor(entity: string, twinRoot: string): string {
  const base = join(twinRoot, "erp-kernel");
  const exact = join(base, `${entity}.md`);
  if (existsSync(exact)) return exact;
  return join(base, `${entity.toLowerCase()}.md`);
}

/**
 * Compila la sección "Vista operativa": por cada entidad declarada, el body
 * (sin frontmatter) de su archivo del kernel. Solo incluye entidades cuyo
 * archivo exista (si no existe, la salta sin fallar) y acota el body a
 * ~4000 chars por entidad.
 *
 * `skillDir` (opcional) permite a un skill publicar su PROPIO schema en
 * `<skillDir>/kernel/<entidad>.md` (gana sobre el kernel global) — útil para
 * entidades sin archivo en `erp-kernel/` (ej. snapshots scratch del MCP).
 */
export function compileKernelView(entities: string[], skillDir?: string): string {
  try {
    const list = (entities ?? []).filter(Boolean);
    if (list.length === 0) return "";
    const twinRoot = resolveCompanyTwinRoot();
    const sections: string[] = [];
    for (const entity of list) {
      const local = skillDir ? join(skillDir, "kernel", `${entity}.md`) : "";
      const body = local && existsSync(local)
        ? kernelBody(local)
        : kernelBody(kernelPathFor(entity, twinRoot));
      if (!body) continue; // sin archivo → se omite (no falla)
      const trimmed = body.length > BODY_CHARS_PER_ENTITY
        ? `${body.slice(0, BODY_CHARS_PER_ENTITY)}…`
        : body;
      sections.push(`### ${entity}\n\n${trimmed}`);
    }
    if (sections.length === 0) return "";
    return `## Vista operativa (compilada del kernel)\n\n${sections.join("\n\n")}`;
  } catch {
    return ""; // blindado: nunca rompe el turno
  }
}

/**
 * Compila la sección "Contexto del Company Twin": por cada concepto declarado
 * en el frontmatter del SKILL.md (`twin_concepts: [mrp/mrp-sesion-periodo]` —
 * path relativo a `companies/<tenant>/` sin extensión), el body (sin
 * frontmatter) de su archivo en el Company Twin del tenant, acotado a ~4000
 * chars por concepto. Omite los conceptos cuyo archivo no exista (sin fallar).
 * Va DESPUÉS de la vista operativa del kernel: son conceptos de la capa company
 * (reglas del tenant, ej. ejercicio/periodo vigente), no entidades del kernel
 * global.
 */
export function compileTwinConceptView(concepts: string[], tenant: string): string {
  try {
    const list = (concepts ?? []).filter(Boolean);
    if (list.length === 0 || !tenant) return "";
    const twinRoot = resolveCompanyTwinRoot();
    const sections: string[] = [];
    for (const concept of list) {
      // El path ya viene con `/` (ej. `mrp/mrp-sesion-periodo`); join lo normaliza.
      const path = join(twinRoot, "companies", tenant, `${concept}.md`);
      const body = kernelBody(path);
      if (!body) continue; // sin archivo → se omite (no falla)
      const trimmed = body.length > BODY_CHARS_PER_ENTITY
        ? `${body.slice(0, BODY_CHARS_PER_ENTITY)}…`
        : body;
      sections.push(`### ${concept}\n\n${trimmed}`);
    }
    if (sections.length === 0) return "";
    return `## Contexto del Company Twin (compilado)\n\n${sections.join("\n\n")}`;
  } catch {
    return ""; // blindado: nunca rompe el turno
  }
}

/**
 * Markdown final del skill = SKILL.md procedural + vista operativa del kernel +
 * contexto del Company Twin del tenant. Devuelve el markdown ORIGINAL si no hay
 * nada que anexar o si algo falla (no rompe el resto del catálogo ni el turno).
 */
export function compileSkillMarkdown(
  skillDir: string,
  markdown: string,
  entities: string[],
  opts?: { twinConcepts?: string[]; tenant?: string },
): string {
  try {
    if (!markdown) return markdown;
    const view = compileKernelView((entities ?? []).filter(Boolean), skillDir);
    const twinView = compileTwinConceptView(opts?.twinConcepts ?? [], opts?.tenant ?? "");
    if (!view && !twinView) return markdown;
    const sections = [markdown.trim()];
    if (view) sections.push(view);
    if (twinView) sections.push(twinView);
    return sections.join("\n\n");
  } catch {
    return markdown; // blindado
  }
}
