import { defineAgent, defineDynamic } from "eve";
import { gateway } from "@ai-sdk/gateway";
import { wrapLanguageModel } from "ai";
import { contextBudgetMiddleware } from "./lib/context-budget.js";
import { loadActiveAgent } from "./lib/runtime-config.js";

const DEFAULT_MODEL_ID = "deepseek/deepseek-v4-flash-0731";

// `agent.md` (editado desde /studio) guarda el id en formato del catálogo de
// AI Gateway ("anthropic/claude-sonnet-4.5" — con PUNTO, no guion, en la
// versión menor; verificado contra https://ai-gateway.vercel.sh/v1/models/catalog).
// Es el id que espera @ai-sdk/gateway, sin transformación.
function resolveModelId(raw: string | null | undefined): string {
  return raw?.trim() || DEFAULT_MODEL_ID;
}

// gateway(modelId) construye un LanguageModel real que enruta por el AI
// Gateway de Vercel (auth: AI_GATEWAY_API_KEY). Eve calcula un id compuesto
// para metadata de context-window/compaction leyendo `.provider`/`.modelId`
// del LanguageModel envuelto: para un modelo de @ai-sdk/gateway eso da
// `.provider = "gateway.<proveedor>"`, así que Eve arma "gateway/<slug>" —
// que NUNCA existe en el catálogo (`https://ai-gateway.vercel.sh/v1/models/catalog`
// solo tiene slugs "anthropic/claude-sonnet-4.5", sin el prefijo "gateway/") y
// falla el build con "does not have known AI Gateway context window metadata".
// `wrapLanguageModel` acepta overrides `providerId`/`modelId` que quedan
// expuestos en el objeto envuelto SIN afectar `doGenerate`/`doStream` (que
// siguen delegando al modelo original de @ai-sdk/gateway). Se usan para que
// Eve vea `.provider = "anthropic"` / `.modelId = "claude-sonnet-4.5"` (igual
// que con @ai-sdk/anthropic directo) y el id compuesto coincida con el
// catálogo, mientras la llamada real SÍ viaja por el AI Gateway.
function buildModel(gatewayModelId: string) {
  const separatorIndex = gatewayModelId.indexOf("/");
  const providerId = separatorIndex === -1 ? gatewayModelId : gatewayModelId.slice(0, separatorIndex);
  const bareModelId = separatorIndex === -1 ? gatewayModelId : gatewayModelId.slice(separatorIndex + 1);
  return wrapLanguageModel({
    model: gateway(gatewayModelId),
    middleware: contextBudgetMiddleware,
    providerId,
    modelId: bareModelId,
  });
}

// El modelo es dinámico por `step.started` (único scope que admite devolver un
// `LanguageModel` en vivo, no un string de gateway — ver docs/agent-config.md)
// para que el campo `model` de `agent.md` del agente activo (editado en
// /studio) surta efecto sin reiniciar el dev server, igual que sus
// instrucciones y skills (`agent/instructions/agent-active.ts`).
export default defineAgent({
  model: defineDynamic({
    fallback: buildModel(DEFAULT_MODEL_ID),
    events: {
      "step.started": () => buildModel(resolveModelId(loadActiveAgent()?.model)),
    },
  }),
});
