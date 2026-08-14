import { defineEval } from "eve/evals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Gate de abstention por tenant (acción A1 de la síntesis accionable): el caso
// canónico ICF — una pregunta de CXP/cuentas por pagar DEBE resolverse con
// "Dato no disponible": el MCP de ICF NO publica el módulo CXP/Tesorería
// (`CXP`, `CxpD`, `CxpConSaldo`, `CtaDinero`, `Dinero`, `DineroD` →
// `EntityNotFound`, verificado en runtime 2026-08-05; documentado en
// `company-twin/companies/icf/modulos.md`). El agente NO debe llamar entidades
// del módulo ni `describe_entities` (fuera del allow-list por diseño).
//
// INVARIANTE PROTEGIDO:
//   1. El turno termina con éxito (`turn.succeeded()` — no crashea ni falla).
//   2. NINGUNA llamada a tool referencia entidades CXP — GATE DURO cuando el
//      tenant activo es ICF.
//   3. Nunca llama `describe_entities` (gate duro siempre).
//   4. Idealmente la respuesta dice "Dato no disponible" (soft — la ruta puede
//      variar; el hecho es que no inventa ni falla).
//
// TENANT-AWARE: lee `company-twin/runtime.json` (+ override `SIGMA_TENANT`) para
// conocer el tenant activo. Con ICF activo el gate de entidades es DURO. Si el
// dev server corre con otro tenant (ej. marmoles, donde CXP SÍ puede existir),
// el eval degrada el gate de entidades a SOFT (tracked-only): sigue validando
// que el turno es limpio (succeeded, sin describe_entities) pero NUNCA asume
// cobertura que no verificó. La regla de fondo —no llamar entidades inexistentes
// del tenant— la impone el linter de conocimiento (`npm run lint:knowledge`,
// read_records first:1 contra el MCP real) y los modulos.md por tenant.
//
// Cómo correrlo: `npx eve eval --list` (descubrimiento) y
// `npx eve eval --url http://127.0.0.1:<puerto>/ --timeout 360000` (el puerto
// del dev server real; DeepSeek es lento, 300s+).
const CXP_ENTITIES = /(?:CXP|CxpD|CxpConSaldo|CXPD|CtaDinero|Dinero|DineroD)\b/i;

function activeTenant(): string {
  try {
    const raw = readFileSync(join(process.cwd(), "company-twin", "runtime.json"), "utf8");
    const rt = JSON.parse(raw) as { activeTenant?: string };
    return process.env.SIGMA_TENANT?.trim() || rt.activeTenant || "icf";
  } catch {
    // Fallback defensivo: si no se puede leer runtime.json, asume ICF (el
    // tenant canónico de este branch) — el gate duro de entidades aplica.
    return "icf";
  }
}

const tenant = activeTenant();
const isIcf = tenant === "icf";

export default defineEval({
  description: `Abstention por tenant (activo: ${tenant}): ante una pregunta de CXP/cuentas por pagar no llama entidades CXP ni describe_entities y responde "Dato no disponible".`,
  // DeepSeek es lento (13-22 tok/s): margen amplio para el turno.
  timeoutMs: 300_000,
  async test(t) {
    // Wording adversarial: pide un dato de CXP sin mencionar "CXP" ni
    // "disponible" — el agente debe reconocer el intento y abstener.
    const turn = await t.send(
      "¿Cuánto debemos a proveedores? Necesito el saldo total de cuentas por pagar para reportarlo a dirección.",
    );
    // (1) El turno terminó con éxito (no crasheó, no dejó tool fallada).
    turn.succeeded();
    // (3) Nunca describe_entities (fuera del allow-list por diseño).
    t.notCalledTool("intelisis-dab__describe_entities");
    // (2) Ninguna llamada referencia entidades del módulo CXP. El invariante
    // protege llamar ENTIDADES DEL MCP (read_records/aggregate_records con
    // entidades CXP) — consultar el Company Twin (`query_company_twin`) es
    // CORRECTO (verifica cobertura antes de asumir) y no cuenta aquí.
    const noCxp = t.eventsSatisfy("ninguna entidad CXP", (events) => {
      const text = events
        .filter((e) => e.type === "actions.requested")
        .flatMap((e) => (e.data?.actions ?? []) as Array<{ name?: string; toolName?: string; input?: unknown; arguments?: unknown }>)
        // Solo tools del MCP del ERP: el regex de entidades aplica a lecturas/
        // agregados/escrituras sobre el ERP, no a búsquedas de conocimiento.
        .filter((a) => (a.name ?? a.toolName ?? "").startsWith("intelisis-dab__"))
        .map((a) => JSON.stringify(a.input ?? a.arguments ?? {}))
        .join(" ");
      return !CXP_ENTITIES.test(text);
    });
    if (!isIcf) noCxp.soft(); // solo ICF tiene cobertura verificada → gate duro; otros tenants: tracked-only.
    // (4) La respuesta abstiene (soft — la ruta puede variar; el hecho es que
    // no inventa datos ni falla).
    turn.messageIncludes(/dato no disponible|no (est[aá] )?disponible|no (est[aá] )?publicad/i).soft();
  },
});
