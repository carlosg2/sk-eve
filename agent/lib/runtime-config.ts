import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

type RuntimeFile = {
  activeTenant?: string;
  activeAgent?: string;
};

export type RuntimeConfig = {
  tenant: string;
  companyName: string;
  erpCompany: string;
  mcpUrl: string;
};

export type SearchProjections = Record<string, string[]>;

export function resolveCompanyTwinRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, "company-twin");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "company-twin");
}

/** Resuelve `agent/skill-library/` (catálogo de skills scopeadas por tenant/agente). */
export function resolveSkillLibraryRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, "agent", "skill-library");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "agent", "skill-library");
}

type FrontmatterValue = string | string[] | null;

/**
 * Parser de frontmatter que soporta escalares, listas inline (`[a, b]`), `null`
 * y block scalars (`>`/`|`). Necesario para el manifest del agente (listas
 * `skills`/`mcp_tools`) y la visibilidad `tenant` de las skills del catálogo.
 */
function parseFrontmatter(raw: string): { fm: Record<string, FrontmatterValue>; body: string } {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const block = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm: Record<string, FrontmatterValue> = {};
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim();
    if (val === ">" || val === "|" || val === ">-" || val === "|-") {
      const folded = val.startsWith(">");
      const cont: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (lines[j].trim() === "") {
          cont.push("");
          continue;
        }
        if (!/^\s+/.test(lines[j])) break;
        cont.push(lines[j].replace(/^\s+/, ""));
      }
      i = j - 1;
      fm[key] = folded
        ? cont.join(" ").replace(/\s+/g, " ").trim()
        : cont.join("\n").replace(/\n+$/, "");
    } else if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (val === "null" || val === "") {
      fm[key] = null;
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
}

function asList(v: FrontmatterValue | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function scalar(v: FrontmatterValue | undefined): string | null {
  return typeof v === "string" ? v : null;
}

function readScalarFrontmatter(raw: string): Record<string, string> {
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};

  return Object.fromEntries(
    raw
      .slice(3, end)
      .trim()
      .split("\n")
      .map((line) => line.match(/^([A-Za-z0-9_]+):\s*(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, "")]),
  );
}

function required(value: string | undefined, name: string): string {
  if (value?.trim()) return value.trim();
  throw new Error(`Falta '${name}' en la configuración del tenant activo.`);
}

export function loadRuntimeConfig(): RuntimeConfig {
  const twinRoot = resolveCompanyTwinRoot();
  const runtime = JSON.parse(readFileSync(join(twinRoot, "runtime.json"), "utf8")) as RuntimeFile;
  const tenant = process.env.SIGMA_TENANT?.trim() || required(runtime.activeTenant, "activeTenant");
  const profile = readScalarFrontmatter(
    readFileSync(join(twinRoot, "companies", tenant, "profile.md"), "utf8"),
  );

  // ⚠️ NUNCA imprimir esta config (ni cualquier URL) a stdout/stderr durante el
  // arranque: el proxy dev de Eve (`eve/dist/src/public/sveltekit/dev-server.js`)
  // detecta el origin de su servidor interno buscando la PRIMERA URL que aparezca
  // en el stdout/stderr del proceso hijo `eve dev` (regex genérica, sin filtrar
  // por host). Un `console.log` con `mcpUrl` ANTES de la línea real "[DEV] server
  // listening at http://127.0.0.1:<port>/" hace que Eve registre por error el
  // host del MCP (ej. https://api2.maserp.mx) como si fuera su propio backend en
  // `.eve/sveltekit-dev-server.json` — todo el chat queda proxied al MCP en vez
  // del motor de Eve (404 ASP.NET/Cloudflare en vez de session real). Ver
  // /memories/repo/sk-eve.md para el diagnóstico completo (2026-08-04).
  return {
    tenant,
    companyName: required(profile.company_name, "company_name"),
    erpCompany: required(profile.erp_company, "erp_company"),
    mcpUrl: process.env.INTELISIS_MCP_URL?.trim() || required(profile.mcp_url, "mcp_url"),
  };
}

export function loadSearchProjections(): SearchProjections {
  const path = join(resolveCompanyTwinRoot(), "search-projections.json");
  return JSON.parse(readFileSync(path, "utf8")) as SearchProjections;
}

export type ActiveAgent = {
  tenant: string;
  slug: string;
  name: string;
  model: string | null;
  instructions: string;
  /** Slugs del catálogo que este agente carga (membresía declarada en agent.md). */
  skills: string[];
  /** Scope de conceptos `layer: erp-kernel`: `"*"` (todos) o lista de ids. */
  kernel: string[] | "*";
  /** Allow-list efectiva de tools MCP para este agente (subset del superset del tenant). */
  mcpTools: string[];
};

export type ScopedSkill = {
  slug: string;
  description: string | null;
  markdown: string;
};

/**
 * Resuelve el agente activo (tenant + agente) desde `runtime.json` y carga su
 * `instructions.md` y su manifest de capacidades (`skills`/`kernel`/`mcp_tools`).
 * Lee fresco de disco en cada llamada para que activar un agente en /studio surta
 * efecto sin reiniciar el runtime. Devuelve `null` si no hay agente activo o si
 * su carpeta no tiene instrucciones.
 */
export function loadActiveAgent(): ActiveAgent | null {
  const twinRoot = resolveCompanyTwinRoot();
  const runtimePath = join(twinRoot, "runtime.json");
  if (!existsSync(runtimePath)) return null;
  const runtime = JSON.parse(readFileSync(runtimePath, "utf8")) as RuntimeFile;
  const tenant = process.env.SIGMA_TENANT?.trim() || runtime.activeTenant?.trim();
  const slug = process.env.SIGMA_AGENT?.trim() || runtime.activeAgent?.trim();
  if (!tenant || !slug) return null;

  const dir = join(twinRoot, "companies", tenant, "agents", slug);
  const instrPath = join(dir, "instructions.md");
  if (!existsSync(instrPath)) return null;

  const defPath = join(dir, "agent.md");
  const fm = existsSync(defPath) ? parseFrontmatter(readFileSync(defPath, "utf8")).fm : {};

  // `kernel` ausente o `"*"` (o lista con `*`) = todos los conceptos del kernel.
  const kernelRaw = fm.kernel;
  const kernel: string[] | "*" =
    kernelRaw === undefined ||
    kernelRaw === "*" ||
    (Array.isArray(kernelRaw) && kernelRaw.includes("*"))
      ? "*"
      : asList(kernelRaw);

  return {
    tenant,
    slug,
    name: scalar(fm.name) ?? slug,
    model: scalar(fm.model),
    instructions: readFileSync(instrPath, "utf8"),
    skills: asList(fm.skills),
    kernel,
    mcpTools: asList(fm.mcp_tools),
  };
}

/**
 * Carga las skills que el agente activo puede usar: intersección de su membresía
 * (`agent.skills`) con la visibilidad por tenant del catálogo
 * (`agent/skill-library/<slug>/SKILL.md`, frontmatter `tenant`). Devuelve el
 * cuerpo markdown para advertirlas dinámicamente vía `defineSkill`.
 */
export function loadScopedSkills(agent: ActiveAgent): ScopedSkill[] {
  const root = resolveSkillLibraryRoot();
  if (!existsSync(root)) return [];
  const membership = new Set(agent.skills);
  const out: ScopedSkill[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !membership.has(entry.name)) continue;
    const file = join(root, entry.name, "SKILL.md");
    if (!existsSync(file)) continue;
    const { fm, body } = parseFrontmatter(readFileSync(file, "utf8"));
    const visible = fm.tenant == null || asList(fm.tenant).includes(agent.tenant);
    if (!visible) continue;
    out.push({ slug: entry.name, description: scalar(fm.description), markdown: body.trim() });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export const runtimeConfig = loadRuntimeConfig();