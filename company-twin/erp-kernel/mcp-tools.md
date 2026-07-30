---
type: MCP Tool Contract
title: Contrato de MCP tools (DAB custom)
description: Parámetros y formas de respuesta reales de los 7 DML tools + tools custom que expone nuestro DAB fork.
resource: http://localhost:5050/mcp
layer: erp-kernel
tenant: null
tags: [mcp, dab, tools, contrato, ejecucion]
timestamp: 2026-07-01T00:00:00Z
mcp_tools: [describe_entities, read_records, aggregate_records, create_record, update_record, delete_record, execute_entity]
---

# Resumen

Contrato **verificado empíricamente** (2026-07-01) contra nuestro DAB fork vía `tools/list`
y llamadas read-only. Es la capa de **capacidad de ejecución**: qué parámetros acepta cada
tool y qué forma tiene la respuesta. Las capacidades del filtro OData viven en
[Capacidades OData](/erp-kernel/index.md#capacidades-odata-dab). No dupliques schema de
entidades aquí (eso vive en el concepto de cada entidad).

> Los tools se invocan desde Eve con prefijo de conexión: `intelisis-dab__<tool>`.

# Schema (parámetros por tool)

| Tool | Parámetros | Notas |
|---|---|---|
| `describe_entities` | `nameOnly?` (bool), `entities?` (array) | Evitar: el schema está en el Twin. No devuelve tipos ni PK. |
| `read_records` | `entity` (req), `select?` (**string** coma-sep), `filter?` (OData), `orderby?` (**array**), `first?` (int), `after?` (cursor) | Ver reglas abajo. |
| `aggregate_records` | `entity` (req), `function` (req), `field` (req), `distinct?` (bool), `filter?`, `groupby?` (array), `having?` (**object**), `orderby?` (**string**), `first?` (int), `after?` (cursor) | `having` y cursor requieren `groupby`. |
| `create_record` | `entity` (req), `data` (**object**, req) | `data` = pares campo/valor. |
| `update_record` | `entity` (req), `keys` (object, req), `fields` (object, req) | |
| `delete_record` | `entity` (req), `keys` (object, req) | |
| `execute_entity` | `entity` (req), `parameters?` (object) | Para stored procs genéricos. |

# Reglas críticas de parámetros (verificadas)

- **`read_records.select` es un STRING** coma-separado: `"ID,Estatus,Saldo"`. **No** es un
  array `fields`.
- **`read_records.orderby` es un ARRAY de strings**: `["ID desc", "Saldo asc"]`. Pasar un
  string (`"ID desc"`) devuelve `UnexpectedError`.
- **`aggregate_records.orderby` es un STRING** estrictamente `"asc"` o `"desc"` — no acepta
  expresiones (`"count desc"` → error) ni arrays. ⚠️ Los docs oficiales dicen array, pero este
  binario solo acepta la dirección simple. Distinto de `read_records` (que sí es array).
- **`aggregate_records.having` (object) SÍ existe** (HAVING nativo). Operadores:
  `eq, neq, gt, gte, lt, lte, in`. Ej.: `having: { gt: 40 }`. **No** simules HAVING en cliente.
- **`create_record` usa `data` (object)**, no campos planos. `update`/`delete` usan `keys`.

# Formas de respuesta (verificadas)

- `read_records` → `{ "value": [ ... ], "after": "<cursor>" }`. La presencia de `after`
  indica que hay más páginas; pásalo como `after` para la siguiente.
- `aggregate_records` **sin** `first` → `{ "result": [ { <groupby>, "<fn>_<field>": n } ] }`.
- `aggregate_records` **con** `first` → `{ "items": [ ... ], "endCursor": "...", "hasNextPage": bool }`.
- Nombres de campo agregado: `count` para count(*); `sum_Saldo`, `avg_Saldo`, etc. para el resto.
- Errores → `{ "status": "error", "error": { "type": "...", "message": "..." } }`.

# Tools custom (stored procs registrados)

El DAB también expone `afectar` y `cambiar_situacion` como **tools MCP dedicados** (no vía
`execute_entity`), con parámetros tipados:

- `afectar`: `Modulo, ID, Accion` (AFECTAR/GENERAR/CANCELAR/AUTORIZAR/DESAFECTAR…), `Base`,
  `GenerarMov`, `Usuario`, `Estacion`, `FechaRegistro`.
- `cambiar_situacion`: `Modulo, ID, Situacion, SituacionFecha, Usuario`, …

> ⚠️ **Configuración de arranque:** el DAB fork carga siempre desde su CWD
> (`dab-custom/dab-config.json`). El flag `--config` con path absoluto es ignorado.
> **Solución aplicada:** `dab-custom/dab-config.json` es un **symlink** a
> `sk-eve/dab/dab-config.json`. Todo cambio en el proyecto aplica automáticamente
> al reiniciar. Arranque: `cd dab-custom && dotnet Azure.DataApiBuilder.Service.dll --urls "http://localhost:5050"`.
>
> ⚠️ **Tools dedicados `afectar`/`cambiar_situacion`:** expuestos en el MCP (herramientas
> tipadas). Ya están en el allow-list de `agent/connections/intelisis-dab.ts` y gateados
> por HITL (`WRITE_TOOL_RE`). Usar directamente en vez de `execute_entity`.

# Custom Tools (TVFs / SPs — sigma-dab .NET 10)

El fork sigma-dab expone stored procedures y table-valued functions de Intelisis como
**tools MCP dedicados** (además de los 7 DML estándar). Verificados contra JoyaRock
(2026-07-01).

## Tools de consulta (solo lectura)

| Tool | Función | Params clave | Retorna |
|---|---|---|---|
| `mov_situacion_tipo_flujo` | Situaciones válidas para un movimiento en un estatus | `Empresa, Modulo, Mov, Estatus` | `{Result: "Normal"\|"Autorizado"\|…}` |
| `rep_mov_pendientes_surtido_existe` | ¿Existen pendientes de surtido? | `Modulo, Mov` | `{Result: 0\|1}` |
| `desplegar_asociar_comp_otros` | ¿Permite asociar complementos de otros módulos? | `Indicador("1"), Modulo, Mov` | `{Result: bool}` |
| `forma_pago_ayuda_captura` | Formas de pago disponibles para captura | `Empresa, Modulo, Mov, Usuario, Campo, CobroIntegrado**(bool)**, Tipo` | array de formas |
| `tipo_impuesto_tasa` | Tasa de un tipo de impuesto | `TipoImpuesto` (clave del catálogo) | `{Result: decimal\|null}` |
| `mov_opcion_encabezado` | Opción de encabezado de un movimiento | `Opcion` (string) | `{Result: string}` |
| `art_unidad_factor` | Factor de conversión entre unidades de un artículo | `Empresa, Articulo, Unidad` | `{Result: decimal}` |

## Tools de escritura (HITL-gateados)

| Tool | Función | Params clave |
|---|---|---|
| `afectar` | Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR) | `Modulo, ID, Accion, Base, Usuario` |
| `cambiar_situacion` | Cambiar sub-estado dentro de un estatus | `Modulo, ID, Situacion, SituacionFecha, Usuario` |

## Gotchas verificados

- **`forma_pago_ayuda_captura.CobroIntegrado`**: debe ser **Boolean** (`true`/`false`), NO string `"0"`. Error: `"Parameter cannot be resolved as type Boolean"`.
- **`mov_situacion_tipo_flujo`**: llamar ANTES de `cambiar_situacion` para conocer los valores permitidos. JoyaRock/CXP/PENDIENTE → solo `"Normal"`.
- **`tipo_impuesto_tasa`**: requiere la clave exacta del catálogo `TipoImpuesto1`. `"IVA"` devuelve `null`; usar la clave real de la empresa (ej. `"IVA16"` o consultar `read_records(TipoImpuesto1)`).
- **`gasto_concepto_prov`**: el schema del DAB dice sin params pero el SP requiere `@Acreedor`. Usar `execute_entity(GastoConceptoProv, parameters:{Acreedor:'...'})` como workaround hasta que el config se corrija.
- **`borrar_ver_cfdi`, `busca_rfcdocumentos_gasto`, `ver_prov_cfdi`, `ver_prov_cfdejecutar`**: misma situación — params no declarados en config. Usar con `execute_entity`.

# Citations

[1] Verificación local vía `tools/list` + llamadas read-only al sigma-dab .NET 10 (2026-07-01).
[2] [DAB DML tools (referencia oficial)](https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/data-manipulation-language-tools)
