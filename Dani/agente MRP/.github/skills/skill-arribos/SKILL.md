---
name: skill-arribos
description: 'Calcular arribos y cobertura a 12 semanas. Usar para: proyección de forecast a 12 semanas, cobertura de materia prima/insumos/concentrado/BBC, programa de compras/arribos y pendientes. Pantalla: Programa de Arribos (6-7 tabs).'
user-invocable: true
---

# Arribos y Compras (12 semanas)

> **Autónomo:** TODO aquí. NO volver a `04_Procedure.sql`. Sesión `{usuario}` (cada usuario tiene su `CalendarioFC`).

## 1. Tablas
| Tabla | Columnas | Uso |
|---|---|---|
| `ForecastArtFam12` | `Usuario, Familia, S1..S12, A1..A12` | MP 12S por familia y Embarques MP |
| `Arribos12S` | `Usuario, Articulo, Descripcion, Familia, S1..S12, A1..A12` | Insumos 12S |
| `ForecastBBC12` | `Usuario, Articulo, S1..S12, A1..A12` | Embarques BBC |
| `ArtFamFC` | `Familia, TiempoEntrega, StockMinimo, StockMaximo` | Coberturas |
| `Art` | `Descripcion1, StockMinimo, StockMaximo` | BBC |
| `ArtDisponible`/`ARTDISPONIBLEVACA` | `Empresa, Articulo, Almacen, Disponible` | Disponible |
| `Alm` | `Almacen, MateriaPrimaCF, GranelCF` | Almacenes MP/granel |
| `Compra`/`CompraD`/`Prov` | Órdenes y partidas | Pendientes |
| `CalendarioFC` | `Usuario, NoSemana, Ano, Semana, Mes, FechaD, FechaA` | Cabeceros 12S |

**Disponible:** MP/Embarques = expansión propia (equivale a `fnWebArtFamDisponible`, NO se llama): parte 1 = `ArtDisponible` de artículos `ArribosFC=1`, `GranelFC=0` en almacenes `MateriaPrimaCF=1`; parte 2 = `GranelFC=1` en almacenes `GranelCF=1`; suma con ISNULL por separado. Insumos = `SUM(ARTDISPONIBLEVACA.Disponible)` en almacenes `MateriaPrimaCF=1`.

## 2. Catálogo de consultas
### A1 — Arribos Materia Prima 12S (POR FAMILIA)
```sql
SELECT CONVERT(NVARCHAR(200), RTRIM(ISNULL(f.Familia,''))) AS Familia,
       ROUND(ISNULL((SELECT SUM(ISNULL(d.Disponible,0.00)) FROM ArtDisponible d JOIN Art a ON d.Articulo = a.Articulo
                      WHERE d.Empresa='INCF' AND a.FamArtCF = f.Familia
                        AND d.Almacen IN (SELECT Almacen FROM Alm WHERE MateriaPrimaCF = 1)
                        AND a.ArribosFC = 1 AND a.GranelFC = 0),0.00)
         + ISNULL((SELECT SUM(ISNULL(d.Disponible,0.00)) FROM ArtDisponible d JOIN Art a ON d.Articulo = a.Articulo
                      WHERE d.Empresa='INCF' AND a.FamArtCF = f.Familia
                        AND d.Almacen IN (SELECT Almacen FROM Alm WHERE GranelCF = 1)
                        AND a.ArribosFC = 1 AND a.GranelFC = 1),0.00),0) AS Disponible,
       ISNULL(f.S1,0) AS S1, ISNULL(f.A1,0) AS A1, ... , ISNULL(f.S12,0) AS S12, ISNULL(f.A12,0) AS A12
FROM ForecastArtFam12 f
WHERE f.Usuario = @usuario AND f.Familia IS NOT NULL AND NULLIF(RTRIM(f.Familia),'') IS NOT NULL
ORDER BY Grupo DESC, f.Familia ASC
```
JS: `ifPrev=Disponible`; por semana `IFn = round(ifPrev - Sn + An)`; `DiasInventario = IF1 != 0 ? round(Disponible/IF1*4) : 0`.

### A2 — Arribos Insumos 12S (POR ARTÍCULO)
```sql
SELECT RTRIM(a.Articulo) AS Articulo, CONVERT(NVARCHAR(250), RTRIM(a.Descripcion)) AS Descripcion,
       ROUND(SUM(ISNULL(dv.Disponible,0.00)),0) AS Disponible,
       ISNULL(a.S1,0) AS S1, ISNULL(a.A1,0) AS A1, ... , ISNULL(a.S12,0) AS S12, ISNULL(a.A12,0) AS A12
FROM Arribos12S a
LEFT OUTER JOIN ARTDISPONIBLEVACA dv ON a.Articulo = dv.Articulo AND dv.Empresa='INCF'
  AND dv.Almacen IN (SELECT Alm.Almacen FROM Alm WHERE Alm.MateriaPrimaCF = 1)
WHERE a.Usuario = @usuario AND RTRIM(ISNULL(a.Familia,'')) = 'INSUMO'
GROUP BY a.Familia, a.Articulo, a.Descripcion, a.S1, a.A1, ..., a.S12, a.A12
```
JS igual que A1.

### A3 — Embarques MP 12S / A4 — Embarques BBC 12S (cobertura, 9 renglones)
Plantilla (`{tabla}`=ForecastArtFam12 MP / ForecastBBC12 BBC; `{Ident}`=f.Familia / f.Articulo; disponible por familia §1 / por artículo abajo):
```sql
SELECT CONVERT(NVARCHAR(200), RTRIM(MAX({Ident}))) AS Ident, {descExpr} AS Descripcion,
       ROUND(SUM(ISNULL({disponible},0.00)),0) AS Disponible,
       MAX(ISNULL(af.TiempoEntrega,0)) AS TiempoEntrega, MAX(ISNULL({StockMinimo},0)) AS StockMinimo,
       MAX(ISNULL({StockMaximo},0)) AS StockMaximo,
       SUM(ISNULL(f.S1,0)) AS S1, SUM(ISNULL(f.A1,0)) AS A1, ... , SUM(ISNULL(f.S12,0)) AS S12, SUM(ISNULL(f.A12,0)) AS A12
FROM {tabla} f JOIN ArtFamFC af ON f.Familia = af.Familia
[JOIN Art a ON f.Articulo = a.Articulo]
WHERE f.Usuario = @usuario AND {Ident} IS NOT NULL AND NULLIF(RTRIM({Ident}),'') IS NOT NULL
GROUP BY {Ident} ORDER BY {Ident} ASC
```
- **Disponible BBC** (equivale a `fnWebArtMaterialDisponible`, NO se llama): `SUM(ArtDisponible.Disponible)` de `Empresa='INCF' AND Articulo=@material AND Almacen IN (MP)`.
- **JS por entidad:** `IF[n]=II[n]-S[n]+A[n]+AP[n]`; `CO[n]=S[n] != 0 ? round(IF[n]/S[n]*100)/100 : 0`; si `IF[n]<=StockMinimo` → `SG[n]=StockMaximo-IF[n]`, `AP[n+TiempoEntrega]+=SG[n]` si `n+TiempoEntrega<13`.
- AP = cálculo **APROXIMADO** (no presentar como valor exacto del sistema).
- **9 renglones por entidad:** 1 Inv Inicial · 2 Forecast · 3 (+) Mercancia enTransitos (arribos) · 4 Solicitud de generacion de embarque sugerido por sistema · 5 Arribos proyectados no confirmados · 6 (=) Inventario final: · 7 Semanas de cobertura · 8 Lead time Semanas · 9 (vacío). Redondeo a ENTERO en presentación.

### A5 — Arribos Pendientes (3 bases)
`@FechaA = CAST(GETDATE() AS date)`; `@FechaD = DATEADD(MONTH,-3,@FechaA)`. **UNION** de linked (`[192.168.1.11].INTELISIS5000.DBO.*`, empresas `VACA`/`PDB`) + local (`DBO.*`, empresa `INCF`):
```sql
SELECT ... FROM COMPRA C JOIN COMPRAD CD ON C.ID = CD.ID
  JOIN Prov ON C.Proveedor = Prov.Proveedor JOIN Art A ON CD.Articulo = A.Articulo
WHERE C.EMPRESA IN ('VACA','PDB') AND C.ESTATUS IN ('PENDIENTE')
  AND C.MOV IN ('ORDEN COMPRA','ORDEN CON GASTOS')
  AND CD.FECHAENTREGA BETWEEN @FechaD AND @FechaA
  AND YEAR(C.FechaEmision) > 2023 AND CD.CANTIDADPENDIENTE > 0
  AND A.Estatus = 'ALTA' AND NULLIF(RTRIM(A.CategoriaActivoFijo),'') IS NULL
  AND CD.Articulo LIKE 'A%'
```
- `Cantidad = Cantidad - CantidadCancelada` (neta); `CantidadPendiente = Estatus='BORRADOR' ? Cantidad : CantidadPendiente`. Orden `Empresa, FechaEmision ASC, MovID ASC`. Fechas ISO `yyyy-mm-dd` → presentación dd/mm/aaaa.

### A6 — Calendario 12 semanas
```sql
SELECT NoSemana, Ano, Semana, Mes, FechaD, FechaA FROM CalendarioFC WHERE Usuario = @usuario ORDER BY NoSemana
```
→ cabeceros `SEMANA {Semana} | {Mes}`.

## 3. Formatos de pantalla (obligatorios)
- **MP 12S (por familia):** `Familia · Inventario Inicial · DOH ·` + por semana `Arribos {N} · Consumo {N} · Inventario Final {N}` (agrupado, ~31 filas).
- **Insumos 12S (por artículo):** `Articulo · Descripción · Inventario Inicial · DOH ·` + por semana `Arribos {N} · Consumo {N} · Inventario Final {N}` (~147 filas).
- **Embarques MP/BBC:** 9 renglones de cobertura con columnas `S1..S12`.
- **Arribos Pendientes:** `Articulo · Familia · Descripción · Empresa · Orden de Compra · Rama · Fecha de Emisión · Fecha de Entrega · Proveedor · ProvNombre · Cantidad · Cantidad Pendiente · Contenedor · Aduana Entrada · Tipo de Envío · Tipo de Contenedor · BL` (+`S1..S12`).

> Notas validadas vs portal: (1) el tab **Arribos Pendientes** usa `spFCArribosVacaPendientes` (local INCF) — 320 filas coinciden con A5. (2) Los tabs MP 12S / Insumos 12S / Embarques MP-BBC dependen de tablas remotas (`ForecastArtFam12`, `Arribos12S`, `ForecastBBC12`) que localmente están vacías → muestran 0 filas; el formato de columnas coincide. (3) El portal muestra las **fechas 1 día atrás** que la BD (conversión UTC del frontend); la fecha correcta es la de BD.

## 4. Reglas
- Siempre 12 semanas completas (A→S→IF), nunca omitir. Orden por semana: **Arribos → Consumo → Inventario Final**.
- Prohibido combinar celdas. Cabeceros con acentos tal cual (`Mercancia enTransitos`, etc.).
- Toast: "X artículos en 3 bases (ICF, AVA, PDB)". Respuesta: tabla → Observaciones.
