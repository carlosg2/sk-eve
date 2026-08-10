// =====================================================================
// PROBE 5 — Cruce FINAL: artículos comprados en julio vs su presupuesto
// (UV_QV_PPTOCOMPRA). Es la evidencia del valor del use case.
//
// QUÉ VALIDÓ (2026-08-06, MCP ICF real, periodo Ejercicio 2026 / Periodo 7):
//   - count MAXCOMPRAKG > 0 = 154 artículos con presupuesto configurado.
//   - Cruce real (60 IDs de julio): A6319 BOLSA CAMPO SANTO compró 4,366,000
//     vs presupuesto 3,002,400 -> +45% 🔴; A5944 BOLSA PUEBLO RICO 340,000
//     vs 76,125 -> +347% 🔴; A6541 BOLSA ZIPPER CANELA 24,200 vs 16,804
//     -> +44% 🔴; A5838 4,372.5 vs 4,400 -> 99% 🟡; A5640 120,000 vs
//     982,549 -> 12% 🟢. Desviaciones reales y accionables.
//   - Top 5 movimientos por importe del periodo (la 'sábana').
//   - OJO unidades: las BOLSAS se miden en pz en CompraD; el presupuesto
//     está en 'KG' nominal (para empaques el valor coincide en piezas).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-presupuesto5.ts
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

const u = await call("read_records", {
  entity: "UV_QV_PPTOCOMPRA",
  filter: "ARTICULO eq 'A6319' or ARTICULO eq 'A5944' or ARTICULO eq 'A6744' or ARTICULO eq 'A5640' or ARTICULO eq 'A6541' or ARTICULO eq 'A5838'",
  select: "ARTICULO,DESCRIPCION,FAMILIA,INVMINIMOKG,INVMAXIMOKG,MAXCOMPRAKG",
  first: 20,
});
console.log("=== Presupuesto de los top comprados julio ===");
console.log(JSON.stringify(rows(u), null, 1).slice(0, 2000));

const n = await call("aggregate_records", {
  entity: "UV_QV_PPTOCOMPRA",
  function: "count",
  field: "*",
  filter: "MAXCOMPRAKG gt 0",
});
console.log("\n=== count MAXCOMPRAKG>0 ===", JSON.stringify(n).slice(0, 400));

const compras = await call("read_records", {
  entity: "Compra",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
  select: "ID",
  first: 60,
});
const ids = rows(compras).map((r: any) => r.ID);
const filter = "ID eq " + ids.join(" or ID eq ");
const agg = await call("aggregate_records", {
  entity: "CompraD",
  function: "sum",
  field: "Cantidad",
  groupby: ["Articulo"],
  filter,
  orderby: "desc",
  first: 25,
});
console.log("\n=== CompraD sum Cantidad por Articulo (60 IDs de julio) ===");
console.log(JSON.stringify(rows(agg), null, 1).slice(0, 2500));

const aggCosto = await call("aggregate_records", {
  entity: "CompraD",
  function: "sum",
  field: "Costo",
  groupby: ["Articulo"],
  filter,
  orderby: "desc",
  first: 10,
});
console.log("\n=== CompraD sum Costo por Articulo (60 IDs julio) ===");
console.log(JSON.stringify(rows(aggCosto), null, 1).slice(0, 1500));

const top = await call("read_records", {
  entity: "Compra",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
  select: "ID,Mov,MovID,FechaEmision,Proveedor,Importe,Estatus,Moneda",
  orderby: ["Importe desc"],
  first: 5,
});
console.log("\n=== Top 5 movimientos por importe (julio 2026) ===");
console.log(JSON.stringify(rows(top), null, 1).slice(0, 2000));
