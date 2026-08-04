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

export type ActiveAgentSkill = {
  slug: string;
  description: string | null;
  body: string;
};

export type ActiveAgent = {
  tenant: string;
  slug: string;
  name: string;
  model: string | null;
  instructions: string;
  skills: ActiveAgentSkill[];
};

function readActiveAgentSkills(agentDir: string): ActiveAgentSkill[] {
  const skillsDir = join(agentDir, "skills");
  if (!existsSync(skillsDir)) return [];
  const out: ActiveAgentSkill[] = [];
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, "utf8");
    const fm = readScalarFrontmatter(raw);
    const body = raw.startsWith("---")
      ? raw.slice(raw.indexOf("\n---", 3) + 4).replace(/^\s*\n/, "")
      : raw;
    out.push({ slug: entry.name, description: fm.description ?? null, body });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Resuelve el agente activo (tenant + agente) desde `runtime.json` y carga su
 * `instructions.md`. Lee fresco de disco en cada llamada para que activar un
 * agente en /studio surta efecto sin reiniciar el runtime. Devuelve `null` si
 * no hay agente activo o si su carpeta no tiene instrucciones.
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
  const fm = existsSync(defPath)
    ? readScalarFrontmatter(readFileSync(defPath, "utf8"))
    : {};

  return {
    tenant,
    slug,
    name: fm.name ?? slug,
    model: fm.model ?? null,
    instructions: readFileSync(instrPath, "utf8"),
    skills: readActiveAgentSkills(dir),
  };
}

export const runtimeConfig = loadRuntimeConfig();