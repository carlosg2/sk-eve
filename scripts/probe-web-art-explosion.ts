// probe-web-art-explosion.ts — FÁBRICA (2026-08-20)
// Investiga la firma real de web_art_explosion_material (error de fecha recurrente ×8)
// y de fcppplan_semana (requiere @ID + @Semana) contra el MCP real.
// Cómo correr: nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//   --experimental-strip-types scripts/probe-web-art-explosion.ts
import { mcpCallTool } from "../agent/lib/mcp-client.ts";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";

const url = loadRuntimeConfig().mcpUrl;
console.log("MCP:", url);

// 1) ¿Qué entidades/parámetros ve el DAB para web_art_explosion_material?
const r1 = await mcpCallTool(url, "describe_entities", { entities: ["WebArtExplosionMaterial"] });
console.log("--- describe WebArtExplosionMaterial:", JSON.stringify((r1 as any).output ?? r1).slice(0, 800));

// 2) Variantes de fecha para web_art_explosion_material
const variantes: Array<[string, Record<string, unknown>]> = [
  ["solo Usuario/Ejercicio/Periodo", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8 }],
  ["+FechaEmision ISO simple", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, FechaEmision: "2026-08-20" }],
  ["+FechaD", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, FechaD: "2026-08-01" }],
  ["+Semana", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, Semana: 33 }],
];
for (const [desc, args] of variantes) {
  const r = await mcpCallTool(url, "web_art_explosion_material", args);
  const out = (r as any).output ?? r;
  const s = JSON.stringify(out);
  console.log(`--- web_art_explosion_material ${desc}: ${s.slice(0, 200)}`);
}

// 3) fcppplan_semana con @ID + @Semana
const r2 = await mcpCallTool(url, "fcppplan_semana", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, ID: 1, Semana: 33 });
console.log("--- fcppplan_semana con ID+Semana:", JSON.stringify((r2 as any).output ?? r2).slice(0, 200));

// 4) buscar_registro con @campo
const r3 = await mcpCallTool(url, "buscar_registro", { entidad: "Prov", campo: "Nombre", termino: "Leticia", primero: 5 });
console.log("--- buscar_registro con campo:", JSON.stringify((r3 as any).output ?? r3).slice(0, 300));
