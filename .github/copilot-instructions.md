# sk-eve — Copilot Instructions

## Qué es este proyecto

Agente conversacional de ERP (Intelisis) construido con **Eve + SvelteKit**. Se conecta al ERP via **MCP sobre DAB (Azure Data API Builder customizado)** y responde preguntas de negocio con datos reales de SQL Server.

**Es la implementación de la tesis Sigma AGI** (`tesis/`): tres abstracciones (Meta-fábrica, Agente, Company Twin) + Governance, con **recursive self-improvement**: el runtime captura errores → buffer → la fábrica (VS Code Copilot) promueve conocimiento a su hogar canónico. **Copilot ES la fábrica** — el agente runtime NUNCA se auto-edita el conocimiento.

---

## Stack completo

| Capa | Tecnología | Puerto |
|---|---|---|
| UI + SSR | SvelteKit 2 + Svelte 5 | 5173/5174/5175 |
| Agent framework | Eve 0.29.2 | embedded en Vite |
| LLM | **`deepseek/deepseek-v4-flash-0731`** vía AI Gateway de Vercel (`@ai-sdk/gateway`); model dinámico por `agent.md` (`agent/agent.ts` + `agent/instructions/agent-active.ts`) | — |
| MCP server | DAB custom; tenant **ICF remoto** `https://api2.maserp.mx/icf/mcp` (DAB local joyarock en 5050) | 5050 (local) |
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

## Skill CXP/Tesorería (`agent/skill-library/cxp/SKILL.md`)

Se carga cuando el usuario pregunta sobre CXP, facturas, proveedores, tesorería o cuentas bancarias **en un tenant que sí publica el módulo** (ej. joyarock). Contiene:
- Tool names exactos con prefijo `intelisis-dab__`
- Schema completo de cada entidad (campos, tipos, FK)
- Patrones de consulta OData recomendados
- Reglas de eficiencia (aggregate vs read, paralelismo, campos limitados)
- Formato de fechas (ISO sin comillas en OData)

> ⚠️ En **ICF** este módulo NO está publicado (ver sección "Conocimiento del tenant ICF") — ante preguntas de CXP en ICF responder "Dato no disponible" sin probar el MCP.

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
- El inspector muestra además `trend:` (resumen de turnos pasados del trace store): duración media, steps, calls, tokens, cache y errores. Úsalo para ver mejora/degradación.

---

## Recursive self-improvement — la tesis aplicada (OBLIGATORIO)

El sistema sigue la **constitución** (`tesis/constitucion.md`) y el **context stack** (`tesis/context-stack.md`). Reglas que Copilot (la fábrica) debe respetar SIEMPRE:

### Separación de poderes
- **Runtime (Eve/agente)** SOLO: lee el Twin, ejecuta tools, y **anexa al buffer** `company-twin/companies/<tenant>/state/learnings.md` (vía `agent/hooks/memory.ts`) cuando un tool falla. NUNCA reorganiza el Twin ni promueve conocimiento.
- **Fábrica (tú, Copilot)** SOLO: toma el buffer, clasifica cada aprendizaje y lo escribe en su **hogar canónico** (protocolo del skill `/promote-learnings` en `.github/skills/promote-learnings/SKILL.md`), y vacía el buffer.

### Hogar canónico de cada hecho (constitución §2)
| Tipo de conocimiento | Hogar | Prohibido en |
|---|---|---|
| Capacidades del motor (OData, UPPERCASE, fechas) | `erp-kernel/index.md` (§ Capacidades OData) | skills, instructions, learnings |
| Schema de entidad | `erp-kernel/<entidad>.md` | skills, instructions |
| Hecho/política del tenant (qué módulos publica, límites, aprobadores) | `companies/<tenant>/` (OKF) | kernel, skills |
| Cómo ejecutar un flujo | `agent/skill-library/<x>/SKILL.md` (cero schema) | instructions, twin |
| Ruteo "para X usa fuente Y" | `agent/instructions.md` | skills, twin |

**Nunca conviertas una observación local en conocimiento universal sin validación.** Un `EntityNotFound` de un tenant NO sube al kernel; vive en el twin del tenant.

### Ciclo completo (validado 2026-08-05)
1. Un tool falla (ej. `read_records CXP` → `EntityNotFound` en ICF).
2. El hook `agent/hooks/memory.ts` lo captura (ahora detecta errores **embebidos** `{ error: "..." }`, no solo `isError`) y anexa `ent-inexistente-CXP` al buffer.
3. El buffer se inyecta en el prompt de la próxima sesión (`agent/instructions/memory.ts`).
4. **Promoción (tú)**: clasifica el learning → twin declarativo del tenant (ej. `companies/icf/modulos.md`), ruteo → `agent/instructions.md`, capacidades → kernel root. Luego marca como promovido en el buffer.
5. Resultado: el agente responde "Dato no disponible" consultando el twin en **2 steps / 14s / 22k tokens** (antes: 12 steps / 16 calls / 4 errores / 608k tokens).

### Evals de regresión
- `evals/no-entity-inexistente.eval.ts` — nunca usar entidades inexistentes del tenant ni `describe_entities`.
- `evals/eficiencia-turno.eval.ts` — ≤10 tool calls, sin errores, sin duplicados.
- Correr con `npx eve eval --list` (descubrimiento) / `npx eve eval` (ejecución).

---

## Self-improvement implementado (2026-08-05) — resumen del stack

- **Hook de memoria ampliado** (`agent/hooks/memory.ts`): `extractError` normaliza todos los shapes de error DAB (estructurado, `{ error: "<json>" }`, `{status:"error",...}`, string); `deriveLearning` cubre errores de **schema** (`EntityNotFound` → `ent-inexistente-<ent>`; `Invalid field...` → `fld-<tool>-<campo>` con hint UPPERCASE). Todo blindado con try/catch.
- **Skill `mrp-cf` corregido**: usa entidades reales del MCP ICF (`ForecastPlanProduccion`, `CalendarioFC`; NO `ResumenPlaneacionCF`/`DimTiempoSemana`/`UtLogEjcProMrp` — EntityNotFound). Campos UPPERCASE. Prohíbe `describe_entities` y reads masivos.
- **Tools restringidos**: `agent/tools/bash.ts` y `glob.ts` → `disableTool()`; `describe_entities` fuera del allow-list del agente (`agent.md`).
- **Trace store**: `src/lib/server/trace-store.ts` + `src/routes/api/traces` — persiste un resumen por turno en `.eve/traces.jsonl`; el inspector muestra la tendencia.
- **Guard de contexto** (`agent/lib/context-budget.ts`): trunca tool-results >20k chars con aviso; blindado con try/catch.
- **Anti-duplicados** (`agent/instructions/duplicates.ts`): escanea tool-calls del historial (part `tool-call` usa `input`, NO `args` — verificado en llm-io.jsonl) y avisa al prompt si repite el mismo input.
- **Linter de conocimiento**: `npm run lint:knowledge` (= `node scripts/check-knowledge.ts`). Valida entidades/campos de skills+twin contra el MCP REAL con `read_records(ent, first:1)` — la verdad de runtime (`describe_entities` es catálogo INCOMPLETO). Detectó 17 entidades no usables en ICF (CXP, CtaDinero, Dinero, DimTiempoSemana, UtLogEjcProMrp, ArtPrototipo*, ProgramaTraspaso, TraspasoSemanal, MRPAlmArribos, ArtAlm, EmpresaCfg2, PlanArtOP, TipoImpuesto1, UtMrpPrevioMateriaPrima).
- **Clasificación por familia del sistema Forecast CF (2026-08-05, validado)**: para "qué variedades de <producto> tenemos" usar `ArtFamFC.Familia` (familias FC finas: "Frijol Negro", "Frijol negro americano"...) + `ResumenPlaneacionCF.FamiliaCF/VariedadCF` (mapeo articulo→familia FC, 1 fila por artículo, S1..S54/P1..P54) — NO `Art.Familia` (genérica). `FamArtCF` NO existe. Patrón en `agent/skill-library/icf/SKILL.md` Patrón 0.2. `primero` de `buscar_registro` SIEMPRE NÚMERO (string no limita → cientos de filas, ~524k chars). `ArtMaterial` (BOM) = `result.value[]`, 0 filas = sin BOM.
- **Gotcha de validación**: cada sesión Eve toma un SNAPSHOT del source en `session.started` — editar skills/kernel no se refleja en la sesión activa. Para validar cambios: terminar el turno → "Reiniciar conversación" (nueva sesión). El inspector de `/chat` tiene ventana deslizante (últimos 300 eventos, outputs truncados a 2k) para no bloquear el hilo con turnos largos.

---

## Operación y mantenimiento — GOTCHAS críticos (2026-08-04/05)

### ⚠️ NUNCA recargar la página durante un turno activo
Interrumpir un turno deja **sesiones huérfanas de Eve** (reintentan en bucle por su cola, saturando el server) y **contenedores Docker del sandbox** (uno "Up" escaneando `/sys` → la UI se congela). Si pasa:
```bash
lsof -tiTCP:5173,5174,5175 -sTCP:LISTEN | xargs -r kill -9
docker ps -aq --filter ancestor=ghcr.io/vercel/eve:latest | xargs -r docker rm -f
rm -rf .eve node_modules/.vite
npm run dev
```

### ⚠️ Proxy /eve 502 tras reiniciar
`.eve/sveltekit-dev-server.json` queda stale (puerto/PID muerto). El script `dev` del package.json ya hace `rm -f .eve/sveltekit-dev-server.json` antes de `vite dev`. Si el server no arranca con el fix, repetir el ciclo de limpieza de arriba.

### ⚠️ TODO código del self-improvement en el runtime debe ser a prueba de errores
Un `throw` en un hook / instruction dinámica / middleware (ej. `ReferenceError: truncateSchemaDescriptions`) **crashea el turno y puede recargar la página** ("refresh como HMR" tras un error de tool). Todo lo que corre en `action.result`, `step.started` o `transformParams` va envuelto en try/catch.

### Conocimiento del tenant ICF (verificado)
- El MCP ICF **NO publica** CXP/Tesorería/Cuentas bancarias: `CXP`, `CxpD`, `CxpConSaldo`, `CtaDinero`, `Dinero`, `DineroD` → `EntityNotFound`. Documentado en `companies/icf/modulos.md`. Ante preguntas de ese módulo en ICF → responder **"Dato no disponible"** sin probar variantes.
- Campos DAB en **UPPERCASE** (`SEMANA`, no `semana`).
- `describe_entities` es un catálogo incompleto (no lista `UV_QV_PPTOCOMPRA` que sí funciona); la disponibilidad real se valida con `read_records(entity, first:1)`.
