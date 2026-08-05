import { defineTool } from "eve/tools";
import { z } from "zod";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { resolveCompanyTwinRoot, loadRuntimeConfig, loadActiveAgent } from "../lib/runtime-config.js";

const BUNDLE_ROOT = resolveCompanyTwinRoot();

const RESERVED = new Set(["index.md", "log.md"]);

type Concept = {
  id: string; // path relativo sin .md (concept id OKF)
  type: string;
  title?: string;
  description?: string;
  layer?: string;
  tenant?: string | null;
  tags: string[];
  body: string;
};

// Parser mínimo de frontmatter YAML plano (sin dependencias). Soporta los
// campos escalares y listas inline (`[a, b]`) que usa este bundle.
function parseFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmBlock = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm: Record<string, unknown> = {};
  for (const line of fmBlock.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (val === "null") {
      fm[key] = null;
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
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
    concepts.push({
      id: relative(BUNDLE_ROOT, file).replace(/\.md$/, ""),
      type: String(fm.type),
      title: fm.title as string | undefined,
      description: fm.description as string | undefined,
      layer: fm.layer as string | undefined,
      tenant: (fm.tenant ?? null) as string | null,
      tags: (fm.tags as string[]) ?? [],
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

export default defineTool({
  description:
    "Consulta el Company Twin (bundle OKF con conocimiento en capas: erp-kernel, company). " +
    "Sin `concept` hace búsqueda con progressive disclosure y devuelve solo metadata (id, tipo, capa, descripción). " +
    "Con `concept` devuelve el cuerpo completo de ese concepto. Filtra por `layer` y `tenant` para respetar el Context Stack.",
  inputSchema: z.object({
    query: z.string().optional().describe("Búsqueda en lenguaje natural (ej: 'límite de aprobación CXP')"),
    concept: z.string().optional().describe("ID de concepto OKF para leer su cuerpo completo (ej: 'erp-kernel/cxp')"),
    layer: z
      .enum(["erp-kernel", "vertical", "company", "skill"])
      .optional()
      .describe("Filtrar por capa del Context Stack"),
    limit: z.number().int().min(1).max(20).default(5).describe("Máximo de coincidencias de metadata"),
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

    // Modo lectura: cuerpo completo de un concepto.
    if (concept) {
      const found = visible.find((candidate) => candidate.id === concept);
      if (!found) {
        return { error: `Concepto '${concept}' no encontrado para el tenant activo` };
      }
      return {
        id: found.id,
        type: found.type,
        layer: found.layer,
        tenant: found.tenant,
        tags: found.tags,
        body: found.body,
      };
    }

    // Modo búsqueda: progressive disclosure (solo metadata, no cuerpos).
    let pool = visible;
    if (layer) pool = pool.filter((c) => c.layer === layer);

    const terms = (query ?? "").toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const ranked =
      terms.length === 0
        ? pool
        : pool
            .map((c) => ({ c, s: score(c, terms) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .map((x) => x.c);

    return {
      tenant: activeTenant,
      matches: ranked.slice(0, limit).map((c) => ({
        id: c.id,
        type: c.type,
        layer: c.layer,
        tenant: c.tenant,
        description: c.description,
        tags: c.tags,
      })),
      hint: "Usa `concept` con un id para leer el cuerpo completo.",
    };
  },
});
