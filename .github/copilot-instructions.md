# sk-eve — Copilot Instructions

## Qué es este proyecto

Agente conversacional de ERP (Intelisis) construido con **Eve + SvelteKit**. Se conecta al ERP via **MCP sobre DAB (Azure Data API Builder customizado)** y responde preguntas de negocio (CXP, tesorería, proveedores, cuentas bancarias) con datos reales de SQL Server.

---

## Stack completo

| Capa | Tecnología | Puerto |
|---|---|---|
| UI + SSR | SvelteKit 2 + Svelte 5 | 5173/5174/5175 |
| Agent framework | Eve 0.29.2 | embedded en Vite |
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
# NOTA: el fork DAB ignora --config con path absoluto; carga siempre desde su CWD.
# dab-custom/dab-config.json es un SYMLINK a sk-eve/dab/dab-config.json (creado 2026-07-01).
# Todo cambio en dab/dab-config.json aplica automáticamente al reiniciar el DAB.
# Binario: sigma-dab .NET 10 ARM64 compilado para macOS (2026-07-01).
# El binario self-contained (./Azure.DataApiBuilder.Service) es bloqueado por Gatekeeper en macOS 26.
# Usar el modo DLL con ~/.dotnet/dotnet (no requiere DOTNET_ROLL_FORWARD).
export CONNECTION_STRING='Server=localhost,1433;Database=JoyaRock_300326;User Id=sa;Password=MyStrong!Password123;TrustServerCertificate=true'
cd "/Users/carlosgarzagarza/Documents/MASERP/Sigma Intelisis/shared/dab-engine/dab-custom"
~/.dotnet/dotnet Azure.DataApiBuilder.Service.dll --urls "http://localhost:5050"

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

## `connection_search` (Eve 0.29.2)

### Comportamiento
Eve requiere `connection_search` en el primer step de cada sesión para registrar los tools calificados (`intelisis-dab__*`). Añade un round-trip de overhead. En 0.29.2 esto lo maneja `createConnectionSearchEvents()` suscrito a `step.started`.

### Historia del patch (ELIMINADO)
En Eve 0.13.3 existía `patches/eve+0.13.3.patch` (via `patch-package`) que pre-cargaba eagerly los tool metadata para eliminar el round-trip (75→43 eventos). **Ese patch se BORRÓ en la migración a 0.29.2** (era incompatible con la nueva estructura interna). También se quitaron `patch-package` y el script `postinstall`.

**Eve 0.29.2 CONSERVA `connection_search` por diseño** — la actualización sola NO elimina el round-trip. Por ahora se acepta (E2E muestra ~4 llamadas al arranque). Eliminarlo requeriría una estrategia nueva para 0.29.2.

### ⚠️ Tras actualizar la versión de Eve
Purgar SIEMPRE la caché de compilación, o el dev server sirve 500 con `LoadCompiledManifestError` (manifest stale del esquema viejo):
```bash
rm -rf .eve node_modules/.vite && npm run dev
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
| `connection_search` en cada primer turno | (0.13.3) Patch eager preload — ELIMINADO en migración a 0.29.2 | Round-trip aceptado |
| Migración a Eve 0.29.2 | Deps + eventos `readonly MessageStreamEvent[]` + purgar `.eve` | E2E validado |
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

---

## Inspección E2E en navegador — OBLIGATORIO

- La UI canónica para probar al agente es **`http://localhost:5173/chat`**, no `/`.
- Usa `read_page` para leer la respuesta y la región accesible **`Agent inspector`**. No uses screenshots para diagnóstico textual.
- **No abras el panel DevTools.** El `<pre aria-label="Inspector (texto plano · sin screenshots)">` está siempre en el DOM y contiene `status`, mensajes, tokens, `DIAGNOSTICS` (steps, tiempos, tools, throughput, cache hit/read/write, warnings) y el trace completo.
- Flujo de prueba: navegar a `/chat` → enviar desde `Escribe tu mensaje…` → esperar que desaparezca `Detener` / `status: ready` → llamar `read_page` → leer respuesta + `Agent inspector`.
- Si el snapshot es demasiado grande, usa el browser automation tool para leer únicamente `getByRole('region', { name: 'Agent inspector' }).innerText()`. No hagas click en DevTools.
- Para entender una falla, reporta desde el inspector: respuesta final, tools llamados, primer tool error, steps, cache r/w y warnings. No infieras el resultado desde la UI visual.
