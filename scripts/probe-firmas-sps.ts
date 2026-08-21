// probe-firmas-sps.ts — FÁBRICA (2026-08-20)
// Lista los input schemas (parámetros requeridos/opcionales) de los SPs que el buffer
// señala, contra el MCP real, para refinar sp-reportes-mrp.md / mcp-tools.md sin inventar.
// Cómo correr: nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//   --experimental-strip-types scripts/probe-firmas-sps.ts
import { mcpCallTool } from "../agent/lib/mcp-client.ts";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";

const url = loadRuntimeConfig().mcpUrl;
console.log("MCP:", url);

// mcpListTools es la tool del runtime (agent/lib/mcp-client.ts exporta mcpCallTool;
// para listar tools se usa la llamada directa al JSON-RPC). Probamos execute_entity
// con los nombres de entidad para ver el error de firma real (expects parameter).
const intentos: Array<[string, string, Record<string, unknown>]> = [
  ["programa_produccion_concentrado_centro", "con @Semana", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, Semana: 33 }],
  ["programa_produccion_concentrado_centro", "SIN @Semana", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8 }],
  ["fcppplan_semana", "con @ID", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, ID: 1 }],
  ["fcppplan_semana", "SIN @ID", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8 }],
  ["web_art_explosion_material", "con fecha", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, FechaEmision: "2026-08-20" }],
  ["web_art_explosion_material", "sin fecha", { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8 }],
  ["buscar_registro", "sin @campo", { entidad: "Prov", termino: "Leticia", primero: 5 }],
];

for (const [tool, desc, args] of intentos) {
  const r = await mcpCallTool(url, tool, args);
  const out = (r as { output?: unknown }).output ?? r;
  const s = JSON.stringify(out);
  console.log(`--- ${tool} (${desc}): ${s.slice(0, 260)}`);
}
