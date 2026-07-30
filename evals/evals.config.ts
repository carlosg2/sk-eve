import { defineEvalConfig } from "eve/evals";

// Config base de la suite de evals. Deterministas por ahora (sin judge LLM).
// Requiere: DAB en localhost:5050 y ANTHROPIC_API_KEY (el agente real arranca).
export default defineEvalConfig({
  timeoutMs: 120_000,
});
