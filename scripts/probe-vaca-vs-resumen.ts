// probe-vaca-vs-resumen.ts — FÁBRICA (2026-08-20) v2
// VacaPresupuestoVtaConD NO tiene campo Usuario (el probe v1 falló con ese filtro).
// Comparo sin filtro: schema real + totales S32/P32 de ambas vistas.
import { mcpCallTool } from "../agent/lib/mcp-client.ts";
import { loadRuntimeConfig } from "../agent/lib/runtime-config.ts";

const url = loadRuntimeConfig().mcpUrl;
console.log("MCP:", url);

// Schema real de VacaPresupuestoVtaConD: campos del primer registro
for (const ent of ["VacaPresupuestoVtaConD"]) {
  const r = await mcpCallTool(url, "read_records", { entity: ent, first: 1 });
  const out = (r as any).output ?? r;
  const s = JSON.stringify(out);
  console.log(`--- read ${ent} first:1 (schema): ${s.slice(0, 1200)}`);
}

// Totales sin filtro Usuario (que esa vista no tiene)
for (const ent of ["VacaPresupuestoVtaConD", "ResumenPlaneacionCF"]) {
  for (const f of ["S32", "P32"]) {
    const r = await mcpCallTool(url, "aggregate_records", { entity: ent, function: "sum", field: f, groupby: [] });
    const out = (r as any).output ?? r;
    console.log(`--- aggregate ${ent} sum ${f} (sin filtro): ${JSON.stringify(out).slice(0, 200)}`);
  }
}
// conteo
for (const ent of ["VacaPresupuestoVtaConD", "ResumenPlaneacionCF"]) {
  const r = await mcpCallTool(url, "aggregate_records", { entity: ent, function: "count", field: "*", groupby: [] });
  const out = (r as any).output ?? r;
  console.log(`--- aggregate ${ent} count *: ${JSON.stringify(out).slice(0, 200)}`);
}
