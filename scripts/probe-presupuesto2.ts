// =====================================================================
// PROBE 2 — Compra: schema, rango de datos y presupuesto configurado.
//
// QUÉ VALIDÓ (2026-08-06, MCP ICF real):
//   - Compra schema: ID/Mov/MovID/FechaEmision/Ejercicio/Periodo/Proveedor/
//     Importe/Estatus/Moneda (camelCase). Mov reales: 'Entrada Compra',
//     'Control Calidad'. Fecha más reciente: 2026-07-30.
//   - Estatus reales: CONCLUIDO 94,388 · CANCELADO 10,405 · SINAFECTAR 1,228
//     (agrupado por Estatus).
//   - UV_QV_PPTOCOMPRA con MAXCOMPRAKG > 0: ejemplos reales A1194
//     (GRANULINA, max 3,096.88), A1195 (ACEITE, max 1,681.46), A1227
//     (ESQUINERO, max 14,241.8).
//   - CompraD sum Cantidad groupby Articulo con filter 'ID le 50' = 0 filas
//     (los IDs recientes son altos; filtrar por IDs reales del periodo).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-presupuesto2.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  try {
    const res = (await mcpCallTool(URL, tool, args)) as any;
    console.log(`\n=== ${label} ===`);
    const inner = res?.value ?? res?.result ?? res;
    const rows = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
    if (Array.isArray(rows)) {
      console.log("filas:", rows.length);
      if (rows.length) {
        console.log("schema:", Object.keys(rows[0]).join(", "));
        console.log("muestra:", JSON.stringify(rows.slice(0, 3), null, 1).slice(0, 1600));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message);
  }
}

// 1. Compra: schema + valores reales sin filtro de fecha
await probe("Compra (first 3, sin filtro)", "read_records", {
  entity: "Compra",
  select: "ID,Mov,MovID,FechaEmision,Ejercicio,Periodo,Proveedor,Importe,Estatus,Moneda",
  orderby: ["FechaEmision desc"],
  first: 3,
});

// 2. Rango de fechas de compras: la más reciente
await probe("Compra max FechaEmision", "read_records", {
  entity: "Compra",
  orderby: ["FechaEmision desc"],
  select: "ID,Mov,MovID,FechaEmision,Estatus",
  first: 1,
});

// 3. ¿Cuántas compras hay por estatus?
await probe("Compra por estatus", "aggregate_records", {
  entity: "Compra",
  function: "count",
  field: "*",
  groupby: ["Estatus"],
  first: 20,
});

// 4. UV_QV_PPTOCOMPRA con MAXCOMPRAKG no nulo (los que SÍ tienen presupuesto)
await probe("UV_QV con presupuesto (MAXCOMPRAKG not null)", "read_records", {
  entity: "UV_QV_PPTOCOMPRA",
  filter: "MAXCOMPRAKG gt 0",
  select: "NIVELAGRUPAMIENTO,TIPO,FAMILIA,LINEA,ARTICULO,DESCRIPCION,TIPOCATALOGO,INVMINIMOKG,INVMAXIMOKG,MAXCOMPRAKG",
  first: 10,
});

// 5. CompraD por ID (cruzar con cabecero): probar aggregate de cantidades
await probe("CompraD aggregate por articulo (ID 1..50)", "aggregate_records", {
  entity: "CompraD",
  function: "sum",
  field: "Cantidad",
  groupby: ["Articulo"],
  filter: "ID le 50",
  first: 10,
});
