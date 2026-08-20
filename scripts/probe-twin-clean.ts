// ── Probe: saneamiento del Company Twin (higiene "twin plano y sano") ────────
// Verifica la proyección que ve el runtime:
//   1. Resolución por título ("ICF — Política de operaciones") → operaciones-policy.
//   2. El body servido NO contiene metadata de fábrica (tenant, layer, generated,
//      sources, rutas /erp-kernel/ o /companies/, "kernel" en prosa).
//   3. La lista de búsqueda NO expone metadata (solo id/title/description).
//
// Uso: nvm use 24; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-twin-clean.ts
import { cleanTwinBody, cleanTwinText } from "../agent/lib/twin-clean.js";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 1) Resolución por título ─────────────────────────────────────────────────
const titles: Array<[string, boolean]> = [
  ["ICF — Política de operaciones", true],
  ["Política de operaciones", true],
  ["operaciones-policy", true],
  ["módulos disponibles", true],
  ["Presupuesto de compras y control del periodo", true],
  ["zapato", false],
];
const candidates = [
  { id: "companies/icf/policies/operaciones-policy", title: "ICF — Política de operaciones" },
  { id: "companies/icf/modulos", title: "MCP de ICF — módulos disponibles" },
  { id: "companies/icf/presupuesto-compras", title: "ICF — Presupuesto de compras y control del periodo" },
];
let fail = 0;
for (const [query, expect] of titles) {
  const nq = norm(query);
  const found = candidates.find((c) => {
    if (norm(c.id) === nq) return true;
    if (norm(c.id.split("/").pop() ?? "") === nq) return true;
    const nt = norm(c.title);
    return (nt === nq || nt.includes(nq)) && nq.length > 3;
  });
  const ok = expect ? !!found : !found;
  if (!ok) fail++;
  console.log(`${ok ? "✅" : "❌"} título "${query}" → ${found?.id ?? "NO RESUELTO"}`);
}

// ── 2) Saneamiento del body ───────────────────────────────────────────────────
// En el runtime, parseFrontmatter separa el frontmatter y el sanitizador solo
// recibe el CUERPO (sin metadata YAML). El probe usa un body fiel a ese caso.
const sample = `# ICF — Política de operaciones

Política del tenant ICF (verificada contra el MCP). Para el tenant activo, el valor
estático es "MASERP". En el kernel universal esto NO aplica. Consulta /company-twin/companies/icf/modulos.md
para cobertura y (erp-kernel) para schema.`;

const clean = cleanTwinBody(sample);
const forbidden = ["tenant", "layer:", "generated:", "sources:", "/company-twin/", "/erp-kernel/", "kernel", "universal"];
for (const f of forbidden) {
  const hit = clean.toLowerCase().includes(f.toLowerCase());
  if (hit) { fail++; console.log(`❌ body aún contiene "${f}":\n---\n${clean}\n---`); }
  else console.log(`✅ body sin "${f}"`);
}
// Gramática: sin residuos "del la", "del el", "()", "el sistema del sistema",
// "para la empresa" suelto en prosa afirmativa.
const grammarBugs = ["del la ", "del el ", "()", "el sistema del sistema", "la empresa del sistema"];
for (const g of grammarBugs) {
  if (clean.toLowerCase().includes(g)) { fail++; console.log(`❌ gramática rota: "${g}"\n---\n${clean}\n---`); }
}
console.log("── body saneado ──\n" + clean + "\n──────────────");

// ── 3) cleanTwinText en descripciones ────────────────────────────────────────
const t = cleanTwinText("Política del tenant activo — núcleo del kernel universal");
if (/tenant|kernel|universal/i.test(t)) { fail++; console.log("❌ cleanTwinText dejó metadata:", t); }
else console.log(`✅ cleanTwinText: "${t}"`);

console.log(fail === 0 ? "\n✅ PROBE OK — 0 fallos" : `\n❌ ${fail} fallos`);
process.exit(fail === 0 ? 0 : 1);
