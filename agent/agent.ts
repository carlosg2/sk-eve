import { defineAgent, defineDynamic } from "eve";
import { gateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel } from "ai";
import { contextBudgetMiddleware } from "./lib/context-budget.js";
import { loadActiveAgent } from "./lib/runtime-config.js";

// ═════════════════════════════════════════════════════════════════════════
// PRUEBA RÁPIDA (2026-08-11): modelo LOCAL vía Ollama (muse-glimmer 30B MLX).
// La sección original de DeepSeek / AI Gateway queda COMENTADA, no borrada.
// Para revertir: descomentar "DeepSeek (AI Gateway)" abajo y poner en el
// `agent.md` activo `model: deepseek/deepseek-v4-flash-0731`.
// ═════════════════════════════════════════════════════════════════════════

// ── DeepSeek (AI Gateway) — COMENTADO (prueba local) ────────────────────
// const DEFAULT_MODEL_ID = "deepseek/deepseek-v4-flash-0731";
//
// // `agent.md` (editado desde /studio) guarda el id en formato del catálogo de
// // AI Gateway ("anthropic/claude-sonnet-4.5" — con PUNTO, no guion, en la
// // versión menor; verificado contra https://ai-gateway.vercel.sh/v1/models/catalog).
// // Es el id que espera @ai-sdk/gateway, sin transformación.
// function resolveModelId(raw: string | null | undefined): string {
//   return raw?.trim() || DEFAULT_MODEL_ID;
// }
//
// // gateway(modelId) construye un LanguageModel real que enruta por el AI
// // Gateway de Vercel (auth: AI_GATEWAY_API_KEY). Eve calcula un id compuesto
// // para metadata de context-window/compaction leyendo `.provider`/`.modelId`
// // del LanguageModel envuelto: para un modelo de @ai-sdk/gateway eso da
// // `.provider = "gateway.<proveedor>"`, así que Eve arma "gateway/<slug>" —
// // que NUNCA existe en el catálogo (`https://ai-gateway.vercel.sh/v1/models/catalog`
// // solo tiene slugs "anthropic/claude-sonnet-4.5", sin el prefijo "gateway/") y
// // falla el build con "does not have known AI Gateway context window metadata".
// // `wrapLanguageModel` acepta overrides `providerId`/`modelId` que quedan
// // expuestos en el objeto envuelto SIN afectar `doGenerate`/`doStream` (que
// // siguen delegando al modelo original de @ai-sdk/gateway). Se usan para que
// // Eve vea `.provider = "anthropic"` / `.modelId = "claude-sonnet-4.5"` (igual
// // que con @ai-sdk/anthropic directo) y el id compuesto coincida con el
// // catálogo, mientras la llamada real SÍ viaja por el AI Gateway.
// function buildModel(gatewayModelId: string) {
//   const separatorIndex = gatewayModelId.indexOf("/");
//   const providerId = separatorIndex === -1 ? gatewayModelId : gatewayModelId.slice(0, separatorIndex);
//   const bareModelId = separatorIndex === -1 ? gatewayModelId : gatewayModelId.slice(separatorIndex + 1);
//   return wrapLanguageModel({
//     model: gateway(gatewayModelId),
//     middleware: contextBudgetMiddleware,
//     providerId,
//     modelId: bareModelId,
//   });
// }

// ── Ollama local (ACTIVO) ───────────────────────────────────────────────
// Elegido: muse-glimmer:30b-mlx porque emite tool_calls NATIVO en el endpoint
// /v1 de Ollama. nemotron-3.5-lightning:30b-mlx NO (devuelve el tool call como
// texto crudo `<function=...>` que el provider OpenAI-compatible no parsea, y
// además alucinó tool calls de ejemplo) — descartado en la prueba (2026-08-11).
const OLLAMA_DEFAULT_MODEL_ID = "ollama/muse-glimmer:30b-mlx";
// Context window del modelo (verificado con `ollama show`): 131072 tokens.
const OLLAMA_CONTEXT_WINDOW_TOKENS = 131072;

// Endpoint OpenAI-compatible de Ollama local (v0.32.9, M3 Max). `/v1` habla el
// mismo protocolo que OpenAI; `createOpenAICompatible` lo conecta con el AI SDK
// del proyecto (ai v7) sin tocar el resto del stack.
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});

// `agent.md` (editado desde /studio) guarda el id con prefijo `ollama/`
// (ej. "ollama/muse-glimmer:30b-mlx"), sin transformación.
function resolveModelId(raw: string | null | undefined): string {
  return raw?.trim() || OLLAMA_DEFAULT_MODEL_ID;
}

// Construye el LanguageModel local y lo envuelve igual que la ruta gateway:
// con `contextBudgetMiddleware` (trunca tool-results >20k chars) y con overrides
// `providerId`/`modelId` expuestos para que Eve arme el id compuesto
// "ollama/<modelo>" (sin afectar `doGenerate`/`doStream`).
function buildOllamaModel(raw: string) {
  const localModelId = raw.startsWith("ollama/") ? raw.slice("ollama/".length) : raw;
  return wrapLanguageModel({
    model: ollama(localModelId),
    middleware: contextBudgetMiddleware,
    providerId: "ollama",
    modelId: localModelId,
  });
}

// El modelo es dinámico por `step.started` (único scope que admite devolver un
// `LanguageModel` en vivo) para que el campo `model` de `agent.md` del agente
// activo (editado en /studio) surta efecto sin reiniciar el dev server, igual
// que sus instrucciones y skills (`agent/instructions/agent-active.ts`).
// `modelContextWindowTokens` es OBLIGATORIO con modelos locales: evita que Eve
// consulte el catálogo de AI Gateway en el compile del fallback (los modelos
// locales no existen ahí → "does not have known AI Gateway context window
// metadata").
export default defineAgent({
  model: defineDynamic({
    fallback: buildOllamaModel(OLLAMA_DEFAULT_MODEL_ID),
    events: {
      "step.started": () => ({
        model: buildOllamaModel(resolveModelId(loadActiveAgent()?.model)),
        modelContextWindowTokens: OLLAMA_CONTEXT_WINDOW_TOKENS,
      }),
    },
  }),
  modelContextWindowTokens: OLLAMA_CONTEXT_WINDOW_TOKENS,
});
