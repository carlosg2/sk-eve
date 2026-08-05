import { existsSync } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

/**
 * Modelo de archivos del harness designer. Todo vive bajo `company-twin/` y se
 * versiona en git. Jerarquía: Tenant → Agentes. El tenant se declara con el
 * frontmatter de `profile.md`; cada agente vive en `agents/<slug>/`.
 *
 * Ninguna operación acepta rutas absolutas del cliente: todas las escrituras y
 * lecturas se resuelven contra `twinRoot` y se rechaza cualquier salida del raíz
 * (path traversal) y cualquier extensión no permitida.
 */

const ALLOWED_WRITE_EXT = new Set([".md", ".ts", ".json"]);

export type TenantSummary = {
	slug: string;
	companyName: string;
	erpCompany: string;
	mcpUrl: string;
	/** Ruta del profile.md relativa a `company-twin/`. */
	profilePath: string;
	agents: AgentSummary[];
	active: boolean;
};

export type AgentSummary = {
	slug: string;
	tenant: string;
	name: string;
	model: string | null;
	reasoning: string | null;
	description: string | null;
	/** Ruta del agent.md relativa a `company-twin/`. */
	defPath: string;
	active: boolean;
};

export type TreeNode = {
	name: string;
	/** Ruta relativa a `company-twin/`. */
	path: string;
	kind: "dir" | "file";
	children?: TreeNode[];
};

export type RuntimeSelection = {
	activeTenant: string | null;
	activeAgent: string | null;
};

/** Resuelve la raíz `company-twin/` subiendo desde el cwd del proceso. */
export function twinRoot(): string {
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
export function skillLibraryRoot(): string {
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

/** Prefijo que distingue rutas del catálogo (`agent/skill-library/`) en el API genérico de archivos. */
const AGENT_SKILLS_PREFIX = "agent-skills/";

/**
 * Resuelve una ruta relativa (recibida del cliente) contra `company-twin/` (o,
 * si empieza con `agent-skills/`, contra `agent/skill-library/`) y verifica que
 * no escape del raíz correspondiente. Lanza si hay traversal.
 */
export function safeResolve(relPath: string): string {
	if (relPath.startsWith(AGENT_SKILLS_PREFIX)) {
		const root = skillLibraryRoot();
		const full = resolve(root, relPath.slice(AGENT_SKILLS_PREFIX.length));
		if (full !== root && !full.startsWith(root + sep)) {
			throw new Error(`Ruta fuera de agent/skill-library: ${relPath}`);
		}
		return full;
	}
	const root = twinRoot();
	const full = resolve(root, relPath);
	if (full !== root && !full.startsWith(root + sep)) {
		throw new Error(`Ruta fuera de company-twin: ${relPath}`);
	}
	return full;
}

function assertWritable(relPath: string): void {
	const dot = relPath.lastIndexOf(".");
	const ext = dot === -1 ? "" : relPath.slice(dot);
	if (!ALLOWED_WRITE_EXT.has(ext)) {
		throw new Error(`Extensión no permitida para escritura: ${relPath}`);
	}
}

// ── frontmatter ────────────────────────────────────────────────────────────

/** Parser mínimo de frontmatter YAML plano (escalares + listas inline + block scalars `>`/`|`). */
export function parseFrontmatter(raw: string): {
	fm: Record<string, string | string[] | null>;
	body: string;
} {
	if (!raw.startsWith("---")) return { fm: {}, body: raw };
	const end = raw.indexOf("\n---", 3);
	if (end === -1) return { fm: {}, body: raw };
	const block = raw.slice(3, end).trim();
	const body = raw.slice(end + 4).replace(/^\s*\n/, "");
	const fm: Record<string, string | string[] | null> = {};
	const lines = block.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
		if (!m) continue;
		const [, key, rawVal] = m;
		const val = rawVal.trim();
		if (val === ">" || val === "|" || val === ">-" || val === "|-") {
			// Block scalar: las líneas siguientes, indentadas, son el contenido.
			const folded = val.startsWith(">");
			const contLines: string[] = [];
			let j = i + 1;
			for (; j < lines.length; j++) {
				if (lines[j].trim() === "") {
					contLines.push("");
					continue;
				}
				if (!/^\s+/.test(lines[j])) break;
				contLines.push(lines[j].replace(/^\s+/, ""));
			}
			i = j - 1;
			fm[key] = folded
				? contLines.join(" ").replace(/\s+/g, " ").trim()
				: contLines.join("\n").replace(/\n+$/, "");
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

function str(v: string | string[] | null | undefined): string | null {
	return typeof v === "string" ? v : null;
}

// ── tenants ──────────────────────────────────────────────────────────────────

export async function readRuntime(): Promise<RuntimeSelection> {
	const path = join(twinRoot(), "runtime.json");
	if (!existsSync(path)) return { activeTenant: null, activeAgent: null };
	try {
		const parsed = JSON.parse(await readFile(path, "utf8")) as {
			activeTenant?: string;
			activeAgent?: string;
		};
		return {
			activeTenant: parsed.activeTenant ?? null,
			activeAgent: parsed.activeAgent ?? null,
		};
	} catch {
		return { activeTenant: null, activeAgent: null };
	}
}

export async function setRuntime(next: Partial<RuntimeSelection>): Promise<RuntimeSelection> {
	const current = await readRuntime();
	const merged: RuntimeSelection = {
		activeTenant: next.activeTenant ?? current.activeTenant,
		activeAgent: next.activeAgent ?? current.activeAgent,
	};
	const path = join(twinRoot(), "runtime.json");
	await writeFile(
		path,
		`${JSON.stringify(
			{ activeTenant: merged.activeTenant, activeAgent: merged.activeAgent },
			null,
			2,
		)}\n`,
		"utf8",
	);
	return merged;
}

async function listAgents(tenantSlug: string, activeAgent: string | null): Promise<AgentSummary[]> {
	const agentsDir = join(twinRoot(), "companies", tenantSlug, "agents");
	if (!existsSync(agentsDir)) return [];
	const out: AgentSummary[] = [];
	for (const entry of await readdir(agentsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const defPath = join("companies", tenantSlug, "agents", entry.name, "agent.md");
		const full = join(twinRoot(), defPath);
		let fm: Record<string, string | string[] | null> = {};
		if (existsSync(full)) fm = parseFrontmatter(await readFile(full, "utf8")).fm;
		out.push({
			slug: entry.name,
			tenant: tenantSlug,
			name: str(fm.name) ?? entry.name,
			model: str(fm.model),
			reasoning: str(fm.reasoning),
			description: str(fm.description),
			defPath,
			active: activeAgent === entry.name,
		});
	}
	return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function listTenants(): Promise<TenantSummary[]> {
	const companiesDir = join(twinRoot(), "companies");
	if (!existsSync(companiesDir)) return [];
	const runtime = await readRuntime();
	const out: TenantSummary[] = [];
	for (const entry of await readdir(companiesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const profilePath = join("companies", entry.name, "profile.md");
		const full = join(twinRoot(), profilePath);
		if (!existsSync(full)) continue;
		const { fm } = parseFrontmatter(await readFile(full, "utf8"));
		out.push({
			slug: entry.name,
			companyName: str(fm.company_name) ?? entry.name,
			erpCompany: str(fm.erp_company) ?? "",
			mcpUrl: str(fm.mcp_url) ?? "",
			profilePath,
			agents: await listAgents(entry.name, runtime.activeAgent),
			active: runtime.activeTenant === entry.name,
		});
	}
	return out.sort((a, b) => a.companyName.localeCompare(b.companyName));
}

// ── file ops ──────────────────────────────────────────────────────────────────

export type ActiveAgentPreview = {
	tenant: string;
	slug: string;
	name: string;
	model: string | null;
	instructions: string;
	exists: boolean;
};

/**
 * Resuelve el agente activo desde `runtime.json` y carga su `instructions.md`,
 * replicando las reglas del runtime live (`agent/lib/runtime-config.ts`). Sirve
 * para previsualizar en /studio qué instrucciones se inyectarán en el próximo
 * arranque de sesión. Devuelve `null` si no hay tenant+agente activos.
 */
export async function resolveActiveAgent(): Promise<ActiveAgentPreview | null> {
	const runtime = await readRuntime();
	const tenant = runtime.activeTenant;
	const slug = runtime.activeAgent;
	if (!tenant || !slug) return null;

	const dir = join(twinRoot(), "companies", tenant, "agents", slug);
	const instrPath = join(dir, "instructions.md");
	const exists = existsSync(instrPath);
	const instructions = exists ? await readFile(instrPath, "utf8") : "";

	const defPath = join(dir, "agent.md");
	const fm = existsSync(defPath) ? parseFrontmatter(await readFile(defPath, "utf8")).fm : {};

	return {
		tenant,
		slug,
		name: str(fm.name) ?? slug,
		model: str(fm.model),
		instructions,
		exists,
	};
}


export async function readTwinFile(relPath: string): Promise<{ path: string; content: string; exists: boolean }> {
	const full = safeResolve(relPath);
	if (!existsSync(full)) return { path: relPath, content: "", exists: false };
	return { path: relPath, content: await readFile(full, "utf8"), exists: true };
}

export async function writeTwinFile(relPath: string, content: string): Promise<void> {
	assertWritable(relPath);
	const full = safeResolve(relPath);
	await mkdir(dirname(full), { recursive: true });
	await writeFile(full, content, "utf8");
}

const IGNORED_TREE = new Set([".DS_Store"]);

/** Árbol de archivos bajo una ruta relativa (para el navegador del Company Twin). */
export async function readTree(relPath: string): Promise<TreeNode[]> {
	const full = safeResolve(relPath);
	if (!existsSync(full)) return [];
	const entries = await readdir(full, { withFileTypes: true });
	const nodes: TreeNode[] = [];
	for (const entry of entries) {
		if (IGNORED_TREE.has(entry.name)) continue;
		const childRel = relative(twinRoot(), join(full, entry.name));
		if (entry.isDirectory()) {
			nodes.push({
				name: entry.name,
				path: childRel,
				kind: "dir",
				children: await readTree(childRel),
			});
		} else {
			nodes.push({ name: entry.name, path: childRel, kind: "file" });
		}
	}
	return nodes.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
}

// ── scaffolding ────────────────────────────────────────────────────────────

const SLUG_RE = /[^a-z0-9-]/g;
export function slugify(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, "-").replace(SLUG_RE, "");
}

export async function createTenant(input: {
	slug: string;
	companyName: string;
	erpCompany: string;
	mcpUrl: string;
}): Promise<TenantSummary> {
	const slug = slugify(input.slug || input.companyName);
	if (!slug) throw new Error("Slug de tenant inválido.");
	const dir = join(twinRoot(), "companies", slug);
	if (existsSync(dir)) throw new Error(`El tenant '${slug}' ya existe.`);
	const profile = [
		"---",
		"type: Tenant Profile",
		`title: ${input.companyName}`,
		`description: Perfil de despliegue de ${input.companyName}.`,
		"layer: company",
		`tenant: ${slug}`,
		`company_name: ${input.companyName}`,
		`erp_company: ${input.erpCompany}`,
		`mcp_url: ${input.mcpUrl}`,
		"tags: [perfil, runtime, conexion]",
		"---",
		"",
		`# ${input.companyName}`,
		"",
		`Perfil activo del tenant ${slug}.`,
		"",
	].join("\n");
	await writeTwinFile(join("companies", slug, "profile.md"), profile);
	await mkdir(join(dir, "agents"), { recursive: true });
	const tenants = await listTenants();
	const created = tenants.find((t) => t.slug === slug);
	if (!created) throw new Error("No se pudo crear el tenant.");
	return created;
}

export async function createAgent(input: {
	tenant: string;
	slug: string;
	name: string;
	model: string;
	description: string;
}): Promise<AgentSummary> {
	const tenantSlug = slugify(input.tenant);
	const slug = slugify(input.slug || input.name);
	if (!slug) throw new Error("Slug de agente inválido.");
	const tenantDir = join(twinRoot(), "companies", tenantSlug);
	if (!existsSync(tenantDir)) throw new Error(`El tenant '${tenantSlug}' no existe.`);
	const agentDir = join(tenantDir, "agents", slug);
	if (existsSync(agentDir)) throw new Error(`El agente '${slug}' ya existe en '${tenantSlug}'.`);

	const model = input.model.trim() || "anthropic/claude-sonnet-4-5";
	const def = [
		"---",
		"type: Agent",
		`name: ${input.name}`,
		`model: ${model}`,
		"reasoning: null",
		`description: ${input.description || input.name}`,
		`tenant: ${tenantSlug}`,
		"---",
		"",
		`# ${input.name}`,
		"",
		input.description || "Agente sin descripción.",
		"",
	].join("\n");
	await writeTwinFile(join("companies", tenantSlug, "agents", slug, "agent.md"), def);
	await writeTwinFile(
		join("companies", tenantSlug, "agents", slug, "instructions.md"),
		`# Instrucciones — ${input.name}\n\nEres el asistente de ${tenantSlug}.\n`,
	);
	const agents = await listAgents(tenantSlug, null);
	const created = agents.find((a) => a.slug === slug);
	if (!created) throw new Error("No se pudo crear el agente.");
	return created;
}

export async function deleteAgent(tenant: string, slug: string): Promise<void> {
	const dir = safeResolve(join("companies", slugify(tenant), "agents", slugify(slug)));
	if (!existsSync(dir)) return;
	await rm(dir, { recursive: true, force: true });
}

// ── capabilities: catálogo de skills ─────────────────────────────────────────

export type AgentCapability = {
	slug: string;
	name: string;
	description: string | null;
	/** Visibilidad por tenant: `null` (universal) o lista de slugs de tenant. */
	tenant: string[] | null;
	/** Ruta del archivo editable (prefijo `agent-skills/`). */
	path: string;
};

/** Lee la primera línea `# Título` del cuerpo markdown, si existe. */
function firstHeading(body: string): string | null {
	for (const line of body.split("\n")) {
		const m = line.match(/^#\s+(.+)$/);
		if (m) return m[1].trim();
	}
	return null;
}

/** Normaliza el frontmatter `tenant` (escalar/lista/null) a lista o `null` (universal). */
function tenantVisibility(v: string | string[] | null | undefined): string[] | null {
	if (v == null) return null;
	if (Array.isArray(v)) return v;
	return [v];
}

/**
 * Lista el catálogo de skills (`agent/skill-library/<slug>/SKILL.md`). Si se pasa
 * `tenant`, filtra a las visibles para ese tenant (frontmatter `tenant` = `null`
 * o incluye el slug). Sin `tenant`, devuelve todo el catálogo.
 */
export async function listCatalogSkills(tenant?: string): Promise<AgentCapability[]> {
	const dir = skillLibraryRoot();
	if (!existsSync(dir)) return [];
	const out: AgentCapability[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const full = join(dir, entry.name, "SKILL.md");
		if (!existsSync(full)) continue;
		const { fm, body } = parseFrontmatter(await readFile(full, "utf8"));
		const visibility = tenantVisibility(fm.tenant);
		if (tenant && visibility !== null && !visibility.includes(slugify(tenant))) continue;
		out.push({
			slug: entry.name,
			name: firstHeading(body) ?? entry.name,
			description: str(fm.description),
			tenant: visibility,
			path: `${AGENT_SKILLS_PREFIX}${entry.name}/SKILL.md`,
		});
	}
	return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Crea una skill en el catálogo (`agent/skill-library/<slug>/SKILL.md`) con su
 * visibilidad `tenant`. `tenant: null` = universal (opt-in por cualquier agente).
 */
export async function createCatalogSkill(input: {
	name: string;
	description: string;
	tenant?: string | null;
	body?: string;
}): Promise<AgentCapability> {
	const slug = slugify(input.name);
	if (!slug) throw new Error("Nombre de skill inválido.");
	const rel = `${AGENT_SKILLS_PREFIX}${slug}/SKILL.md`;
	if (existsSync(safeResolve(rel))) throw new Error(`El skill '${slug}' ya existe.`);
	const tenantLine = input.tenant ? `tenant: ${slugify(input.tenant)}` : "tenant: null";
	const body =
		input.body?.trim() || `# ${input.name}\n\nDescribe cómo el agente debe ejecutar este skill.`;
	const md = ["---", tenantLine, `description: ${JSON.stringify(input.description)}`, "---", "", body, ""].join(
		"\n",
	);
	await writeTwinFile(rel, md);
	return {
		slug,
		name: input.name,
		description: input.description,
		tenant: input.tenant ? [slugify(input.tenant)] : null,
		path: rel,
	};
}

// ── capabilities: manifest del agente (agent.md) ─────────────────────────────

export type AgentManifest = {
	skills: string[];
	kernel: string[] | "*";
	mcpTools: string[];
};

function asStrList(v: string | string[] | null | undefined): string[] {
	if (Array.isArray(v)) return v;
	if (typeof v === "string" && v.trim()) return [v.trim()];
	return [];
}

function agentDefPath(tenant: string, agent: string): string {
	return join("companies", slugify(tenant), "agents", slugify(agent), "agent.md");
}

/** Ruta relativa (a `company-twin/`) del `agent.md` de un agente. */
export function agentMdPath(tenant: string, agent: string): string {
	return agentDefPath(tenant, agent);
}

/** Lee el manifest de capacidades (`skills`/`kernel`/`mcp_tools`) de un `agent.md`. */
export async function readAgentManifest(tenant: string, agent: string): Promise<AgentManifest> {
	const full = join(twinRoot(), agentDefPath(tenant, agent));
	if (!existsSync(full)) return { skills: [], kernel: "*", mcpTools: [] };
	const { fm } = parseFrontmatter(await readFile(full, "utf8"));
	const kernelRaw = fm.kernel;
	const kernel: string[] | "*" =
		kernelRaw === undefined ||
		kernelRaw === null ||
		kernelRaw === "*" ||
		(Array.isArray(kernelRaw) && kernelRaw.includes("*"))
			? "*"
			: asStrList(kernelRaw);
	return { skills: asStrList(fm.skills), kernel, mcpTools: asStrList(fm.mcp_tools) };
}

/** Serializa un valor de manifest como línea YAML inline (lista o `"*"`). */
function manifestLine(key: string, value: string[] | "*"): string {
	if (value === "*") return `${key}: "*"`;
	return `${key}: [${value.join(", ")}]`;
}

/**
 * Reescribe (función pura) las claves `skills`/`kernel`/`mcp_tools` del
 * frontmatter de un `agent.md`, preservando el resto del documento. Lanza si el
 * frontmatter está ausente o mal formado. Usada por `writeAgentManifest` (que
 * persiste) y por el motor Evolve (que solo necesita el diff).
 */
export function applyManifestToAgentMd(raw: string, next: AgentManifest): string {
	if (!raw.startsWith("---")) throw new Error("agent.md sin frontmatter.");
	const end = raw.indexOf("\n---", 3);
	if (end === -1) throw new Error("agent.md con frontmatter mal formado.");
	const fmBlock = raw.slice(4, end);
	const rest = raw.slice(end); // "\n---...resto"
	const lines = fmBlock.split("\n").filter((line) => {
		const m = line.match(/^([A-Za-z0-9_]+):/);
		return !m || !["skills", "kernel", "mcp_tools"].includes(m[1]);
	});
	lines.push(
		manifestLine("skills", next.skills),
		manifestLine("kernel", next.kernel),
		manifestLine("mcp_tools", next.mcpTools),
	);
	return `---\n${lines.join("\n").replace(/\n+$/, "")}${rest}`;
}

/**
 * Reescribe las claves `skills`/`kernel`/`mcp_tools` del frontmatter de un
 * `agent.md`, preservando el resto del documento. Inserta la clave si falta.
 */
export async function writeAgentManifest(
	tenant: string,
	agent: string,
	patch: Partial<AgentManifest>,
): Promise<AgentManifest> {
	const rel = agentDefPath(tenant, agent);
	const full = join(twinRoot(), rel);
	if (!existsSync(full)) throw new Error(`No existe agent.md para '${tenant}/${agent}'.`);
	const raw = await readFile(full, "utf8");
	const current = await readAgentManifest(tenant, agent);
	const next: AgentManifest = {
		skills: patch.skills ?? current.skills,
		kernel: patch.kernel ?? current.kernel,
		mcpTools: patch.mcpTools ?? current.mcpTools,
	};
	await writeFile(full, applyManifestToAgentMd(raw, next), "utf8");
	return next;
}

// ── capabilities: conceptos del ERP Kernel ───────────────────────────────────

export type KernelConcept = {
	/** Id corto (nombre de archivo sin `.md`), usado en el manifest `kernel`. */
	id: string;
	title: string;
	description: string | null;
};

/** Lista los conceptos de la capa ERP Kernel (`company-twin/erp-kernel/*.md`). */
export async function listKernelConcepts(): Promise<KernelConcept[]> {
	const dir = join(twinRoot(), "erp-kernel");
	if (!existsSync(dir)) return [];
	const out: KernelConcept[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "index.md") continue;
		const { fm, body } = parseFrontmatter(await readFile(join(dir, entry.name), "utf8"));
		if (!fm.type) continue;
		const id = entry.name.replace(/\.md$/, "");
		out.push({
			id,
			title: str(fm.title) ?? firstHeading(body) ?? id,
			description: str(fm.description),
		});
	}
	return out.sort((a, b) => a.id.localeCompare(b.id));
}

// ── capabilities: tools del runtime ──────────────────────────────────────────

export type RuntimeTool = {
	name: string;
	description: string | null;
	/** Ruta relativa al repo, informativa (no editable desde /studio). */
	path: string;
};

/** Resuelve la carpeta `agent/` del runtime live (hermana de `company-twin/`). */
function runtimeAgentRoot(): string | null {
	const root = dirname(twinRoot());
	const candidate = join(root, "agent");
	return existsSync(candidate) ? candidate : null;
}

/** Extrae `description: "..."` (comillas simples o dobles) del source de un tool. */
function extractToolDescription(source: string): string | null {
	const m = source.match(/description:\s*(["'`])([\s\S]*?)\1/);
	return m ? m[2].trim() : null;
}

/**
 * Lista los tools TypeScript del runtime live (`agent/tools/*.ts`): son los que
 * Eve compila y expone al modelo además de los del MCP. Solo lectura.
 */
export async function listRuntimeTools(): Promise<RuntimeTool[]> {
	const root = runtimeAgentRoot();
	if (!root) return [];
	const dir = join(root, "tools");
	if (!existsSync(dir)) return [];
	const out: RuntimeTool[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
		const source = await readFile(join(dir, entry.name), "utf8");
		out.push({
			name: entry.name.replace(/\.ts$/, ""),
			description: extractToolDescription(source),
			path: join("agent", "tools", entry.name),
		});
	}
	return out.sort((a, b) => a.name.localeCompare(b.name));
}

export type FrameworkTool = { name: string; description: string };

/**
 * Tools que Eve inyecta al modelo por defecto (sin sandbox). No viven en
 * `agent/tools/` ni en el MCP: las provee el framework. Los tools de sandbox
 * (bash/glob/grep/read_file/write_file) NO están porque `agent.ts` no configura
 * sandbox. Fuente compartida con el inventario de /debug/tools.
 */
export const FRAMEWORK_TOOLS: FrameworkTool[] = [
	{ name: "connection_search", description: "Descubre y registra tools de las conexiones MCP." },
	{ name: "load_skill", description: "Carga un skill por nombre bajo demanda; inyecta instrucciones enfocadas de un dominio." },
	{ name: "ask_question", description: "Pregunta al usuario y espera respuesta (evento HITL input.requested)." },
	{ name: "todo", description: "Gestiona una lista de tareas durable de la sesión; sobrevive a la compactación." },
	{ name: "web_fetch", description: "Obtiene el contenido de una URL. Devuelve texto/HTML." },
	{ name: "web_search", description: "Busca en la web y devuelve resultados." },
];

// ── MCP ping ─────────────────────────────────────────────────────────────────

/** Prueba de conectividad contra un endpoint MCP (initialize handshake). */
export async function pingMcp(url: string): Promise<{ ok: boolean; status?: number; detail: string }> {
	if (!/^https?:\/\//.test(url)) {
		return { ok: false, detail: "URL inválida (se espera http/https)." };
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2024-11-05",
					capabilities: {},
					clientInfo: { name: "sk-eve-studio", version: "0.0.1" },
				},
			}),
			signal: controller.signal,
		});
		const body = await res.text();
		return {
			ok: res.ok,
			status: res.status,
			detail: res.ok ? `Handshake OK (${res.status})` : body.slice(0, 300) || `HTTP ${res.status}`,
		};
	} catch (err) {
		return { ok: false, detail: err instanceof Error ? err.message : "Fallo de red" };
	} finally {
		clearTimeout(timeout);
	}
}

// ── MCP tools discovery ──────────────────────────────────────────────────────

/** URL del MCP declarada en el `profile.md` del tenant. */
export async function tenantMcpUrl(slug: string): Promise<string | null> {
	const profilePath = join(twinRoot(), "companies", slugify(slug), "profile.md");
	if (!existsSync(profilePath)) return null;
	const { fm } = parseFrontmatter(await readFile(profilePath, "utf8"));
	return str(fm.mcp_url);
}

export type McpToolInfo = {
	name: string;
	description: string | null;
	inputSchema: unknown;
};

export type McpToolsResult = {
	ok: boolean;
	detail: string;
	status?: number;
	serverInfo?: { name?: string; version?: string } | null;
	tools?: McpToolInfo[];
};

/**
 * Extrae el mensaje JSON-RPC de una respuesta MCP, que puede venir como JSON
 * plano o como SSE (`event: message\ndata: {...}`). Busca el frame `data:` cuyo
 * JSON corresponde al `id` pedido (o cualquiera con result/error como fallback).
 */
function extractJsonRpc(text: string, contentType: string, id: number): Record<string, unknown> | null {
	if (contentType.toLowerCase().includes("application/json")) {
		try {
			return JSON.parse(text) as Record<string, unknown>;
		} catch {
			return null;
		}
	}
	for (const frame of text.split(/\n\n/)) {
		const data = frame
			.split("\n")
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice(5).trim())
			.join("\n");
		if (!data) continue;
		try {
			const obj = JSON.parse(data) as Record<string, unknown>;
			if (obj.id === id || "result" in obj || "error" in obj) return obj;
		} catch {
			// frame parcial; seguir buscando
		}
	}
	return null;
}

/**
 * Descubre todos los tools que expone un MCP (Streamable HTTP): handshake
 * `initialize` → `notifications/initialized` → `tools/list`, arrastrando el
 * header `mcp-session-id`. Devuelve la lista completa tal cual la publica el
 * servidor (nombre, descripción, inputSchema).
 */
export async function listMcpTools(url: string): Promise<McpToolsResult> {
	if (!/^https?:\/\//.test(url)) {
		return { ok: false, detail: "URL inválida (se espera http/https)." };
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 12000);
	try {
		const initRes = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2024-11-05",
					capabilities: {},
					clientInfo: { name: "sk-eve-studio", version: "0.0.1" },
				},
			}),
			signal: controller.signal,
		});
		const initText = await initRes.text();
		if (!initRes.ok) {
			return { ok: false, status: initRes.status, detail: initText.slice(0, 300) || `HTTP ${initRes.status}` };
		}
		const initMsg = extractJsonRpc(initText, initRes.headers.get("content-type") ?? "", 1);
		const initResult = (initMsg?.result ?? null) as { serverInfo?: { name?: string; version?: string }; protocolVersion?: string } | null;
		const serverInfo = initResult?.serverInfo ?? null;
		const protocolVersion = initResult?.protocolVersion ?? "2024-11-05";

		const headers: Record<string, string> = {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			"mcp-protocol-version": protocolVersion,
		};
		const sessionId = initRes.headers.get("mcp-session-id");
		if (sessionId) headers["mcp-session-id"] = sessionId;

		// Notificación requerida por el protocolo antes de operar (best-effort).
		try {
			await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
				signal: controller.signal,
			});
		} catch {
			// algunos servidores no la exigen
		}

		const listRes = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
			signal: controller.signal,
		});
		const listText = await listRes.text();
		if (!listRes.ok) {
			return { ok: false, status: listRes.status, detail: listText.slice(0, 300) || `HTTP ${listRes.status}`, serverInfo };
		}
		const listMsg = extractJsonRpc(listText, listRes.headers.get("content-type") ?? "", 2);
		const err = listMsg?.error as { message?: string } | undefined;
		if (err) return { ok: false, detail: err.message ?? "Error en tools/list", serverInfo };

		const raw = ((listMsg?.result as { tools?: unknown[] } | null)?.tools ?? []) as Array<Record<string, unknown>>;
		const tools: McpToolInfo[] = raw.map((t) => ({
			name: String(t.name ?? ""),
			description: typeof t.description === "string" ? t.description : null,
			inputSchema: t.inputSchema ?? null,
		}));
		return { ok: true, status: listRes.status, detail: `${tools.length} tools`, serverInfo, tools };
	} catch (err) {
		return { ok: false, detail: err instanceof Error ? err.message : "Fallo de red" };
	} finally {
		clearTimeout(timeout);
	}
}
