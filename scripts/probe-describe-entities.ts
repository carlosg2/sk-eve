// PROBE DE FÁBRICA — "¿describe_entities es fuente de verdad?" (2026-08-21)
// Corrobora TODOS los casos posibles contra el MCP real del tenant:
//   A = catálogo de describe_entities (nameOnly=true)
//   B = entidades del kernel (erp-kernel/*.md) + vistas conocidas
// Para cada entidad en A ∪ B → read_records(first:1) → ¿funciona?
// Cruce:
//   ✅ en A y funciona            → verdadero positivo (ambos de acuerdo)
//   ⚠️ en A y NO funciona         → falso positivo de describe_entities (publicada pero rota)
//   🟡 NO en A pero funciona      → falso negativo de describe_entities (el caso UV_QV_PPTOCOMPRA)
//   ⚫ NO en A y no funciona      → ambos de acuerdo (no existe)
// Correr: nvm use 24; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-describe-entities.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.js";
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";
import { resolveCompanyTwinRoot } from "../agent/lib/runtime-config.js";

function nameOf(res: unknown): string {
  // read_records exitoso → { entity, result: { value: [...] } } o similar
  const r = res as { entity?: unknown; result?: { value?: unknown } } | null;
  return r?.entity ? String(r.entity) : "";
}

function rows(res: unknown): unknown[] {
  const r = res as { result?: { value?: unknown[] } } | null;
  if (r?.result?.value && Array.isArray(r.result.value)) return r.result.value;
  return [];
}

async function readOk(url: string, entity: string): Promise<{ ok: boolean; err?: string; rows: number }> {
  try {
    const res = await mcpCallTool(url, "read_records", { entity, first: 1 });
    const asErr = res as { error?: unknown } | null;
    if (res && typeof res === "object" && typeof asErr?.error === "string") {
      return { ok: false, err: String(asErr.error).slice(0, 110), rows: 0 };
    }
    return { ok: true, rows: rows(res).length };
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message.slice(0, 110) : String(e), rows: 0 };
  }
}

(async () => {
  const rt = loadRuntimeConfig();
  const url = rt.mcpUrl;
  console.log(`MCP: ${url} · tenant: ${rt.tenant}\n`);

  // 1. Catálogo de describe_entities (nameOnly)
  let catalog: string[] = [];
  try {
    const de = await mcpCallTool(url, "describe_entities", { nameOnly: true });
    const d = de as { entity?: string; entities?: { name?: string }[] | string[]; result?: { entities?: unknown } };
    // Acepta varios shapes
    if (Array.isArray(d?.entities)) {
      catalog = d.entities.map((e: unknown) => (typeof e === "string" ? e : (e as { name?: string }).name ?? ""));
    } else if (Array.isArray((d?.result as { entities?: unknown })?.entities)) {
      const list = (d?.result as { entities: unknown[] }).entities;
      catalog = list.map((e) => (typeof e === "string" ? e : (e as { name?: string }).name ?? ""));
    }
  } catch (e) {
    console.log("describe_entities falló:", e instanceof Error ? e.message : e);
  }
  catalog = [...new Set(catalog.filter(Boolean))].sort();
  console.log(`=== describe_entities (nameOnly) devolvió ${catalog.length} entidades ===\n`);

  // 2. Entidades del kernel (archivos erp-kernel/*.md) + vistas conocidas
  const twinRoot = resolveCompanyTwinRoot();
  const kernelFiles = readdirSync(join(twinRoot, "erp-kernel")).filter((f) => f.endsWith(".md") && !["index.md", "log.md"].includes(f));
  const kernelEntities = kernelFiles.map((f) => f.replace(/\.md$/, ""));
  const conocidas = ["UV_QV_PPTOCOMPRA", "DIM_TIEMPO_SEMANA", "DIM_TIEMPO_SEMANA_ISO", "ForecastPlanProduccion", "ResumenPlaneacionCF", "CalendarioFC", "ExplocionMatCF", "ArtMaterial", "ArtDisponible", "ArtDisponibleDesc", "WebInicio", "ForecastPlanSemanal", "WebArtExplosionMaterial", "AuxiliarU", "Usuario", "UV_QV_FILLRATE"];

  // Unión: catálogo + kernel + conocidas (los nombres del kernel van en lowercase;
  // probamos también la forma PascalCase del catálogo si existe)
  const kernelSet = new Set(kernelEntities.map((e) => e.toLowerCase()));
  const union = new Map<string, { fromCatalog: boolean; fromKernel: boolean }>();
  for (const e of catalog) union.set(e, { fromCatalog: true, fromKernel: false });
  for (const e of kernelEntities) {
    // nombre del kernel (lowercase) → buscar el PascalCase del catálogo
    const pascal = catalog.find((c) => c.toLowerCase() === e) ?? e;
    if (!union.has(pascal)) union.set(pascal, { fromCatalog: false, fromKernel: true });
    else union.get(pascal)!.fromKernel = true;
  }
  for (const e of conocidas) {
    if (!union.has(e)) union.set(e, { fromCatalog: false, fromKernel: false });
    else if (!union.get(e)!.fromKernel) union.get(e)!.fromKernel = false;
  }

  console.log(`=== Cruzando ${union.size} entidades (catálogo + kernel + vistas conocidas) contra read_records(first:1) ===\n`);

  const rowsOut: { entidad: string; enCat: boolean; enKernel: boolean; ok: boolean; err?: string }[] = [];
  for (const [ent, src] of union) {
    const r = await readOk(url, ent);
    rowsOut.push({ entidad: ent, enCat: src.fromCatalog, enKernel: src.fromKernel, ok: r.ok, err: r.err });
  }

  const vp = rowsOut.filter((r) => r.enCat && r.ok);                       // en catálogo y funciona
  const fp = rowsOut.filter((r) => r.enCat && !r.ok);                      // en catálogo pero NO funciona
  const fn = rowsOut.filter((r) => !r.enCat && r.ok);                      // NO en catálogo pero funciona
  const nn = rowsOut.filter((r) => !r.enCat && !r.ok);                     // ni catálogo ni funciona

  console.log(`✅ EN describe_entities Y FUNCIONA  : ${vp.length}`);
  console.log(`⚠️  EN describe_entities pero NO funciona: ${fp.length}`);
  console.log(`🟡 FUNCIONA pero NO está en describe_entities (falsos negativos): ${fn.length}`);
  console.log(`⚫ Ni en catálogo ni funciona: ${nn.length}\n`);

  console.log("--- ⚠️ EN catálogo pero NO funciona (falsos positivos de describe_entities) ---");
  for (const r of fp) console.log(`  ${r.entidad} → ${r.err}`);
  console.log("\n--- 🟡 FUNCIONA pero NO está en describe_entities (falsos negativos) ---");
  for (const r of fn) console.log(`  ${r.entidad} (kernel: ${r.enKernel})`);

  console.log("\n=== ¿Describe_entities lista los TOOLS custom (SPs)? ===");
  const tools = await mcpListTools(url);
  const custom = tools.map((t) => t.name).filter((n) => !["read_records", "aggregate_records", "create_record", "update_record", "delete_record", "execute_entity", "describe_entities", "buscar_registro"].includes(n));
  const catLower = new Set(catalog.map((e) => e.toLowerCase()));
  const customMissing = custom.filter((n) => !catLower.has(n.toLowerCase()));
  console.log(`Tools custom (SPs): ${custom.length} · de ellos NO listados como entidad en describe_entities: ${customMissing.length}`);
  for (const n of customMissing) console.log(`  ${n}`);
})().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
