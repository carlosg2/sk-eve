// =====================================================================
// PROBE 4 — CompraD: ¿se puede filtrar por periodo eficientemente?
//
// QUÉ VALIDÓ (2026-08-06, MCP ICF real):
//   - CompraD de una Entrada Compra (ID 140154): FechaRequerida/FechaEntrega
//     = null; Unidad 'kg'. El detalle NO trae fechas útiles para el periodo.
//   - CompraD NO tiene campos Ejercicio/Periodo (select devuelve []).
//   - Filtrar CompraD por FechaRequerida (ge/le) FALLA con InvalidArguments:
//     "No hay ninguna asignación de tipo de objeto Microsoft.OData.Edm.Date"
//     -> REGLA: el periodo SIEMPRE se filtra en el cabecero Compra con
//     Ejercicio/Periodo fiscal, NUNCA con fechas en CompraD.
//   - UV_QV_PPTOCOMPRA NIVELAGRUPAMIENTO eq 'FAMILIA' = 0 filas: el presupuesto
//     SOLO existe a nivel ARTICULO (601) — la familia es un campo de cada fila.
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-presupuesto4.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function call(tool: string, args: Record<string, unknown>) {
  return (await mcpCallTool(URL, tool, args)) as any;
}
function rows(res: any): any[] {
  const inner = res?.value ?? res?.result ?? res;
  const r = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
  return Array.isArray(r) ? r : [];
}

// 1. CompraD de una entrada de julio (140154) — ver FechaRequerida vs fecha del cabecero
const d1 = await call("read_records", {
  entity: "CompraD",
  filter: "ID eq 140154",
  select: "ID,Renglon,Articulo,Cantidad,Costo,FechaRequerida,FechaEntrega,Almacen,Unidad",
  first: 5,
});
console.log("=== CompraD ID 140154 (Entrada Compra 2026-07-30) ===");
console.log(JSON.stringify(rows(d1), null, 1).slice(0, 1800));

// 2. ¿CompraD tiene Ejercicio/Periodo? Probar un select con esos campos
const d2 = await call("read_records", {
  entity: "CompraD",
  filter: "ID eq 140154",
  select: "ID,Articulo,Ejercicio,Periodo,FechaRequerida",
  first: 2,
});
console.log("\n=== CompraD con Ejercicio/Periodo (¿existen?) ===");
console.log(JSON.stringify(rows(d2), null, 1).slice(0, 1200));

// 3. Sum Cantidad por Articulo filtrando por FechaRequerida del periodo julio
const d3 = await call("aggregate_records", {
  entity: "CompraD",
  function: "sum",
  field: "Cantidad",
  groupby: ["Articulo"],
  filter: "FechaRequerida ge 2026-07-01 and FechaRequerida le 2026-07-31",
  orderby: "desc",
  first: 10,
});
console.log("\n=== CompraD sum Cantidad por Articulo (FechaRequerida julio 2026) ===");
console.log(JSON.stringify(rows(d3), null, 1).slice(0, 1500));

// 4. Total de renglones con FechaRequerida en julio
const d4 = await call("aggregate_records", {
  entity: "CompraD",
  function: "count",
  field: "*",
  filter: "FechaRequerida ge 2026-07-01 and FechaRequerida le 2026-07-31",
});
console.log("\n=== CompraD count (FechaRequerida julio) ===", JSON.stringify(d4).slice(0, 400));

// 5. El presupuesto por familia: ¿qué familias tienen MAXCOMPRAKG?
const u = await call("read_records", {
  entity: "UV_QV_PPTOCOMPRA",
  filter: "NIVELAGRUPAMIENTO eq 'FAMILIA'",
  select: "NIVELAGRUPAMIENTO,FAMILIA,INVMINIMOKG,INVMAXIMOKG,MAXCOMPRAKG",
  first: 20,
});
console.log("\n=== UV_QV PPTO por FAMILIA (muestra) ===");
console.log(JSON.stringify(rows(u), null, 1).slice(0, 1800));

// 6. ¿Cuántas familias vs artículos en el presupuesto?
const u2 = await call("aggregate_records", {
  entity: "UV_QV_PPTOCOMPRA",
  function: "count",
  field: "*",
  filter: "NIVELAGRUPAMIENTO eq 'FAMILIA'",
});
console.log("\n=== UV_QV count FAMILIA ===", JSON.stringify(u2).slice(0, 400));
