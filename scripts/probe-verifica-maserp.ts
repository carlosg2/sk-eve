// =====================================================================
// PROBE — Verificar corrida MASERP tras la respuesta del DBA (2026-08-19).
// Objetivo: confirmar en vivo contra el MCP ICF:
//   1) El tool fcforcast_cfnuk (carga SP) YA existe en el MCP.
//   2) ResumenPlaneacionCF para Usuario='MASERP' está poblado y coincide
//      con la referencia del motor:
//        S32≈3,978,128 · P32≈2,867,048 · S33≈2,440,112 · P33≈2,120,442
//        S34≈1,973,193 · P34≈1,872,112 · S35≈2,142,893 · P35≈2,104,518
// Uso (Node 24):
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-verifica-maserp.ts
// =====================================================================
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function call(name: string, args: Record<string, unknown>) {
  try {
    const r = await mcpCallTool(URL, name, args);
    const txt = typeof r === "string" ? r : JSON.stringify(r);
    return txt;
  } catch (e) {
    return "THROW: " + (e as Error).message;
  }
}

// ---------- 1. Tools del MCP: ¿está fcforcast_cfnuk? ----------
console.log("======== 1. TOOLS MCP (filtro fcforcast/execute/faltante/carga) ========");
const tools = await mcpListTools(URL);
console.log("total tools:", tools.length);
for (const t of tools) {
  if (/fcforcast|execute|faltant|carga|nuk|inicio/i.test(t.name)) {
    console.log(" -", t.name, "|", (t.description ?? "").slice(0, 80));
  }
}

// ---------- 2. ResumenPlaneacionCF — count para MASERP ----------
console.log("\n======== 2. ResumenPlaneacionCF Usuario=MASERP — count ========");
console.log(await call("aggregate_records", {
  entity: "ResumenPlaneacionCF",
  function: "count",
  field: "*",
  filter: "Usuario eq 'MASERP'",
}));

// ---------- 3. Sumas por semana S32..S35 / P32..P35 ----------
console.log("\n======== 3. Suma por semana (S32..S35 y P32..P35) MASERP ========");
for (const week of ["S32", "P32", "S33", "P33", "S34", "P34", "S35", "P35"]) {
  const r = await call("aggregate_records", {
    entity: "ResumenPlaneacionCF",
    function: "sum",
    field: week,
    filter: "Usuario eq 'MASERP'",
  });
  const m = r.match(/"(\d+(?:\.\d+)?)"/);
  console.log(`  ${week}: ${m ? m[1] : r.slice(0, 160)}`);
}

// ---------- 4. Muestra de filas (first 3) para ver shape ----------
console.log("\n======== 4. Muestra first 3 (select S32,P32,S33,Articulo,VariedadCF,FamiliaCF) ========");
console.log(await call("read_records", {
  entity: "ResumenPlaneacionCF",
  filter: "Usuario eq 'MASERP'",
  select: "Articulo,VariedadCF,FamiliaCF,S32,P32,S33,P33",
  first: 3,
}));

// ---------- 5. (Info) Tool de carga: ¿se puede invocar sin tocar nada? ----------
console.log("\n======== 5. fcforcast_cfnuk (dry: SOLO LISTADO — no se ejecuta) ========");
console.log("Verificado arriba en la lista de tools; no se ejecuta para no regenerar la corrida.");
