// =====================================================================
// PROBE 3 — Tubería COMPLETA del use case (la que el skill control-compras
// instruye al modelo): compras del periodo por artículo y por proveedor.
//
// QUÉ VALIDÓ (2026-08-06, MCP ICF real, periodo Ejercicio 2026 / Periodo 7):
//   - Compra julio 2026 = 987 movimientos (count).
//   - Cabeceros reales: Entrada Compra CONCLUIDO, Proveedor PP-0021/PP-0295,
//     Importes de cientos de miles.
//   - Join a CompraD por ID (aggregate sum Cantidad groupby ['Articulo']):
//     A6319 = 1,442,000 · A5944 = 310,000 · A6744 = 161,280 · A5640 = 120,000.
//   - aggregate_records(Compra, sum Importe, groupby ['Proveedor'],
//     orderby 'desc') funciona (gasto por proveedor del periodo).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-presupuesto3.ts
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

// 1. ¿Cuántas compras hay en Ejercicio 2026 / Periodo 7 (julio)?
const c7 = await call("aggregate_records", {
  entity: "Compra",
  function: "count",
  field: "*",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
});
console.log("=== Compra julio 2026 (count) ===", JSON.stringify(c7).slice(0, 400));

// 2. Cabeceros de compras del periodo (CONCLUIDO + SINAFECTAR + PENDIENTE)
const compras = await call("read_records", {
  entity: "Compra",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
  select: "ID,Mov,MovID,FechaEmision,Proveedor,Importe,Estatus,Moneda",
  orderby: ["FechaEmision desc"],
  first: 8,
});
console.log("\n=== Compra julio 2026 (muestra) ===");
console.log(JSON.stringify(rows(compras), null, 1).slice(0, 2200));

// 3. IDs de julio 2026 (para el join con CompraD)
const comprasAll = await call("read_records", {
  entity: "Compra",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
  select: "ID",
  first: 500,
});
const ids = rows(comprasAll).map((r: any) => r.ID);
console.log("\n=== IDs julio 2026: ", ids.length, " ===", ids.slice(0, 20).join(","));

// 4. Detalle agregado por artículo para esos IDs
if (ids.length) {
  const filter = "ID eq " + ids.slice(0, 30).join(" or ID eq ");
  const agg = await call("aggregate_records", {
    entity: "CompraD",
    function: "sum",
    field: "Cantidad",
    groupby: ["Articulo"],
    filter,
    first: 20,
  });
  console.log("\n=== CompraD sum Cantidad por Articulo (primeros 30 IDs) ===");
  console.log(JSON.stringify(rows(agg), null, 1).slice(0, 2000));
}

// 5. Compras de un proveedor en el periodo (para la desviación por proveedor)
const p = await call("aggregate_records", {
  entity: "Compra",
  function: "sum",
  field: "Importe",
  filter: "Ejercicio eq 2026 and Periodo eq 7",
  groupby: ["Proveedor"],
  orderby: "desc",
  first: 8,
});
console.log("\n=== Compra julio 2026 sum Importe por Proveedor ===");
console.log(JSON.stringify(rows(p), null, 1).slice(0, 1800));
