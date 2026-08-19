---
name: skill-forecast
description: 'Generar y gestionar el forecast (pronóstico) del periodo. Usar para: desglosar el forecast por artículo/semana (S1..S54), recalcular inventario/a-producir/kg, y editar cifras. Pantalla: Desglose de Forecast.'
user-invocable: true
---

# Forecast (pronóstico)

> **Autónomo:** TODO aquí (tablas, consultas, formatos, reglas). NO volver a `04_Procedure.sql`. Sesión del núcleo: `{usuario}·{ejercicio}·{periodo}`; ventana visible = `[primerSemana..+4]`.

## 1. Tablas
| Tabla | Columnas útiles | Uso |
|---|---|---|
| `ResumenPlaneacionCF` | `ID, Usuario, CtTrabajo, Ejercicio, Concepto, Articulo, Descripcion, Cliente, NombreCte, Programa, S1..S54, P1..P54, Venta, Stock, TotalInv, Producir, Gramaje, Kg, FamiliaCF, Stok15` | Desglose (lectura directa) |
| `VacaPresupuestoVtaConD`/`Con` | `ID, Articulo, Concepto, Cliente, Programa, S1..S54` / `ID, Ejercicio, Version, Estatus` | Presupuesto (generar planeación) |
| `AuxiliarU` + `Alm` | `Grupo, Rama, Empresa, Fecha, Cuenta, CargoU, AbonoU` / `Almacen, EmpacadoCF` | Saldo inventario |
| `UV_QV_FILLRATE` | `NO_ARTICULO, FECHA_REMISION, CANTIDAD_EMBARCADA, RECHAZO` | Venta real (remoto) |
| `Prod`/`ProdD`/`MovTipo` | `Empresa, FechaEmision, Estatus, Articulo, Cantidad` / `Clave, Modulo` | Producción real |
| `ForecastHist` + `Usuario` | `ID, FechaEmision, Ejercicio, Periodo, MovID` / `Nombre` | Histórico/versiones |
| `DIM_TIEMPO_SEMANA` | `AÑO, MES, SEMANA, FECHAINICIO, FECHAFIN` | Fechas de semana |

## 2. Catálogo de consultas
### F1 — Desglose de Forecast (por artículo/semana)
```sql
SELECT Articulo, Descripcion, CtTrabajo, Concepto, Familia, Programa, Cliente,
       S32, P32, S33, P33, S34, P34, S35, P35, S36, P36,
       TotalInv, Stock
FROM ResumenPlaneacionCF WHERE Usuario = '{usuario}'
```
Columnas `S{i}/P{i}` dinámicas; ventana `[PrimerSemana, +4]` (para 8-2026 = S32..S36).

### F2 — Inventario Semanal (presupuesto semanal por artículo)
Parámetros `{usuario}`, `{ejercicio}`, `{semana}`; `@Dias = 5`; fechas de `DIM_TIEMPO_SEMANA` (`FechaD=FECHAINICIO`, `FechaA=FECHAFIN`); saldo a `Fecha < DATEADD(day,-1,FechaD)`.
- **Saldo (Inv. Inicial)** — equivale a `fn_ObtenerSaldoInventario` (NO se llama):
```sql
SELECT SUM(ISNULL(AuxiliarU.CargoU,0.00) - ISNULL(AuxiliarU.AbonoU,0.00))
FROM AuxiliarU JOIN Alm ON AuxiliarU.Grupo = Alm.Almacen
WHERE AuxiliarU.Rama='INV' AND AuxiliarU.Empresa='INCF' AND Alm.EmpacadoCF=1
  AND AuxiliarU.Fecha < @Fecha AND AuxiliarU.Cuenta = @Articulo
```
- **Venta Sem.** — equivale a `fnWebVentaFechasAcumFactura` (NO se llama): `SUM(CANTIDAD_EMBARCADA - RECHAZO)` de `UV_QV_FILLRATE` en `[FechaD,FechaA]` por `NO_ARTICULO`. *`UV_QV_FILLRATE` es vista remota; localmente Venta=0.*
- **Producción Sem.** — equivale a `fnWebArtAcumProduciendoFechas` (NO se llama):
```sql
SELECT ROUND(SUM(ISNULL(ProdD.Cantidad,0.00)),2)
FROM Prod JOIN MovTipo ON Prod.Mov = MovTipo.Mov JOIN ProdD ON Prod.ID = ProdD.ID
WHERE Prod.Empresa='INCF' AND Prod.FechaEmision BETWEEN @FechaD AND @FechaA
  AND MovTipo.Clave IN ('PROD.E') AND Prod.Estatus IN ('CONCLUIDO')
  AND ProdD.Articulo = @Articulo AND MovTipo.Modulo='PROD'
```
- **Cálculos:** `InventarioFinal = Saldo + Producido - Venta`; `VentaDias = Venta/5`; `DOHInicial = Saldo/VentaDias`; `DOHFinal = InventarioFinal/VentaDias` (NULLIF); orden `Saldo DESC`.

### F3 — Histórico/versiones
```sql
SELECT h.ID, h.FechaEmision, h.Ejercicio, h.Periodo AS Mes, h.Usuario, u.Nombre, h.MovID AS Version
FROM ForecastHist h JOIN Usuario u ON h.Usuario = u.Usuario
WHERE h.Ejercicio = {ejercicio} AND h.Periodo = {periodo}
ORDER BY h.ID DESC
```

## 3. Formatos de pantalla (obligatorios)
| Pantalla | Columnas |
|---|---|
| **Desglose de Forecast** | `Articulo · Descripcion · S32/P32 · S33/P33 · S34/P34 · S35/P35 · S36/P36 · Total Inventario · Stock 15 Días` (sin columnas ocultas; TotalInv/Stok15 entero) |
| **Inventario Semanal** | `Semana · Articulo · Descripción · Concepto · Nombre Cliente · Programa · Cantidad · DOH Inicial · Inventario Inicial · Ventas Semana · Producción Semana · Inventario Final · DOH Final` (13 columnas, nombres completos como el portal) |
| **Histórico** | `S1..S54 + P1..P54` visibles `[PrimerSemana..+4]` + `Programa, Familia, CtTrabajo, Concepto, NombreCte, Venta, TotalInv, Producir, Kg` |

## 4. Reglas
- Semanas visibles = `PrimerSemana..+4`. Planeación generada en la carga inicial (paso 5 del núcleo) desde `VacaPresupuestoVtaConD`.
- Ediciones → recalcular dependientes, validar totales, persistir en transacción (rollback).
- NO usar SPs del sistema — consultas propias.
