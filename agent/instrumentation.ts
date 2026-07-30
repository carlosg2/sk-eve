import { defineInstrumentation } from "eve/instrumentation";
import { recordModelInput } from "./lib/llm-io.js";

// Observabilidad del INPUT al LLM. Eve invoca `step.started` después de armar
// el input final del modelo (system prompt + mensajes + tools) y antes de la
// llamada al proveedor. Capturamos ese snapshot al archivo puente para poder
// inspeccionar en el navegador EXACTAMENTE qué se envió al modelo en cada step.
export default defineInstrumentation({
  recordInputs: true,
  recordOutputs: true,
  events: {
    "step.started": (input) => {
      void recordModelInput({
        sessionId: input.session.id,
        turn: input.turn.sequence,
        step: input.step.index,
        at: new Date().toISOString(),
        instructions: input.modelInput.instructions ?? null,
        messages: input.modelInput.messages,
      });
      return undefined;
    },
  },
});
