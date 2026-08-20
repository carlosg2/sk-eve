# Petición al DBA — Gap completo del agente MRP fundamentado en el agente de Daniel

**Fecha:** 2026-08-19 · **De:** Fábrica Sigma (sk-eve) · **Para:** DBA/Backend (integración DAB ICF)
**BD:** `Intelisis5000` (alimenta el MCP de ICF, `https://api2.maserp.mx/icf/mcp`)

---

## 1. Resumen ejecutivo

Auditoría de brechas del **agente MRP de sk-eve vs el motor de Daniel**
(`Dani/agente MRP/`). Se verificó en vivo contra el MCP el estado tras tu
última actualización del config (74 entidades):

- ✅ **Cobertura de ENTIDADES: COMPLETA.** Todas las tablas/vistas que el
  agente de Daniel consulta (45/45 verificadas en vivo con `read_records`)
  ya están publicadas en el MCP. No se pide publicar ninguna tabla nueva.
- ⚠️ **Gap de SPs: el real.** El agente de Daniel usa **~30 stored procedures**
  como referencia de pantallas/cálculos y una **cadena de carga de 11 SPs**
  para regenerar la corrida por sesión. Solo **2** están publicados como tools
  ejecutables (`fcforcast_cfnuk`, `buscar_registro`; además `faltante_insumos`
  y `faltante_materia_prima`).
- 🟢 **El agente sk-eve ya replica los formatos con consultas propias** sobre
  las tablas publicadas (validado E2E). Los SPs de reporte son **opcionales
  (P1/P2)**: garantizan el formato EXACTO del portal y reducen errores de
  cálculo. Los SPs de **carga (P0)** sí son necesarios para que el agente
  pueda regenerar la corrida completa por sesión sin depender del backend.

---

## 2. Estado actual — verificado en vivo (2026-08-19)

| Verificación | Resultado |
|---|---|
| Entidades publicadas en config | **74** (fuente: `dab-config-icf.json`) |
| Entidades del agente de Daniel que responden | **45/45 ✅** (`read_records first:1` OK) |
| Tools MCP | **11** (7 DML + `faltante_insumos`, `faltante_materia_prima`, `fcforcast_cfnuk`, `buscar_registro`) |
| Plan `MASERP · 2026 · P8` | ✅ 90 filas · S32=3,978,128 exacto a referencia |
| Entidades faltantes (`ArtVarFC`, `EmpresaCfg2`, `PlanArtOP`, `TipoImpuesto1`, `ArtPrototipo*`) | ⚠️ NO son consultadas por el agente de Daniel → **no son gap** |

> **Entidades verificadas OK** (todas las que Daniel usa en sus skills):
> `ResumenPlaneacionCF`, `WebInicio`, `ForecastPlanProduccion`, `CentroFC`,
> `ForecastPlanSemanal/D`, `MovSituacionFC/L/UsuarioFC`, `BalanceFC`,
> `ArtMaterial`, `ArtDisponible`, `ARTDISPONIBLEVACA`, `ArtFamFC`,
> `VacaPresupuestoVtaCon/D`, `CalendarioFC`, `ExplocionMatCF`, `ArtCentroTemp`,
> `CentroFCTemp`, `EstacionTFC/TFCTemp`, `ProgramaProdProcesadosA`,
> `ProgramaProdSemillasA`, `ProgramaProdSituacionLog`, `UT_MAX_MIN_COMPRA`,
> `UT_LOG_EJC_PRO_MRP`, `UT_MRP_PREVIO_MATERIA_PRIMA`, `ForecastHist`,
> `ForecastAyuda`, `ForecastArtFam12`, `ForecastBBC12`, `Arribos12/S/Sub12S`,
> `ProcesadosCF`, `FCArribos`, `VentaTCalc`, `AuxiliarU`, `UV_QV_FILLRATE`,
> `DIM_TIEMPO_SEMANA`, `Art`, `Alm`, `Prod`, `ProdD`, `MovTipo`, `Compra`,
> `CompraD`, `Prov`, `Usuario`.

---

## 3. P0 — SPs de carga (necesarios para regenerar la corrida por sesión)

El agente de Daniel regenera la corrida en la **carga inicial** del periodo
(skill-nucleo §5) con esta cadena. Solo `spFCForcastCFNuk` está publicado hoy.
**Recomendado:** crear el **SP envolvente `spWebFCCargaCorrida`** (Opción B-b
pendiente) que ejecute toda la cadena en un solo tool, o publicar cada SP:

| # | SP | Parámetros (firma verificada) | Estado |
|---|---|---|---|
| 1 | `spFCAsignarBasesDefaul` | `@Usuario varchar(10)` | ❌ no publicado |
| 2 | `spArtCentroDefaul` | `@Usuario varchar(10), @Ejercicio int` | ❌ no publicado |
| 3 | `spArtCentroBalanceo` | `@Usuario varchar(10), @json varchar(max)` | ❌ no publicado |
| 4 | `spFCForcastCFNuk` | `@Usuario varchar(10), @Ejercicio int, @Periodo int, @EnSilencio bit` | ✅ publicado (`fcforcast_cfnuk`) |
| 5 | `spWebForecast12` | `@Usuario varchar(10), @FechaEmision datetime` | ❌ no publicado |
| 6 | `spWebForecastFam12S` | `@Usuario varchar(10), @FechaEmision datetime` | ❌ no publicado |
| 7 | `spWebForecastBBC12` | `@Usuario varchar(10), @FechaEmision datetime` | ❌ no publicado |
| 8 | `spWebForecastArribos12` | `@Usuario varchar(10)` | ❌ no publicado |
| 9 | `spWebForecastArribosMateriaPrima12` | `@Usuario varchar(10)` | ❌ no publicado |
| 10 | `spWebForecastArribosInsumo12` | `@Usuario varchar(10)` | ❌ no publicado |
| 11 | `spWebInicio` | `@Usuario varchar(10), @Ejercicio int, @Periodo int, @Familia, @Historico, @EnSilencio bit` | ❌ no publicado |

**Ejemplo de entidad DAB** (mismo patrón que `FCForcastCFNuk`, permiso
`execute`, REST/GraphQL off):

```json
"CargaCorridaFC": {
  "source": { "object": "dbo.spWebFCCargaCorrida", "type": "stored-procedure" },
  "mcp": { "dml-tools": false },
  "permissions": [ { "role": "anonymous", "actions": [ { "action": "execute" } ] } ]
}
```

> **Nota booleanos:** `EnSilencio`/`Historico` deben enviarse como `true`/`false`,
> no `"1"` (DAB rechaza `cannot be resolved ... with type "Boolean"`).

---

## 4. P1 — SPs de reporte del portal (formato EXACTO de pantalla, opcional pero recomendado)

El agente de Daniel usa estos SPs como **referencia del resultado esperado**
de cada pantalla (skill-forecast/programa/materiales/arribos/analisis).
Publicarlos como `execute_entity` permite al agente obtener el formato exacto
del portal en cálculos complejos (cobertura, prorrateo, explosión) y validar
contra la verdad del sistema. **Prioridad P1 = pantallas centrales:**

| # | SP | Firma (verificada) | Pantalla |
|---|---|---|---|
| 1 | `spWebDesgloseForecast` | `@Usuario varchar(10)` | Desglose de Forecast |
| 2 | `spWebCoberturaMateriaPrima` | `@Usuario varchar(10)` | Cobertura MP (Arribos) |
| 3 | `spWebArtMaterialReqProrrateo` | `@Empresa char(5), @Usuario varchar(10), @Ejercicio int, ...` | Requerimiento de materiales prorrateado |
| 4 | `spWebArtExplosionMaterial` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Explosión de materiales |
| 5 | `spWebArtExplosionMatFaltante` | `@Empresa char(5), @Usuario varchar(10), @Nivel int` | Explosión de faltantes |
| 6 | `spWebFCFaltanteConcentrado` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Faltantes concentrado |
| 7 | `spCFArticuloCumplimiento` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Indicador cumplimiento artículos |
| 8 | `spCFCentraTrabajoCumplimiento` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Indicador cumplimiento centros |
| 9 | `spProgramaProduccionConcentradoCentro` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Concentrado por centro |
| 10 | `spProgramaProduccionConcentradoFamilia` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Concentrado por familia |
| 11 | `spWebInicioConcentrado` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Programa mensual concentrado |
| 12 | `spFCCentroCapacidadReal` | `@Usuario varchar(10), @Centro varchar(10), @CapacidadHras float OUTPUT` | Capacidad real por centro |
| 13 | `spWebForecastHistLista` | `@Usuario varchar(10), @Ejercicio int, @Periodo int` | Histórico/versiones |
| 14 | `spWebForecastArribosInsumo12` | `@Usuario varchar(10)` | Arribos insumos 12S |
| 15 | `spWebForecastArribosMateriaPrima12` | `@Usuario varchar(10)` | Arribos MP 12S |
| 16 | `spFCArribosVaca` | `@Usuario varchar(10), @FechaD datetime, @FechaA datetime` | Arribos Vaca (pendientes) |
| 17 | `spVacaPresupuestoForecastSemanal` | `@Usuario varchar(50)='MASERP', @Ejercicio int, @Semana int` | Presupuesto Vaca semanal |
| 18 | `spFC_PP_PlanSemana` | `@Usuario varchar(10), @Ejercicio int, @Periodo int, ...` | Plan semanal |

**P2 — resto de reportes** (solo si se quiere cobertura total del portal):
`spWebDesgloseForecastActualizar`, `spWebForecastGuardar`, `spWebForecastCargarHist`,
`spFCForcastCFAgrupar`, `spFCForcastFiltro`, `spCFFamiliaLista`, `spCFCentroLista`,
`spFCArtLista`, `spFCPPSemanaLista`, `spWebPortalProdArticulo`, `spWebPortalVentaArticulo`,
`spWebCompraArribos`, `spFCProducirAsignar`, `spWebExplocionCapacidad`,
`spProgramaProdSituacionSemana`, `spSituacionPermiteAvanzarFC`, `spWebSituacionInicialFC`,
`spCambiarSituacionFC`, `spFCAsignarCfgDefaul`, `spFCActualizarBases`, `spFCBasesjson`,
`spWebArriboDispFamIntegracion`, `spWebArriboDispInsumoIntegracion`,
`spWebArriboDispBBCIntegracion`, `spWebCoberturaBBC`, `spWebCompraArtCostoInfo`,
`spForecastAyudaLista`, `spForecastAyudaGuardar`, `ProgProdSemillasNukA`,
`ProgProdProcesadosNukA`, `ForcastSemanalCFNuk`, `SpProduccionCF`,
`spWebFCGenerarFaltantes`, `spArtDisponibleForecast`.

---

## 5. ⚠️ NO publicar (seguridad)

- **`spWebSigmaEjecucion @SQL varchar(max)`** — ejecuta **SQL dinámico** arbitrario.
  Es un riesgo de inyección si se expone como tool MCP. NO publicarlo.

---

## 6. Script de verificación (después de publicar)

```sql
-- Cadena de carga (si se publica el envolvente, solo esto):
EXEC spWebFCCargaCorrida 'MASERP', 2026, 8;
-- o la cadena completa:
EXEC spFCAsignarBasesDefaul 'MASERP';
EXEC spArtCentroDefaul 'MASERP', 2026;
EXEC spFCForcastCFNuk 'MASERP', 2026, 8, 1;
EXEC spWebForecast12        'MASERP', @FechaEmision;
EXEC spWebForecastFam12S    'MASERP', @FechaEmision;
EXEC spWebForecastBBC12     'MASERP', @FechaEmision;
EXEC spWebForecastArribos12 'MASERP';
EXEC spWebForecastArribosMateriaPrima12 'MASERP';
EXEC spWebForecastArribosInsumo12 'MASERP';
EXEC spWebInicio 'MASERP', 2026, 8, NULL, 0, 1;

-- Verificación esperada:
SELECT COUNT(*) FROM ResumenPlaneacionCF WHERE Usuario='MASERP';  -- 90
SELECT SUM(S32) FROM ResumenPlaneacionCF WHERE Usuario='MASERP';  -- 3,978,128
```

**Verificación desde el MCP** (lo que hará la fábrica tras tu respuesta):
```
read_records(ResumenPlaneacionCF, Usuario eq 'MASERP')  → 90 filas · S32=3,978,128
mcpListTools → debe aparecer cada SP publicado (ej. webdesgloseforecast, webcoberturamateriaprima...)
```

---

## 7. Pendientes previos (de la petición anterior)

1. **`CargaCorridaFC` (Opción B-b)**: requiere crear `dbo.spWebFCCargaCorrida`; el
   snippet de la entidad está listo (§3) para publicar cuando exista.
2. **Fecha oficial del periodo**: si prefieres re-correr con la fecha oficial de
   `@FechaEmision` de 2026/8 (en lugar del fallback `VacaPresupuestoVtaCon` ID 76
   = 2026-07-29), indícala y se re-corre.
3. **Presupuesto del periodo**: debe estar **CONCLUIDO** para que la corrida tenga insumo.

---

## Resumen para el DBA (una sola frase)

> "No hace falta publicar más tablas: las 74 entidades cubren el 100% de lo que
> consulta el agente de Daniel. Lo que falta son SPs: P0 la **cadena de carga**
> (o el envolvente `spWebFCCargaCorrida`) para regenerar la corrida por sesión, y
> P1 los **SPs de reporte del portal** (Desglose, Cobertura, Cumplimiento,
> Concentrado, Explosión…) para garantizar el formato exacto. NO publicar
> `spWebSigmaEjecucion` (SQL dinámico)."
