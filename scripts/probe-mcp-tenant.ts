// ── Probe: ¿las tools MCP reales exponen "tenant" al modelo? ─────────────────
// El runtime inyecta las descriptions de las tools MCP remotas tal cual
// (agent/tools/erp.ts: `description: tool.description`). Este probe usa el
// MISMO cliente MCP del runtime para listar las tools del endpoint activo y
// buscar "tenant" en description y schema. Es la vía más probable de fuga.
//
// Uso: nvm use 24; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-mcp-tenant.ts
import { mcpListTools } from "../agent/lib/mcp-client.js";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.js";

async function main() {
  const cfg = loadRuntimeConfig();
  console.log("MCP activo:", cfg.mcpUrl);
  let tools;
  try {
    tools = await mcpListTools(cfg.mcpUrl);
  } catch (e) {
    console.error("ERROR listando tools:", (e as Error).message);
    process.exit(1);
  }
  console.log("Total tools:", tools.length);
  let hits = 0;
  for (const t of tools) {
    const hay = `${t.name} ${t.description ?? ""} ${JSON.stringify(t.inputSchema ?? {})}`;
    if (/tenant/i.test(hay)) {
      hits++;
      const m = hay.match(/.{0,60}tenant.{0,80}/gi);
      console.log(`*** TENANT en "${t.name}":`, m?.join(" | ") ?? "match");
    }
  }
  console.log(hits === 0 ? "✅ 0 tools con 'tenant'" : `❌ ${hits} tools con 'tenant'`);
  // Imprimir las primeras 10 descriptions para contexto
  console.log("\n--- primeras 10 descriptions ---");
  for (const t of tools.slice(0, 10)) {
    console.log(`- ${t.name}: ${(t.description ?? "").slice(0, 100)}`);
  }
  process.exit(hits === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
