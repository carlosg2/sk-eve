// =====================================================================
// PROBE 1 — Presupuesto de compras: verificación base del use case
// "Control de compras del periodo" (reunión ICF 2026-08-05, R-FIN-06/07).
//
// QUÉ VALIDÓ (2026-08-06, MCP real https://api2.maserp.mx/icf/mcp):
//   - UV_QV_PPTOCOMPRA existe: schema NIVELAGRUPAMIENTO/TIPO/FAMILIA/LINEA/
//     ARTICULO/DESCRIPCION/TIPOCATALOGO/INVMINIMOKG/INVMAXIMOKG/MAXCOMPRAKG
//     (UPPERCASE). 601 artículos en total; la mayoría con KG null.
//   - Compra con filtro de FECHA (FechaEmision ge/le) devuelve 0 filas y
//     NO da error -> el periodo se filtra por Ejercicio/Periodo fiscal, no
//     por fechas (ver probe 4).
//   - CompraD es rica: Cantidad, Costo, Articulo, Unidad, FechaRequerida
//     (null en Entrada Compra), FechaCaducidad, ClavePresupuestal, etc.
//   - ArtDisponibleDesc con Disponible/Descripcion1 (vista de existencias).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-presupuesto.ts
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
        console.log("muestra:", JSON.stringify(rows.slice(0, 3), null, 1).slice(0, 1800));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message);
  }
}

// 1. Presupuesto de compra (stock de seguridad / máximo de compra)
await probe("UV_QV_PPTOCOMPRA (first 5)", "read_records", {
  entity: "UV_QV_PPTOCOMPRA",
  first: 5,
});

// 2. ¿Cuántas familias/artículos hay?
await probe("UV_QV_PPTOCOMPRA count", "aggregate_records", {
  entity: "UV_QV_PPTOCOMPRA",
  function: "count",
  field: "*",
});

// 3. Compras del periodo (julio 2026) — cabecero
await probe("Compra julio 2026 (first 3)", "read_records", {
  entity: "Compra",
  filter: "FechaEmision ge 2026-07-01 and FechaEmision le 2026-07-31",
  select: "ID,Mov,MovID,FechaEmision,Proveedor,Importe,Estatus,Moneda",
  orderby: ["FechaEmision desc"],
  first: 3,
});

// 4. Detalle de compra: campos y shape
await probe("CompraD (first 2)", "read_records", {
  entity: "CompraD",
  first: 2,
});

// 5. ¿Existe ArtDisponibleDesc con consumo? Solo para verificación de campos
await probe("ArtDisponibleDesc (first 2)", "read_records", {
  entity: "ArtDisponibleDesc",
  select: "Articulo,Descripcion1,Disponible,Almacen",
  first: 2,
});
