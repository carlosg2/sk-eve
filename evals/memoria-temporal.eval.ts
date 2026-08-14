import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";

// Gate de memoria temporal single-session (A1/A5 de la síntesis accionable,
// patrón LongMemEval/LoCoMo: supersession y continuidad temporal).
// Escenario: el turno 1 resuelve algo real del Company Twin (la política de
// aprobación del tenant); el turno 2 pregunta "¿cómo lo resolvimos antes?"
// y DEBE usar el contexto de la conversación previa — no redescubrir el twin
// (sin `query_company_twin` de nuevo) ni re-ejecutar la resolución completa.
//
// ⚠️ Invariante protegido (bug ABIERTO→PENDIENTE es la evidencia de que ya
// pasó): si el agente re-consultara el twin en el turno 2, la memoria
// conversacional no se usa — el guard lo detecta con `notCalledTool` scopeado
// al turno (Eve 0.29.2: `turn.events` son SOLO los eventos de ese turno).
export default defineEval({
  description:
    "Memoria temporal single-session: el turno 2 responde '¿cómo lo resolvimos antes?' usando el contexto del turno 1 (misma sesión) sin re-consultar el Company Twin ni re-descubrir el schema.",
  // DeepSeek es lento (13-22 tok/s): margen amplio para 2 turnos.
  timeoutMs: 300_000,
  async test(t) {
    // Turno 1: resolver la política de aprobación desde el Company Twin.
    const first = await t.send(
      "¿Cuál es la política de aprobación para crear o modificar registros en este tenant?",
    );
    // El turno 1 responde con el hecho (política/confirmación humana).
    first.messageIncludes(/aprobaci[oó]n|confirmaci[oó]n/i);
    // Métrica (soft): si el plan del lóbulo frontal ya precargó el concepto, el
    // modelo puede responder sin llamar el tool — no es el invariante de este
    // gate, solo se registra como dato.
    first.calledTool("query_company_twin").soft();

    // Turno 2: pedir que recuerde cómo lo resolvió. La respuesta vive en el
    // historial de la conversación (misma sesión física de Eve).
    const second = await t.send(
      "¿Cómo lo resolvimos antes? Recuerda y resume la política de aprobación que me diste.",
    );

    // Continuidad temporal: el turno 2 corre en la MISMA sesión (gate duro —
    // si Eve abriera sesión nueva, no hay memoria conversacional que validar).
    await t.require(second.sessionId, equals(first.sessionId));

    t.succeeded();
    // El turno 2 responde desde el contexto previo: menciona la política.
    second.messageIncludes(/aprobaci[oó]n|confirmaci[oó]n/i);
    // El turno 2 NO redescubre: no vuelve a consultar el Company Twin (ni
    // re-ejecuta la resolución). Esta es la señal de que usó la conversación.
    second.notCalledTool("query_company_twin");
  },
});
