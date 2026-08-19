---
name: skill-programa
description: 'Generar el programa de producción. Usar para: programa mensual/semanal por centro/familia/artículo, concentrado por centro y familia, dashboard, ocupación/capacidad y situaciones (workflow). Pantallas: Programa Mensual, Dashboard, Concentrado de Familias.'
user-invocable: true
---

# Programa de Producción

> **Autónomo:** este archivo contiene TODO (tablas, consultas, formatos, reglas). NO volver a `04_Procedure.sql` ni a fuentes externas. Sesión activa del núcleo: `{usuario}·{ejercicio}·{periodo}`.

## 1. Tablas (Intelisis5000)
| Tabla | Columnas útiles | Uso |
|---|---|---|
| `WebInicio` | `Usuario, CentroTrabajo, Venta, AProducir, TiempoExtra, Ocupacion, PzasLibres, DiasHAbiles, DiasTextra, CapacidadHrs, HorasProgram, PorOcupacion, Inventario*` | Programa mensual por centro |
| Vista `ForecastPlanProduccion` | `ID, Ejercicio, Periodo, CentroTrabajo, Semana, Situacion, Renglon, Articulo, Descripcion, Lun..Dom, PorProducir, Kilos, Familia` | Plan semanal + Dashboard |
| `ResumenPlaneacionCF` | `Articulo, Descripcion, CtTrabajo, Concepto, FamiliaCF, Programa, Cliente, S1..S54, P1..P54, Producir, Kg, Gramaje` | Planeación, desglose, familias |
| `CentroFC` | `Centro, Descripcion, Forecast, Grupo*, SubGrupo*` | Grupos del Dashboard |
| `ForecastPlanSemanal`/`D` | Cabecera `ID, Ejercicio, Periodo, Semana, CentroTrabajo, Usuario, Situacion`; detalle `Articulo, Lun..Dom` | Plan semanal (escritura) |
| `MovSituacionFC`/`L`/`UsuarioFC` | Situaciones y permisos | Workflow |
| `DIM_TIEMPO_SEMANA` | `AÑO, MES, SEMANA, FECHAINICIO, FECHAFIN` | Fechas de semana (`@FechaD`/`@FechaA`) |
| `Art` | `Articulo, Descripcion1, FamArtCF, GramajeFC` | Descripción, familia, gramaje |
| `BalanceFC`* | `Usuario, CtTrabajo, Inventario` | Origen de `Inventario` |

> *Solo en la BD real: `WebInicio.Inventario`, `CentroFC.Grupo/SubGrupo`, `BalanceFC`, `DIM_TIEMPO_SEMANA`, `Art`.

## 2. Catálogo de consultas (elige, parametriza, ejecuta)
> Reglas: `fnMayor(x,0)` = `CASE WHEN x>0 THEN x ELSE 0 END`; `DOH = Venta/Inventario` (NULLIF); fila `Total` viene en `WebInicio` (NO calcularla). Implementación propia, nunca `sp*`/`fn*`.

### C1 — Programa Mensual (global por centro)
```sql
SELECT CentroTrabajo, ISNULL(SUM(Venta),0) AS Venta, ISNULL(SUM(AProducir),0) AS AProducir,
       CASE WHEN SUM(ISNULL(TiempoExtra,0))>0 THEN SUM(ISNULL(TiempoExtra,0)) ELSE 0 END AS TiempoExtra,
       ISNULL(SUM(Ocupacion),0) AS Ocupacion,
       CASE WHEN SUM(ISNULL(PzasLibres,0))>0 THEN SUM(ISNULL(PzasLibres,0)) ELSE 0 END AS PzasLibres,
       ISNULL(SUM(DiasHAbiles),0) AS DiasHAbiles, ISNULL(SUM(DiasTextra),0) AS DiasTextra,
       ISNULL(SUM(CapacidadHrs),0) AS CapacidadHrs, ISNULL(SUM(HorasProgram),0) AS HorasProgram,
       ISNULL(SUM(PorOcupacion),0) AS PorOcupacion, ISNULL(SUM(Inventario),0) AS Inventario,
       ROUND(NULLIF(SUM(Venta),0)/NULLIF(SUM(Inventario),0),2) AS DOH
FROM WebInicio WHERE Usuario = '{usuario}'
GROUP BY CentroTrabajo
ORDER BY CASE WHEN RTRIM(LTRIM(CentroTrabajo))='Total' THEN 1 ELSE 0 END, CentroTrabajo
```

### C2 — Programa Mensual por centro específico
```sql
SELECT CentroTrabajo, ISNULL(SUM(Venta),0) AS Venta, ISNULL(SUM(AProducir),0) AS AProducir,
       ISNULL(SUM(CapacidadHrs),0) AS CapacidadHrs, ISNULL(SUM(HorasProgram),0) AS HorasProgram,
       ISNULL(SUM(PorOcupacion),0) AS PorOcupacion,
       CASE WHEN SUM(ISNULL(PzasLibres,0))>0 THEN SUM(ISNULL(PzasLibres,0)) ELSE 0 END AS PzasLibres,
       ISNULL(SUM(DiasHAbiles),0) AS DiasHAbiles, ISNULL(SUM(DiasTextra),0) AS DiasTextra
FROM WebInicio WHERE Usuario = '{usuario}' AND RTRIM(LTRIM(CentroTrabajo)) = '{centro}'
GROUP BY CentroTrabajo
```

### C3 — Desglose por artículo/familia de un centro
```sql
SELECT Articulo, ISNULL(FamiliaCF,'') AS Familia, ISNULL(CtTrabajo,'') AS CtTrabajo,
       ISNULL(Producir,0) AS Producir, ISNULL(Kg,0) AS Kg, ISNULL(Gramaje,0) AS Gramaje
FROM ResumenPlaneacionCF
WHERE Usuario = '{usuario}' AND RTRIM(LTRIM(ISNULL(CtTrabajo,''))) = '{centro}'
```

### C4 — Concentrado de Familias
```sql
SELECT CONVERT(NVARCHAR(100), RTRIM(r.FamiliaCF)) AS Familia,
       ROUND(SUM(ISNULL(r.Producir,0.00)),0) AS PzaProducirse,
       ROUND(SUM(ISNULL(r.Kg,0.00)),0) AS KilogramosdeUso
FROM ResumenPlaneacionCF r WHERE r.Usuario = '{usuario}'
GROUP BY r.FamiliaCF HAVING SUM(ISNULL(r.Producir,0.00)) > 0.00
ORDER BY r.FamiliaCF ASC
```
Añade fila `Total`. Formato: `Familia | PZ A Producirse | Kilogramos de Uso`.

### C5 — Plan semanal por artículo (Lun..Dom)
```sql
SELECT fpp.ID, fpp.Ejercicio, fpp.Periodo, fpp.CentroTrabajo, fpp.Semana, fpp.Renglon,
       fpp.Articulo, fpp.Descripcion, fpp.Lun, fpp.Mar, fpp.Mie, fpp.Jue, fpp.Vie, fpp.Sab, fpp.Dom, fpp.PorProducir,
       ISNULL((SELECT ROUND(SUM(ISNULL(pd.Cantidad,0.00)),2)
                 FROM Prod p JOIN MovTipo mt ON p.Mov = mt.Mov JOIN ProdD pd ON p.ID = pd.ID
                WHERE p.Empresa='INCF' AND p.FechaEmision BETWEEN @FechaD AND @FechaA
                  AND mt.Clave IN ('PROD.E') AND p.Estatus='CONCLUIDO' AND mt.Modulo='PROD'
                  AND pd.Centro = fpp.CentroTrabajo AND pd.Articulo = fpp.Articulo),0) AS Producido
FROM ForecastPlanProduccion fpp
WHERE fpp.Ejercicio = {ejercicio} AND fpp.Periodo = {periodo} AND fpp.Semana = {semana}
```

### C6 — Global a producir (Dashboard semana)
```sql
SELECT CentroTrabajo, SUM(ISNULL(PorProducir,0.00)) AS PzasProducir
FROM ForecastPlanProduccion
WHERE Ejercicio = {ejercicio} AND Periodo = {periodo} AND Semana = {semana}
GROUP BY CentroTrabajo
```

### C7 — Tabla Semana (concentrado por familia de la semana)
```sql
SELECT CentroTrabajo, Familia, SUM(ISNULL(PorProducir,0.00)) AS PzasProducir, SUM(ISNULL(Kilos,0.00)) AS Kilos
FROM ForecastPlanProduccion
WHERE Ejercicio = {ejercicio} AND Periodo = {periodo} AND Semana = {semana}
GROUP BY CentroTrabajo, Familia HAVING SUM(ISNULL(PorProducir,0.00)) > 0.00
ORDER BY CentroTrabajo
```
Display: `Familia · Centro · Piezas a Fabricar · Kg a Mover`.

### C8 — Gráfica Semana (plan diario por centro)
`{prod(d1,d2)}` = subconsulta sobre `Prod/ProdD/MovTipo` (`Clave='PROD.E'`, `Estatus='CONCLUIDO'`, `Modulo='PROD'`, `FechaEmision BETWEEN d1 AND d2`):
```sql
SELECT CentroFC.Centro,
       SUM(ISNULL(ForecastPlanProduccion.Lun,0.00)) AS ALun, SUM({prod(@FechaD, @FechaD)}) AS ALunP,
       SUM(ISNULL(ForecastPlanProduccion.Mar,0.00)) AS BMar, SUM({prod(DATEADD(day,1,@FechaD), DATEADD(day,1,@FechaD))}) AS BMarP,
       SUM(ISNULL(ForecastPlanProduccion.Mie,0.00)) AS CMie, SUM({prod(DATEADD(day,2,@FechaD), DATEADD(day,2,@FechaD))}) AS CMieP,
       SUM(ISNULL(ForecastPlanProduccion.Jue,0.00)) AS DJue, SUM({prod(DATEADD(day,3,@FechaD), DATEADD(day,3,@FechaD))}) AS DJueP,
       SUM(ISNULL(ForecastPlanProduccion.Vie,0.00)) AS EVie, SUM({prod(DATEADD(day,4,@FechaD), DATEADD(day,4,@FechaD))}) AS EVieP,
       SUM(ISNULL(ForecastPlanProduccion.Sab,0.00)) AS FSab, SUM({prod(DATEADD(day,5,@FechaD), DATEADD(day,5,@FechaD))}) AS FSabP,
       SUM(ISNULL(ForecastPlanProduccion.PorProducir,0.00)) AS Total,
       SUM(ISNULL(ForecastPlanProduccion.PorProducir,0.00)*ISNULL(Art.GramajeFC,1)) AS TotalKilos,
       SUM({prod(@FechaD, @FechaA)}) AS Producido,
       SUM({prod(@FechaD, @FechaA)}*ISNULL(Art.GramajeFC,0.00)) AS ProducidoKgs
FROM CentroFC
LEFT JOIN ForecastPlanProduccion
  ON CentroFC.Centro = ForecastPlanProduccion.CentroTrabajo
 AND ForecastPlanProduccion.Ejercicio = {ejercicio}
 AND ForecastPlanProduccion.Periodo = {periodo}
 AND ForecastPlanProduccion.Semana = {semana}
LEFT JOIN Art ON ForecastPlanProduccion.Articulo = Art.Articulo
WHERE CentroFC.Forecast = 1
GROUP BY CentroFC.Centro
```
KPIs = fila `Total`: Piezas a Producir=`Total`, Kilos=`TotalKilos`, Producidas=`Producido`, Kilos Producidos=`ProducidoKgs`.

### C9 — Venta por Grupo (Pay)
```sql
SELECT CentroFC.Grupo, SUM(ISNULL(WebInicio.Venta,0.00)) AS Venta
FROM WebInicio INNER JOIN CentroFC ON WebInicio.CentroTrabajo = CentroFC.Centro
WHERE WebInicio.Usuario = '{usuario}' AND CentroFC.Forecast = 1 AND CentroFC.Grupo IS NOT NULL
GROUP BY CentroFC.Grupo
```
Añade fila `TOTAL`.

### C10 — Dona Pay (utilización/disponible)
```sql
SELECT ROUND((SUM(ISNULL(WebInicio.HorasProgram,0.00))/NULLIF(SUM(ISNULL(WebInicio.Capacidadhrs,0.00)),0))*100,0) AS Utilizacion,
       100 - ROUND((SUM(ISNULL(WebInicio.HorasProgram,0.00))/NULLIF(SUM(ISNULL(WebInicio.Capacidadhrs,0.00)),0))*100,0) AS Disponible
FROM WebInicio LEFT JOIN CentroFC ON WebInicio.CentroTrabajo = CentroFC.Centro
WHERE CentroFC.Grupo = 'CAMPO FRESCO' AND WebInicio.Usuario = '{usuario}' AND CentroFC.Forecast = 1
```

### C11 — Widget por centro (4 grupos)
Datos de `WebInicio` unidos a `CentroFC` (`CentroTrabajo=Centro`); bloques: `CAMPO FRESCO - GRANOS Y SEMILLAS` · `CAMPO FRESCO - PROCESADOS` · `CAMPO FRESCO - MODULOS VARIOS` · `MAQUILA`.
Columnas: `Venta, AProducir, Inventario, DOH, CapacidadHrs, HorasProgram, Ocupacion, TiempoExtra, PzasLibres, DiasHAbiles, DiasTextra`.

## 3. Formatos de pantalla (obligatorios)
| Pantalla | Columnas |
|---|---|
| **Programa Mensual** | `Centro de Trabajo · Forecast de ventas · Piezas programadas · Capacidad Mensual · Horas Programadas · Ocupación · Piezas Libres · Días Hábiles · Días Extra` |
| **Plan por semana** | `Articulo · Descripción · Estación · Lunes..Domingo` |
| **Concentrado de Familias** | `Familia | PZ A Producirse | Kilogramos de Uso` (enteros) |
| **Dashboard** | Tabla Grupo/Forecast (`Grupo · Forecast`) · Dona Pay · 4 bloques widget (por Grupo/SubGrupo): `Centro · Forecast · Piezas Programadas · Inventario · DOH · Capacidad Mensual · Horas Programadas · Capacidad Horas · Ocupación · Horas Extras · Piezas Libres · Días Hábiles · Días Extra` · (semana: 4 KPIs, Global, Gráfica, Tabla) |

> Nota validada vs portal: la Dona Pay del Dashboard (`Pay.svelte`) usa **valores fijos** `77/23` en el código, NO el cálculo real `spWebInicioPay` (que devuelve 80/20 = mi C10). El resto de widgets coincide 100% con `spWebInicioDashboard` y WebInicio+CentroFC.

## 4. Reglas
- **Workflow de situaciones: la IA propone, el humano confirma** (permisos `MovSituacionUsuarioFC`).
- Reportar centros sobrecargados (ocupación > 100%). Validar ocupación ≤ capacidad; persistir en transacción tras confirmación.
- Resultado > 20 filas: totales + ofrecer filtro (centro/familia). `Días` en 0 en centros sin programa NO es error.
