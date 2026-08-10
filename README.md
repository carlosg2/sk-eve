# sk-eve — Agente ERP (Sigma AGI)

Asistente conversacional de ERP **Intelisis** construido con **Eve** + **SvelteKit**.
Se conecta al ERP vía **MCP sobre DAB** y responde preguntas de negocio con datos
reales de SQL Server. Es la implementación de la tesis **Sigma AGI** (`tesis/`):
tres abstracciones (Meta-fábrica, Agente, Company Twin) + Governance, con
*recursive self-improvement*: el runtime captura errores → buffer → la fábrica
(VS Code Copilot) promueve conocimiento a su hogar canónico.

## Stack

| Capa | Tecnología |
|---|---|
| UI + SSR | SvelteKit 2 + Svelte 5 |
| Agent framework | Eve 0.29.2 (embebido en Vite) |
| LLM | `deepseek/deepseek-v4-flash-0731` vía AI Gateway de Vercel; modelo dinámico por agente |
| MCP server | DAB custom; tenant ICF remoto `https://api2.maserp.mx/icf/mcp` (DAB local en 5050) |
| Base de datos | SQL Server 2022 (Docker) |
| Node.js | **24.x obligatorio** (Eve requiere ≥24) |

## Arranque

```bash
# 1. SQL Server docker (ya debe estar corriendo)
docker start sv5-sqlserver

# 2. DAB custom (MCP server) — ver .github/copilot-instructions.md §DAB custom
#    (binario DLL con ~/.dotnet/dotnet, config symlink a dab/dab-config.json)

# 3. SvelteKit + Eve
nvm use 24
npm install
npm run dev          # → http://localhost:5173 (o 5174/5175 si hay conflicto)
```

Variables de entorno en `.env.local` (ver `.env.example`):
`ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY`, `INTELISIS_MCP_URL` (opcional).

> El runbook operativo completo (gotchas de Eve, DAB build, protocolo de pruebas,
> self-improvement) vive en **`.github/copilot-instructions.md`** — léelo antes de
> tocar el agente.

## Estructura

```
agent/                  # el agente: agent.ts, instructions/, hooks/, lib/, skill-library/ (19 skills), tools/
company-twin/           # el activo: erp-kernel/ (universal OKF) + companies/<tenant>/ (ICF, marmoles, joyarock…)
evals/                  # gates de regresión (npx eve eval)
tesis/                  # la tesis Sigma AGI (ver tesis/README.md)
src/                    # SvelteKit: /chat, /studio, /audit, /api/*
scripts/                # probes de la meta-fábrica, linter de conocimiento, e2e
.data/                  # radiografía durable (sessions.sqlite3) — gitignored
```

## Verificación (antes de cada cambio)

```bash
nvm use 24
npm run check                                # svelte-check, 0 errores
node scripts/check-knowledge.ts              # linter de conocimiento vs MCP real: 0 críticos
node_modules/.bin/eve eval --url http://127.0.0.1:62803/ --timeout 360000   # evals 4/4
```

## Documentación

- `tesis/README.md` — guía de lectura de la tesis (arquitectura → tesis → constitución → ADRs)
- `.github/copilot-instructions.md` — runbook operativo de la fábrica (VS Code Copilot)
- `tesis/protocolo-pruebas.md` — protocolo de evaluación con evidencia (radiografía)
