# sk-eve — Copilot Instructions

## Qué es este proyecto

Agente conversacional de ERP (Intelisis) construido con **Eve + SvelteKit**. Se conecta al ERP via **MCP sobre DAB (Azure Data API Builder customizado)** y responde preguntas de negocio (CXP, tesorería, proveedores, cuentas bancarias) con datos reales de SQL Server.

---

## Stack completo

| Capa | Tecnología | Puerto |
|---|---|---|
| UI + SSR | SvelteKit 2 + Svelte 5 | 5173/5174/5175 |
| Agent framework | Eve 0.13.3 | embedded en Vite |
| LLM | Anthropic Claude (via `@ai-sdk/anthropic`) | — |
| MCP server | DAB custom (.NET 8) | 5050 |
| Base de datos | SQL Server 2022 (Docker) | 1433 |
| Node.js | **24.x obligatorio** (Eve requiere ≥24) | — |

---

## Cómo arrancar todo

```bash
# 1. SQL Server docker (ya debe estar corriendo)
docker start sv5-sqlserver   # o el nombre del contenedor

# 2. DAB custom (MCP server)
export CONNECTION_STRING='Server=localhost,1433;Database=JoyaRock_300326;User Id=sa;Password=MyStrong!Password123;TrustServerCertificate=true'
cd "/Users/carlosgarzagarza/Documents/MASERP/Sigma Intelisis/shared/dab-engine/dab-custom"
dotnet Azure.DataApiBuilder.Service.dll \
  --config "/Users/carlosgarzagarza/Documents/GitHub/sk-eve/dab/dab-config.json" \
  --urls "http://localhost:5050"

# 3. SvelteKit + Eve (en sk-eve/)
nvm use 24
npm run dev      # → http://localhost:5173 (o 5174/5175 si hay conflicto)
```

Variables de entorno en `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Estructura del agente

```
agent/
├── agent.ts                   # modelo: anthropic("claude-sonnet-4-5")
├── instructions.md            # system prompt siempre activo
├── channels/eve.ts            # auth channel (localDev + vercelOidc)
├── connections/
│   └── intelisis-dab.ts       # MCP → DAB en localhost:5050
├── skills/
│   └── cxp/SKILL.md           # playbook CXP/Tesorería/CtaDinero
└── tools/
    └── get_weather.ts         # tool de ejemplo (zod schema)
```

### Conexión MCP (`agent/connections/intelisis-dab.ts`)

```typescript
defineMcpClientConnection({
  url: "http://localhost:5050/mcp",
  tools: { allow: ["describe_entities","read_records","aggregate_records",
                   "create_record","update_record","delete_record","execute_entity"] }
})
```

Los tools se llaman con prefijo: `intelisis-dab__read_records`, `intelisis-dab__aggregate_records`, etc.

---

## Entidades DAB disponibles

| Entidad | Tabla | Descripción |
|---|---|---|
| `CtaDinero` | dbo.CtaDinero | Cuentas bancarias. Activas: `Estatus eq 'ALTA'` |
| `CXP` | dbo.CXP | Cuentas por Pagar. Pendientes: `Estatus eq 'ABIERTO'` |
| `CxpD` | dbo.CxpD | Detalle de CXP |
| `Prov` | dbo.Prov | Proveedores. Activos: `Estatus eq 'ALTA'` |
| `Dinero` | dbo.Dinero | Movimientos de tesorería |
| `DineroD` | dbo.DineroD | Detalle de tesorería |
| `Afectar` | stored proc | Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR) |
| `CambiarSituacion` | stored proc | Cambio de situación dentro de un estatus |

Filtros OData: fechas **sin comillas** → `Vencimiento ge 2026-06-01`

---

## Eve framework — internals clave

### `connection_search` (framework tool)

Eve inyecta `connection_search` dinámicamente en cada `step.started`. En sesiones nuevas, los tools calificados (`intelisis-dab__*`) no existen en el contexto hasta que se llama `connection_search` — el modelo los registra y en el siguiente step ya los puede usar directamente.

**Este proyecto parchea Eve** para eliminar ese round-trip (ver abajo).

### Eventos NDJSON del stream

El stream `/eve/v1/session/:id/stream` emite eventos:
- `session.started` / `session.completed`
- `turn.started` / `turn.completed`
- `step.completed` → incluye `usage` (tokens)
- `actions.requested` → tool calls (input visible)
- `action.result` → resultado de cada tool
- `message.appended` / `message.completed` → texto del modelo
- `reasoning.appended` / `reasoning.completed` → si el modelo soporta reasoning

La UI en `src/routes/+page.svelte` expone estos eventos via `agent.events`.

---

## Patch a Eve (eager tool preload)

### Problema
Eve requiere `connection_search` en el primer step de cada sesión para registrar los tools. Esto añade ~30 eventos de overhead y una llamada extra al MCP server.

### Solución — `patches/eve+0.13.3.patch`

Patch en `node_modules/eve/dist/src/runtime/framework-tools/connection-search-dynamic.js`:

En el handler `step.started`, cuando `v.length === 0` (sin tools cacheados), el patch **pre-carga eagerly** todos los tool metadata de todas las conexiones MCP y los inyecta directamente en el mapa de tools disponibles para el modelo. Se cachean en `ConnectionSearchResultsKey`.

**Resultado:** 75 eventos → 43 eventos (−43%). `connection_search` ya no aparece.

### Persistencia

```json
// package.json
"scripts": {
  "postinstall": "patch-package"
}
```

El patch se re-aplica automáticamente en cada `npm install`. Si Eve se actualiza, `patch-package` avisará con un error y habrá que revisar si necesita ajuste.

Para re-generar el patch tras modificar Eve manualmente:
```bash
npx patch-package eve
```

---

## DAB custom — build

El servidor MCP es un fork de [Azure Data API Builder](https://github.com/Azure/data-api-builder) compilado con .NET 8.

### Ubicación del binario
```
/Users/carlosgarzagarza/Documents/MASERP/Sigma Intelisis/shared/dab-engine/dab-custom/
```

### Rebuild (si se modifica el source en ~/GitHub/data-api-builder)
```bash
cd ~/GitHub/data-api-builder
dotnet build src/Service.Tests/../Service/Azure.DataApiBuilder.Service.csproj \
  -c Release --no-incremental 2>&1 | tail -5

# Copiar DLL MCP al binario custom
cp src/out/Release/net8.0/Azure.DataApiBuilder.Mcp.dll \
   "/Users/.../shared/dab-engine/dab-custom/"
cp src/out/Release/net8.0/Azure.DataApiBuilder.Mcp.pdb \
   "/Users/.../shared/dab-engine/dab-custom/"
```

`global.json` del repo debe tener:
```json
{ "sdk": { "version": "8.0.100", "rollForward": "latestFeature" } }
```

### Cambios aplicados al source de DAB
- Eliminado texto "STEP 1: describe_entities..." de los tool descriptions en:
  `ReadRecordsTool.cs`, `CreateRecordTool.cs`, `UpdateRecordTool.cs`, `DeleteRecordTool.cs`, `ExecuteEntityTool.cs`, `AggregateRecordsTool.cs`
- Esto evita que el modelo llame `describe_entities` innecesariamente.

### Config DAB (`dab/dab-config.json`)
Las entidades tienen `object-description` enriquecidos con schema, valores de Estatus, y ejemplos de filtros. Esto permite al modelo planificar queries directamente sin llamar `describe_entities`.

---

## Skill CXP/Tesorería (`agent/skills/cxp/SKILL.md`)

Se carga automáticamente cuando el usuario pregunta sobre CXP, facturas, proveedores, tesorería o cuentas bancarias. Contiene:
- Tool names exactos con prefijo `intelisis-dab__`
- Schema completo de cada entidad (campos, tipos, FK)
- Patrones de consulta OData recomendados
- Reglas de eficiencia (aggregate vs read, paralelismo, campos limitados)
- Formato de fechas (ISO sin comillas en OData)

---

## Optimizaciones aplicadas (historial)

| Problema | Solución | Impacto |
|---|---|---|
| Eve requería Node ≥24 | `nvm use 24` + `engines.node: "24.x"` | Proyecto arranca |
| Model compaction falla con gateway string | `@ai-sdk/anthropic` + `anthropic("claude-sonnet-4-5")` | Dev server estable |
| `connection_search` en cada primer turno | Patch eager preload (`patches/eve+0.13.3.patch`) | −43% eventos |
| `describe_entities` llamado antes de cada query | Eliminar prerequisite text en DAB C# tools | Queries directas |
| Modelo no conoce schema de entidades | `object-description` ricos en `dab-config.json` | Sin discovery |
| Instrucciones ignoradas sobre discovery | Reescribir `instructions.md` con directivas realistas | Modelo silencioso |

---

## Convenciones de código

- **Svelte 5**: usar `$state`, `$derived`, `$effect`. NO usar `let` reactivo de Svelte 4.
- **Eve tools**: siempre `defineTool` con schema Zod en `agent/tools/`.
- **Eve channels**: `eveChannel({ auth: [...] })` en `agent/channels/`.
- **Filtros OData en DAB**: fechas sin comillas, strings con comillas simples.
- **Vite plugins**: `eveSvelteKit()` SIEMPRE antes de `sveltekit()`.
