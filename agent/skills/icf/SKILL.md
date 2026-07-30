---
description: >
  Use when the user asks about disponibilidad de artículos, inventario, stock,
  ventas (pedidos, facturas, clientes), compras (órdenes, entradas, proveedores),
  o cualquier consulta operativa de Industrias Campo Fresco (ICF).
---

# Skill: Operaciones ICF — Ventas, Compras, Inventario

> **Este skill es SOLO procedural.** El schema de entidades vive en el Company Twin:
> `query_company_twin({ query, layer: "erp-kernel" })`.

Conexión MCP: **`intelisis-dab`** → `https://api2.maserp.mx/icf/mcp`
Tools: `read_records`, `aggregate_records`, `create_record`, `update_record`, `delete_record`, `execute_entity`, **`buscar_registro`** (búsqueda texto parcial).

## Recordatorios críticos

- **Empresa ICF = `INCF`** — incluirlo siempre en `create_record`.
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

Entidades soportadas: Prov, Cte, Art, Compra, Venta, Inv, ArtDisponibleDesc, ArtDisponible, GastoT, CompraD, VentaD, MovTipo, Alm.

---
```
read_records(ArtDisponibleDesc,
  filter: "Almacen eq 'GRAL'",
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

### Búsqueda por texto parcial (sin contains — traer y filtrar)
```
PASO 1: read_records(ArtDisponibleDesc,
  filter: "Almacen eq 'GRAL' and Disponible gt 0",
  select: "Articulo,Descripcion1,Disponible,Unidad",
  first: 200)
→ Filtrar client-side por texto en Descripcion1
```

### Con datos de clasificación (familia, grupo)
```
PASO 1: read_records(ArtDisponibleDesc, filter="Almacen eq 'GRAL'", select="Articulo,Disponible")
PASO 2: read_records(Art, filter="Familia eq 'Frijol' and Estatus eq 'ALTA'", select="Articulo,Descripcion1,Grupo,Categoria,Linea,Familia")
→ Unir por Articulo
```

---

## Patrón 2 — Ventas pendientes (VTAS.P)

Movimientos VTAS.P en esta BD: **Pedido, Orden Surtido, Orden Surtido R, Ingreso, Contratos, Pedido Posfechado, Reservacion**.

> ⚠️ `VTAS.P` es una CLAVE de MovTipo. El campo `Mov` en Venta NUNCA contiene 'VTAS.P'.

### Cabecero de ventas pendientes
```
read_records(Venta,
  filter: "Estatus eq 'PENDIENTE' and (Mov eq 'Pedido' or Mov eq 'Orden Surtido' or Mov eq 'Orden Surtido R' or Mov eq 'Ingreso' or Mov eq 'Contratos' or Mov eq 'Pedido Posfechado' or Mov eq 'Reservacion')",
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

Movimientos VTAS.F en esta BD: **Factura, Factura Credito, Factura Activo, Factura Flexible, Factura Prorrateada, FacturaDIF, FacturaE, Nota Venta, Nota Venta R, Cancelacion NC**.

> ⚠️ `VTAS.F` es una CLAVE. NUNCA usar `Mov eq 'VTAS.F'`.

### Cabecero
```
read_records(Venta,
  filter: "Estatus eq 'CONCLUIDO' and (Mov eq 'Factura' or Mov eq 'Factura Credito' or Mov eq 'Factura Activo' or Mov eq 'Factura Flexible' or Mov eq 'Factura Prorrateada' or Mov eq 'FacturaDIF' or Mov eq 'FacturaE' or Mov eq 'Nota Venta' or Mov eq 'Nota Venta R')",
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

Movimientos COMS.O en esta BD: **Orden Compra, Orden Compra OP, Orden Compra AF, Orden Compra AFSocio, Orden Compra Socios, Orden Compra Emida, Aduana, Confirma Proveedor, Control Calidad, Factura Proveedor**.

> ⚠️ `COMS.O` es una CLAVE. NUNCA usar `Mov eq 'COMS.O'`.

### Cabecero de compras pendientes
```
read_records(Compra,
  filter: "Estatus eq 'PENDIENTE' and (Mov eq 'Orden Compra' or Mov eq 'Orden Compra OP' or Mov eq 'Orden Compra AF' or Mov eq 'Orden Compra AFSocio' or Mov eq 'Orden Compra Socios' or Mov eq 'Orden Compra Emida' or Mov eq 'Aduana' or Mov eq 'Confirma Proveedor' or Mov eq 'Control Calidad' or Mov eq 'Factura Proveedor')",
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

Movimientos COMS.F en esta BD: **Entrada Compra, Entrada Mercancia, Entrada Maquila, Entrada Consignacion, Entrada Insumos, Entrada Herramienta, Entrada Consumibles, Entrada de Prestamo, Compra Activos, CompraActivos Socios**.

> ⚠️ `COMS.F` es una CLAVE. NUNCA usar `Mov eq 'COMS.F'`. Los Movs son los nombres listados arriba.

```
read_records(Compra,
  filter: "Estatus eq 'CONCLUIDO' and (Mov eq 'Entrada Compra' or Mov eq 'Entrada Mercancia' or Mov eq 'Entrada Maquila' or Mov eq 'Entrada Consignacion' or Mov eq 'Entrada Insumos' or Mov eq 'Entrada Herramienta' or Mov eq 'Entrada Consumibles' or Mov eq 'Entrada de Prestamo' or Mov eq 'Compra Activos' or Mov eq 'CompraActivos Socios')",
  select: "ID,Empresa,Mov,MovID,FechaEmision,Ejercicio,Periodo,Proveedor,Importe,Impuestos,Estatus,Moneda",
  orderby: ["FechaEmision asc"])
```

---

## Reglas de eficiencia

1. **`ArtDisponibleDesc` sobre `ArtDisponible`** — ya incluye Descripcion1 sin join adicional.
2. **Usar MovTipo cacheado** (valores en este skill) — evitar lookup de MovTipo en cada query.
3. **`aggregate_records` para métricas** — nunca leer todos y calcular en memoria.
4. **Paralelizar** pasos independientes (cabecero + lookup de Prov/Cte simultáneos).
5. **Limitar con `select` y `first`** siempre.
6. **Si un filtro retorna 0**, verificar con `read_records(Venta, first: 3, select: "ID,Estatus,Mov")` para ver valores reales.
7. **Para writes**, confirmar siempre con el usuario antes de ejecutar.
