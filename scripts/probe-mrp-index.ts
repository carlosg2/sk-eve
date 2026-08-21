// =====================================================================
// PROBE — Corroboración del índice mrp/SKILL.md contra el MCP real de ICF.
//
// QUÉ VALIDA (2026-08-20, MCP real https://api2.maserp.mx/icf/mcp):
//   A. Existencia de entidades que el índice afirma que existen:
//      ResumenPlaneacionCF, CalendarioFC, DIM_TIEMPO_SEMANA,
//      ForecastPlanSemanal, WebInicio, Arribos12, CentroFCTemp,
//      EstacionTFCTemp, ExplocionMatCF, BalanceFC, Usuario.
//   B. Entidad que el índice afirma que NO existe: UtLogEjcProMrp.
//   C. Casing real de campos: DIM_TIEMPO_SEMANA (Anio/MES/SEMANA...),
//      CalendarioFC (Ano/Semana/FechaD/FechaA camelCase).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-mrp-index.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, entity: string, args: Record<string, unknown> = {}) {
  try {
    const res = (await mcpCallTool(URL, "read_records", { entity, first: 1, ...args })) as any;
    const text = JSON.stringify(res ?? {});
    const m = text.match(/"error"\s*:\s*"([^"]{0,260})/);
    if (m) {
      let tipo = "?", detalle = m[1].replace(/\\r\\n/g, " ").slice(0, 200);
      try {
        const inner = JSON.parse(m[1]);
        tipo = inner?.error?.type ?? inner?.type ?? inner?.status ?? "?";
        detalle = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner).slice(0, 200);
      } catch { /* truncado */ }
      console.log(`${label.padEnd(38)} ❌ ${tipo} :: ${detalle}`);
      return { ok: false, entity, tipo };
    }
    const inner = res?.value ?? res?.result ?? res;
    const rows = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
    const n = Array.isArray(rows) ? rows.length : "?";
    const cols = Array.isArray(rows) && rows.length ? Object.keys(rows[0]).join(", ") : "(sin filas)";
    console.log(`${label.padEnd(38)} ✅ ${n} fila(s) :: ${cols.slice(0, 180)}`);
    return { ok: true, entity, cols };
  } catch (e) {
    console.log(`${label.padEnd(38)} ❌ ERROR ${(e as Error).message.slice(0, 200)}`);
    return { ok: false, entity };
  }
}

console.log("==== A. Entidades que el índice afirma EXISTEN ====");
await probe("ResumenPlaneacionCF", "ResumenPlaneacionCF", { filter: "Usuario eq 'MASERP'" });
await probe("CalendarioFC", "CalendarioFC", { filter: "Usuario eq 'MASERP'" });
await probe("DIM_TIEMPO_SEMANA", "DIM_TIEMPO_SEMANA", { select: "Anio,MES,SEMANA,FECHAINICIO,FECHAFIN", filter: "Anio eq 2026" });
await probe("ForecastPlanSemanal", "ForecastPlanSemanal");
await probe("WebInicio", "WebInicio", { filter: "Usuario eq 'MASERP'" });
await probe("Arribos12", "Arribos12", { filter: "Usuario eq 'MASERP'" });
await probe("CentroFCTemp", "CentroFCTemp", { filter: "Usuario eq 'MASERP'" });
await probe("EstacionTFCTemp", "EstacionTFCTemp", { filter: "Usuario eq 'MASERP'" });
await probe("ExplocionMatCF", "ExplocionMatCF", { filter: "Usuario eq 'MASERP'" });
await probe("BalanceFC", "BalanceFC", { filter: "Usuario eq 'MASERP'" });
await probe("Usuario (tabla sesión)", "Usuario", { select: "Usuario,Nombre,DefEmpresa,Estatus", filter: "Usuario eq 'MASERP'" });

console.log("\n==== B. Entidad que el índice afirma NO existe ====");
await probe("UtLogEjcProMrp (debe fallar)", "UtLogEjcProMrp");
await probe("DimTiempoSemana (casing mal, debe fallar)", "DimTiempoSemana");

console.log("\n==== C. Casing de campos (schema real) ====");
await probe("CalendarioFC schema", "CalendarioFC", {});
console.log("\nListo.");
