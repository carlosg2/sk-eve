# Disponibilidad de un artículo

## Consulta 1

```sql
SELECT ArtDisponibleDesc.Articulo,
       ArtDisponibleDesc.Descripcion1,
       ArtDisponibleDesc.Disponible,
       Art.Grupo,
       Art.Categoria,
       Art.Linea,
       Art.Familia,
       ArtDisponibleDesc.Almacen,
       Alm.Nombre
FROM ArtDisponibleDesc
JOIN Art ON ArtDisponibleDesc.Articulo = Art.Articulo
JOIN Alm ON ArtDisponibleDesc.Almacen = Alm.Almacen
WHERE ArtDisponibleDesc.Descripcion1 LIKE '%Frijol negro%'
  AND Art.Familia LIKE '%Frijol%'
  AND ArtDisponibleDesc.Almacen = 'C. FRESCO';
```

## Consulta 2

### Ventas Generales Pendientes

```sql
SELECT
  Venta.ID,
  Venta.Empresa,
  Venta.Mov,
  Venta.MovID,
  dbo.fnFechaSinHora(Venta.FechaEmision) AS FechaEmision,
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.Cliente,
  Cte.Nombre,
  Venta.Estatus,
  Venta.Moneda,
  Venta.TipoCambio,
  ISNULL(Venta.Importe, 0.00) AS Importe,
  ISNULL(Venta.Impuestos, 0.00) AS Impuestos,
  ISNULL(Venta.Importe, 0.00) + ISNULL(Venta.Impuestos, 0.00) AS Total
FROM Venta
JOIN Cte ON Venta.Cliente = Cte.Cliente
WHERE Venta.Estatus = 'PENDIENTE'
  AND Venta.Mov IN (
    'Pedido',
    'Orden Venta',
    'Cotizacion'
  )
ORDER BY
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.FechaEmision,
  Venta.MovID
GO
```

## Consulta 3

### Ventas Detalle Pendientes

```sql
SELECT
  Venta.ID,
  Venta.Empresa,
  Venta.Mov,
  Venta.MovID,
  dbo.fnFechaSinHora(Venta.FechaEmision) AS FechaEmision,
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.Cliente,
  Cte.Nombre,
  Venta.Estatus,
  Venta.Moneda,
  Venta.TipoCambio,
  ISNULL(Venta.Importe, 0.00) AS Importe,
  ISNULL(Venta.Impuestos, 0.00) AS Impuestos,
  ISNULL(Venta.Importe, 0.00) + ISNULL(Venta.Impuestos, 0.00) AS Total,
  VentaD.Renglon,
  VentaD.Articulo,
  VentaD.Descripcion,
  ISNULL(VentaD.Cantidad, 0.00) AS Cantidad,
  ISNULL(VentaD.Precio, 0.00) AS Precio,
  ISNULL(VentaD.Importe, 0.00) AS ImporteDetalle
FROM Venta
JOIN VentaD ON Venta.ID = VentaD.ID
JOIN Cte ON Venta.Cliente = Cte.Cliente
WHERE Venta.Estatus = 'PENDIENTE'
  AND Venta.Mov IN (
    'Pedido',
    'Orden Venta',
    'Cotizacion'
  )
ORDER BY
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.FechaEmision,
  Venta.MovID,
  VentaD.Renglon
GO
```

## Consulta 8

### Compras en Firme Cabecero

```sql
SELECT
  Compra.ID,
  Compra.Empresa,
  Compra.Mov,
  Compra.MovID,
  dbo.fnFechaSinHora(Compra.FechaEmision) AS FechaEmision,
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.Proveedor,
  Prov.Nombre,
  Compra.Estatus,
  Compra.Moneda,
  Compra.TipoCambio,
  MovTipo.Clave,
  ISNULL(Compra.Importe, 0.00) AS Importe,
  ISNULL(Compra.Impuestos, 0.00) AS Impuestos,
  ISNULL(Compra.Importe, 0.00) + ISNULL(Compra.Impuestos, 0.00) AS Total
FROM Compra
JOIN Prov ON Compra.Proveedor = Prov.Proveedor
JOIN MovTipo ON Compra.Mov = MovTipo.Mov
  AND MovTipo.Modulo = 'COMS'
WHERE Compra.Estatus = 'CONCLUIDO'
  AND MovTipo.Clave = 'COMS.F'
ORDER BY
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.FechaEmision,
  Compra.MovID
GO
```

## Consulta 9

### Compras en Firme Detalle

```sql
SELECT
  Compra.ID,
  Compra.Empresa,
  Compra.Mov,
  Compra.MovID,
  dbo.fnFechaSinHora(Compra.FechaEmision) AS FechaEmision,
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.Proveedor,
  Prov.Nombre,
  Compra.Estatus,
  Compra.Moneda,
  Compra.TipoCambio,
  MovTipo.Clave,
  CompraD.Renglon,
  CompraD.Articulo,
  Art.Descripcion1 AS NombreProducto,
  ISNULL(CompraD.Cantidad, 0.00) AS Cantidad,
  ISNULL(CompraD.Costo, 0.00) AS Costo,
  ISNULL(CompraD.Cantidad, 0.00) * ISNULL(CompraD.Costo, 0.00) AS ImporteDetalle
FROM Compra
JOIN CompraD ON Compra.ID = CompraD.ID
JOIN Art ON CompraD.Articulo = Art.Articulo
JOIN Prov ON Compra.Proveedor = Prov.Proveedor
JOIN MovTipo ON Compra.Mov = MovTipo.Mov
  AND MovTipo.Modulo = 'COMS'
WHERE Compra.Estatus = 'CONCLUIDO'
  AND MovTipo.Clave = 'COMS.F'
ORDER BY
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.FechaEmision,
  Compra.MovID,
  CompraD.Renglon
GO
```

## Consulta 4

### Compras Pendientes Cabecero

```sql
SELECT
  'Cabecero' AS TipoRegistro,
  Compra.ID,
  Compra.Empresa,
  Compra.Mov,
  Compra.MovID,
  dbo.fnFechaSinHora(Compra.FechaEmision) AS FechaEmision,
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.Proveedor,
  Prov.Nombre,
  Compra.Estatus,
  Compra.Moneda,
  Compra.TipoCambio,
  ISNULL(Compra.Importe, 0.00) AS Importe,
  ISNULL(Compra.Impuestos, 0.00) AS Impuestos,
  ISNULL(Compra.Importe, 0.00) + ISNULL(Compra.Impuestos, 0.00) AS Total,
  NULL AS Renglon,
  NULL AS Articulo,
  NULL AS NombreProducto,
  NULL AS Cantidad,
  NULL AS Costo,
  NULL AS ImporteDetalle
FROM Compra
JOIN Prov ON Compra.Proveedor = Prov.Proveedor
WHERE Compra.Estatus = 'PENDIENTE'
  AND Compra.Mov IN (
    'Orden Compra',
    'Orden de Compra'
  )
```

## Consulta 5

### Compras Pendientes Detalle

```sql
SELECT
  'Detalle' AS TipoRegistro,
  Compra.ID,
  Compra.Empresa,
  Compra.Mov,
  Compra.MovID,
  dbo.fnFechaSinHora(Compra.FechaEmision) AS FechaEmision,
  Compra.Ejercicio,
  Compra.Periodo,
  Compra.Proveedor,
  Prov.Nombre,
  Compra.Estatus,
  Compra.Moneda,
  Compra.TipoCambio,
  ISNULL(Compra.Importe, 0.00) AS Importe,
  ISNULL(Compra.Impuestos, 0.00) AS Impuestos,
  ISNULL(Compra.Importe, 0.00) + ISNULL(Compra.Impuestos, 0.00) AS Total,
  CompraD.Renglon,
  CompraD.Articulo,
  Art.Descripcion1 AS NombreProducto,
  ISNULL(CompraD.Cantidad, 0.00) AS Cantidad,
  ISNULL(CompraD.Costo, 0.00) AS Costo,
  ISNULL(CompraD.Cantidad, 0.00) * ISNULL(CompraD.Costo, 0.00) AS ImporteDetalle
FROM Compra
JOIN CompraD ON Compra.ID = CompraD.ID
JOIN Art ON CompraD.Articulo = Art.Articulo
JOIN Prov ON Compra.Proveedor = Prov.Proveedor
WHERE Compra.Estatus = 'PENDIENTE'
  AND Compra.Mov IN (
    'Orden Compra',
    'Orden de Compra'
  )
ORDER BY
  ID,
  TipoRegistro,
  Renglon
```

## Consulta 6

### Ventas en Firme Cabecero

```sql
SELECT
  Venta.ID,
  Venta.Empresa,
  Venta.Mov,
  Venta.MovID,
  dbo.fnFechaSinHora(Venta.FechaEmision) AS FechaEmision,
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.Cliente,
  Cte.Nombre,
  Venta.Estatus,
  Venta.Moneda,
  Venta.TipoCambio,
  MovTipo.Clave,
  ISNULL(Venta.Importe, 0.00) AS Importe,
  ISNULL(Venta.Impuestos, 0.00) AS Impuestos,
  ISNULL(Venta.Importe, 0.00) + ISNULL(Venta.Impuestos, 0.00) AS Total
FROM Venta
JOIN Cte ON Venta.Cliente = Cte.Cliente
JOIN MovTipo ON Venta.Mov = MovTipo.Mov
  AND MovTipo.Modulo = 'VTAS'
WHERE Venta.Estatus = 'CONCLUIDO'
  AND MovTipo.Clave = 'VTAS.F'
ORDER BY
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.FechaEmision,
  Venta.MovID
GO
```

## Consulta 7

### Ventas en Firme Detalle

```sql
SELECT
  Venta.ID,
  Venta.Empresa,
  Venta.Mov,
  Venta.MovID,
  dbo.fnFechaSinHora(Venta.FechaEmision) AS FechaEmision,
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.Cliente,
  Cte.Nombre,
  Venta.Estatus,
  Venta.Moneda,
  Venta.TipoCambio,
  MovTipo.Clave,
  VentaD.Renglon,
  VentaD.Articulo,
  Art.Descripcion1 AS NombreProducto,
  ISNULL(VentaD.Cantidad, 0.00) AS Cantidad,
  ISNULL(VentaD.Precio, 0.00) AS Precio,
  ISNULL(VentaD.Importe, 0.00) AS ImporteDetalle
FROM Venta
JOIN VentaD ON Venta.ID = VentaD.ID
JOIN Art ON VentaD.Articulo = Art.Articulo
JOIN Cte ON Venta.Cliente = Cte.Cliente
JOIN MovTipo ON Venta.Mov = MovTipo.Mov
  AND MovTipo.Modulo = 'VTAS'
WHERE Venta.Estatus = 'CONCLUIDO'
  AND MovTipo.Clave = 'VTAS.F'
ORDER BY
  Venta.Ejercicio,
  Venta.Periodo,
  Venta.FechaEmision,
  Venta.MovID,
  VentaD.Renglon
GO
```