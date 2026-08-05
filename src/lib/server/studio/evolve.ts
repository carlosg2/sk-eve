import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "$env/dynamic/private";
import {
	agentMdPath,
	applyManifestToAgentMd,
	createCatalogSkill,
	listCatalogSkills,
	listKernelConcepts,
	readAgentManifest,
	safeResolve,
	skillLibraryRoot,
	slugify,
	writeAgentManifest,
	writeTwinFile,
	type AgentManifest,
} from "./harness";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DRAFT_MODEL = "anthropic/claude-sonnet-4.5";

export type EvolveFileChange = {
	/** Ruta relativa (prefijo `agent-skills/` para el catálogo) para el diff. */
	path: string;
	before: string;
	after: string;
};

/** Operación estructurada a aplicar (no re-invoca al modelo en el apply). */
export type EvolveOp =
	| { kind: "instructions"; content: string }
	| { kind: "skill"; slug: string; tenant: string | null; description: string; body: string; addToManifest: boolean }
	| { kind: "toggle"; skills?: string[]; kernel?: string[] | "*"; mcpTools?: string[] };

export type EvolveProposal = {
	kind: EvolveOp["kind"];
	title: string;
	summary: string;
	changes: EvolveFileChange[];
	op: EvolveOp;
};

function instructionsRel(tenant: string, agent: string): string {
	return join("companies", slugify(tenant), "agents", slugify(agent), "instructions.md");
}

async function readRel(rel: string): Promise<string> {
	const full = safeResolve(rel);
	return existsSync(full) ? readFile(full, "utf8") : "";
}

// ── gateway ──────────────────────────────────────────────────────────────────

function extractJson(text: string): string | null {
	const start = text.indexOf("{");
	if (start < 0) return null;
	let depth = 0;
	let inStr = false;
	let esc = false;
	for (let i = start; i < text.length; i++) {
		const c = text[i];
		if (inStr) {
			if (esc) esc = false;
			else if (c === "\\") esc = true;
			else if (c === '"') inStr = false;
			continue;
		}
		if (c === '"') inStr = true;
		else if (c === "{") depth++;
		else if (c === "}") {
			depth--;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return null;
}

async function callGateway(system: string, user: string): Promise<string> {
	const token = env.AI_GATEWAY_API_KEY?.trim();
	if (!token) {
		throw new Error(
			"Falta AI_GATEWAY_API_KEY en .env.local — Evolve necesita el modelo para draftear la propuesta.",
		);
	}
	const res = await fetch(GATEWAY_URL, {
		method: "POST",
		headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
		body: JSON.stringify({
			model: DRAFT_MODEL,
			max_tokens: 4096,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
		}),
	});
	const body = await res.text();
	if (!res.ok) throw new Error(`Gateway ${res.status}: ${body.slice(0, 300)}`);
	const json = JSON.parse(body) as { choices?: { message?: { content?: string } }[] };
	const content = json.choices?.[0]?.message?.content;
	if (typeof content !== "string") throw new Error("El gateway no devolvió contenido.");
	return content;
}

// ── draft ────────────────────────────────────────────────────────────────────

const SYSTEM = `Eres un diseñador de agentes del Studio de sk-eve (ERP Intelisis).
El usuario describe un cambio y tú propones UNA modificación concreta al agente activo.
Responde SOLO con un objeto JSON (sin markdown, sin explicación) con una de estas formas:

1) Editar instrucciones del agente:
{"kind":"instructions","title":"...","summary":"...","content":"<instructions.md completo nuevo>"}

2) Crear una skill nueva en el catálogo (load-on-demand):
{"kind":"skill","title":"...","summary":"...","slug":"kebab-case","description":"Use when ...","tenant":"<tenant|null>","body":"<cuerpo markdown de la skill>","addToManifest":true}

3) Ajustar el manifest de capacidades (toggles):
{"kind":"toggle","title":"...","summary":"...","skills":["..."],"kernel":"*"|["id"],"mcpTools":["..."]}

Reglas:
- Elige la forma MÍNIMA que cumpla la intención. Para "toggle" incluye SOLO las claves que cambian.
- "content"/"body" deben ser markdown válido y completo (no fragmentos).
- "description" de una skill es el hint de ruteo: empieza con "Use when ...".
- No inventes slugs de skills/kernel/tools que no existan (salvo al crear una skill nueva).`;

export async function draftEvolveProposal(input: {
	tenant: string;
	agent: string;
	intent: string;
}): Promise<EvolveProposal> {
	const { tenant, agent, intent } = input;
	const [manifest, catalog, kernel] = await Promise.all([
		readAgentManifest(tenant, agent),
		listCatalogSkills(tenant),
		listKernelConcepts(),
	]);
	const instrRel = instructionsRel(tenant, agent);
	const currentInstr = await readRel(instrRel);

	const context = [
		`Agente: ${agent} (tenant ${tenant})`,
		"",
		"Manifest actual:",
		JSON.stringify(manifest),
		"",
		`Skills del catálogo (slug — descripción): ${catalog.map((s) => `${s.slug}`).join(", ") || "(ninguna)"}`,
		`Conceptos de kernel: ${kernel.map((k) => k.id).join(", ") || "(ninguno)"}`,
		"",
		"instructions.md actual:",
		currentInstr || "(vacío)",
		"",
		`Intención del usuario: ${intent}`,
	].join("\n");

	const raw = await callGateway(SYSTEM, context);
	const jsonText = extractJson(raw);
	if (!jsonText) throw new Error("El modelo no devolvió un JSON de propuesta válido.");
	const parsed = JSON.parse(jsonText) as Record<string, unknown>;
	return toProposal(tenant, agent, manifest, currentInstr, instrRel, parsed);
}

async function toProposal(
	tenant: string,
	agent: string,
	manifest: AgentManifest,
	currentInstr: string,
	instrRel: string,
	p: Record<string, unknown>,
): Promise<EvolveProposal> {
	const kind = p.kind as string;
	const title = String(p.title ?? "Propuesta");
	const summary = String(p.summary ?? "");

	if (kind === "instructions") {
		const content = String(p.content ?? "");
		if (!content.trim()) throw new Error("La propuesta de instrucciones vino vacía.");
		return {
			kind: "instructions",
			title,
			summary,
			op: { kind: "instructions", content },
			changes: [{ path: instrRel, before: currentInstr, after: content }],
		};
	}

	if (kind === "skill") {
		const slug = slugify(String(p.slug ?? p.title ?? ""));
		if (!slug) throw new Error("La skill propuesta no tiene slug.");
		const tenantVis = p.tenant === null || p.tenant === "null" ? null : String(p.tenant ?? tenant);
		const description = String(p.description ?? "");
		const body = String(p.body ?? `# ${slug}\n`);
		const addToManifest = p.addToManifest !== false;
		const skillFm = [
			"---",
			tenantVis ? `tenant: ${slugify(tenantVis)}` : "tenant: null",
			`description: ${JSON.stringify(description)}`,
			"---",
			"",
			body.trim(),
			"",
		].join("\n");
		const changes: EvolveFileChange[] = [
			{ path: `agent-skills/${slug}/SKILL.md`, before: "", after: skillFm },
		];
		if (addToManifest && !manifest.skills.includes(slug)) {
			const agentRaw = await readRel(agentMdPath(tenant, agent));
			const after = applyManifestToAgentMd(agentRaw, {
				...manifest,
				skills: [...manifest.skills, slug],
			});
			changes.push({ path: agentMdPath(tenant, agent), before: agentRaw, after });
		}
		return {
			kind: "skill",
			title,
			summary,
			op: { kind: "skill", slug, tenant: tenantVis, description, body, addToManifest },
			changes,
		};
	}

	if (kind === "toggle") {
		const next: AgentManifest = {
			skills: Array.isArray(p.skills) ? (p.skills as string[]) : manifest.skills,
			kernel:
				p.kernel === "*"
					? "*"
					: Array.isArray(p.kernel)
						? (p.kernel as string[])
						: manifest.kernel,
			mcpTools: Array.isArray(p.mcpTools) ? (p.mcpTools as string[]) : manifest.mcpTools,
		};
		const agentRaw = await readRel(agentMdPath(tenant, agent));
		const after = applyManifestToAgentMd(agentRaw, next);
		return {
			kind: "toggle",
			title,
			summary,
			op: { kind: "toggle", skills: next.skills, kernel: next.kernel, mcpTools: next.mcpTools },
			changes: [{ path: agentMdPath(tenant, agent), before: agentRaw, after }],
		};
	}

	throw new Error(`Tipo de propuesta desconocido: ${kind}`);
}

// ── apply ────────────────────────────────────────────────────────────────────

export async function applyEvolveProposal(input: {
	tenant: string;
	agent: string;
	op: EvolveOp;
}): Promise<void> {
	const { tenant, agent, op } = input;
	if (op.kind === "instructions") {
		await writeTwinFile(instructionsRel(tenant, agent), op.content);
		return;
	}
	if (op.kind === "skill") {
		if (!existsSync(join(skillLibraryRoot(), op.slug, "SKILL.md"))) {
			await createCatalogSkill({
				name: op.slug,
				description: op.description,
				tenant: op.tenant,
				body: op.body,
			});
		}
		if (op.addToManifest) {
			const manifest = await readAgentManifest(tenant, agent);
			if (!manifest.skills.includes(op.slug)) {
				await writeAgentManifest(tenant, agent, { skills: [...manifest.skills, op.slug] });
			}
		}
		return;
	}
	// toggle
	await writeAgentManifest(tenant, agent, {
		skills: op.skills,
		kernel: op.kernel,
		mcpTools: op.mcpTools,
	});
}
