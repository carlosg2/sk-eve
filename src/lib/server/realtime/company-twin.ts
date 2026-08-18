// Lookup del Company Twin para el canal de voz (server-side).
//
// Es una versión servible de `agent/tools/query_company_twin.ts` (que es una
// `defineTool` de Eve y no se puede invocar fuera del runtime): misma resolución
// por id / nombre corto / título normalizado + scoring por keywords, con el body
// SANITIZADO (`cleanTwinBody`) y visibilidad por empresa activa (frontmatter).
// READ-ONLY: nunca escribe en el twin (la fábrica es la única que promueve).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadRuntimeConfig, resolveCompanyTwinRoot } from "../../../../agent/lib/runtime-config.js";
import { cleanTwinBody } from "../../../../agent/lib/twin-clean.js";

export type TwinConcept = {
	id: string;
	title: string;
	description: string;
	body: string;
};

function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
	const fm: Record<string, string> = {};
	if (!raw.startsWith("---")) return { fm, body: raw };
	const end = raw.indexOf("\n---", 3);
	if (end === -1) return { fm, body: raw };
	const block = raw.slice(3, end);
	const body = raw.slice(end + 4).replace(/^\s*\n/, "");
	for (const line of block.split("\n")) {
		const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
		if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
	}
	return { fm, body };
}

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const p = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(p));
		else if (entry.name.endsWith(".md")) out.push(p);
	}
	return out;
}

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function loadConcepts(): TwinConcept[] {
	const { tenant } = loadRuntimeConfig();
	const root = resolveCompanyTwinRoot();
	const out: TwinConcept[] = [];
	for (const file of walk(root)) {
		const rel = file.slice(root.length + 1).replace(/\\/g, "/");
		if (/\/index\.md$/.test(rel) || /\/log\.md$/.test(rel) || /\/state\//.test(rel)) continue;
		let raw: string;
		try {
			raw = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const { fm, body } = parseFrontmatter(raw);
		const conceptTenant =
			fm.tenant === "null" || fm.tenant === undefined ? null : (fm.tenant || null);
		if (conceptTenant !== null && conceptTenant !== tenant) continue;
		out.push({
			id: rel.replace(/\.md$/, ""),
			title: fm.title || rel.split("/").pop()?.replace(/\.md$/, "") || rel,
			description: fm.description || "",
			body: cleanTwinBody(body),
		});
	}
	return out;
}

function shortId(id: string): string {
	return id.split("/").pop() || id;
}

/**
 * Consulta el twin con la misma semántica que `query_company_twin` del runtime:
 *   - sin término → catálogo (id + título, top 20)
 *   - con término → 1) id/nombre corto/título exacto, 2) título contiene,
 *     3) scoring por keywords (title×3, description×2, body×1)
 * Devuelve SIEMPRE un objeto serializable (ok/error incluido).
 */
export function queryCompanyTwinServer(query?: string, concept?: string): Record<string, unknown> {
	try {
		const concepts = loadConcepts();
		const target = (concept || query || "").trim();
		if (!target) {
			return { ok: true, conceptos: concepts.map((c) => ({ id: shortId(c.id), title: c.title })).slice(0, 20) };
		}
		const norm = normalize(target);

		// 1) id / nombre corto / título exacto
		for (const c of concepts) {
			if (
				c.id === target ||
				shortId(c.id) === target ||
				normalize(c.id) === norm ||
				normalize(shortId(c.id)) === norm ||
				normalize(c.title) === norm
			) {
				return { ok: true, id: shortId(c.id), title: c.title, body: c.body };
			}
		}
		// 2) título contiene
		for (const c of concepts) {
			if (normalize(c.title).includes(norm)) {
				return { ok: true, id: shortId(c.id), title: c.title, body: c.body };
			}
		}
		// 3) scoring por keywords (sin stopwords/términos cortos: "de" infla todo)
		const STOP = new Set([
			"de", "del", "la", "el", "los", "las", "en", "para", "un", "una",
			"con", "por", "que", "y", "a", "al", "lo", "se", "es", "su", "como",
		]);
		const terms = norm.split(" ").filter((t) => t.length >= 3 && !STOP.has(t));
		if (terms.length === 0) return { ok: false, error: `Concepto '${target}' no encontrado para esta empresa` };
		const scored = concepts
			.map((c) => {
				const titleN = normalize(c.title);
				const descN = normalize(c.description);
				const bodyN = normalize(c.body).slice(0, 4000);
				let score = 0;
				for (const t of terms) {
					if (titleN.includes(t)) score += 3;
					if (descN.includes(t)) score += 2;
					if (bodyN.includes(t)) score += 1;
				}
				return { c, score };
			})
			.filter((x) => x.score > 0)
			.sort((a, b) => b.score - a.score);
		if (scored.length > 0) {
			return {
				ok: true,
				matches: scored.slice(0, 3).map((x) => ({
					id: shortId(x.c.id),
					title: x.c.title,
					score: x.score,
					body: x.c.body.slice(0, 1500),
				})),
			};
		}
		return { ok: false, error: `Concepto '${target}' no encontrado para esta empresa` };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}
