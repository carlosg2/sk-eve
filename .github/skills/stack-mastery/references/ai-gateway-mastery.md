# Manual de dominio: AI Gateway + Modelos (sk-eve)

> Referencia de dominio para cómo sk-eve resuelve y enruta los modelos de LLM:
> Vercel AI Gateway, `@ai-sdk/gateway`, `wrapLanguageModel`, y el modelo
> dinámico por agente. Fuente primaria: `agent/agent.ts`, `.env.example`,
> `.github/copilot-instructions.md`. Verificado contra el código 2026-08-10.

## 1. La arquitectura del modelo

```
agent/agent.ts
  → DEFAULT_MODEL_ID = "deepseek/deepseek-v4-flash-0731"
  → buildModel(gatewayModelId):
      gateway(gatewayModelId)          # LanguageModel real que enruta por AI Gateway
      wrapLanguageModel({              # override de metadata para Eve
        model, middleware: contextBudgetMiddleware,
        providerId, modelId            # SIN el prefijo "gateway/"
      })
  → defineDynamic({ fallback: buildModel(DEFAULT), events: { "step.started": ... } })
      → loadActiveAgent()?.model       # el campo `model` de agent.md del agente activo
```

**El truco del `wrapLanguageModel`** (documentado en agent.ts): Eve calcula el id
compuesto para metadata de context-window/compaction leyendo
`.provider`/`.modelId` del modelo envuelto. Con `@ai-sdk/gateway` eso daría
`.provider = "gateway.<proveedor>"` → Eve arma `gateway/<slug>` que NUNCA existe
en el catálogo → falla el build con "does not have known AI Gateway context
window metadata". La solución: `wrapLanguageModel` con overrides
`providerId`/`modelId` que quedan expuestos en el objeto envuelto SIN afectar
`doGenerate`/`doStream` (siguen delegando al modelo original del gateway).

## 2. Formato de los model ids (crítico)

- El id en `agent.md` (editado desde /studio) usa el formato del catálogo del
  AI Gateway: `anthropic/claude-sonnet-4.5` — **con PUNTO en la versión menor**
  (no guion).
- Catálogo verificado: `https://ai-gateway.vercel.sh/v1/models/catalog` — solo
  tiene slugs tipo `anthropic/claude-sonnet-4.5` (sin prefijo `gateway/`).
- `resolveModelId(raw)`: `raw?.trim() || DEFAULT_MODEL_ID` — nunca null.

## 3. El modelo dinámico por agente

- **Evento `step.started`** es el ÚNICO scope de `defineDynamic` que admite
  devolver un `LanguageModel` en vivo (no un string de gateway).
- Cambiar `model` en `agent.md` (studio) surte efecto **sin reiniciar el dev
  server** — igual que instructions y skills.
- **Costo del cambio a mitad de sesión**: los prompt caches son por modelo;
  cambiar a mitad de sesión re-ingesta a precio no cacheado. Preferir cambio en
  sesión nueva.

## 4. El middleware de contexto (context-budget.ts)

`contextBudgetMiddleware` (wrapLanguageModel middleware) hace transformParams:

- **Trunca** descriptions/schemas de tools (a un presupuesto).
- **Compacta** tool-results de lectura: proyección por entidad + tope de filas.
- **Deduplica** resultados repetidos.
- **Avisa** de tool calls duplicadas (warnings del inspector).
- **Inyecta el plan de contexto** por mensaje (fase B del planner — workaround
  de la carrera de eventos de Eve).

## 5. Auth y credenciales

- **`AI_GATEWAY_API_KEY`**: para enrutar por el Gateway desde host externo
  (dev/self-host).
- **En Vercel**: el string de model id va por Vercel AI Gateway autenticado con
  **OIDC del proyecto** (sin API key).
- **`ANTHROPIC_API_KEY`**: necesaria para el agente real al arrancar (evals) —
  documentada en `.env.example`/copilot-instructions.

## 6. Oportunidades (modelos)

1. **Sonnet-4.5 para chat, DeepSeek para batch** (recomendación de la tesis v2):
  el `defineDynamic` ya lo soporta por agente — definir un agente "chat-cliente"
  con sonnet y loops batch con DeepSeek.
2. **Instrumentación de costos**: `defineInstrumentation` + OTel con
  `gen_ai.usage.*` del AI Gateway daría costo por turno/agente en la radiografía
  (hoy solo tokens).
3. **Evals con `mockModel`**: fixtures deterministas sin llamar al proveedor
  (evals de memoria/seguridad baratos en CI).
4. **Catálogo como fuente de verdad**: exponer el catálogo del gateway al studio
  para que el dropdown de modelo no permita ids inexistentes (hoy es texto libre
  con fallback silencioso al default).

## 7. Gotchas

- **DeepSeek es lento** (13-57 tok/s): timeouts amplios en evals (300-360s);
  "modelo lento" en warnings NO es un bug del cambio.
- **Nunca `gateway/` como prefijo**: el id compuesto de Eve debe coincidir con
  el catálogo (`anthropic/claude-sonnet-4.5`).
- **Modelo por agente = snapshot**: la sesión activa usa el modelo del
  `session.started`; cambiarlo en agent.md requiere sesión nueva.
- **Un modelo desconocido no rompe**: `resolveModelId` cae al default
  silenciosamente — verificar en el inspector qué modelo se usó realmente.

---

*Fuentes: `agent/agent.ts`, `.env.example`, `.github/copilot-instructions.md`,
manual eve-mastery §10 (deployment), tesis v2. Generado 2026-08-10.*
