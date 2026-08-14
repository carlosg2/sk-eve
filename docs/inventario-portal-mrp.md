# Inventario de extrapolación: portal MRP (sigma-icf) → sistema multiagente

> Estado: 2026-08-11. Mapeo sistemático de las rutas de negocio del portal
> sigma-icf (~/Documents/GitHub/sigma-icf) contra las skills del tenant ICF
> y las tools del MCP (DAB). Objetivo: saber QUÉ está extrapolado, QUÉ falta y
> QUÉ está duplicado antes de decidir skills vs subagentes.

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Rutas de negocio del portal | **20** (excluyendo lab/ y login) |
| SPs web únicos que consume | **~65** (patrón `spWebFC*`, `spPrograma*`, `spFC*`) |
| Skills del tenant ICF | **19** (todas `tenant: icf`, excepto `cxp` universal y `sugerido-compra` marmoles) |
| SPs del portal expuestos en el dab-config | **0** (los configs modulares de sigma-dab son de joya; los del MCP ICF viven en el servidor remoto) |
| Herramientas de negocio mencionadas en skills | `faltante_insumos`, `faltante_materia_prima`, `planartop`, `planeacion_mrp` |

## La matriz ruta → SPs → skill → estado

| Ruta del portal | SPs que consume | Skill del tenant | Estado de extrapolación |
|---|---|---|---|
| `/faltantes` | spWebFCFaltanteMateriaPrima, spWebFCFaltanteInsumos, spWebFCFaltanteConcentrado, spWebCompraArtCostoInfo | `mrp-faltantes`, `gap-abasto` | ✅ **Cubierto** (documenta los 3 SPs como tools `faltante_*`; agregación por familia vía aggregate_records) |
| `/arribos` | spWebArriboDisp*Integracion (3), spWebCoberturaBBC/MateriaPrima, spWebForecastArribos*12 (3), spFCArribosVacaPendientes, spCalendarioTitulo12S | `mrp-arribos` | ✅ **Cubierto** (arribos 12 semanas + cobertura) |
| `/dashboard` | spProgramaProdConcentadoCentro, spProgramaProdConcentadoDashboardCentro, spProgramaProduccionConcentradoCentro/Familia, spWebInicio* (3), spFCPPSemanaLista, spFC_PP_PlanSemana | `mrp-dashboard` | ✅ **Cubierto** (reutiliza fuente de "Programa Mensual") |
| `/inicio` | spProgramaProduccionConcentrado, spProgramaProdConcentadoCentro, spProgramaProdSituacionSemana, spFC_PP_PlanSemana(Guardar), spFCPPSemanaLista, spCambiarSituacionFC, spFCArtLista, spForecastLog, spWebInicio | `mrp-inicio`, `mrp-produccion` | ✅ **Cubierto** (programa mensual + situación semanal) |
| `/inicio-resumen` | spProgramaProduccionConcentrado, spFC_PP_PlanSemana(Guardar), spCambiarSituacionFC, spForecastLog, spWebInicio | `mrp-inicio` | ✅ **Cubierto** (variante resumen) |
| `/concentrado` | spWebInicio, spWebInicioConcentrado | `mrp-concentrado` | ✅ **Cubierto** |
| `/inventario` | spFCArtLista, spFCPPSemanaLista, spProgramaProdSituacionSemana, spVacaPresupuestoForecastSemanal, spWebInicio | `mrp-inventario`, `icf` | ✅ **Cubierto** (presupuesto VACA + asignación) |
| `/traspasos` | spFCProgramaTraspasoSemanal(Guardar), spMRPAlmArribosLista, spMRPInvProgramaTraspaso, spMRPTraspasoSemanaLista | `mrp-traspasos` | ✅ **Cubierto** (incluye GUARDAR — escritura) |
| `/forecast` | spWebDesgloseForecast(Actualizar), spFCForcastFiltro, spWebInicio | `mrp-forecast` | ✅ **Cubierto** |
| `/historico` | spWebForecastHistLista, spWebForecastCargarHist, spWebDesgloseForecast(Actualizar), spFC_PP_PlanSemana(Guardar), spFCPPSemanaLista | `mrp-forecast` | ⚠️ **Parcial** (histórico de forecast; verificar si la skill cubre cargar/guardar histórico) |
| `/indicadores` | spCFArticuloCumplimiento, spCFCentraTrabajoCumplimiento, spCFCentroLista, spCFFamiliaLista, spWebCompraArtCostoInfo | `mrp-indicadores` | ⚠️ **Parcial** (cumplimiento + KPIs; verificar cobertura de los 4 SPs) |
| `/articulos` | spArtPrototipoLista, spArtPrototipoMaterial, spArtPrototipoCosto, spCambiarSituacionArtPrototipo, spRechazarSituacionArtPrototipo, spWebCompraArtCostoInfo | `mrp-articulos` | ⚠️ **Parcial** (prototipos + costeo; incluye escritura cambiar/rechazar) |
| `/modelado1-4` | spArtCentroBalanceo(Cantidad), spBalanceFC, spCFCentroLista, spFCActualizarBases, spFCBasesjson, spWebForecastGuardar, spWebDesgloseForecast, spWebInicio | `mrp-modelado-centros` | ⚠️ **Parcial** (config de centros + balanceo; hay 4 variantes del portal) |
| `/produccion` | spWebCompraArtCostoInfo, spWebDesgloseForecast | `mrp-produccion` | ⚠️ **Parcial** (validación de insumos para producir) |
| `/v2/forecast` | spFCForcastCFNuk | (¿`mrp-cf`?) | ❓ **Sin mapear** (la skill `mrp-cf` describe MRPCF5000; verificar si cubre el SP) |
| `/inicio2` | spFCAsignarCfgDefaul, spForecastLog, spWebForecastCargarHist, spWebForecastHistLista | (ninguna explícita) | ❌ **Sin cubrir** (variante vieja del inicio) |
| `/forecasttest` | (igual que /forecast) | (ninguna) | ❌ **Sin cubrir** (duplicado de /forecast — posible candidata a deprecarse) |

## SPs del portal SIN skill ni tool (los gaps de ejecución)

Los SPs del portal que **ninguna skill documenta como tool dedicada** y que no
aparecen en el dab-config local (viven solo en el MCP remoto):

**Escritura / mutación (los más críticos — hoy el agente no los expone):**
- `spFCProgramaTraspasoSemanalGuardar`, `spFC_PP_PlanSemanaGuardar` — guardar plan
- `spCambiarSituacionFC`, `spCambiarSituacionArtPrototipo`, `spRechazarSituacionArtPrototipo` — estatus
- `spWebForecastGuardar`, `spWebDesgloseForecastActualizar`, `spWebForecastCargarHist` — forecast
- `spFCActualizarBases`, `spFCBasesjson` — bases de modelado
- `spGuardarTokenApp`, `spUsuarioPINValidar` — auth del portal (NO deben extrapolarse)

**Lectura sin mapear:**
- `spVacaPresupuestoForecastSemanal` — presupuesto VACA (¿cubierto por mrp-inventario?)
- `spWebCompraArtCostoInfo` — costo de compra por artículo
- `spFCForcastCFNuk` — forecast CF (¿cubierto por mrp-cf?)
- `spArtCentroBalanceoCantidad` — balanceo por cantidad
- `spWebInicioVentaPay`, `spWebInicioPay` — KPIs de venta del dashboard
- `spForecastLog`, `spFCForcastFiltro` — log/filtro de forecast

## Diagnóstico (lo que el inventario revela)

1. **Cobertura de LECTURA: ~70%** — 13 de 20 rutas tienen skill (más o menos completa).
   Las consultas de negocio (faltantes, arribos, dashboard, programa, inventario,
   traspasos, forecast) están extrapoladas o casi.

2. **Cobertura de ESCRITURA: ~0%** — **ningún SP de mutación del portal está
   expuesto como tool dedicada.** El agente puede "ver" el MRP pero no puede
   *guardar un plan de producción*, *cambiar estatus de una orden*, ni *actualizar
   el forecast*. Este es el gap de valor real: el portal es operativo (el usuario
   toca datos), el agente es solo consultivo.

3. **El portal tiene SPs de auth (`spUsuarioPINValidar`, `spGuardarTokenApp`) que
   NO deben extrapolarse** — son del login del portal, no del dominio de negocio.

4. **Rutas duplicadas/deprecables**: `/forecasttest` (≈ `/forecast`), `/inicio2`
   (≈ `/inicio`), 4 variantes `/modelado1-4` (¿una canónica?). El portal tiene
   historia de iteración; el inventario marca cuáles son las canónicas.

5. **El dab-config local no tiene los SPs del MRP** — las tools `faltante_*`
   viven en el servidor MCP remoto (api2.maserp.mx/icf/mcp). Esto significa que
   la BD local del cliente (Intelisis5000) y el MCP local (localhost:5050) NO
   reproducen el MRP — solo el remoto. **Implicación: el probe del MRP necesita
   el MCP remoto o los SPs deben copiarse a la BD local.**

## Recomendación (orden de ataque)

**Fase 1 — Cerrar el inventario de escritura (el gap de valor):**
los SPs de mutación del MRP son los que convierten al agente de "consultor" en
"operador". Decidir cuáles se exponen como tools del DAB (con HITL de por medio,
patrón `write-needs-approval`) — candidatos: `spFC_PP_PlanSemanaGuardar`,
`spFCProgramaTraspasoSemanalGuardar`, `spCambiarSituacionFC`.

**Fase 2 — Completar las skills parciales:** `/historico`, `/indicadores`,
`/articulos`, `/modelado1-4`, `/produccion` — verificar qué SPs cubre cada skill
y documentar los faltantes (patrón ya usado en mrp-faltantes: SP → tool/aggregate).

**Fase 3 — Decidir skills vs subagentes por forma de tarea:**
- **Consulta** (faltantes, arribos, dashboard, inventario) → skill (ya resuelto).
- **Proceso** (modelado, plan de producción, traspasos con guardar) → subagente
  con su propio contexto (aislamiento) + HITL para escritura. **Primer candidato:
  "Programa de Producción"** (spFC_PP_PlanSemana + Guardar) — es el flujo más
  procesual y el más valioso operativamente.

**Fase 4 — Resolver la BD del MRP:** decidir si los SPs del MRP se traen al
config local (para reproducir/probar contra Intelisis5000) o se mantienen solo
en el MCP remoto (y los evals van contra remoto).

## Fuentes

- Portal: `~/Documents/GitHub/sigma-icf/src/routes/(shell)/` (20 rutas, SPs extraídos de +page.js/components)
- Skills: `~/Documents/GitHub/sk-eve/agent/skill-library/` (20 skills, frontmatter tenant)
- DAB: `~/Documents/GitHub/sk-eve/dab/dab-config.json` (189 entidades: 140 tablas, 33 vistas, 16 SPs)
- Contract: `~/Documents/GitHub/sk-eve/company-twin/erp-kernel/mcp-tools.md`
- Configs modulares: `~/Documents/GitHub/data-api-builder/projects/joya/modules/*/config/` (joya, no ICF)
