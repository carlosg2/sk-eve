// =====================================================================
// PROBE — Verificar publicación P0+P1 del DBA (2026-08-19).
// Objetivo: confirmar en vivo que los 30 SPs custom están en el MCP y
// probar los SPs clave (capacidad real con OUTPUT, desglose, carga).
// Uso:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-verifica-sps.ts
// =====================================================================
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

console.log("======== 1. TOOLS MCP (todos, filtro custom SP) ========");
const tools = await mcpListTools(URL);
console.log("total tools:", tools.length);
const customs = tools.filter((t) => !["aggregate_records", "create_record", "delete_record", "describe_entities", "execute_entity", "read_records", "update_record"].includes(t.name));
console.log("customs (no-DML):", customs.length);
for (const t of customs) console.log(" -", t.name);

// ---------- 2. Probar SPs clave ----------
async function call(name: string, args: Record<string, unknown>) {
  try {
    const r = await mcpCallTool(URL, name, args);
    return typeof r === "string" ? r : JSON.stringify(r);
  } catch (e) {
    return "THROW: " + (e as Error).message;
  }
}

console.log("\n======== 2. SPs clave — ejecución ========");
console.log("\n-- fccentro_capacidad_real (OUTPUT) CRIBACF --");
console.log((await call("fccentro_capacidad_real", { Usuario: "MASERP", Centro: "CRIBACF" })).slice(0, 500));
console.log("\n-- web_desglose_forecast (primeras 400) --");
console.log((await call("web_desglose_forecast", { Usuario: "MASERP" })).slice(0, 400));
console.log("\n-- fcasignar_bases_defaul (dry: solo verificar que existe el tool; NO ejecutar) --");
console.log("tool listado arriba; no se ejecuta para no regenerar corrida");
console.log("\n-- webcobertura_materia_prima (primeras 300) --");
console.log((await call("webcobertura_materia_prima", { Usuario: "MASERP" })).slice(0, 300));
