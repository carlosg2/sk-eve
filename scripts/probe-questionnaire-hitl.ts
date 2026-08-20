// =====================================================================
// PROBE — Faltantes reales ICF para el demo HITL del Questionnaire.
//
// QUÉ VALIDÓ (2026-08-10, MCP real https://api2.maserp.mx/icf/mcp):
//   - faltante_insumos(Usuario: "MASERP", Ejercicio: 2026, Periodo: 7):
//     artículos INSUMOS DE PRODUCCION con Faltante > 0 (empaques, tarimas,
//     consumibles de planta) + si ya hay requisición en trámite.
//   - faltante_materia_prima(...): granos/materia prima (Art.SeProduce = 0)
//     con Faltante > 0 + diagnósticos de arribos/traspasos/préstamos.
//   - Estos son los DATOS REALES que el agente presenta al HITL antes de
//     armar la requisición de compra (R-COM-01/02, R-FIN-01/07 de la
//     reunión ICF 2026-08-05).
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-questionnaire-hitl.ts
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
        console.log("muestra:", JSON.stringify(rows.slice(0, 6), null, 1).slice(0, 3500));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message);
  }
}

// 1. Faltante de insumos de producción (julio 2026)
await probe("faltante_insumos (2026/7)", "faltante_insumos", {
  Usuario: "MASERP",
  Ejercicio: 2026,
  Periodo: 7,
});

// 2. Faltante de materia prima (julio 2026)
await probe("faltante_materia_prima (2026/7)", "faltante_materia_prima", {
  Usuario: "MASERP",
  Ejercicio: 2026,
  Periodo: 7,
});

// 3. Existencias reales de los artículos con faltante (acotado)
await probe("ArtDisponibleDesc muestra", "read_records", {
  entity: "ArtDisponibleDesc",
  filter: "Articulo eq '000002'",
  select: "Articulo,Descripcion1,Disponible,Almacen",
  first: 5,
});
