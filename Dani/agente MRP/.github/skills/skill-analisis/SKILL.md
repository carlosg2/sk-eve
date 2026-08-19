---
name: skill-analisis
description: 'Calcular indicadores e históricos. Usar para: forecast vs ventas, cumplimiento por centro/artículo, ejecución del programa, versiones históricas e inventario semanal. Pantallas: Indicadores, Inventario Semanal, Histórico.'
user-invocable: true
---

# Análisis e Indicadores

> **Autónomo:** TODO aquí. NO volver a `04_Procedure.sql`. Sesión `{usuario}·{ejercicio}·{periodo}`. Fechas del periodo en `yyyyMMdd` (CONVERT 112). `FechaD/FechaA` = MIN/MAX `FECHAINICIO/FIN` de `DIM_TIEMPO_SEMANA`; `FechaMD/FechaMA` = 1er/último día del mes calendario.

## 1. Tablas
`ResumenPlaneacionCF` (r), `Art`, `Prod`/`ProdD`/`MovTipo`, `UV_QV_FILLRATE`, `DIM_TIEMPO_SEMANA`.

## 2. Catálogo de consultas
### I1 — Forecast vs Ventas (por centro)
- **Forecast + Inventario** (`sumS = S1+...+S54`):
```sql
SELECT RTRIM(r.Articulo) AS Articulo, RTRIM(r.CtTrabajo) AS CtTrabajo,
       ROUND(SUM({S1+...+S54}),0) AS Forecast, ROUND(SUM(ISNULL(r.TotalInv,0.00)),0) AS Inventario
FROM ResumenPlaneacionCF r WHERE r.Usuario='{usuario}'
GROUP BY r.Articulo, r.CtTrabajo HAVING SUM({S1+...+S54}) > 0
```
- **Ventas** (mes calendario, equivale a `fnWebVentaFechasAcumFactura`, NO se llama):
```sql
SELECT RTRIM(f.NO_ARTICULO) AS Articulo,
       ROUND(SUM(ISNULL(f.CANTIDAD_EMBARCADA,0.00)-ISNULL(f.RECHAZO,0.00)),0) AS Ventas
FROM UV_QV_FILLRATE f
WHERE CONVERT(datetime, f.FECHA_REMISION) BETWEEN '{FechaMD}' AND '{FechaMA}'
  AND f.NO_ARTICULO IN (SELECT r.Articulo FROM ResumenPlaneacionCF r WHERE r.Usuario='{usuario}')
GROUP BY f.NO_ARTICULO
```
- **JS por centro** (`(SIN CENTRO)` si vacío): `Cumplimiento = Ventas>0 ? round(Ventas/Forecast*100) : 0`; `Participacion = totalVentas>0 ? round(100/totalVentas*Ventas*100)/100 : 0`; `DOH = Inventario>0 ? round(Forecast/Inventario*100)/100 : 0`. Añade `TOTAL`.

### I2 — Cumplimiento de Centros
- **Planeación** (por artículo+centro): `SELECT CtTrabajo, Articulo, FamiliaCF, Descripcion, Kg, Producir, Gramaje FROM ResumenPlaneacionCF LEFT JOIN Art WHERE Usuario='{usuario}'`.
- **Producido** (Pzas):
```sql
SELECT RTRIM(ProdD.Centro) AS Centro, RTRIM(ProdD.Articulo) AS Articulo, ROUND(SUM(ISNULL(ProdD.Cantidad,0.00)),2) AS Pzas
FROM Prod JOIN ProdD ON Prod.ID = ProdD.ID JOIN MovTipo ON Prod.Mov = MovTipo.Mov
WHERE Prod.Empresa='INCF' AND Prod.FechaEmision BETWEEN '{FechaD}' AND '{FechaA}'
  AND MovTipo.Clave IN ('PROD.E') AND Prod.Estatus='CONCLUIDO' AND MovTipo.Modulo='PROD'
GROUP BY RTRIM(ProdD.Centro), RTRIM(ProdD.Articulo)
```
- **JS:** `prodKg = prodPzas × Gramaje`; `cumplimiento = progPzas>0 ? round(prodPzas/progPzas*10000)/100 : 0`. Modo CENTRO: agrupa por centro (suma Kg/Pzas), salida `Centro, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas, Cumplimiento` + `TOTAL`.

### I3 — Cumplimiento de Artículos
- Misma base, **una fila por artículo**; filtros opcionales `Centro` (`ISNULL(r.CtTrabajo,'')='{Centro}'`) y `Familia` (`ISNULL(r.FamiliaCF,'')='{Familia}'`).
- Producido = mismo de I2 (`prodMap['Centro|Articulo']`).
- **Salida** (JOIN `Art`): `Centro, Familia, Articulo, Descripcion, ProgramadoKg, ProducidoKg, ProgramadoPzas, ProducidoPzas, Cumplimiento` + `TOTAL`.
- Centro sin nombre → se muestra `null` en el portal (NO '(SIN CENTRO)'); Familia vacía → `vacio`.

## 3. Formatos de pantalla (obligatorios)
| Tab | Columnas (orden del portal) |
|---|---|
| **Forecast vs Ventas** | `Centro de Trabajo · Forecast · Ventas · Cumplimiento · Participacion · DOH` |
| **Cumplimiento de Centros** | `Centro de Trabajo · Programado Kg. · Programado Piezas · Producido Kg · Producido Pzas · Cumplimiento` |
| **Cumplimiento de Artículos** | `Articulo · Descripción · Centro · Familia · Programado Kg · Programado Pzs · Producido Kg · Producido Pzs · Cumplimiento` |
| **Inventario Semanal** | (ver skill-forecast F2) |

> Validado vs portal: el tab Forecast vs Ventas muestra `null` como nombre de centro cuando `CtTrabajo` es NULL; los tabs de cumplimiento usan `null`/`vacio` igual que la BD.

## 4. Reglas
- Métricas propias y trazables. NO usar SPs. Comparar por clave (artículo/centro), no por orden de filas (sin ORDER BY).
