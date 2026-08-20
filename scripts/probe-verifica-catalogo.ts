// =====================================================================
// PROBE — Verificar MCP ICF tras la actualización del DAB por el DBA (2026-08-19).
// Objetivo: confirmar en vivo qué entidades clave del agente de Daniel
// responden ahora (config nuevo 74 entidades) y cuáles faltan.
// Uso:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-verifica-catalogo.ts
// =====================================================================
import { mcpCallTool, mcpListTools } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

console.log("======== 1. TOOLS MCP (todos) ========");
const tools = await mcpListTools(URL);
console.log("total tools:", tools.length);
for (const t of tools) console.log(" -", t.name, "|", (t.description ?? "").slice(0, 70));

// Entidades clave que el agente de Daniel usa (skills) — verificar respuesta
const entidades = [
  // nuevas en el config 74 (antes EntityNotFound o no publicadas)
  "UT_LOG_EJC_PRO_MRP", "UT_MRP_PREVIO_MATERIA_PRIMA", "DIM_TIEMPO_SEMANA",
  "ProcesadosCF", "FCArribos", "VentaTCalc", "ForecastArtFam12", "ForecastBBC12",
  "AuxiliarU", "UV_QV_FILLRATE", "Usuario", "Arribos12S", "Arribos12", "ArribosSub12S",
  // del agente de Daniel (skills)
  "ResumenPlaneacionCF", "WebInicio", "ForecastPlanProduccion", "CentroFC",
  "ForecastPlanSemanal", "ForecastPlanSemanalD", "MovSituacionFC", "MovSituacionUsuarioFC",
  "BalanceFC", "ArtMaterial", "ArtDisponible", "ARTDISPONIBLEVACA", "ArtFamFC",
  "VacaPresupuestoVtaCon", "VacaPresupuestoVtaConD", "CalendarioFC", "ExplocionMatCF",
  "ArtCentroTemp", "CentroFCTemp", "EstacionTFC", "EstacionTFCTemp",
  "ProgramaProdProcesadosA", "ProgramaProdSemillasA", "ProgramaProdSituacionLog",
  "UT_MAX_MIN_COMPRA", "ForecastHist", "ForecastAyuda", "Alm", "Prod", "ProdD", "MovTipo",
  // posibles faltantes
  "ArtVarFC", "EmpresaCfg2", "PlanArtOP", "TipoImpuesto1", "ArtPrototipo", "ArtPrototipoD",
];

console.log("\n======== 2. ENTIDADES — read_records first:1 ========");
for (const e of entidades) {
  try {
    const r = await mcpCallTool(URL, "read_records", { entity: e, first: 1 });
    const txt = typeof r === "string" ? r : JSON.stringify(r);
    const ok = /status["']?\s*:\s*["']success|Successfully read/.test(txt);
    console.log(`${ok ? "✅" : "⚠️"} ${e}: ${ok ? "OK" : txt.slice(0, 110)}`);
  } catch (e2) {
    console.log(`❌ ${e}: THROW ${(e2 as Error).message.slice(0, 110)}`);
  }
}
