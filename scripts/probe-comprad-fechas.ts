// Probe temporal (meta-fábrica): verificar filtros temporales en CompraD para
// corregir el patrón del skill control-compras sin or-chains gigantes.
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

// 1. ¿FechaEntrega funciona como filtro de rango en CompraD?
try {
  const a = await call("aggregate_records", {
    entity: "CompraD",
    function: "count",
    field: "*",
    filter: "FechaEntrega ge 2026-07-01 and FechaEntrega le 2026-07-31",
  });
  console.log("FechaEntrega range:", JSON.stringify(a).slice(0, 300));
} catch (e) {
  console.log("FechaEntrega range ERROR:", (e as Error).message);
}

// 2. ¿FechaContableMov (campo que existe en CompraD) funciona?
try {
  const b = await call("aggregate_records", {
    entity: "CompraD",
    function: "count",
    field: "*",
    filter: "FechaContableMov ge 2026-07-01 and FechaContableMov le 2026-07-31",
  });
  console.log("FechaContableMov range:", JSON.stringify(b).slice(0, 300));
} catch (e) {
  console.log("FechaContableMov range ERROR:", (e as Error).message);
}

// 3. Muestra de CompraD reciente: qué fechas vienen pobladas (FechaEntrega / FechaContableMov)
const c = await call("read_records", {
  entity: "CompraD",
  filter: "ID eq 140154",
  select: "ID,Articulo,FechaRequerida,FechaEntrega,FechaContableMov,FechaContable,FechaEmision",
  first: 3,
});
console.log("CompraD fechas ID 140154:", JSON.stringify(rows(c), null, 1).slice(0, 1200));

// 4. Sum Cantidad por Articulo filtrando por FechaEntrega del periodo (si funciona)
try {
  const d = await call("aggregate_records", {
    entity: "CompraD",
    function: "sum",
    field: "Cantidad",
    groupby: ["Articulo"],
    filter: "FechaEntrega ge 2026-07-01 and FechaEntrega le 2026-07-31",
    orderby: "desc",
    first: 10,
  });
  console.log("Sum Cantidad por Articulo (FechaEntrega julio):", JSON.stringify(rows(d), null, 1).slice(0, 1200));
} catch (e) {
  console.log("Sum Cantidad FechaEntrega ERROR:", (e as Error).message);
}

// 5. ¿CompraD tiene algún campo con datos de fecha útil? Schema real de un renglón reciente completo
const e = await call("read_records", {
  entity: "CompraD",
  filter: "ID eq 140154",
  first: 1,
});
const row = rows(e)[0] ?? {};
const fechaCampos = Object.keys(row).filter((k) => /fecha/i.test(k));
console.log("Campos fecha en CompraD:", fechaCampos.join(", "));
for (const f of fechaCampos) console.log(`  ${f} = ${JSON.stringify(row[f])}`);
