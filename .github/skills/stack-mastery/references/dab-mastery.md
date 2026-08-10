# Manual de dominio: DAB (Azure Data API Builder) — original + fork sigma-dab

> Referencia de dominio para el MCP server que expone el ERP Intelisis (SQL
> Server) como API. Fuente primaria: `dab/dab-config.json` del proyecto,
> `company-twin/erp-kernel/mcp-tools.md` (contrato verificado empíricamente
> 2026-07-01), `.github/copilot-instructions.md` y la documentación oficial de
> Microsoft (Data API builder). Verificado contra el uso real en `agent/`.

---

## 1. Qué es el DAB original (Microsoft)

**Azure Data API Builder (DAB)** es un servicio open-source de Microsoft (.NET)
que convierte una base de datos (SQL Server, PostgreSQL, MySQL, Cosmos DB) en una
API REST, GraphQL **y MCP** sin escribir backend. Un `dab-config.json` declara
`data-source` + `entities`; el servicio genera los endpoints.

**Hitos relevantes (verificado en web, ago 2026):**

- **SQL MCP Server llegó en DAB v1.7** (marzo 2026): soporte MCP sobre SQL con
  las herramientas DML ([What's new v1.7](https://learn.microsoft.com/en-us/azure/data-api-builder/whats-new/version-1-7)).
- **Los 7 DML tools están disponibles en v2.0+** (maduros):
  `describe_entities`, `create_record`, `read_records`, `update_record`,
  `delete_record`, `execute_entity`, `aggregate_records` — exactamente los que
  usa sk-eve ([DML tools doc](https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/data-manipulation-language-tools)).
- **DAB 2.0** es la versión "production-ready" para REST+GraphQL+MCP: query
  builder, integración con Microsoft Foundry, extensiones VS Code, CLI
  cross-platform ([Azure SQL Dev Blog](https://devblogs.microsoft.com/azure-sql/introducing-sql-mcp-server/)).
- Nuget local: `~/.nuget/packages/microsoft.dataapibuilder/` tiene **1.7.90** y
  **2.0.0-rc** — el proyecto podría actualizar el binario si hiciera falta.
- La integración RBAC nativa: roles por entidad en `dab-config.json`
  (permisos por rol sobre cada entity action) — **oportunidad sin explotar** en
  sigma-dab (ver §6).

## 2. Qué es sigma-dab (el fork custom)

El proyecto NO usa el DAB de Microsoft directo: usa un **fork compilado**
(`sigma-dab`, .NET 10 ARM64) que vive en
`/Users/carlosgarzagarza/Documents/MASERP/Sigma Intelisis/shared/dab-engine/dab-custom/`
(con repo git propio en `~/Documents/MASERP/Sigma Intelisis/.git`). El fork:

- **Habilita el MCP** en el runtime (`runtime.mcp.enabled: true`, path `/mcp`).
- **Exponer tools custom** además de los 7 DML estándar:
  - **SPs de estatus**: `afectar` (AFECTAR/GENERAR/CANCELAR/AUTORIZAR/
    DESAFECTAR con `Modulo, ID, Accion, Base, GenerarMov, Usuario, Estacion,
    FechaRegistro`) y `cambiar_situacion` — tools MCP **dedicados y tipados**,
    no vía `execute_entity`.
  - **TVFs/SPs de consulta** (verificados contra JoyaRock 2026-07-01):
    `mov_situacion_tipo_flujo`, `rep_mov_pendientes_surtido_existe`,
    `desplegar_asociar_comp_otros`, `forma_pago_ayuda_captura`,
    `tipo_impuesto_tasa`, `mov_opcion_encabezado`, `art_unidad_factor`
    (y en ICF: `buscar_registro` — LIKE en servidor, y `planeacion_mrp`/SPs MRP).
- **Arranque**: binario DLL con `~/.dotnet/dotnet Azure.DataApiBuilder.Service.dll
  --urls "http://localhost:5050"`. El binario self-contained bloqueado por
  Gatekeeper en macOS 26 → usar modo DLL.
- **Config por symlink**: el fork carga `dab-config.json` desde su CWD
  (ignora `--config` con path absoluto); `dab-custom/dab-config.json` es un
  **symlink** a `sk-eve/dab/dab-config.json` — cambios en el repo aplican al
  reiniciar el DAB.

## 3. Arquitectura del config (`dab/dab-config.json`, 34KB, ~187 entidades)

```jsonc
{
  "$schema": "https://github.com/Azure/data-api-builder/releases/latest/download/dab.draft.schema.json",
  "data-source": {
    "database-type": "mssql",
    "connection-string": "@env('CONNECTION_STRING')"   // Server=localhost,1433;Database=JoyaRock_300326;...
  },
  "runtime": {
    "rest":   { "enabled": true,  "path": "/api" },
    "graphql":{ "enabled": true,  "path": "/graphql", "allow-introspection": true },
    "mcp": {
      "enabled": true, "path": "/mcp",
      "description": "API universal del ERP Intelisis - Proyecto joya (ART, COMS, CXP, DIN, GAS, GAS-OPS, VTAS-REP)",
      "dml-tools": {
        "describe-entities": true, "create-record": true, "read-records": true,
        "update-record": true, "delete-record": true, "execute-entity": true,
        "aggregate-records": true
      }
    },
    "host": { "cors": { "origins": ["http://localhost:3000", "http://localhost:5173"] },
              "authentication": { "provider": "Unauthenticated" }, "mode": "development" }
  },
  "entities": {
    "CtaSituacion": {
      "source": { "object": "dbo.CtaSituacion", "type": "table",
                  "object-description": "Situaciones. Tipo: Maestros. Módulos: (Todos)" },
      "mcp": { "dml-tools": true },
      "graphql": { "enabled": true }
    }
    // ... ~187 entidades: tablas + vistas + SPs
  }
}
```

**Puntos clave:**
- El **`object-description`** es el texto que el modelo lee para entender la
  entidad sin `describe_entities` — es la palanca de eficiencia más importante
  del config (evita el round-trip de discovery).
- Cada entidad declara `type: table | view | stored-procedure`.
- `runtime.host.authentication: Unauthenticated` en dev — **en producción esto
  es un riesgo** (ver §6.5).

## 4. Cómo fluye la llamada agente → MCP → DAB → SQL

```
Eve (agent/agent.ts)
  → defineDynamic "session.started" (agent/tools/erp.ts)
      → mcpListTools(tenant.mcpUrl)        // handshake JSON-RPC, cache TTL 5 min
      → expone tools como intelisis-dab__<tool> (allow-list por agente desde agent.md)
      → escrituras (create/update/delete/execute_entity/afectar/cambiar_situacion)
        con approval: always()  → HITL
  → mcpCallTool(url, name, input)          // agent/lib/mcp-client.ts (cliente JSON-RPC propio)
      → DAB /mcp (sigma-dab .NET 10)
          → SQL Server 2022 (Docker sv5-sqlserver, BD por tenant)
```

- El MCP URL es **dinámico por tenant** (`https://api2.maserp.mx/<tenant>/mcp`
  remoto o DAB local en 5050) — por eso `erp.ts` usa `defineDynamic` en vez de
  una conexión estática `defineMcpClientConnection` (cuyo `url` era fijo y
  obligaba a reiniciar al cambiar de tenant).
- El cliente MCP propio (`mcp-client.ts`) maneja: handshake con `mcp-session-id`,
  cache TTL 5 min, y **hardening de `first/primero` a número** (un string
  "primero" = bug de 524k chars).
- Los tools se advierten al modelo con prefijo `intelisis-dab__` para preservar
  referencias en skills/instructions/hook de memoria.

## 5. Contrato verificado de las tools (NO inventar parámetros)

Extraído de `company-twin/erp-kernel/mcp-tools.md` (verificado empíricamente
2026-07-01 contra el binario):

| Tool | Parámetros | Notas críticas |
|---|---|---|
| `describe_entities` | `nameOnly?`, `entities?` | Evitar: el schema está en el Twin. No devuelve tipos ni PK. |
| `read_records` | `entity` (req), `select?` (**string** coma-sep), `filter?` (OData), `orderby?` (**array**), `first?`, `after?` | `select` es STRING, `orderby` es ARRAY. Pasar al revés → `UnexpectedError`. |
| `aggregate_records` | `entity`, `function`, `field`, `distinct?`, `filter?`, `groupby?` (array), `having?` (**object**), `orderby?` (**string**), `first?`, `after?` | `having` existe (eq/neq/gt/gte/lt/lte/in) — no simular en cliente. `orderby` es STRING simple ("asc"/"desc"), NO array. |
| `create_record` | `entity`, `data` (**object**) | `data` = pares campo/valor. |
| `update_record` | `entity`, `keys` (object), `fields` (object) | |
| `delete_record` | `entity`, `keys` (object) | |
| `execute_entity` | `entity`, `parameters?` (object) | SPs genéricos; los SPs importantes tienen tool dedicado. |

**Formas de respuesta (verificadas):**
- `read_records` → `{ "value": [...], "after": "<cursor>" }` (presencia de
  `after` = hay más páginas).
- `aggregate_records` sin `first` → `{ "result": [ {<groupby>, "<fn>_<field>": n} ] }`;
  con `first` → `{ "items": [...], "endCursor", "hasNextPage" }`.
- Nombres de campo agregado: `count` para count(*); `sum_Saldo`, `avg_Saldo`…
- Errores → `{ "status": "error", "error": { "type": "...", "message": "..." } }`
  (el hook `memory.ts` normaliza estas shapes para aprender de los fallos).

**Capacidades OData del motor** (viven en `erp-kernel/index.md`, no duplicar):
parámetros sin `$`, **casing por vista** (ForecastPlanProduccion UPPERCASE,
CalendarioFC camelCase), fechas sin comillas, strings con comillas simples,
`in`/`contains` NO soportados (usar `or` chains / `buscar_registro`).

## 6. Oportunidades para sk-eve (mejoras de arquitectura vía DAB)

### 6.1 Vistas SQL para entidades complejas
El patrón ya probado: ICF usa vistas (`UV_QV_PPTOCOMPRA`, `ArtDisponibleDesc`,
`ResumenPlaneacionCF`…) para consultas que el modelo no puede armar con joins
(DAB no soporta joins entre entidades). **Oportunidad:** cada consulta que hoy
requiere 2-3 `read_records`/`aggregate_records` + joins manuales en skills es
candidata a una vista con `object-description` rica → 1 tool call.

### 6.2 `object-description` más ricas
La palanca de eficiencia #1: una descripción de entidad bien escrita hace que el
modelo elija `select` correcto y no llame `describe_entities`. **Auditoría
recomendada:** revisar las ~187 entidades y enriquecer las que el modelo usa
(métrica: turnos que aún llaman `describe_entities` en la radiografía).

### 6.3 Stored procedures como tools dedicados
El patrón `afectar`/`cambiar_situacion`/`buscar_registro`/`planeacion_mrp` ya
demuestra el valor: SP tipado > `execute_entity` genérico. **Oportunidad:**
identificar en la radiografía qué operaciones compuestas (3-way match,
validaciones de captura, proyecciones) se repiten → registrarlas como tools
dedicados en el fork sigma-dab.

### 6.4 Actualización del binario DAB
Nuget local tiene **2.0.0-rc** (DML tools maduros, query builder, mejoras MCP).
**Riesgo:** el fork sigma-dab está compilado contra una versión concreta;
actualizar requiere re-compilar el fork y re-validar el contrato (las reglas de
parámetros de §5 son del binario actual y podrían cambiar).

### 6.5 Seguridad (ADR-009)
- **`host.authentication: Unauthenticated`** es aceptable en dev, **no** en
  producción: el MCP expone CRUD sobre el ERP. Mitigaciones: auth por token en
  el DAB (bearer), network isolation (el MCP remoto ya vive en `api2.maserp.mx`),
  y **RBAC por entidad** (roles DAB) para que `delete_record` no esté disponible
  al agente aunque la tool exista.
- El vector #1 ERP (indirect prompt injection vía campos de datos) entra por el
  CONTENIDO devuelto, no por el DAB en sí — la sanitización va en el runtime de
  Eve (context-budget / instructions), no en el DAB.

### 6.6 Tools custom que faltan
`buscar_registro` (LIKE servidor) existe para ICF pero hay que verificar su
disponibilidad por tenant. `planeacion_mrp`/`spPlanArt` (cómputo sancionado OKF,
Attested Computation) — verificar que esté expuesto como tool dedicado.

## 7. Gotchas operativos (no romper el flujo que funciona)

- **Cambios a `dab/dab-config.json` NO aplican en caliente**: requieren restart
  del DAB (symlink hace que el config nuevo se cargue al reiniciar).
- **`--config` con path absoluto es ignorado** por el fork: siempre CWD.
- **Casing por vista**: UPPERCASE en `ForecastPlanProduccion` (`SEMANA`,
  `EJERCICIO`), camelCase en `CalendarioFC` (`Ano`/`Semana`). Usar el casing
  equivocado → `BadRequest: Invalid field`.
- **`first`/`primero` como string** = bug de 524k chars; el hardening de
  `mcp-client.ts` lo coacciona, pero un warning "Resultado grande" sigue siendo
  señal de que el modelo no siguió el patrón del skill.
- **OData `in`/`contains` NO soportados**; texto parcial → `buscar_registro`.
- **DAB local vs remoto**: local joyarock en 5050, remoto ICF en
  `https://api2.maserp.mx/icf/mcp`. El agente usa el del tenant ACTIVO
  (`runtime.json`).
- **No loguear `mcpUrl` al arrancar** (el proxy dev de Eve detecta el origin por
  la PRIMERA URL en stdout).
- **El hook `memory.ts` está blindado** (try/catch): un error del DAB nunca debe
  romper el turno; los errores accionables se aprenden al buffer.

---

*Fuentes: `dab/dab-config.json`, `company-twin/erp-kernel/mcp-tools.md`,
`.github/copilot-instructions.md`, `agent/tools/erp.ts`, `agent/lib/mcp-client.ts`,
docs oficiales Microsoft (DML tools, What's new 1.7/2.0). Generado 2026-08-10.*
