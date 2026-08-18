---
type: Intelisis Casing Reference
title: Casing de campos por vista (DAB)
description: Mapa de casing (camelCase vs UPPERCASE) por entidad del DAB — la regla "todo UPPERCASE" es falsa; la mayoría de entidades son camelCase y solo vistas de módulos específicos se exponen UPPERCASE.
layer: erp-kernel
tenant: null
generated:
  by: copilot/sigma-meta-fabrica
  at: 2026-08-17
tags: [odata, casing, schema, dab, campos]
sources:
  - resource: selects validados en agent/skill-library/* (linter check-knowledge, 0 críticos, 2026-08)
  - resource: buffer state/learnings.md (25+ errores Invalid field, 2026-08-05..17)
---

# Casing de campos por vista (DAB)

## Regla general (verificada en runtime)

NO existe una regla universal "campos en UPPERCASE". El casing depende de la **vista**:

- **Catálogos y movimientos (la mayoría) → camelCase.** `Compra`, `CompraD`, `Venta`,
  `VentaD`, `Art`, `ArtDisponible`, `ArtDisponibleDesc`, `Prov`, `Cte`, `Alm`, `MovTipo`,
  `CalendarioFC`, `ResumenPlaneacionCF`, `ArtFamFC`, `ArtMaterial`, `ExplocionMatCF`,
  `WebInicio`, `CentroFC`/`CentroFCTemp`, `EstacionTFC`, `Prod`/`ProdD`,
  `ForecastPlanSemanal`, `Arribos12`/`FCArribos`, `VacaPresupuestoVtaCon(D)` → campos en
  camelCase (`FechaEmision`, `Articulo`, `Cantidad`, `MovID`, `Descripcion1`...).
- **Excepción → UPPERCASE.** SOLO vistas de módulos específicos se exponen en MAYÚSCULAS
  (p.ej. en el módulo Forecast/Planeación: `ForecastPlanProduccion` → `SEMANA`,
  `PORPRODUCIR`, `CENTROTRABAJO`; `UV_QV_PPTOCOMPRA` → `ARTICULO`, `INVMINIMOKG`,
  `MAXCOMPRAKG`). La lista exacta por empresa vive en el Company Twin de la empresa
  (no es universal).
- **Ante cualquier duda → `read_records(<Ent>, first: 1)`** sin select para ver los campos y
  su casing REALES antes de construir el select/filter. Es la verdad de runtime; nunca adivines.

## Mapa por entidad (camelCase — verificados)

| Entidad | Campos correctos (ejemplos) | Notas |
|---|---|---|
| `Compra` | ID, Empresa, Mov, MovID, FechaEmision, FechaDocumento, FechaEntrega, Ejercicio, Periodo, Proveedor, Importe, Impuestos, Estatus, Moneda, Almacen, Condicion | cabecera; **no trae Articulo** |
| `CompraD` | ID, Renglon, Articulo, Cantidad, Costo, Almacen, FechaRequerida | renglones; `CantidadPendiente` si aplica |
| `Venta` | ID, Empresa, Mov, MovID, FechaEmision, Ejercicio, Periodo, Cliente, Importe, Impuestos, Estatus, Moneda | cabecera; **no trae Articulo** |
| `VentaD` | ID, Renglon, Articulo, Cantidad, CantidadPendiente, Precio, Almacen, Unidad | **no existe Importe ni Descripcion** (ver [ventad.md](ventad.md)) |
| `Art` | Articulo, Descripcion1, Estatus, AlmacenROP, SeProduce, Familia | catálogo |
| `ArtDisponible` | Empresa, Articulo, Almacen, Disponible, Apartado, DispMenosApartado | vista MÍNIMA; **no trae Descripcion1 ni Unidad** |
| `ArtDisponibleDesc` | Empresa, Articulo, Almacen, Disponible, Descripcion1, Unidad (+14) | vista completa; **no trae Apartado/DispMenosApartado** |
| `ArtFamFC` | Familia, StockMinimo, StockMaximo, TiempoEntrega | familias FC |
| `ResumenPlaneacionCF` | Articulo, Descripcion, VariedadCF, FamiliaCF, S1..S54, P1..P54, Venta, Stock, Producir, Kg | **VariedadCF/FamiliaCF**, no Variedad/Familia |
| `CalendarioFC` | Ano, Semana, FechaD, FechaA | **Ano** (no ANO) |
| `ArtMaterial` | Articulo (BOM) | shape result.value[] |
| `Prov` | Nombre, Estatus, ... | catálogo |

## Correcciones de campo — resuelven los errores típicos (cross-referencia)

Cuando `read_records`/`aggregate_records` falla con `Invalid field` / `Could not find a
property named 'X'`, la corrección depende de la entidad y del casing:

| Campo intentado (falla) | Campo correcto | Entidad(es) |
|---|---|---|
| `FECHAEMISION` / `Fecha` | `FechaEmision` (o FechaDocumento/FechaEntrega/FechaRequerida según la entidad) | Compra, CompraD, Venta, VentaD, Prod(D) |
| `FOLIO` / `Documento` | `MovID` | Compra, Venta, Prod |
| `EXISTENCIA` | `Disponible` | ArtDisponible, ArtDisponibleDesc |
| `VARIEDAD` / `FAMILIACF` | `VariedadCF` / `FamiliaCF` | ResumenPlaneacionCF |
| `ANO` | `Ano` | CalendarioFC |
| `CENTROTRABAJO` (camelCase) | `CENTROTRABAJO` (UPPERCASE) | ForecastPlanProduccion |
| `SEMANA` (camelCase) | `SEMANA` (UPPERCASE) | ForecastPlanProduccion |
| `UNIDAD` en ArtDisponible | `Unidad` en **ArtDisponibleDesc** | vista correcta |
| `APARTADO`/`DISPMENOSAPARTADO` en ArtDisponibleDesc | `Apartado`/`DispMenosApartado` en **ArtDisponible** | vista correcta |
| `GRUPO` / `CLAVE` / `CODIGO` | no existen genéricos; usar Familia / Articulo / MovID según entidad | — |
| `IDPADRE` / `EN_TRANSITO` / `DISPONIBLE_NETO` / `E` | no existen como tales; verificar la vista real con read_records(first:1) (ej. `ExplocionMatCF` usa ArticuloPadre/ArticuloHijo) | — |

Regla operativa: **NUNCA aplicar UPPERCASE a ciegas** (el intento `FECHAEMISION` en Compra
también falla — el campo real es `FechaEmision`). Ante un error de campo: verificar el casing
con `read_records(<Ent>, first:1)` y consultar [index.md §Capacidades OData](/erp-kernel/index.md).
