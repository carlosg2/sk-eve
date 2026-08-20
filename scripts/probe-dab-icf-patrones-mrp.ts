// =====================================================================
// PROBE — Patrones de consulta del agente MRP (Daniel) adaptados a OData
// del DAB, validados contra el MCP remoto de ICF (2026-08-19).
//
// Objetivo: verificar ANTES de escribir el skill integrado que los
// patrones que usará el agente con las 4 entidades nuevas funcionan:
//   P1. Sesión          -> read_records(Usuario, filter Usuario eq 'X')
//   P2. Venta real      -> UV_QV_FILLRATE (agregados por MES_FISCAL /
//                          SEMANA_FACTURA; FECHA_REMISION es varchar
//                          dd/mm/yyyy -> NO se puede filtrar por rango
//                          lexicográfico en OData)
//   P3. Saldo inventario-> AuxiliarU: sum(CargoU) - sum(AbonoU) con
//                          Rama='INV', Empresa='INCF', Cuenta='<art>'
//   P4. Workflow        -> read_records(MovSituacionFCL)
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-dab-icf-patrones-mrp.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  try {
    const res = (await mcpCallTool(URL, tool, args)) as any;
    const text = JSON.stringify(res ?? {});
    const m = text.match(/"error"\s*:\s*"([^"]{0,200})/);
    if (m) {
      console.log(`\n=== ${label} === ❌ ERROR: ${m[1].replace(/\\r\\n/g, " ").slice(0, 200)}`);
      return;
    }
    console.log(`\n=== ${label} ===`);
    const inner = res?.value ?? res?.result ?? res;
    const rows = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
    if (Array.isArray(rows)) {
      console.log("filas:", rows.length);
      console.log("muestra:", JSON.stringify(rows.slice(0, 3), null, 1).slice(0, 1400));
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1200));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message.slice(0, 300));
  }
}

console.log("======== P1. SESIÓN ========");
// El stack sk-eve usa MASERP como Usuario fijo del módulo FC. ¿Existe en la tabla?
await probe("Usuario eq 'MASERP' (select)", "read_records", {
  entity: "Usuario",
  filter: "Usuario eq 'MASERP'",
  select: "Usuario,Nombre,DefEmpresa,Estatus",
});
await probe("Usuario eq 'MASERP' (select)", "read_records", {
  entity: "Usuario",
  filter: "Usuario eq 'MASERP'",
  select: "Usuario,Nombre,DefEmpresa,Estatus",
});

console.log("\n======== P2. VENTA REAL (UV_QV_FILLRATE) ========");
// FECHA_REMISION es varchar dd/mm/yyyy -> probar si un filtro de rango
// lexicográfico devuelve algo (esperado: puede fallar o devolver mal).
await probe("FECHA_REMISION ge '01/01/2026' (lexicográfico)", "read_records", {
  entity: "UV_QV_FILLRATE",
  filter: "FECHA_REMISION ge '01/01/2026'",
  select: "NO_ARTICULO,FECHA_REMISION,CANTIDAD_EMBARCADA,RECHAZO,MES_FISCAL,SEMANA_FACTURA",
  first: 3,
});
// Agregado por MES_FISCAL (int) — patrón robusto independiente del formato fecha
await probe("aggregate count por MES_FISCAL=8", "aggregate_records", {
  entity: "UV_QV_FILLRATE",
  function: "count",
  field: "*",
  filter: "MES_FISCAL eq 8",
});
// Suma de venta real de un artículo (patrón del skill: CANTIDAD_EMBARCADA - RECHAZO)
await probe("sum CANTIDAD_EMBARCADA + RECHAZO del A0064 (MES_FISCAL 8)", "aggregate_records", {
  entity: "UV_QV_FILLRATE",
  function: "sum",
  field: "CANTIDAD_EMBARCADA",
  filter: "NO_ARTICULO eq 'A0064' and MES_FISCAL eq 8",
});
await probe("sum RECHAZO del A0064 (MES_FISCAL 8)", "aggregate_records", {
  entity: "UV_QV_FILLRATE",
  function: "sum",
  field: "RECHAZO",
  filter: "NO_ARTICULO eq 'A0064' and MES_FISCAL eq 8",
});

console.log("\n======== P3. SALDO INVENTARIO (AuxiliarU) ========");
// Patrón del skill-forecast F2: SUM(CargoU - AbonoU) con Rama='INV', Empresa='INCF'
await probe("sum CargoU A0716 INV (cuenta ejemplo del probe)", "aggregate_records", {
  entity: "AuxiliarU",
  function: "sum",
  field: "CargoU",
  filter: "Rama eq 'INV' and Empresa eq 'INCF' and Cuenta eq 'A0716'",
});
await probe("sum AbonoU A0716 INV", "aggregate_records", {
  entity: "AuxiliarU",
  function: "sum",
  field: "AbonoU",
  filter: "Rama eq 'INV' and Empresa eq 'INCF' and Cuenta eq 'A0716'",
});
// Conteo por Grupo (almacén) — el join a Alm se hace por Grupo=Almacen
await probe("count AuxiliarU Rama INV Empresa INCF (volumen)", "aggregate_records", {
  entity: "AuxiliarU",
  function: "count",
  field: "*",
  filter: "Rama eq 'INV' and Empresa eq 'INCF'",
});

console.log("\n======== P4. WORKFLOW (MovSituacionFCL) ========");
await probe("MovSituacionFCL (todas)", "read_records", {
  entity: "MovSituacionFCL",
  select: "Modulo,Mov,ID",
});
