# MRP / Forecast-Planeación (FC) — ICF

Conocimiento del módulo **Forecast/Planeación (FC)** de Intelisis, verificado contra
el MCP de ICF (`https://api2.maserp.mx/icf/mcp`, 2026-07-31). **`tenant: icf`** — no
confirmado para otros tenants, por eso vive aquí y no en `erp-kernel/`.

Este módulo calcula el **MRP** (Material Requirements Planning): explota demanda de
ventas/forecast en requerimientos de materia prima/insumos por semana, y organiza el
plan de producción por centro de trabajo. Los tools `faltante_insumos`/
`faltante_materia_prima` (ver [skill gap-abasto](/agent/skills/gap-abasto/SKILL.md))
son la salida ya calculada de este proceso — la mayoría de las entidades de aquí son
**tablas de trabajo internas del proceso**, no destinadas a lectura directa salvo que
se necesite diagnosticar o construir un reporte nuevo.

⚠️ **No hay schema de columnas verificado para estas entidades** (a diferencia de
`erp-kernel/*`, donde el schema viene de inspección directa de SQL Server local). Estas
descripciones vienen de `describe_entities` contra el MCP remoto de ICF, que no expone
tipos ni PK. Antes de construir un patrón de query nuevo, **verificar columnas reales**
con `read_records(<Entidad>, first: 1)` sin `select` para ver todos los campos.

# Contenido

* [Núcleo MRP](mrp-explosion.md) — `ExplocionMatCF`, `BalanceFC`, `BalanceFCHist`, `ProcesadosCF`, `UtLogEjcProMrp`, `UtMaxMinCompra`, `UtMrpPrevioMateriaPrima`, `MovSituacionFC`, `MovSituacionUsuarioFC`.
* [Forecast y arribos a 12 semanas](mrp-forecast-arribos.md) — `Arribos12`, `Arribos12S`, `ArribosSub12S`, `FCArribos`, `ForecastArtFam12`, `ForecastBBC12`, `ForecastHist`, `ForecastAyuda`, `CalendarioFC`, `DimTiempoSemana`, `DimTiempoSemanaIso`, `ArtFamFC`.
* [Plan y programa de producción](mrp-plan-produccion.md) — `ForecastPlanProduccion`, `ForecastPlanSemanal`, `ForecastPlanSemanalD`, `ProgramaProdProcesadosA`, `ProgramaProdSemillasA`, `ProgramaProdSituacionLog`, `Prod`, `ProdD`, `ResumenPlaneacionCF`, `ResumenPlaneacionCFHist`.
* [Centros y estaciones de trabajo](mrp-centros-estaciones.md) — `Centro`, `CentroFC`, `CentroFCHist`, `CentroFCTemp`, `EstacionTFC`, `EstacionTFCHist`, `EstacionTFCTemp`, `ArtCentroTemp`.
* [Presupuesto ganadero / VACA](mrp-vaca-ganadera.md) — `ArtDisponibleVaca`, `VacaPresupuestoVtaCon`, `VacaPresupuestoVtaConD`, `VentaTCalc`.
* [Soporte y portal](mrp-soporte.md) — `Empresa`, `SerieLote`, `MensajeLista`, `PortalForecastLog`, `PushDispositivos`, `WebInicio`, `WebInicioHist`.

Ver el patrón de uso procedural en [agent/skills/mrp/SKILL.md](/agent/skills/mrp/SKILL.md).
