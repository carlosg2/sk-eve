// probe-verifica-artprototipo.ts — FÁBRICA (2026-08-20)
// Corrobora contra el MCP real del tenant las entidades que el buffer señala como
// inexistentes (ArtPrototipo/ArtPrototipoMaterial) antes de promover a modulos.md.
// Cómo correr: nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//   --experimental-strip-types scripts/probe-verifica-artprototipo.ts
import { mcpCallTool } from "../agent/lib/mcp-client.ts";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";

const url = loadRuntimeConfig().mcpUrl;
async function probe(entity: string) {
  const r = await mcpCallTool(url, "read_records", { entity, first: 1 });
  const out = (r as { output?: unknown }).output ?? r;
  const s = JSON.stringify(out).slice(0, 220);
  const notFound = /EntityNotFound|not found|not defined/i.test(s);
  console.log(`--- ${entity}: ${notFound ? "NO EXISTE" : "EXISTE"} | ${s}`);
}
console.log("MCP:", url);
await probe("ArtPrototipo");
await probe("ArtPrototipoMaterial");
await probe("ArtMaterial");
