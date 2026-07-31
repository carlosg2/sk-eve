import { defineAgent } from "eve";
import { anthropic } from "@ai-sdk/anthropic";
import { wrapLanguageModel } from "ai";
import { promptCacheMiddleware } from "./lib/prompt-cache.js";

// Modelo envuelto con prompt caching (ver lib/prompt-cache.ts). Cachea el
// prefijo estático (system + tools) y el historial rolling entre steps para
// bajar TTFT y ~90% del costo de input en agentes multi-step.
export default defineAgent({
  model: wrapLanguageModel({
    model: anthropic("claude-sonnet-4-5"),
    middleware: promptCacheMiddleware,
  }),
});
