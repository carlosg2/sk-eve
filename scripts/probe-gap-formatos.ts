// =====================================================================
// PROBE — Gap de formatos (2026-08-19): verifica contra el MCP real ICF
// las entidades que los formatos de pantalla de Daniel requieren y que
// sk-eve aún no referencias, para NO inventarlas en los skills.
//
// QUÉ VALIDA:
//   A. ForecastHist            — F3 Histórico/versiones (mrp-forecast)
//   B. EstacionTFCTemp         — modelado de estaciones (mrp-modelado-centros)
//   C. BalanceFC               — balance de carga (mrp-modelado-centros)
//   D. CentroFCTemp            — config de centros por sesión
//   E. WebInicio (columnas)    — formato Programa Mensual (mrp-inicio)
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-gap-formatos.ts
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
      console.log(`\n=== ${label} === ❌ NO PUBLICADA (${tipo})`);
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
        console.log("muestra:", JSON.stringify(rows.slice(0, 2), null, 1).slice(0, 1500));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message.slice(0, 300));
  }
}

console.log("======== A. HISTÓRICO / VERSIONES (F3) ========");
await probe("ForecastHist (first 3)", "read_records", { entity: "ForecastHist", first: 3 });

console.log("\n======== B. MODELADO DE CENTROS/ESTACIONES ========");
await probe("EstacionTFCTemp (first 3)", "read_records", { entity: "EstacionTFCTemp", first: 3 });
await probe("BalanceFC (first 3)", "read_records", { entity: "BalanceFC", first: 3 });
await probe("CentroFCTemp (first 3)", "read_records", { entity: "CentroFCTemp", first: 3 });

console.log("\n======== C. PROGRAMA MENSUAL — columnas WebInicio ========");
await probe("WebInicio columnas programa (first 3)", "read_records", {
  entity: "WebInicio",
  select: "Usuario,CentroTrabajo,Venta,AProducir,TiempoExtra,Ocupacion,PzasLibres,CapacidadHrs,HorasProgram,PorOcupacion,DiasHAbiles,DiasTextra",
  first: 3,
});
