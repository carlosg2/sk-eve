// =====================================================================
// PROBE — Disparar la CARGA INICIAL de la planeación para MASERP
// (2026-08-19/20). En el motor de Daniel, al confirmar la sesión se ejecuta
// spFCForcastCFNuk(@Usuario,@Ejercicio,@Periodo) que regenera
// ResumenPlaneacionCF para ese usuario. MASERP no tiene plan en el MCP
// porque nadie ha corrido la carga con MASERP como usuario.
//
// Este probe intenta ejecutar el SP vía execute_entity y, si el MCP lo
// expone, verifica que MASERP quede con plan (count + sum S32..S36).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-carga-maserp.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  const t0 = Date.now();
  try {
    const res = (await mcpCallTool(URL, tool, args)) as any;
    const text = JSON.stringify(res ?? {});
    const ms = Date.now() - t0;
    const m = text.match(/"error"\s*:\s*"([^"]{0,300})/);
    if (m) {
      let tipo = "?", detalle = m[1].replace(/\\r\\n/g, " ").slice(0, 300);
      try {
        const inner = JSON.parse(m[1]);
        tipo = inner?.error?.type ?? inner?.type ?? inner?.status ?? "?";
        detalle = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner).slice(0, 280);
      } catch { /* truncado */ }
      console.log(`\n=== ${label} === ❌ (${tipo}) en ${ms}ms`);
      console.log("  detalle:", detalle);
      return;
    }
    console.log(`\n=== ${label} === OK en ${ms}ms`);
    console.log(" ", JSON.stringify(res).slice(0, 400));
  } catch (e) {
    console.log(`\n=== ${label} === ERROR en ${Date.now() - t0}ms`, (e as Error).message.slice(0, 300));
  }
}

console.log("======== 1. INTENTAR EJECUTAR LA CARGA INICIAL PARA MASERP ========");
await probe("execute_entity spFCForcastCFNuk (MASERP, 2026, 8, silencio)", "execute_entity", {
  entity: "spFCForcastCFNuk",
  parameters: { Usuario: "MASERP", Ejercicio: 2026, Periodo: 8, EnSilencio: true },
});
await probe("execute_entity spFCForcastCFNuk (variante camel)", "execute_entity", {
  entity: "spFCForcastCFNuk",
  parameters: { usuario: "MASERP", ejercicio: 2026, periodo: 8, enSilencio: true },
});

console.log("\n======== 2. VERIFICAR SI MASERP YA TIENE PLAN ========");
const c: any = await mcpCallTool(URL, "aggregate_records", {
  entity: "ResumenPlaneacionCF", function: "count", field: "*", filter: "Usuario eq 'MASERP'",
});
console.log("count MASERP =>", JSON.stringify(c ?? {}).slice(0, 140));
for (const f of ["S32", "P32", "S33", "P33", "TotalInv"]) {
  const r: any = await mcpCallTool(URL, "aggregate_records", {
    entity: "ResumenPlaneacionCF", function: "sum", field: f, filter: "Usuario eq 'MASERP'",
  });
  console.log(`sum ${f} (MASERP) =>`, JSON.stringify(r ?? {}).slice(0, 130));
}
