// =====================================================================
// PROBE — Corroboración para el DBA: entidades faltantes + columnas clave
// de la integración del agente MRP de Daniel en el tenant ICF.
//
// QUÉ VALIDA (2026-08-19, MCP real https://api2.maserp.mx/icf/mcp):
//   A. Las 4 entidades que NO están publicadas en el DAB (Usuario,
//      UV_QV_FILLRATE, AuxiliarU, MovSituacionFCL): ¿EntityNotFound hoy?
//   B. Columnas que el agente de Daniel necesita en entidades YA
//      publicadas (Art, ArtFamFC, DIM_TIEMPO_SEMANA, Alm, CentroFC,
//      WebInicio): ¿se exponen en OData y con qué casing?
//
// NOTA: la BD local (MssqlMcp de Intelisis5000) confirmó que los 4 objetos
// SÍ existen en la BD (3 tablas + 1 vista) y que DIM_TIEMPO_SEMANA cubre
// 2026; UV_QV_FILLRATE está rota en la copia local (binding a BD
// CAMPOFRESCO inexistente) — el DAB remoto dirá si en producción compila.
//
// CÓMO CORRERLO:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-dab-icf-entidades.ts
// =====================================================================
import { mcpCallTool } from "../agent/lib/mcp-client.js";

const URL = "https://api2.maserp.mx/icf/mcp";

async function probe(label: string, tool: string, args: Record<string, unknown>) {
  try {
    const res = (await mcpCallTool(URL, tool, args)) as any;
    const text = JSON.stringify(res ?? {});
    // Detectar error embebido del DAB (EntityNotFound / BadRequest)
    const m = text.match(/"error"\s*:\s*"([^"]{0,260})/);
    if (m) {
      // El error es un JSON escapado dentro de { error: "<json>" } — intentar
      // parsearlo para extraer type/message reales.
      let tipo = "?", detalle = m[1].replace(/\\r\\n/g, " ").slice(0, 260);
      try {
        const inner = JSON.parse(m[1]);
        tipo = inner?.error?.type ?? inner?.type ?? inner?.status ?? "?";
        detalle = inner?.error?.message ?? inner?.message ?? JSON.stringify(inner).slice(0, 240);
      } catch {
        /* el string puede estar truncado */
      }
      console.log(`\n=== ${label} === ❌ NO PUBLICADA (${tipo})`);
      console.log("  detalle:", detalle);
      return;
    }
    console.log(`\n=== ${label} ===`);
    const inner = res?.value ?? res?.result ?? res;
    const rows = Array.isArray(inner) ? inner : inner?.value ?? inner?.items ?? [];
    if (Array.isArray(rows)) {
      console.log("filas:", rows.length);
      if (rows.length) {
        console.log("schema:", Object.keys(rows[0]).join(", "));
        console.log("muestra:", JSON.stringify(rows.slice(0, 2), null, 1).slice(0, 1500));
      }
    } else {
      console.log(JSON.stringify(res, null, 1).slice(0, 1500));
    }
  } catch (e) {
    console.log(`\n=== ${label} === ERROR`, (e as Error).message.slice(0, 300));
  }
}

console.log("======== A. ENTIDADES FALTANTES (¿publicadas en el DAB hoy?) ========");
await probe("Usuario (first 1)", "read_records", { entity: "Usuario", first: 1 });
await probe("UV_QV_FILLRATE (first 1)", "read_records", { entity: "UV_QV_FILLRATE", first: 1 });
await probe("AuxiliarU (first 1)", "read_records", { entity: "AuxiliarU", first: 1 });
await probe("MovSituacionFCL (first 3)", "read_records", { entity: "MovSituacionFCL", first: 3 });

console.log("\n======== B. COLUMNAS CLAVE EN ENTIDADES YA PUBLICADAS ========");
await probe("Art: campos FC (first 2)", "read_records", {
  entity: "Art",
  select: "Articulo,Descripcion1,Grupo,SeProduce,FamArtCF,GramajeFC,Factorstock,CentroDef,ArribosFC,GranelFC,ArticuloVACA,AlmacenROP,Estatus",
  first: 2,
});
await probe("ArtFamFC: Familia+TiempoEntrega+Stock (first 3)", "read_records", {
  entity: "ArtFamFC",
  select: "Familia,TiempoEntrega,StockMinimo,StockMaximo",
  first: 3,
});
await probe("DIM_TIEMPO_SEMANA: calendario 2026 (first 2)", "read_records", {
  entity: "DIM_TIEMPO_SEMANA",
  select: "Anio,MES,SEMANA,FECHAINICIO,FECHAFIN",
  filter: "Anio eq 2026",
  first: 2,
});
await probe("Alm: MateriaPrimaCF/GranelCF/EmpacadoCF (first 2)", "read_records", {
  entity: "Alm",
  select: "Almacen,MateriaPrimaCF,GranelCF,EmpacadoCF",
  first: 2,
});
await probe("CentroFC: Grupo/SubGrupo/Forecast (first 3)", "read_records", {
  entity: "CentroFC",
  select: "Centro,Descripcion,Grupo,SubGrupo,Forecast,Estatus",
  first: 3,
});
await probe("WebInicio: Inventario (first 2)", "read_records", {
  entity: "WebInicio",
  select: "Usuario,CentroTrabajo,Inventario",
  first: 2,
});
