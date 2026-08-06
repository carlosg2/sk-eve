import { defineEvalConfig } from "eve/evals";

// Config base de la suite de evals. Deterministas por ahora (sin judge LLM).
// Requiere: DAB en localhost:5050 y ANTHROPIC_API_KEY (el agente real arranca).
// timeoutMs 300s: los turnos reales con DeepSeek (13-22 tok/s) tardan >2 min.
export default defineEvalConfig({
  timeoutMs: 300_000,
});
