// ── Probe: resolución de conceptos del twin REAL por título ──────────────────
// Reproduce el error original: el modelo pasaba `concept: "ICF — Política de
// operaciones"` y el runtime respondía "no encontrado". Verifica que la
// resolución actual (nombre corto, id, o título normalizado) lo resuelve.
//
// Uso: nvm use 24; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-twin-resolve.ts
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { resolveCompanyTwinRoot } from "../agent/lib/runtime-config.js";

type Concept = { id: string; title?: string; description?: string; layer?: string; tenant?: string | null };

function parseFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { fm, body: m[2] };
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

async function main() {
  const root = resolveCompanyTwinRoot();
  const files = await walk(root);
  const concepts: Concept[] = [];
  for (const file of files) {
    const { fm, body } = parseFrontmatter(await readFile(file, "utf8"));
    if (!fm.type) continue;
    concepts.push({
      id: relative(root, file).replace(/\.md$/, ""),
      title: String(fm.title ?? ""),
      description: String(fm.description ?? ""),
      layer: String(fm.layer ?? ""),
      tenant: fm.tenant == null || String(fm.tenant) === "null" ? null : String(fm.tenant),
    });
  }

  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, " ").replace(/\s+/g, " ").trim();

  const activeTenant = "icf";
  const visible = concepts.filter(
    (c) => c.tenant === null || c.tenant === activeTenant,
  );

  const resolve = (query: string) => {
    const nq = norm(query);
    return visible.find((c) => {
      if (norm(c.id) === nq) return true;
      if (norm(c.id.split("/").pop() ?? "") === nq) return true;
      const nt = norm(c.title);
      return (nt === nq || nt.includes(nq)) && nq.length > 3;
    });
  };

  const cases: Array<[string, boolean]> = [
    // El error original del usuario:
    ["ICF — Política de operaciones", true],
    // Variantes que el modelo podría usar:
    ["Política de operaciones", true],
    ["operaciones-policy", true],
    ["política", true],
    ["MCP de ICF — módulos disponibles", true],
    ["módulos disponibles", true],
    ["modulos", true],
    ["ICF — Presupuesto de compras y control del periodo", true],
    ["presupuesto-compras", true],
    ["Art — Artículos", true],
    ["art", true],
    ["CXP — Cuentas por pagar", true],
    ["cxp", true],
    // Negativos:
    ["zapato", false],
    ["qwerty", false],
  ];

  let fail = 0;
  for (const [q, expect] of cases) {
    const r = resolve(q);
    const ok = expect ? !!r : !r;
    if (!ok) fail++;
    console.log(`${ok ? "✅" : "❌"} "${q}" → ${r?.id ?? "NO RESUELTO"}`);
  }
  console.log(`\nConceptos visibles (icf): ${visible.length}`);
  console.log(fail === 0 ? "✅ PROBE OK — 0 fallos" : `❌ ${fail} fallos`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
