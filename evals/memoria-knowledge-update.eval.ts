import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";

// Gate de memoria knowledge-update single-session (acción A1 de la síntesis
// accionable, patrón LongMemEval KV/supersession): el turno 1 SIEMBRA un hecho
// del negocio en la conversación; el turno 2 DEBE resolver usando ese contexto
// (misma sesión física) sin redescubrir el Company Twin ni probar entidades.
//
// Escenario: el turno 1 confirma un hecho de cobertura (el módulo CXP/tesorería
// no está disponible en el tenant; ante preguntas de ese módulo la respuesta es
// "Dato no disponible"); el turno 2 pide aplicar ese hecho ("¿qué respondo si me
// piden el saldo de CXP?") y debe responder desde la conversación, no
// re-consultando el twin.
//
// INVARIANTE PROTEGIDO:
//   1. Los DOS turnos corren en la MISMA sesión física (gate duro — si Eve
//      abriera sesión nueva no hay memoria conversacional que validar).
//   2. Ambos turnos terminan con éxito (`first.succeeded()`, `second.succeeded()`).
//   3. El turno 2 NO re-consulta `query_company_twin` (soft — el modelo puede
//      variar la ruta; la señal de que usó la conversación es no redescubrir).
//   4. El turno 2 tampoco prueba entidades CXP (soft — refuerza el gate de
//      abstention; el eval de cobertura dedicado es `abstention-tenant`).
//
// NOTA: funciona con cualquier tenant activo — el hecho se SIEMBRA en el turno
// 1 (no depende de qué publique el tenant): es un test de MEMORIA, no de
// cobertura.
//
// Cómo correrlo: `npx eve eval --list` (descubrimiento) y
// `npx eve eval --url http://127.0.0.1:<puerto>/ --timeout 360000` (el puerto
// del dev server real; DeepSeek es lento, 300s+).
export default defineEval({
  description:
    "Memoria knowledge-update single-session: el turno 2 usa el hecho sembrado en el turno 1 (misma sesión) y no redescubre el Company Twin.",
  // DeepSeek es lento (13-22 tok/s): margen amplio para 2 turnos.
  timeoutMs: 300_000,
  async test(t) {
    // Turno 1: siembra el hecho. Pregunta factual de negocio cuya respuesta el
    // agente puede verificar contra el twin/skills (cobertura de módulos).
    const first = await t.send(
      "Para el resto de esta conversación, ten en cuenta este hecho: en este tenant el módulo de cuentas por pagar (CXP) y tesorería no está disponible; ante preguntas de ese módulo la respuesta es 'Dato no disponible'. ¿Me confirmas que lo tienes registrado?",
    );
    // El turno 1 responde confirmando el hecho (la semilla quedó en la
    // conversación). Broad a propósito: el modelo puede confirmar citando el
    // módulo o reconociendo el registro.
    first.succeeded();
    first.messageIncludes(/cuentas por pagar|CXP|tesorer[ií]a|no (est[aá] )?disponible|entendido|registrad|anotad/i);

    // Turno 2: pide aplicar el hecho sembrado. La respuesta vive en el
    // historial de la conversación (misma sesión física de Eve).
    const second = await t.send(
      "Con el hecho que te indiqué en mente: si un usuario me pregunta cuánto debemos a proveedores, ¿qué le respondo?",
    );

    // Continuidad: el turno 2 corre en la MISMA sesión (gate duro — sin sesión
    // compartida no hay memoria conversacional que validar).
    await t.require(second.sessionId, equals(first.sessionId));

    // Invariante central: el turno 2 termina con éxito.
    second.succeeded();
    // El turno 2 responde desde el contexto previo: abstiene con "Dato no
    // disponible" (soft — la ruta puede variar; el hecho es que no inventa).
    second.messageIncludes(/dato no disponible|no (est[aá] )?disponible|no (est[aá] )?publicad/i).soft();
    // El turno 2 NO redescubre: no vuelve a consultar el Company Twin (soft).
    second.notCalledTool("query_company_twin").soft();
    // El turno 2 tampoco prueba entidades del módulo CXP (soft — refuerzo).
    // Solo tools del MCP cuentan (consultar el twin para verificar cobertura
    // es correcto y no debe disparar el gate).
    second
      .eventsSatisfy("turno 2 sin entidades CXP", (events) => {
        const text = events
          .filter((e) => e.type === "actions.requested")
          .flatMap((e) => (e.data?.actions ?? []) as Array<{ name?: string; toolName?: string; input?: unknown; arguments?: unknown }>)
          .filter((a) => (a.name ?? a.toolName ?? "").startsWith("intelisis-dab__"))
          .map((a) => JSON.stringify(a.input ?? a.arguments ?? {}))
          .join(" ");
        return !/(?:CXP|CxpD|CxpConSaldo|CXPD|CtaDinero|Dinero|DineroD)\b/i.test(text);
      })
      .soft();
  },
});
