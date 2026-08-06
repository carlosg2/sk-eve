---
tenant: icf
description: >
  Use when the user asks about disponibilidad de artículos, inventario, stock,
  ventas (pedidos, facturas, clientes), compras (órdenes, entradas, proveedores),
  o cualquier consulta operativa del ERP Intelisis.
---

# Skill: Operaciones Intelisis — Ventas, Compras, Inventario

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })`.

Conexión MCP: **`intelisis-dab`**.
Tools: `read_records`, `aggregate_records`, `create_record`, `update_record`, `delete_record`, `execute_entity`, **`buscar_registro`** (búsqueda texto parcial).

## Recordatorios críticos

- **Empresa, almacenes y defaults** — obtenerlos de la política `company` del tenant activo; nunca asumir valores de otro cliente.
- **Parámetros sin `$`**: `filter`, `select`, `first`, `orderby` (NO `$filter`, `$select`, etc.).
- **`in` NO soportado** — usar `or` chains: `Mov eq 'Pedido' or Mov eq 'Factura'`.
- **Búsqueda texto parcial → `buscar_registro`** (tool MCP nativo, ver Patrón 0). Respuesta en `result.value.value[]`.
- **`VentaD` sin `Importe`** — calcular `Cantidad * Precio`. Sin campo `Descripcion` — join con `Art.Descripcion1`.
- **Fechas sin comillas**: `FechaEmision ge 2026-01-01`. Strings con comillas simples: `Estatus eq 'PENDIENTE'`.
- ⚠️ **`COMS.F`, `VTAS.P`, etc. son CLAVES de MovTipo, NO valores de `Mov`**. NUNCA filtrar con `Mov eq 'COMS.F'`. Usar los nombres de Mov listados en cada patrón abajo.

---

## Patrón 0 — Búsqueda de texto parcial (buscar_registro)

**Usar para:** buscar proveedor/cliente/artículo por nombre parcial.
**Tool:** `intelisis-dab__buscar_registro` — llamar DIRECTAMENTE (NO via execute_entity).
**Respuesta:** registros en `result.value.value[]` (distinto de `read_records` → `result.value[]`).

```
# Buscar proveedor por nombre
buscar_registro({ entidad:"Prov", campo:"Nombre", termino:"Mexicana", primero:10 })
→ PP-0085 MEXICANA DE ARROZ SA DE CV, AP-0004 ESTAFETA MEXICANA SA DE CV, ...

# Buscar artículo por descripción
buscar_registro({ entidad:"Art", campo:"Descripcion1", termino:"Frijol Negro", primero:20 })

# Buscar cliente
buscar_registro({ entidad:"Cte", campo:"Nombre", termino:"Walmart", primero:5 })

# Con modo (default: CONTIENE)
buscar_registro({ entidad:"Prov", campo:"Nombre", termino:"MEXICANA", modo:"EMPIEZA", primero:5 })
```

Parámetros: `entidad` (req), `campo` (req), `termino` (req), `modo` (CONTIENE|EMPIEZA|TERMINA), `primero` (max 500), `ordenar` (campo para ORDER BY).

⚠️ **`primero` SIEMPRE como NÚMERO** (`primero: 20`, no `primero: "20"`). Si llega
como string el DAB NO aplica el límite y devuelve cientos de filas (~200k chars
que se re-envían en cada step). Resultado grande de `buscar_registro` = error
caro: el contexto se proyecta y trunca, pero la llamada ya trajo todo.

Entidades soportadas: Prov, Cte, Art, Compra, Venta, Inv, ArtDisponibleDesc, ArtDisponible, GastoT, CompraD, VentaD, MovTipo, Alm.

## Patrón 0.2 — Artículos por familia (clasificación Forecast CF) — NO repetir buscar_registro

Para responder "¿de qué variedad/artículos de <familia> disponemos?" (ej. frijol
negro), **NO** hagas varios `buscar_registro` con el mismo concepto y distinto
`primero`. Usa la clasificación del **sistema Forecast CF** (la que usa el plan
de producción), NO `Art.Familia` (que es genérica, ej. "FRIJOL"):

1. **Familias del sistema FC** → `read_records(ArtFamFC, select: "Familia",
   first: 200)` — catálogo fino ("Frijol Negro", "Frijol negro americano",
   "Mitades Negras", "Frijol Pinto"...). Filtra localmente las que contengan el
   término.
2. **Artículos por familia FC** → `read_records(ResumenPlaneacionCF,
   select: "Articulo,Descripcion,VariedadCF,FamiliaCF", first: 300)` — UNA fila
   por artículo con su `FamiliaCF`/`VariedadCF`. Selecciona localmente los de la
   familia. (Para productos terminados de la familia FC consultar también
   `Art`/`ArtDisponibleDesc` por esos artículos.)

```
read_records(ArtFamFC, select: "Familia,StockMinimo,StockMaximo", first: 200)
read_records(ResumenPlaneacionCF,
  select: "Articulo,Descripcion,VariedadCF,FamiliaCF", first: 300)
```

Después agrega existencias por artículo con `aggregate_records(ArtDisponible,
sum, Disponible, filter: "Articulo eq '<X1>' or Articulo eq '<X2>'",
groupby: ["Articulo"])` y consulta arribos una sola vez. **Regla:** una búsqueda
por concepto; si el resultado no alcanza, usa `ResumenPlaneacionCF.FamiliaCF`/
`ArtFamFC`, no repetir `buscar_registro`.

---

## Patrón 0.1 — Compras de un proveedor por nombre

Cuando el usuario pregunta **“qué compras tenemos de X”** sin rango de fechas,
interpretar “tenemos” como **compromisos vigentes**. Priorizar órdenes pendientes;
no mezclar órdenes, entradas y controles de calidad como si fueran compras distintas.

```
PASO 1: buscar_registro({ entidad:"Prov", campo:"Nombre", termino:"Mexicana de Arroz", primero:5 })
→ elegir coincidencia exacta normalizada; si hay dos plausibles, preguntar al usuario

PASO 2: read_records(Compra,
  filter: "Proveedor eq 'PP-0085' and Estatus eq 'PENDIENTE' and (<MOVS_COMS_O>)",
  select: "ID,Mov,MovID,FechaEmision,Importe,Estatus,Almacen,Condicion",
  orderby: ["FechaEmision desc"],
  first: 50)
```

Reglas de respuesta:
- Abrir con la decisión útil: **N órdenes pendientes · $total**.
- Mostrar solo esas órdenes en la tabla principal.
- Si no hay pendientes, decirlo y consultar como fallback las últimas 10 entradas concluidas.
- Historial concluido, entradas y control de calidad van en secciones separadas y solo si el usuario los pide.
- Si la actividad más reciente tiene más de 90 días, destacarlo: **“Sin actividad reciente; último movimiento: fecha”**.
- Si la respuesta trae cursor/página siguiente, NO afirmar un total calculado en cliente; decir “primeros 50” o usar `aggregate_records`.

---
```
read_records(ArtDisponibleDesc,
  filter: "Almacen eq '<ALMACEN_DEL_TENANT>'",
  select: "Articulo,Descripcion1,Disponible,Apartado,DispMenosApartado,Unidad",
  orderby: ["Disponible desc"],
  first: 50)
```

### Disponibilidad de un artículo por clave
```
read_records(ArtDisponibleDesc,
  filter: "Articulo eq '000002'",
  select: "Articulo,Descripcion1,Disponible,Apartado,DispMenosApartado,Almacen")
```

### Búsqueda por texto parcial (usar buscar_registro, NO paginar)
```
buscar_registro({ entidad:"ArtDisponibleDesc", campo:"Descripcion1", termino:"Frijol" })
```
NUNCA hagas `read_records` con `first` alto para "traer y filtrar en cliente":
pagina miles de filas a contexto y dispara la latencia. `buscar_registro` hace el
LIKE en el servidor y devuelve solo lo que coincide.

### Con datos de clasificación (familia, grupo)
```
PASO 1: read_records(ArtDisponibleDesc, filter="Almacen eq '<ALMACEN_DEL_TENANT>'", select="Articulo,Disponible")
PASO 2: read_records(Art, filter="Familia eq 'Frijol' and Estatus eq 'ALTA'", select="Articulo,Descripcion1,Grupo,Categoria,Linea,Familia")
→ Unir por Articulo
```

---

## Patrón 2 — Ventas pendientes (VTAS.P)

Resolver los movimientos `VTAS.P` con `MovTipo` o con la política del tenant. No reutilizar listas de otra empresa.

> ⚠️ `VTAS.P` es una CLAVE de MovTipo. El campo `Mov` en Venta NUNCA contiene 'VTAS.P'.

### Cabecero de ventas pendientes
```
read_records(Venta,
  filter: "Estatus eq 'PENDIENTE' and (<MOVS_VTAS_P>)",
  select: "ID,Empresa,Mov,MovID,FechaEmision,Ejercicio,Periodo,Cliente,Importe,Impuestos,Estatus,Moneda",
  orderby: ["Ejercicio asc","Periodo asc","FechaEmision asc"])
```

### + Nombre de cliente (join manual)
```
PASO 1: (query cabecero arriba) → obtener IDs de Cliente únicos
PASO 2: read_records(Cte, filter="Cliente eq 'C001' or Cliente eq 'C002' or ...", select="Cliente,Nombre")
→ Unir por Cliente
```

### Detalle de renglones
```
PASO 1: (IDs de Venta del paso anterior)
PASO 2: read_records(VentaD,
  filter: "ID eq 1001 or ID eq 1002 or ...",
  select: "ID,Renglon,Articulo,Cantidad,Precio,Almacen,Unidad")
PASO 3 (opcional): read_records(Art,
  filter: "Articulo eq 'A001' or Articulo eq 'A002' or ...",
  select: "Articulo,Descripcion1")
→ ImporteDetalle = Cantidad * Precio
```

---

## Patrón 3 — Ventas en firme / facturadas (VTAS.F)

Resolver los movimientos `VTAS.F` con `MovTipo` o con la política del tenant.

> ⚠️ `VTAS.F` es una CLAVE. NUNCA usar `Mov eq 'VTAS.F'`.

### Cabecero
```
read_records(Venta,
  filter: "Estatus eq 'CONCLUIDO' and (<MOVS_VTAS_F>)",
  select: "ID,Empresa,Mov,MovID,FechaEmision,Ejercicio,Periodo,Cliente,Importe,Impuestos,Estatus,Moneda",
  orderby: ["Ejercicio asc","Periodo asc","FechaEmision asc"])
```

### Total facturado por cliente (agregación eficiente)
```
aggregate_records(Venta,
  function: sum, field: Importe,
  filter: "Estatus eq 'CONCLUIDO' and Mov eq 'Factura'",
  groupby: ["Cliente"],
  orderby: "desc",
  first: 20)
→ Luego join con Cte para nombres
```

---

## Patrón 4 — Compras pendientes (COMS.O)

Resolver los movimientos `COMS.O` con `MovTipo` o con la política del tenant.

> ⚠️ `COMS.O` es una CLAVE. NUNCA usar `Mov eq 'COMS.O'`.

### Cabecero de compras pendientes
```
read_records(Compra,
  filter: "Estatus eq 'PENDIENTE' and (<MOVS_COMS_O>)",
  select: "ID,Empresa,Mov,MovID,FechaEmision,Ejercicio,Periodo,Proveedor,Importe,Impuestos,Estatus,Moneda",
  orderby: ["FechaEmision asc"])
```

### + Nombre de proveedor (join manual)
```
PASO 1: (query cabecero) → claves Proveedor únicas
PASO 2: read_records(Prov, filter="Proveedor eq 'P001' or Proveedor eq 'P002' or ...", select="Proveedor,Nombre")
```

### Detalle de renglones
```
PASO 1: IDs de Compra
PASO 2: read_records(CompraD,
  filter: "ID eq 2001 or ID eq 2002 or ...",
  select: "ID,Renglon,Articulo,Cantidad,Costo,Almacen,FechaRequerida")
PASO 3 (opcional): read_records(Art, filter="...", select="Articulo,Descripcion1")
→ ImporteDetalle = Cantidad * Costo
```

---

## Patrón 5 — Compras en firme (COMS.F)

Resolver los movimientos `COMS.F` con `MovTipo` o con la política del tenant.

> ⚠️ `COMS.F` es una CLAVE. NUNCA usar `Mov eq 'COMS.F'`. Los Movs son los nombres listados arriba.

```
read_records(Compra,
  filter: "Estatus eq 'CONCLUIDO' and (<MOVS_COMS_F>)",
  select: "ID,Empresa,Mov,MovID,FechaEmision,Ejercicio,Periodo,Proveedor,Importe,Impuestos,Estatus,Moneda",
  orderby: ["FechaEmision asc"])
```

---

## Reglas de eficiencia

1. **`ArtDisponibleDesc` sobre `ArtDisponible`** — ya incluye Descripcion1 sin join adicional.
2. **Usar la política del tenant si contiene MovTipo verificado**; si no, resolverlo con `read_records(MovTipo, ...)`.
3. **`aggregate_records` para métricas** — nunca leer todos y calcular en memoria.
4. **Paralelizar** pasos independientes (cabecero + lookup de Prov/Cte simultáneos).
5. **Limitar con `select` y `first`** siempre.
6. **Si un filtro retorna 0**, verificar con `read_records(Venta, first: 3, select: "ID,Estatus,Mov")` para ver valores reales.
7. **Para writes**, confirmar siempre con el usuario antes de ejecutar.
