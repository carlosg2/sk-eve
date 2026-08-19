---
name: skill-materiales
description: 'Calcular explosión de materiales y faltantes. Usar para: explotar materiales (padre→hijo), requerimientos y prorrateo, faltantes de materia prima/insumos/concentrado, loteo PEPS y validación de insumos. Pantallas: Faltantes, Validación de Insumos, Materiales de Artículos.'
user-invocable: true
---

# Materiales y Faltantes

> **Autónomo:** TODO aquí. NO volver a `04_Procedure.sql`. Sesión `{usuario}`. BOM FUENTE = `ArtMaterial` (nunca leer `ExplocionMatCF` como dato estable).

## 1. Tablas
| Tabla | Columnas | Uso |
|---|---|---|
| `ArtMaterial` | `Articulo, OrdenID, Material, Cantidad, Unidad, Merma, Centro` | **BOM fuente** |
| `Art` | `Descripcion1, Grupo, SeProduce, CentroDef, FamArtCF, Factorstock` | Catálogo/filtros |
| `ResumenPlaneacionCF` | `Articulo, Descripcion, CtTrabajo, Venta, Producir, Stock, Factorstock, FamiliaCF` | Padres del usuario |
| `ArtDisponible` | `Empresa, Articulo, Almacen, Disponible` | Disponible MP |
| `ARTDISPONIBLEVACA` | `Disponible` | FIFO |
| `UV_QV_FILLRATE` | `NO_ARTICULO, FECHA_REMISION, CANTIDAD_EMBARCADA, RECHAZO` | Venta real |
| `Prod`/`ProdD`/`MovTipo` | producción real | Produciendo |
| `UT_MAX_MIN_COMPRA` | `Empresa, Articulo, InvMinimoKg, InvMaximoKg` | InvMin/InvMax Insumos |
| `Alm` | `MateriaPrimaCF` | Almacenes MP |
| `CentroFC` | `Centro, DiasHabilies` | Días hábiles |

**Reglas replicadas (NO se llaman):** `fnWebArtMaterialDisponible` = `SUM(ArtDisponible)` en almacenes MP; `fnWebVentaFechasAcumFactura` = `SUM(CANTIDAD_EMBARCADA-RECHAZO)` de `UV_QV_FILLRATE`; `fnWebArtAcumProduciendoFechas` = `SUM(ProdD.Cantidad)` (`PROD.E`, `CONCLUIDO`); `fnMayor(a,b)` = `CASE WHEN a>b THEN a ELSE b END`; `fnPorcentaje(a,b)` = `a*b/100`.

## 2. Catálogo de consultas
### M1 — Cadena neta (requerido REAL, regla TARIMA)
`@Total = max(cVenta - Venta - Disponible - Produciendo + Stock, 0)`; `InvRequerido = @Total × Cantidad`. **NUNCA** `SUM(S32 × Cantidad)` (infla).
```sql
SELECT r.Articulo, r.Venta AS cVenta, r.Venta * a.Factorstock / 100.0 AS Stock,
       (SELECT SUM(ISNULL(f.CANTIDAD_EMBARCADA,0.00)-ISNULL(f.RECHAZO,0.00)) FROM UV_QV_FILLRATE f
         WHERE CONVERT(datetime,f.FECHA_REMISION) BETWEEN @FechaD AND @FechaA AND f.NO_ARTICULO = r.Articulo) AS Venta,
       (SELECT ROUND(SUM(ISNULL(pd.Cantidad,0.00)),2) FROM Prod p JOIN MovTipo mt ON p.Mov=mt.Mov JOIN ProdD pd ON p.ID=pd.ID
         WHERE p.Empresa='INCF' AND p.FechaEmision BETWEEN @FechaD AND @FechaA
           AND mt.Clave IN ('PROD.E') AND p.Estatus IN ('CONCLUIDO') AND pd.Articulo=r.Articulo AND mt.Modulo='PROD') AS Produciendo,
       (SELECT ROUND(SUM(ISNULL(d.Disponible,0.00)),0) FROM ArtDisponible d
         WHERE d.Empresa='INCF' AND d.Articulo=r.Articulo
           AND d.Almacen IN (SELECT Almacen FROM Alm WHERE MateriaPrimaCF = 1)) AS Disponible
FROM ResumenPlaneacionCF r JOIN Art a ON r.Articulo = a.Articulo
WHERE r.Usuario = '{usuario}'
```

### M2 — BOM de un padre (detalle)
```sql
SELECT am.Articulo AS ArticuloPadre, RTRIM(am.Material) AS ArticuloHijo,
       a.Descripcion1 AS DescripcionH, am.Cantidad AS rendimiento, am.Centro, am.Unidad
FROM ArtMaterial am JOIN Art a ON a.Articulo = am.Material
WHERE am.Articulo = @padre ORDER BY am.OrdenID
```

### M3 — FIFO (material compartido)
`Disponible(material) = SUM(ARTDISPONIBLEVACA)` en almacenes MP; por cada fila en orden de padres: `InvH` (antes de consumir), `Faltante=max(0,InvRequerido-InvH)`, `PorAlcance=ROUND(InvH/NULLIF(InvRequerido,0),2)` (acotar a 100), `AlcanceDias=PorAlcance×26`, `InvFinal=max(InvH-InvRequerido,0)` y el resto pasa a la siguiente fila del mismo material.

### M4 — Faltantes de Materia (22 columnas)
`SeProduce=0`, `Grupo NOT IN ('INSUMOS DE PRODUCCION','SIN CLASIFICAR')`, `Faltante>0`; agrupa por `ArticuloHijo`. `Faltante = max(0, DisponibilidadICF - InvRequerido)`; `DisponibilidadICF` = expansión de `fnWebArtMaterialDisponible`.
Columnas: `Articulo · Descripcion · InventarioRequerido · DisponibilidadICF · InventarioAlmacenadoAVC · SolicitudTraspasoAVC · SolicitudTraspasoAVCEstatus · InventarioAlmacenadoPBC · SolicitudTraspasoPBC · SolicitudTraspasoPBCEstatus · ExistenciasAVC · SolicitudPrestamoCompraAVC · SolicitudPrestamoCompraAVCEstatus · ExistenciasPBC · SolicitudPrestamoCompraPBC · SolicitudPrestamoCompraPBCEstatus · ArribosAVC · RedireccionArriboAVC · RedireccionArriboAVCEstatus · Faltante · InvMin · InvMax` (AVC/PBC/Estatus en `0`/`''`; InvMin/Max=0).

### M5 — Faltantes de Insumos (8 columnas)
`Grupo IN ('INSUMOS DE PRODUCCION')`, `NOT IN ('SIN CLASIFICAR')`, `Faltante>0`. Columnas: `Articulo · Descripcion · InventarioRequerido · DisponibilidadICF · Faltante · RequisicionEnviadaAlERP('') · InvMin · InvMax`. `InvMin/InvMax` = `ROUND(UT_MAX_MIN_COMPRA.InvMinimoKg/InvMaximoKg,0)` por `Articulo` y `Empresa='INCF'`.

### M6 — Faltantes de Concentrado (por familia)
`SeProduce=0`, grupos excluidos; agrupa por `FamiliaCF` sumando `InventarioRequerido, DisponibilidadICF, Faltante`; solo `SUM(Faltante)>0`. Columnas: `Familia · InventarioRequerido · DisponibilidadICF · Faltante`.

### M7 — Validación de Insumos (padres + BOM)
**Padre solo si está en `ResumenPlaneacionCF` del usuario** (si no, no se muestra). No inventar filas.
- **Query 1 (padres):** `ResumenPlaneacionCF JOIN Art LEFT JOIN CentroFC`, con Disponible/VentaReal/Produciendo como subconsultas (M1); `ORDER BY r.Articulo`.
- **Query 2 (hijos BOM):** `ArtMaterial JOIN Art JOIN ResumenPlaneacionCF`, con `InvH` = `SUM(ARTDISPONIBLEVACA)` en almacenes MP.
- **JS hijo (cadena neta):** `requerido = round(totalPadre × rendimiento)` (NO `Producir×`); `invFinal=round(InvH-requerido)`; `porAlcance=requerido>0 ? min(round(InvH/requerido*100),100) : 0`; `alcanceDias=round(InvH/requerido*26)`; `SeProduce = Number(x)===1` (ODBC bit="0"/"1", NUNCA `!!x`); `Cubre = invFinal>=0 ? 'CUBRE':'NO CUBRE'`.
- **Fila padre:** `stock=round(cVenta×Factorstock/100)`; `doh=cVenta>0 ? round(Disponible/cVenta×DiasHabilies) : 0`; `planear=totalPadre`.

## 3. Formatos de pantalla (obligatorios)
| Pantalla | Columnas |
|---|---|
| **Validación (P1: padres)** | `Articulo · Materiales (verde/amarillo/rojo) · Descripción · Centro Trabajo · Forecast · Producir · Capacidad de Produccion · En Producción · Venta · % Venta · Inventario · % Stock · Stock · Por Planear` (el portal **oculta** `DOH`, `Objetivo`, `BobinaXConsumir`) |
| **Validación (P2: detalle BOM)** | `Articulo · Descripción · Rendimiento (6 dec) · Inventario · Requerido · Final · Alcance Días · Cobertura (verde>=100 amarillo 50-99 rojo<50)` |
| **Faltantes MP** | Visibles: `Articulo · Descripción · Disponibilidad ICF · Inventario Requerido · Faltante`; ocultas: `InventarioAlmacenadoAVC, SolicitudTraspasoAVC(Estatus), InventarioPulses, SolicitudTraspasoPBC(Estatus), ExistenciasAVC, SolicitudPrestamoCompraAVC(Estatus), ExistenciasPBC, SolicitudPrestamoCompraPBC(Estatus), ArribosAVC, RedireccionArriboAVC(Estatus)` |
| **Faltantes Insumos** | 8 columnas (M5) |
| **Faltantes Concentrado** | `Familia · Inventario Requerido · Disponibilidad ICF · Faltante` |
| **Ver Materiales** | `Articulo · Descripción · Cantidad · Almacén · Utiliza En · Centro` |

## 4. Reglas
- BOM FUENTE `ArtMaterial`; `ExplocionMatCF` solo referencia (por usuario, se regenera al abrir).
- Requerido = **cadena neta** (M1), nunca forecast bruto. Semáforos: verde >=100, amarillo 50-99, rojo <50.
- Solo `Faltante > 0`. NO usar faltantes pre-calculadas. Persistir en transacción.
