// =====================================================================
// PROBE — Estructura de respuesta "estilo Daniel" para Desglose de
// Forecast (2026-08-19): verifica quién tiene la corrida activa del
// snapshot ResumenPlaneacionCF (MASERP vs MASERP), el conteo de
// artículos, y las columnas S32..S36/TotalInv/Stok15 vía MCP DAB.
//
// QUÉ VALIDA:
//   A. count(ResumenPlaneacionCF) por Usuario (MASERP, MASERP, otros)
//   B. muestra de filas con la ventana S32..S36 + TotalInv + Stok15
//      para el usuario ganador
//   C. agregados por columna (sum S32..S36/P32..P36/TotalInv/Stok15)
//      para replicar los "Totales por columna" de la respuesta de Daniel
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-gap-forecast-estructura.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  try {
    const res = (await mcpCallTool(URL, tool, args)) as any;
    const text = JSON.stringify(res ?? {});
    const m = text.match(/"error"\s*:\s*"([^"]{0,260})/);
    if (m) {
      let tipo = "?", detalle = m[1].replace(/\\r\\n/g, " ").slice(0, 260);
      try {
        const inner = JSON.parse(m[1]);
        tipo = inner?.error?.type ?? inner?.type ?? inner?.status ?? "?";
        detalle = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner).slice(0, 240);
      } catch { /* truncado */ }
      console.log(`\n=== ${label} === ❌ (${tipo})`);
      console.log("  detalle:", detalle);
      return;
    }
    console.log(`\n=== ${label} ===`);
    const inner = res?.value ?? res?.result ?? res;
    const rows = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
    if (Array.isArray(rows)) {
      console.log("filas:", rows.length);
      if (rows.length) {
        console.log("schema:", Object.keys(rows[0]).join(", "));
        console.log("muestra:", JSON.stringify(rows.slice(0, 2), null, 1).slice(0, 1600));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message.slice(0, 300));
  }
}

console.log("======== A. ¿QUIÉN TIENE LA CORRIDA ACTIVA? ========");
await probe("count ResumenPlaneacionCF por Usuario (MASERP)", "aggregate_records", {
  entity: "ResumenPlaneacionCF",
  function: "count", field: "*",
  filter: "Usuario eq 'MASERP'",
});
await probe("count ResumenPlaneacionCF por Usuario (MASERP)", "aggregate_records", {
  entity: "ResumenPlaneacionCF",
  function: "count", field: "*",
  filter: "Usuario eq 'MASERP'",
});
await probe("groupby Usuario (todos los usuarios con corrida)", "aggregate_records", {
  entity: "ResumenPlaneacionCF",
  function: "count", field: "*",
  groupby: ["Usuario"],
});

console.log("\n======== B. MUESTRA con ventana S32..S36 (MASERP) ========");
await probe("ResumenPlaneacionCF MASERP (S32..S36+TotalInv+Stok15)", "read_records", {
  entity: "ResumenPlaneacionCF",
  filter: "Usuario eq 'MASERP'",
  select: "Articulo,Descripcion,S32,P32,S33,P33,S34,P34,S35,P35,S36,P36,TotalInv,Stok15",
  first: 3,
});

console.log("\n======== C. TOTALES POR COLUMNA (replicar respuesta Daniel) ========");
for (const f of ["S32", "P32", "S33", "P33", "S34", "P34", "S35", "P35", "S36", "P36", "TotalInv", "Stok15"]) {
  await probe(`sum ${f} (MASERP)`, "aggregate_records", {
    entity: "ResumenPlaneacionCF",
    function: "sum", field: f,
    filter: "Usuario eq 'MASERP'",
  });
}
