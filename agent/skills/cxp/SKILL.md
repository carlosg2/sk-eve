---
description: >
  Use when the user asks explicitly about Cuentas por Pagar (CXP), tesorería
  (Dinero), o cuentas bancarias (CtaDinero) en un tenant con esos módulos.
---
# Skill: Módulo CXP / Tesorería — patrones de ejecución

> **Este skill es SOLO procedural** (cómo ejecutar secuencias). El **schema** de las
> entidades (campos, tipos, estatus, relaciones) vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })` → `{ concept: "erp-kernel/<entidad>" }`.
> No dupliques schema aquí; consúltalo cuando lo necesites.

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`,
`create_record`, `update_record`, `delete_record`, `execute_entity`.

## Recordatorios rápidos

- **Contrato de tools** (verificado): `read_records` usa `select` (**string** coma-sep, ej. `"ID,Saldo"`) y `orderby` **array** (`["Saldo desc"]`); `aggregate_records` usa `orderby` **string** (`"desc"`) y soporta `having` nativo. Detalle: [Contrato de MCP tools](../../../company-twin/erp-kernel/mcp-tools.md).
- **Fechas OData sin comillas**: `Vencimiento le 2026-12-31` (NO `'2026-12-31'`). Rango: `Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01`.
- **Estatus pendiente de pago = `PENDIENTE`** (ciclo `SINAFECTAR → PENDIENTE → CONCLUIDO`/`CANCELADO`). Detalle en el Twin (`erp-kernel/cxp`, `erp-kernel/afectar`).
- **Antes de create/update**: consulta el schema en el Twin, valida límites varchar e incluye campos requeridos. `create_record` usa `data` (object); `update`/`delete` usan `keys`.
- **Transiciones de estatus**: SP `Afectar` vía `execute_entity`, no `update_record`.

---

## Patrones de consulta recomendados

### Documentos abiertos (CXP pendiente)
```
entity: CXP
filter: Estatus eq 'PENDIENTE'
select: "ID,Proveedor,Vencimiento,Saldo,Moneda,FechaEmision"
```

### Total adeudado por proveedor
```
# Opción A (más eficiente) — usar la vista CxpConSaldo:
read_records(entity=CxpConSaldo, orderby=["Saldo desc"], first=10)
→ devuelve Proveedor+Nombre+Saldo en UNA llamada. No necesita aggregate ni lookup de Prov.

# Opción B — si necesitas filtrar por empresa/moneda:
read_records(entity=CxpConSaldo, filter="Moneda eq 'Pesos'", orderby=["Saldo desc"], first=5)
```

### Conteo de documentos
```
entity: CXP, function: count, field: ID
filter: Estatus eq 'PENDIENTE'
```

### Documentos que vencen en N días
```
filter: Estatus eq 'PENDIENTE' and Vencimiento ge HOY and Vencimiento le HOY+N
```
> Sustituye HOY con la fecha ISO sin comillas. Ejemplo: `Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01`

### Transiciones de estatus (afectar / cambiar situación)
```
# USAR el tool dedicado 'afectar' (está en el allow-list). NO usar execute_entity.
afectar(Modulo="DIN", ID=2660, Accion="AFECTAR", Base="Todo", Usuario="ADMIN", Estacion=1)
# Estacion es Int32 obligatorio. Usar 1 si no hay estación real. NUNCA pasar como string.

# Cambiar sub-estado dentro de PENDIENTE (Normal → Autorizado):
cambiar_situacion(Modulo="CXP", ID=3639, Situacion="Autorizado", SituacionFecha="2026-07-01", Usuario="ADMIN")
```

### Retorno de afectar
- `Ok = null` = éxito. `Ok = <código>` = error de negocio Intelisis.
- **60040** = error de validación del SP (movimiento no existe, ya cancelado/concluido, o faltan partidas). Verificar estatus real con `read_records(Dinero|CXP, filter: "ID eq <n>", select: "ID,Estatus")`.

### Cuentas bancarias activas con saldo
```
# Usar CtaDineroConSaldo (incluye Saldo pre-calculado):
read_records(entity=CtaDineroConSaldo, filter="Estatus eq 'ALTA'", select="CtaDinero,Descripcion,Saldo,Moneda,Empresa")

# vs. CtaDinero (sin saldo):
read_records(entity=CtaDinero, filter="Estatus eq 'ALTA'", select="CtaDinero,Descripcion,NumeroCta,CLABE,Institucion,Moneda")
```

---

## Patrones de consulta multi-entidad (joins)

> DAB no tiene JOIN nativo. Lo **recomendado** para un join recurrente es una **view** o un
> **stored proc** (`execute_entity`) que lo encapsule. Como alternativa ad-hoc, encadena tool
> calls: primero obtén las claves FK, luego filtra la entidad dependiente.

### Buscar CXP por RFC de proveedor → detalle CxpD
```
PASO 1 (paralelo si tienes múltiples RFC):
  read_records(Prov, filter: "RFC eq 'XAXX010101000'", select: "Proveedor")
  → obtienes clave Proveedor ej. "PROV001"

PASO 2:
  read_records(CXP, filter: "Proveedor eq 'PROV001'", select: "ID,Mov,MovID,Importe,Saldo,Estatus,FechaEmision")
  → obtienes IDs de CXP ej. [100, 101, 102]

PASO 3:
  read_records(CxpD, filter: "ID eq 100 or ID eq 101 or ID eq 102")
  → detalle de líneas
```

### Movimientos de Dinero por cuenta bancaria → DineroD
```
PASO 1:
  read_records(CtaDinero, filter: "Estatus eq 'ALTA' and Moneda eq 'USD'", select: "CtaDinero")
  → obtienes claves ej. ["20713", "32883", "53431", ...]

PASO 2 (paraleliza por cuenta):
  read_records(Dinero, filter: "CtaDinero eq '20713'", orderby: ["FechaEmision desc"], first: 3, select: "ID,FechaEmision,Importe,Mov,BeneficiarioNombre")
  → obtienes IDs de Dinero

PASO 3:
  read_records(DineroD, filter: "ID eq X or ID eq Y or ID eq Z")
  → detalle de cada movimiento
```

### Multi-aggregate (avg + max + min por grupo)
> `aggregate_records` soporta una función por llamada. Para avg+max+min, lanza 3 llamadas en **paralelo**:
```
PARALELO:
  aggregate_records(CtaDinero, avg, Saldo, filter: "Estatus eq 'ALTA'", groupby: [Institucion])
  aggregate_records(CtaDinero, max, Saldo, filter: "Estatus eq 'ALTA'", groupby: [Institucion])
  aggregate_records(CtaDinero, min, Saldo, filter: "Estatus eq 'ALTA'", groupby: [Institucion])
```
Luego combina los tres resultados por `Institucion`.

### Filtrar por umbral después de aggregate (HAVING nativo)
> `aggregate_records` soporta `having` nativo (verificado). Filtra grupos por el valor agregado sin traerlos todos:
```
aggregate_records(CXP, sum, Saldo, filter: "Estatus eq 'PENDIENTE'", groupby: [Proveedor], having: { gt: 50000 })
→ solo grupos con sum(Saldo) > 50000, calculado en el motor
```

---

## Reglas de eficiencia

1. **Nunca llames `describe_entities`** — el schema está en el Company Twin (`layer: erp-kernel`). Consúltalo con `query_company_twin` si dudas de un campo.
2. **`connection_search`**: si es el único tool disponible al inicio de sesión, llámalo en silencio (sin narrar) y luego usa los tools directamente.
3. **Usa `aggregate_records` para métricas** — no leas todos los registros y calcules en memoria. Para contar, usa `function: count, field: "*"`.
4. **Paraleliza** llamadas independientes.
5. **Limita campos con `select`** (string coma-sep) y resultados con `first` (default `first: 20`).
6. **Fechas sin comillas** en OData: `Vencimiento ge 2026-06-24`.
7. **Si un filtro por Estatus devuelve 0**, haz `read_records(CXP, first: 3, select: "ID,Estatus")` para ver los valores reales y ajustar (o consulta `erp-kernel/cxp` en el Twin).
8. **Para joins**, encadena: FK en paso 1, entidad dependiente en paso 2 con `field eq 'v1' or field eq 'v2'`.
9. **`AFECTADO` no es un Estatus** — es la acción del SP `Afectar`. Si el usuario lo pide, usa `Estatus eq 'CONCLUIDO'` y explica el ajuste.

---

## Resumen ejecutivo CXP — plan óptimo (4 llamadas en paralelo)

Para "dame resumen ejecutivo de CXP", ejecuta **simultáneamente**:
1. `intelisis-dab__aggregate_records(entity: CXP, function: count, field: "*", filter: "Estatus eq 'PENDIENTE'")` → total documentos
2. `intelisis-dab__aggregate_records(entity: CXP, function: sum, field: Saldo, filter: "Estatus eq 'PENDIENTE'")` → monto total
3. `intelisis-dab__aggregate_records(entity: CXP, function: count, field: "*", filter: "Estatus eq 'PENDIENTE' and Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01")` → vencen en 7 días (ajusta fechas al día actual)
4. `intelisis-dab__aggregate_records(entity: CXP, function: sum, field: Saldo, filter: "Estatus eq 'PENDIENTE'", groupby: [Proveedor], orderby: "desc", first: 3)` → top 3 proveedores

Luego: `intelisis-dab__read_records(entity: Prov, filter: "Proveedor eq 'A' or Proveedor eq 'B' or Proveedor eq 'C'", select: "Proveedor,Nombre")` para nombres.

**Si count devuelve 0**, haz primero `intelisis-dab__read_records(entity: CXP, first: 3, select: "ID,Estatus")` para verificar los valores reales de Estatus y ajustar el filtro.