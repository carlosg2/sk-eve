---
description: >
  Use when the user asks about Cuentas por Pagar (CXP), facturas de proveedores,
  saldos pendientes, vencimientos, pagos, tesorería (Dinero), o cuentas bancarias
  (CtaDinero) del ERP Intelisis. Carga este skill antes de cualquier consulta
  al módulo CXP, DIN o tesorería.
---

# Skill: Módulo CXP / Tesorería — Intelisis DAB

## Conexión y tools disponibles

La conexión MCP se llama **`intelisis-dab`**.

### Tools exactos

| Tool | Para qué |
|---|---|
| `intelisis-dab__read_records` | Leer registros con filtro y paginación |
| `intelisis-dab__aggregate_records` | COUNT, SUM, AVG, MIN, MAX con agrupación |
| `intelisis-dab__create_record` | Crear registro |
| `intelisis-dab__update_record` | Actualizar registro |
| `intelisis-dab__delete_record` | Eliminar registro |
| `intelisis-dab__describe_entities` | Solo si necesitas campos no documentados aquí |

**Nota sobre discovery:** Si `connection_search` es el único tool disponible al inicio de sesión, llámalo **inmediatamente y en silencio** (sin texto al usuario), luego usa directamente los tools de arriba. NO narres el paso de discovery.

### Formato de fechas en filtros OData (DAB)
Usa ISO 8601 sin comillas: `Vencimiento le 2025-12-31`  
No uses: ~~`Vencimiento le '2025-12-31'`~~ (con comillas falla en DAB)  
Para rango: `Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01`

---

## Entidades disponibles

### CXP — Cuentas por Pagar (cabecera de movimiento)
Tabla: `dbo.CXP` | PK: `ID`

| Campo | Tipo | Descripción |
|---|---|---|
| `ID` | int PK | Identificador único del documento |
| `Mov` | string | Tipo de movimiento (ej. `FACTURA`, `NOTA`) |
| `MovID` | int | Folio/consecutivo del movimiento |
| `FechaEmision` | date | Fecha del documento |
| `Proveedor` | string | Clave del proveedor (FK → Prov.Proveedor) |
| `Estatus` | string | **`ABIERTO`** (pendiente), `CONCLUIDO`, `CANCELADO` |
| `Situacion` | string | Sub-estado dentro del Estatus |
| `Vencimiento` | date | Fecha de vencimiento/pago |
| `Importe` | decimal | Importe original del documento |
| `Saldo` | decimal | Saldo pendiente de pago |
| `Moneda` | string | `MXN`, `USD`, etc. |
| `TipoCambio` | decimal | Tipo de cambio al momento del documento |
| `Condicion` | string | Condición de pago |
| `Referencia` | string | Referencia del proveedor |
| `Concepto` | string | Descripción del movimiento |
| `CtaDinero` | string | Cuenta bancaria asignada para pago (FK → CtaDinero) |
| `FormaPago` | string | Forma de pago (03=transferencia, 01=efectivo…) |
| `FechaProgramada` | date | Fecha programada de pago |
| `FechaConclusion` | date | Fecha en que se concluyó/pagó |
| `Empresa` | string | Clave de empresa |

**Valores de `Estatus`:** `ABIERTO` · `CONCLUIDO` · `CANCELADO`  
**Filtros OData más usados:**
```
Estatus eq 'ABIERTO'
Vencimiento le '2025-12-31'
Proveedor eq 'PROV001'
Moneda eq 'MXN'
```

---

### CxpD — Cuentas por Pagar Detalle (líneas de aplicación)
Tabla: `dbo.CxpD` | PK: `ID + Renglon`

| Campo | Tipo | Descripción |
|---|---|---|
| `ID` | int | FK → CXP.ID |
| `Renglon` | int | Línea de detalle |
| `Importe` | decimal | Importe de la línea |
| `Aplica` | string | Tipo de documento que aplica |
| `AplicaID` | int | ID del documento que aplica |
| `Fecha` | date | Fecha de aplicación |
| `DescuentoRecargos` | decimal | Descuentos o recargos aplicados |

---

### Prov — Proveedores
Tabla: `dbo.Prov` | PK: `Proveedor`

| Campo | Descripción |
|---|---|
| `Proveedor` | Clave del proveedor (PK) |
| `Nombre` | Nombre o razón social |
| `RFC` | RFC del proveedor |
| `Condicion` | Condición de pago por defecto |
| `Estatus` | `ALTA` (activo), `BAJA` |
| `Moneda` | Moneda habitual |

---

### CtaDinero — Cuentas Bancarias
Tabla: `dbo.CtaDinero` | PK: `CtaDinero`

| Campo | Descripción |
|---|---|
| `CtaDinero` | Clave de la cuenta (PK) |
| `Descripcion` | Nombre/descripción de la cuenta |
| `NumeroCta` | Número de cuenta bancaria |
| `CLABE` | CLABE interbancaria |
| `Institucion` | Banco (Banorte, BBVA, etc.) |
| `Moneda` | `MXN`, `USD`, etc. |
| `Estatus` | `ALTA` (activa), `BAJA` |
| `Tipo` | Tipo de cuenta |
| `Saldo` | Saldo disponible (si aplica) |

---

### Dinero — Tesorería (movimientos bancarios)
Tabla: `dbo.Dinero` | PK: `ID`

| Campo | Descripción |
|---|---|
| `ID` | PK |
| `Mov` | Tipo de movimiento |
| `MovID` | Folio |
| `FechaEmision` | Fecha |
| `CtaDinero` | Cuenta bancaria origen (FK → CtaDinero) |
| `CtaDineroDestino` | Cuenta destino (en transferencias) |
| `Importe` | Monto del movimiento |
| `Estatus` | `ABIERTO`, `CONCLUIDO`, `CANCELADO` |
| `BeneficiarioNombre` | Nombre del beneficiario |
| `Referencia` | Referencia bancaria |
| `Concepto` | Descripción |

---

### DineroD — Tesorería Detalle
Tabla: `dbo.DineroD` | PK: `ID + Renglon`  
FK: `ID → Dinero.ID`. Relaciona movimientos de Dinero con documentos de CXP u otros módulos.

| Campo | Descripción |
|---|---|
| `ID` | FK → Dinero.ID |
| `Renglon` | Línea del detalle |
| `AplicaMod` | Módulo del documento aplicado (CXP, etc.) |
| `AplicaID` | ID del documento aplicado |
| `Importe` | Monto de la línea |
| `Concepto` | Descripción de la línea |

---

## Patrones de consulta recomendados

### Documentos abiertos (CXP pendiente)
```
entity: CXP
filter: Estatus eq 'ABIERTO'
fields: [ID, Proveedor, Vencimiento, Saldo, Moneda, FechaEmision]
```

### Total adeudado por proveedor
```
entity: CXP, function: sum, field: Saldo
filter: Estatus eq 'ABIERTO'
groupby: [Proveedor]
orderby: desc
```

### Conteo de documentos
```
entity: CXP, function: count, field: ID
filter: Estatus eq 'ABIERTO'
```

### Documentos que vencen en N días
```
filter: Estatus eq 'ABIERTO' and Vencimiento ge HOY and Vencimiento le HOY+N
```
> Sustituye HOY con la fecha ISO sin comillas. Ejemplo: `Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01`

### Top 3 proveedores con mayor deuda
1. Llama `aggregate_records(CXP, sum, Saldo, filter: "Estatus eq 'ABIERTO'", groupby: [Proveedor], orderby: desc, first: 3)`
2. Llama `read_records(Prov, filter: "Proveedor eq 'X' or Proveedor eq 'Y' or Proveedor eq 'Z'", fields: [Proveedor, Nombre])` para resolver nombres

### Cuentas bancarias activas
```
entity: CtaDinero
filter: Estatus eq 'ALTA'
fields: [CtaDinero, Descripcion, NumeroCta, CLABE, Institucion, Moneda]
```

---

## Patrones de consulta multi-entidad (joins manuales)

> DAB no tiene JOIN nativo. Encadena tool calls: primero obtén las claves FK, luego filtra la entidad dependiente.

### Buscar CXP por RFC de proveedor → detalle CxpD
```
PASO 1 (paralelo si tienes múltiples RFC):
  read_records(Prov, filter: "RFC eq 'XAXX010101000'", fields: [Proveedor])
  → obtienes clave Proveedor ej. "PROV001"

PASO 2:
  read_records(CXP, filter: "Proveedor eq 'PROV001'", fields: [ID, Mov, MovID, Importe, Saldo, Estatus, FechaEmision])
  → obtienes IDs de CXP ej. [100, 101, 102]

PASO 3:
  read_records(CxpD, filter: "ID eq 100 or ID eq 101 or ID eq 102")
  → detalle de líneas
```

### Movimientos de Dinero por cuenta bancaria → DineroD
```
PASO 1:
  read_records(CtaDinero, filter: "Estatus eq 'ALTA' and Moneda eq 'USD'", fields: [CtaDinero])
  → obtienes claves ej. ["20713", "32883", "53431", ...]

PASO 2 (paraleliza por cuenta):
  read_records(Dinero, filter: "CtaDinero eq '20713'", orderby: FechaEmision desc, first: 3, fields: [ID, FechaEmision, Importe, Mov, BeneficiarioNombre])
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

### Filtrar por umbral después de aggregate (simulación de HAVING)
> DAB no soporta HAVING. Obtén todos los grupos y filtra en la respuesta final:
```
aggregate_records(CXP, sum, Saldo, filter: "Estatus eq 'ABIERTO'", groupby: [Proveedor])
→ filtra client-side: solo grupos con Saldo > 50000
```

---

## ⚠️ Estatus válidos por entidad

| Entidad | Estatus válidos | **NO existe** |
|---|---|---|
| CXP | `ABIERTO` · `CONCLUIDO` · `CANCELADO` | — |
| Dinero | `ABIERTO` · `CONCLUIDO` · `CANCELADO` | ~~AFECTADO~~ |
| CtaDinero | `ALTA` · `BAJA` | — |
| Prov | `ALTA` · `BAJA` | — |

**`AFECTADO` no es un estatus en ninguna entidad.** Es la acción del stored proc `Afectar`. Si el usuario pide "movimientos en estatus AFECTADO", corrige: en Dinero usa `Estatus eq 'CONCLUIDO'` (los movimientos concluidos son los que pasaron por el proceso de afectación).

---

1. **`connection_search` es automático en la primera petición de sesión** — si aparece como único tool disponible, llámalo en silencio sin narrar al usuario. En peticiones subsiguientes los tools ya están directamente disponibles.
2. **Nunca llames `describe_entities`** — el schema está en este skill.
3. **Usa `aggregate_records` para métricas** — no leas todos los registros y calcules en memoria.
4. **Paraleliza** — lanza varias llamadas simultáneas cuando los datos sean independientes.
5. **Limita campos con `fields`** — solo pide los campos necesarios.
6. **Usa `first`** para limitar resultados en listas (default: `first: 20`).
7. **Fechas sin comillas** en filtros OData: `Vencimiento ge 2026-06-24` (NO `'2026-06-24'`).
8. **Si Estatus eq 'ABIERTO' devuelve 0**, verifica con `read_records(CXP, first: 3)` sin filtro para ver los valores reales de Estatus en la BD.
9. **Para multi-aggregate** (avg+max+min), lanza 3 llamadas en paralelo — una función por llamada.
10. **Para joins**, encadena: obtén FK en paso 1, filtra entidad dependiente en paso 2 con `field eq 'val1' or field eq 'val2'`.
11. **`AFECTADO` no es un Estatus válido de Dinero.** Si el usuario lo pide, usa `CONCLUIDO` y explica el ajuste.

---

## Resumen ejecutivo CXP — plan óptimo (4 llamadas en paralelo)

Para "dame resumen ejecutivo de CXP", ejecuta **simultáneamente**:
1. `intelisis-dab__aggregate_records(entity: CXP, function: count, field: ID, filter: "Estatus eq 'ABIERTO'")` → total documentos
2. `intelisis-dab__aggregate_records(entity: CXP, function: sum, field: Saldo, filter: "Estatus eq 'ABIERTO'")` → monto total
3. `intelisis-dab__aggregate_records(entity: CXP, function: count, field: ID, filter: "Estatus eq 'ABIERTO' and Vencimiento ge 2026-06-24 and Vencimiento le 2026-07-01")` → vencen en 7 días (ajusta fechas al día actual)
4. `intelisis-dab__aggregate_records(entity: CXP, function: sum, field: Saldo, filter: "Estatus eq 'ABIERTO'", groupby: [Proveedor], orderby: desc, first: 3)` → top 3 proveedores

Luego: `intelisis-dab__read_records(entity: Prov, filter: "Proveedor eq 'A' or Proveedor eq 'B' or Proveedor eq 'C'", fields: [Proveedor, Nombre])` para nombres.

**Si count devuelve 0**, haz primero `intelisis-dab__read_records(entity: CXP, first: 3, fields: [ID, Estatus])` para verificar los valores reales de Estatus y ajustar el filtro.