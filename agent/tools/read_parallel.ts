import { defineTool } from "eve/tools";
import { z } from "zod";
import { loadActiveAgent, loadRuntimeConfig } from "../lib/runtime-config.js";
import { mcpCallTool } from "../lib/mcp-client.js";

// Tools del ERP que requieren approval (escrituras). read_parallel NUNCA debe
// exponerlas: cualquier operación cuyo tool matchee esta regex se rechaza con
// `{ ok: false, error: "no permitido" }` (mismo criterio que agent/tools/erp.ts).
const WRITE_TOOL_RE = /(create|update|delete)_record|execute_entity|afectar|cambiar_situacion/;

// Ejecuta N lecturas del MCP del tenant ACTIVO en paralelo (Promise.all) para
// ahorrar pasadas LLM: el modelo hace 1 tool call en vez de 5-7. Solo lectura:
// filtra contra la allow-list del agente activo (`agent.mcpTools`) y nunca
// expone escrituras (ver WRITE_TOOL_RE arriba).
export default defineTool({
  description:
    "Agrupa las N lecturas del MISMO FLUJO en UNA sola tool call (ejecución paralela en el servidor): el plan + el SP + el snapshot + los agregados de un mismo turno van en UN lote, aunque sean de entidades y tools distintos (read_records, aggregate_records, buscar_registro, web_art_explosion_material, faltante_insumos, faltante_materia_prima, etc.). Cada paso LLM cuesta ~15-20s; agrupar N lecturas ahorra N-1 pasadas. NO es una llamada por artículo/registro: si necesitas cobertura por artículo, usa la consulta agregada o el SP del skill, no iteres read_parallel por fila. Máximo 10 operaciones por lote; si el flujo necesita más, prioriza las más importantes y agrupa el resto en un segundo lote (nunca más de 2-3 lotes por turno). Ejemplo: read_parallel({ operations: [{ tool: 'read_records', args: { entity: 'PlanProduccion', first: 5 } }, { tool: 'web_art_explosion_material', args: {...} }, { tool: 'faltante_insumos', args: {...} }] }). NO incluye escrituras (create/update/delete/execute/afectar/cambiar_situacion) — se rechazan. Si 2 operaciones son idénticas, se ejecuta una sola vez.",
  inputSchema: z.object({
    operations: z
      .array(
        z.object({
          tool: z
            .string()
            .describe("Nombre del tool MCP SIN prefijo intelisis-dab__ (ej. 'read_records')."),
          args: z.any().describe("Argumentos del tool (mismos que en la llamada directa)."),
        }),
      )
      .min(1)
      .max(10),
  }),
  async execute({ operations }) {
    try {
      const runtime = loadRuntimeConfig();
      const agent = loadActiveAgent();
      const allow = new Set(agent?.mcpTools ?? []);

      // Una operación es de solo lectura permitida si NO es escritura Y está en
      // la allow-list del agente (o si el agente no declara allow-list, cualquier
      // no-escritura).
      const isReadAllowed = (name: string): boolean => {
        if (WRITE_TOOL_RE.test(name)) return false;
        return allow.size === 0 || allow.has(name);
      };

      // Dedupe: operaciones idénticas (mismo tool + mismos args) se ejecutan UNA
      // sola vez y el resultado se reutiliza en las posiciones duplicadas.
      const keyOf = (op: { tool: string; args?: unknown }): string => {
        let argsStr = "";
        try {
          argsStr = JSON.stringify(op.args ?? {});
        } catch {
          argsStr = String(op.args);
        }
        return `${op.tool}::${argsStr}`;
      };
      const seen = new Map<string, number>();
      const results = new Array(operations.length);

      // Primera pasada: planificar qué índices ejecutar y cuáles reutilizar.
      const plan = operations.map((op, idx) => {
        const key = keyOf(op);
        if (seen.has(key)) return { idx, from: seen.get(key)! as number, key };
        seen.set(key, idx);
        return { idx, from: idx, key };
      });

      const executed = await Promise.all(
        plan
          .filter((p) => p.from === p.idx)
          .map(async (p) => {
            const op = operations[p.idx];
            const tool = op.tool;
            if (!isReadAllowed(tool)) {
              return { tool, ok: false, error: "no permitido" };
            }
            try {
              const data = await mcpCallTool(runtime.mcpUrl, tool, op.args ?? {});
              // mcpCallTool no lanza: ante fallo del MCP devuelve `{ error: string }`.
              const asErr = data as { error?: unknown } | null;
              if (data && typeof data === "object" && typeof asErr?.error === "string") {
                return { tool, ok: false, error: asErr.error };
              }
              return { tool, ok: true, data };
            } catch (err) {
              // Blindaje: una operación que falle no tumba a las demás.
              return { tool, ok: false, error: err instanceof Error ? err.message : String(err) };
            }
          }),
      );

      // Segunda pasada: colocar resultados (reusando los duplicados).
      const executedMap = new Map<string, unknown>();
      let execCursor = 0;
      plan.forEach((p, slot) => {
        if (p.from === p.idx) {
          const r = executed[execCursor];
          executedMap.set(p.key, r);
          results[slot] = r;
          execCursor += 1;
        } else {
          results[slot] = executedMap.get(p.key);
        }
      });

      const hasErrors = results.some((r) => r && (r as { ok: boolean }).ok === false);
      return { ok: true, hasErrors, results };
    } catch (err) {
      // Blindaje global: nunca romper el turno.
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
});
