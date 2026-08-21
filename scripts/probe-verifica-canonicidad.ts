// =============================================================================
// probe-verifica-canonicidad.ts — META-FÁBRICA: corrobora contra lo real (MCP
// del tenant) las entidades/campos que el conocimiento del runtime afirma,
// ANTES de editar/promover. Verdad de runtime = lo que el DAB expone.
//   Uso: nvm use 24; node --import ./scripts/ts-hook.mjs \
//        --experimental-strip-types scripts/probe-verifica-canonicidad.ts
// =============================================================================
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";
import { runtimeConfig } from "../agent/lib/runtime-config.js";

const url = runtimeConfig.mcpUrl;
const show = (label: string, res: unknown) => {
  const s = JSON.stringify(res)?.slice(0, 500) ?? String(res);
  console.log(`\n◆ ${label}\n  ${s}`);
};

console.log("MCP del tenant:", url);

// 1) Tools publicados (¿qué entidades/superficies hay?)
const tools = await mcpListTools(url);
const names = (tools ?? []).map((t: any) => t.name);
console.log("\nTools totales:", names.length);
console.log("¿read_records?", names.includes("read_records"), "| ¿execute_entity?", names.includes("execute_entity"));

// 2) DIM_TIEMPO_SEMANA — nombres de campo EXACTOS que expone el DAB
show("DIM_TIEMPO_SEMANA (first:1)", await mcpCallTool(url, "read_records", { entity: "DIM_TIEMPO_SEMANA", first: 1 }));

// 3) ArtDisponible vs ArtDisponibleDesc — Apartado / DispMenosApartado
show("ArtDisponible (first:1)", await mcpCallTool(url, "read_records", { entity: "ArtDisponible", first: 1 }));
show("ArtDisponibleDesc (first:1)", await mcpCallTool(url, "read_records", { entity: "ArtDisponibleDesc", first: 1 }));

// 4) Compra — FechaEmision / Semana reales
show("Compra (first:1)", await mcpCallTool(url, "read_records", { entity: "Compra", first: 1 }));

// 5) Entidades "no publicadas" — ¿EntityNotFound real?
for (const ent of ["EmpresaCfg2", "InvD"]) {
  show(`${ent} (first:1)`, await mcpCallTool(url, "read_records", { entity: ent, first: 1 }));
}
