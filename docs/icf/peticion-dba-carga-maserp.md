# Petición al DBA/Backend — Correr la carga inicial de la planeación para MASERP (Periodo 8)

**Fecha:** 2026-08-20 · **Solicitado por:** equipo Sigma (agente ERP ICF)
**BD:** `Intelisis5000` (la que alimenta el MCP de ICF, `https://api2.maserp.mx/icf/mcp`)

---

## Contexto

El agente consulta los snapshots del módulo FC/MRP **por usuario** (`ResumenPlaneacionCF`, `WebInicio`, `Arribos12`, `CentroFCTemp`, `EstacionTFCTemp`, `BalanceFC`, etc.). Estos snapshots **no son permanentes**: los regenera la **carga inicial** que se ejecuta al confirmar una sesión en el portal (usuario · ejercicio · periodo).

El usuario `MASERP` **no tiene plan poblado** en el MCP (las semanas `S32..S36`/`P32..P36` vienen en `null`; solo hay inventario `TotalInv`), porque **no se ha corrido la carga inicial con `MASERP` como usuario** para el periodo activo. El ejemplo de referencia (motor de Daniel) usa la corrida `MASERP · 2026 · Periodo 8 · S32–S36`.

**Pedido:** ejecutar la carga inicial con `MASERP` para el **Ejercicio 2026 · Periodo 8**, para que el MCP quede con la misma corrida que usa el motor de referencia.

---

## Receta (script SQL en `Intelisis5000`)

Ejecutar en este orden (firma verificada contra `04_Procedure.sql` del motor):

```sql
USE Intelisis5000;
GO

DECLARE @Usuario    varchar(10) = 'MASERP';
DECLARE @Ejercicio  int         = 2026;
DECLARE @Periodo    int         = 8;
-- Fecha de emisión del presupuesto del periodo (para los SPs de forecast 12S):
DECLARE @FechaEmision datetime = (SELECT TOP 1 FechaEmision FROM ForecastHist
                                  WHERE Ejercicio = @Ejercicio AND Periodo = @Periodo
                                  ORDER BY ID DESC);

-- 1) Bases por defecto de centros/estaciones (sesión del usuario)
EXEC spFCAsignarBasesDefaul @Usuario;

-- 2) Artículos → centro default (desde el presupuesto VacaPresupuestoVtaConD)
EXEC spArtCentroDefaul @Usuario, @Ejercicio;

-- 3) [Opcional] Balanceo de carga entre centros (solo si se quiere re-balancear;
--    requiere el JSON de asignación actual)
-- EXEC spArtCentroBalanceo @Usuario, @json;  -- omitir si el balanceo ya está

-- 4) Forecast 54 semanas → regenera ResumenPlaneacionCF (el snapshot PRINCIPAL)
EXEC spFCForcastCFNuk @Usuario, @Ejercicio, @Periodo, @EnSilencio = 1;

-- 5) Forecast 12 semanas (familias y BBC) + arribos 12 semanas
EXEC spWebForecast12         @Usuario, @FechaEmision;
EXEC spWebForecastFam12S     @Usuario, @FechaEmision;
EXEC spWebForecastBBC12      @Usuario, @FechaEmision;
EXEC spWebForecastArribos12  @Usuario;

-- 6) Programa mensual por centro (WebInicio)
EXEC spWebInicio @Usuario, @Ejercicio, @Periodo, @EnSilencio = 1;
GO
```

> Nota: el paso 3 (`spArtCentroBalanceo`) recibe un `@json` con la asignación
> artículo→centro. Si no se quiere alterar el balanceo actual, omitirlo (los
> pasos 1-2 y 4-6 bastan para poblar el plan).

---

## Verificación (debe quedar así)

Tras ejecutar, comprobar en la misma BD:

```sql
-- Conteo de artículos con plan para MASERP (esperado ~90-100)
SELECT COUNT(*) FROM ResumenPlaneacionCF WHERE Usuario = 'MASERP';

-- El periodo 8 debe tener plan real (S32..S36 > 0), no null:
SELECT SUM(ISNULL(S32,0)) AS S32, SUM(ISNULL(P32,0)) AS P32,
       SUM(ISNULL(S33,0)) AS S33, SUM(ISNULL(P33,0)) AS P33,
       SUM(ISNULL(S34,0)) AS S34, SUM(ISNULL(P34,0)) AS P34,
       SUM(ISNULL(S35,0)) AS S35, SUM(ISNULL(P35,0)) AS P35,
       SUM(ISNULL(S36,0)) AS S36, SUM(ISNULL(P36,0)) AS P36
FROM ResumenPlaneacionCF WHERE Usuario = 'MASERP';
```

Esperado (referencia del motor): S32 ≈ 3,978,128 · P32 ≈ 2,867,048 · S33 ≈ 2,440,112 · S34 ≈ 1,973,193 · S35 ≈ 2,142,893 (el resto puede variar por la corrida).

---

## Opción B (opcional, recomendada): publicar la carga como tool MCP

Para que el agente pueda **regenerar la corrida por sesión** (flujo completo de
Daniel) en lugar de depender de una corrida manual, publicar en el DAB el SP de
carga como stored-procedure ejecutable:

- Entidad/SP a publicar: **`spFCForcastCFNuk`** (parámetros `Usuario`,
  `Ejercicio`, `Periodo`, `EnSilencio`) — como mínimo.
- Idealmente también: `spFCAsignarBasesDefaul`, `spArtCentroDefaul`,
  `spWebForecast12`, `spWebForecastFam12S`, `spWebForecastBBC12`,
  `spWebForecastArribos12`, `spWebInicio`.

Así el MCP expondría `execute_entity(spFCForcastCFNuk, ...)` (hoy devuelve
`EntityNotFound`) y el agente replicaría el ciclo sesión → carga → consulta.

---

## Notas

- El MCP de ICF es de **solo lectura** para el agente (CRUD + `execute_entity`
  de SPs publicados); la carga la ejecuta el equipo, no el agente.
- El presupuesto del periodo debe estar **CONCLUIDO** (`VacaPresupuestoVtaCon`
  Estatus = 'CONCLUIDO'); si no, `spFCForcastCFNuk` no tiene insumo.
- Cualquier duda con parámetros, la firma verificada está en
  `Dani/agente MRP/SQL/04_Procedure.sql` (SPs en las líneas 738, 1006, 1170,
  3066, 4264, 5107, 5792, 6132, 6557).
