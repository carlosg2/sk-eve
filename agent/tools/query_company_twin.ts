import { defineTool } from "eve/tools";
import { z } from "zod";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { resolveCompanyTwinRoot, loadRuntimeConfig, loadActiveAgent } from "../lib/runtime-config.js";
import { cleanTwinBody, cleanTwinText } from "../lib/twin-clean.js";

const BUNDLE_ROOT = resolveCompanyTwinRoot();

const RESERVED = new Set(["index.md", "log.md"]);

type Actor = { by: string; at: string };
type Source = {
  id?: string;
  resource: string;
  title?: string;
  author?: string;
  last_modified?: string;
  usage_count?: number;
};
type Trust = "unverified" | "machine-confirmed" | "human-reviewed";

type Concept = {
  id: string; // path relativo sin .md (concept id OKF)
  type: string;
  title?: string;
  description?: string;
  layer?: string;
  tenant?: string | null;
  tags: string[];
  // OKF v0.2: lifecycle + trust + provenance
  status?: string; // draft | stable | deprecated (ausente ⇒ stable)
  staleAfter?: string; // fecha absoluta YYYY-MM-DD
  generated?: Actor;
  verified?: Actor[];
  sources?: Source[];
  stale: boolean; // hoy >= stale_after
  trust: Trust; // derivado de verified (human: ⇒ human-reviewed)
  body: string;
};

// Parseador de flow mappings YAML inline: `{ by: x, at: 2026-01-01 }` → { by, at }.
function parseFlowMap(s: string): Record<string, string> {
  const inner = s.replace(/^\{\s*/, "").replace(/\s*\}$/, "");
  const out: Record<string, string> = {};
  let depth = 0;
  let cur = "";
  const parts: string[] = [];
  for (const ch of inner) {
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  for (const p of parts) {
    const i = p.indexOf(":");
    if (i < 0) continue;
    out[p.slice(0, i).trim()] = p.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// Parser mínimo de frontmatter YAML plano (sin dependencias). Soporta escalares,
// listas inline (`[a, b]`), flow mappings (`{ by, at }`) y secuencias de mappings
// en bloque (`sources:`, `verified:`) de OKF v0.2.
function parseFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmBlock = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm: Record<string, unknown> = {};
  const lines = fmBlock.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (val === "null" || val === "") {
      fm[key] = null;
    } else if (val.startsWith("{") && val.endsWith("}")) {
      // Flow mapping inline: `generated: { by: x, at: ... }`
      fm[key] = parseFlowMap(val);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }

    // Secuencia en bloque tras una clave vacía: `verified:`, `sources:`, `parameters:`
    if (fm[key] === null && i + 1 < lines.length && /^\s*-\s*/.test(lines[i + 1])) {
      const items: Record<string, string>[] = [];
      let j = i + 1;
      // Forma flow map: `- { by: x, at: ... }` / `- { name: ..., type: ... }`
      while (j < lines.length && /^\s*-\s*\{.*\}\s*$/.test(lines[j])) {
        const flow = lines[j].match(/^\s*-\s*(\{.*\})\s*$/);
        if (flow) items.push(parseFlowMap(flow[1]));
        j++;
      }
      // Forma mappings: `- id: foo` + líneas indentadas
      while (j < lines.length && /^\s*-\s*\S/.test(lines[j])) {
        const first = lines[j].match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
        if (!first) break;
        const item: Record<string, string> = {};
        let k = first[1];
        let v = first[2].trim();
        j++;
        while (j < lines.length && /^\s+[A-Za-z0-9_]+:/.test(lines[j])) {
          const next = lines[j].match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
          if (!next) break;
          item[k] = v.replace(/^["']|["']$/g, "");
          k = next[1];
          v = next[2].trim();
          j++;
        }
        item[k] = v.replace(/^["']|["']$/g, "");
        items.push(item);
      }
      fm[key] = items;
      i = j - 1;
    }
  }
  return { fm, body };
}

function trustOf(verified: Actor[] | undefined): Trust {
  if (!verified || verified.length === 0) return "unverified";
  return verified.some((v) => String(v.by ?? "").startsWith("human:"))
    ? "human-reviewed"
    : "machine-confirmed";
}

function isStale(staleAfter: string | undefined): boolean {
  if (!staleAfter) return false;
  const d = new Date(`${staleAfter}T23:59:59`);
  return !Number.isNaN(d.getTime()) && new Date() >= d;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".md") && !RESERVED.has(entry.name)) out.push(full);
  }
  return out;
}

async function loadConcepts(): Promise<Concept[]> {
  const files = await walk(BUNDLE_ROOT);
  const concepts: Concept[] = [];
  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const { fm, body } = parseFrontmatter(raw);
    if (!fm.type) continue; // OKF: sin `type` no es un concepto conformante
    const verifiedRaw = fm.verified as Actor[] | Actor | undefined;
    const verifiedList: Actor[] | undefined = Array.isArray(verifiedRaw)
      ? verifiedRaw
      : verifiedRaw && typeof verifiedRaw === "object"
        ? [verifiedRaw]
        : undefined;
    concepts.push({
      id: relative(BUNDLE_ROOT, file).replace(/\.md$/, ""),
      type: String(fm.type),
      title: fm.title as string | undefined,
      description: fm.description as string | undefined,
      layer: fm.layer as string | undefined,
      tenant: (fm.tenant ?? null) as string | null,
      tags: (fm.tags as string[]) ?? [],
      status: (fm.status as string | undefined) ?? "stable",
      staleAfter: fm.stale_after as string | undefined,
      generated: fm.generated as Actor | undefined,
      verified: verifiedList,
      sources: fm.sources as Source[] | undefined,
      stale: isStale(fm.stale_after as string | undefined),
      trust: trustOf(verifiedList),
      body,
    });
  }
  return concepts;
}

function score(c: Concept, terms: string[]): number {
  const hay = `${c.id} ${c.title ?? ""} ${c.description ?? ""} ${c.tags.join(" ")} ${c.body}`.toLowerCase();
  let s = 0;
  for (const t of terms) if (hay.includes(t)) s += 1;
  return s;
}

// Devuelve el nombre corto de un concepto (último segmento del id). El agente
// ve nombres planos ("cxp"), nunca rutas internas de la fábrica
// ("erp-kernel/cxp", "companies/icf/modulos").
function shortId(id: string): string {
  return id.split("/").pop() ?? id;
}

export default defineTool({
  description:
    "Consulta el conocimiento del sistema (Company Twin): schema de entidades, estatus válidos, " +
    "políticas y reglas operativas de la empresa activa. " +
    "Sin `concept` hace una búsqueda y devuelve solo la lista de conceptos coincidentes (título + descripción). " +
    "Con `concept` devuelve el cuerpo completo del concepto (puedes usar el nombre corto, ej. 'cxp').",
  inputSchema: z.object({
    query: z.string().optional().describe("Búsqueda en lenguaje natural (ej: 'límite de aprobación CXP')"),
    concept: z.string().optional().describe("Concepto a leer completo (nombre corto o id, ej: 'cxp')"),
    limit: z.number().int().min(1).max(20).default(5).describe("Máximo de coincidencias"),
  }),
  async execute({ query, concept, layer, limit }) {
    const concepts = await loadConcepts();
    // Tenant activo FRESCO por llamada (no cacheado) para que cambiar de agente/
    // tenant en /studio surta efecto sin reiniciar. Visibilidad por tenant +
    // scope de kernel del agente activo.
    const activeTenant = loadRuntimeConfig().tenant;
    const kernelScope = loadActiveAgent()?.kernel ?? "*";
    const visible = concepts.filter((candidate) => {
      if (candidate.tenant !== null && candidate.tenant !== activeTenant) return false;
      if (candidate.layer === "erp-kernel" && kernelScope !== "*") {
        const shortId = candidate.id.split("/").pop() ?? candidate.id;
        if (!kernelScope.includes(shortId) && !kernelScope.includes(candidate.id)) return false;
      }
      return true;
    });

    // Modo lectura: cuerpo completo de un concepto. Acepta id completo
    // (`erp-kernel/cxp`), nombre corto (`cxp`) o el título (`Art — Artículos`).
    // El agente solo ve nombres cortos y títulos; las rutas de la fábrica son
    // un detalle interno.
    if (concept) {
      // Normalización compartida para id y título: minúsculas, sin puntuación,
      // espacios colapsados. Permite resolver por nombre corto, ruta o título
      // ("ICF — Política de operaciones" → "icf política de operaciones").
      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9áéíóúñü\s]/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
      const normalized = norm(concept);
      const found = visible.find((candidate) => {
        if (norm(candidate.id) === normalized) return true;
        if (norm(candidate.id.split("/").pop() ?? "") === normalized) return true;
        const normTitle = norm(candidate.title ?? "");
        return (
          (normTitle === normalized || normTitle.includes(normalized)) &&
          normalized.length > 3
        );
      });
      if (!found) {
        return { error: `Concepto '${concept}' no encontrado para esta empresa` };
      }
      return {
        id: shortId(found.id),
        title: cleanTwinText(found.title ?? found.id),
        body: cleanTwinBody(found.body),
      };
    }

    // Modo búsqueda: progressive disclosure (solo títulos y descripciones,
    // sin metadata de fábrica: capas, tenant, status, trust, provenance).
    const terms = (query ?? "").toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const ranked =
      terms.length === 0
        ? visible
        : visible
            .map((c) => ({ c, s: score(c, terms) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .map((x) => x.c);

    return {
      matches: ranked.slice(0, limit).map((c) => ({
        id: shortId(c.id),
        title: cleanTwinText(c.title ?? c.id),
        description: cleanTwinText(c.description ?? ""),
      })),
      hint: "Usa `concept` con un nombre para leer el cuerpo completo.",
    };
  },
});
