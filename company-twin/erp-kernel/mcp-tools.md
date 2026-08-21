---
type: MCP Tool Contract
title: Contrato de MCP tools
description: Parámetros y formas de respuesta reales de los 7 DML tools + tools custom del MCP.
resource: http://localhost:5050/mcp
layer: erp-kernel
tenant: null
tags: [mcp, dab, tools, contrato, ejecucion]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [describe_entities, read_records, aggregate_records, create_record, update_record, delete_record, execute_entity]
sources:
  - id: verificacion-dab
    resource: http://localhost:5050/mcp
    title: Verificación local vía tools/list + llamadas read-only al sigma-dab .NET 10
    last_modified: 2026-07-01
  - id: dab-dml-docs
    resource: https://learn.microsoft.com/en-us/azure/data-api-builder/mcp/data-manipulation-language-tools
    title: DAB DML tools (referencia oficial)
---

# Resumen

Contrato **verificado empíricamente**  contra el MCP vía `tools/list`
y llamadas read-only. Documenta qué parámetros acepta cada tool y qué forma tiene la
respuesta. Las capacidades del filtro OData viven en
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

> ⚠️ **Tools dedicados `afectar`/`cambiar_situacion`:** expuestos en el MCP (herramientas
> tipadas) y gateados por HITL. Usar directamente en vez de `execute_entity`.

# Custom Tools (TVFs / SPs)

El MCP expone stored procedures y table-valued functions de Intelisis como
**tools MCP dedicados** (además de los 7 DML estándar).

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
| `buscar_registro` | Búsqueda por término en una entidad | `entidad, campo` (**REQUERIDO**), `termino, primero` | array de registros que coinciden |

## Tools de escritura (HITL-gateados)

| Tool | Función | Params clave |
|---|---|---|
| `afectar` | Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR) | `Modulo, ID, Accion, Base, Usuario` |
| `cambiar_situacion` | Cambiar sub-estado dentro de un estatus | `Modulo, ID, Situacion, SituacionFecha, Usuario` |

## Gotchas verificados

- **`forma_pago_ayuda_captura.CobroIntegrado`**: debe ser **Boolean** (`true`/`false`), NO string `"0"`. Error: `"Parameter cannot be resolved as type Boolean"`.
- **`mov_situacion_tipo_flujo`**: llamar ANTES de `cambiar_situacion` para conocer los valores permitidos. JoyaRock/CXP/PENDIENTE → solo `"Normal"`.
- **`tipo_impuesto_tasa`**: requiere la clave exacta del catálogo `TipoImpuesto1`. `"IVA"` devuelve `null`; usar la clave real de la empresa (ej. `"IVA16"` o consultar `read_records(TipoImpuesto1)`).
- **`buscar_registro`**: `campo` es obligatorio (el campo sobre el que se busca); sin él falla `spbuscar_registro expects parameter '@campo'`. `primero` siempre numérico.
- **`gasto_concepto_prov`**: el schema del DAB dice sin params pero el SP requiere `@Acreedor`. Usar `execute_entity(GastoConceptoProv, parameters:{Acreedor:'...'})` como workaround hasta que el config se corrija.
- **`borrar_ver_cfdi`, `busca_rfcdocumentos_gasto`, `ver_prov_cfdi`, `ver_prov_cfdejecutar`**: misma situación — params no declarados en config. Usar con `execute_entity`.
