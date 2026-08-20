// =====================================================================
// PROBE — Listar tools del MCP ICF y depurar execute_entity (2026-08-20).
// Objetivo: ¿está publicado spFCForcastCFNuk (carga inicial) como tool/entidad
// ejecutable en el MCP remoto? ¿Qué SPs de carga están expuestos?
// =====================================================================
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

console.log("======== 1. TOOLS DEL MCP (filtro sp/forecast/execute/faltante/carga) ========");
const tools = await mcpListTools(URL);
console.log("total tools:", tools.length);
for (const t of tools) {
  const n = t.name;
  if (/sp|forecast|execute|faltant|carga|planea|nuk|inicio|web/i.test(n)) {
    console.log(" -", n, "| desc:", (t.description ?? "").slice(0, 90));
  }
}
console.log("(primeros 25 nombres para contexto):", tools.slice(0, 25).map((t) => t.name).join(", "));

console.log("\n======== 2. ERROR COMPLETO de execute_entity ========");
try {
  const res = await mcpCallTool(URL, "execute_entity", {
    entity: "spFCForcastCFNuk",
    parameters: { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, EnSilencio: true },
  });
  console.log("respuesta:", JSON.stringify(res, null, 1).slice(0, 800));
} catch (e) {
  console.log("THROW:", (e as Error).message);
}
