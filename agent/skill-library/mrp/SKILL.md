---
description: >
  Use when the user asks about MRP, explosión de materiales, forecast de venta,
  arribos proyectados, plan o programa de producción, capacidad de centros,
  presupuesto ganadero (VACA), indicadores de cumplimiento, o cualquier
  funcionalidad del portal MRP legacy (sigma-icf) del tenant ICF, y no está
  claro todavía cuál de los 12 skills específicos de ruta aplica. Este skill es
  un ÍNDICE — enruta a los skills mrp-* especializados, no reemplaza su
  contenido detallado.
---

# Skill: MRP (ICF) — Índice de rutas

> **Este skill es SOLO un índice/orquestador.** El detalle procedural de cada
> funcionalidad vive en 12 skills especializados (`agent/skills/mrp-*/SKILL.md`),
> uno por cada ruta real del portal MRP legacy (sigma-icf). El schema de cada
> entidad vive en el Company Twin:
> [company-twin/companies/icf/mrp/index.md](/company-twin/companies/icf/mrp/index.md).

Conexión MCP: **`intelisis-dab`** (remoto, tenant ICF). Tools: `read_records`,
`aggregate_records`. `Usuario` fijo para todo el módulo FC: **`"CGARZA"`** (no
preguntarlo al usuario del chat ni inventar otro valor — todas las tablas de
trabajo del módulo son scratch **por usuario ERP que corre el proceso**, no por
usuario que chatea).

## Primero: ¿esto es "MRP/producción" o "compras" (gap de abasto)?

**"¿Qué me falta comprar?"** / "gap de abasto" / "faltante de insumos o materia
prima" (caso general, por artículo) → usar **`gap-abasto`** directamente, no
este índice. Solo si la pregunta pide explícitamente el nivel de agregación
**por familia** ("faltante de concentrado"), usar `mrp-faltantes`.

## Mapa de rutas del portal → skill específico

| Ruta del portal (sigma-icf) | Qué responde | Skill |
|---|---|---|
| Programa de Arribos | Arribos/recepciones proyectados 12 semanas, cobertura, reorden | [`mrp-arribos`](/agent/skills/mrp-arribos/SKILL.md) |
| Artículos (Art Prototipo) | Prototipos de artículo/receta, costeo, autorización — ⚠️ no confirmado en DAB | [`mrp-articulos`](/agent/skills/mrp-articulos/SKILL.md) |
| Concentrado de Familias | Consolidado de piezas/kg a producir por familia | [`mrp-concentrado`](/agent/skills/mrp-concentrado/SKILL.md) |
| Dashboard | Vista general/KPIs (solapa con Programa Mensual) | [`mrp-dashboard`](/agent/skills/mrp-dashboard/SKILL.md) |
| Faltantes de Materia | Faltante insumos/materia prima/concentrado por familia | [`mrp-faltantes`](/agent/skills/mrp-faltantes/SKILL.md) (→ ver primero `gap-abasto`) |
| Desglose de Forecast | Grid maestro S1-S54/P1-P54 por artículo/cliente/centro | [`mrp-forecast`](/agent/skills/mrp-forecast/SKILL.md) |
| Indicadores | Cumplimiento programado vs. producido real, forecast vs. venta | [`mrp-indicadores`](/agent/skills/mrp-indicadores/SKILL.md) |
| Programa Mensual (`/inicio`) | Ocupación/capacidad por centro, situación del plan semanal | [`mrp-inicio`](/agent/skills/mrp-inicio/SKILL.md) |
| Inventario Semanal | Presupuesto ganadero (VACA) por semana, lotes PEPS/FIFO | [`mrp-inventario`](/agent/skills/mrp-inventario/SKILL.md) |
| Modelado de Centros | Configuración/capacidad de centros y estaciones, balanceo | [`mrp-modelado-centros`](/agent/skills/mrp-modelado-centros/SKILL.md) |
| Validación de Insumos (`/produccion`) | Cobertura de materiales para producir, alcance, capacidad | [`mrp-produccion`](/agent/skills/mrp-produccion/SKILL.md) |
| Programa de Traspasos | Traspasos entre almacenes por semana — ⚠️ no confirmado en DAB | [`mrp-traspasos`](/agent/skills/mrp-traspasos/SKILL.md) |

## Patrones comunes a TODO el módulo FC (aplican en los 12 skills)

- **Snapshot por usuario**: casi todas las tablas de trabajo
  (`ResumenPlaneacionCF`, `ExplocionMatCF`, `BalanceFC`, `WebInicio`, `Arribos12`,
  `CentroFCTemp`, `EstacionTFCTemp`) se sobrescriben (DELETE+INSERT) cada vez que
  alguien "corre" el proceso en el portal. El agente **solo lee** el resultado
  ya calculado — nunca puede disparar el recálculo.
- **Verificar que el proceso se corrió** antes de reportar "no hay datos":
  ```
  read_records(UtLogEjcProMrp, filter: "ORG eq 'CGARZA'",
    select: "LOG_ID,LOG_FYH,ORG,PRM", orderby: ["LOG_FYH desc"], first: 5)
  ```
- **Traducir "semana N" a fechas**: usar `CalendarioFC`/`DimTiempoSemana`, no
  asumir que la semana 1 es la primera del año calendario (depende de cuándo se
  capturó el forecast).
- **Escrituras/transiciones de estatus**: el agente es de **solo lectura** sobre
  este módulo. En particular, autorizar el plan semanal (`ForecastPlanSemanal.
  Situacion = 'AUTORIZADO'`) dispara generación real de Órdenes de Surtido en el
  ERP (`PR_MRP_GENERA_OS`, ver detalle en `mrp-inicio`) — nunca intentar
  replicar esa escritura.
- **Columnas no verificadas por inspección directa**: a diferencia de
  `erp-kernel/*`, las entidades de este módulo vienen de `describe_entities`
  remoto contra ICF, que no expone tipos/PK reales. Si un `read_records` con
  `select` falla, usar `read_records(<Entidad>, first: 1)` sin `select` para
  descubrir el schema real antes de reintentar.

## Limitaciones generales

- Dos skills (`mrp-articulos`, `mrp-traspasos`) cubren rutas cuyos stored
  procedures fuente **no están presentes** en `sp-mrp.sql` (único archivo SQL
  disponible del proyecto sigma-icf) y no tienen entidad documentada en el
  Twin — su lógica de negocio exacta no está verificada; tratarlos como
  "posible gap de cobertura DAB", no como patrones confiables.
- `WebInicio`/`WebInicioHist` tienen filas duplicadas conocidas por calidad de
  datos histórica — deduplicar o advertirlo si se usan en un reporte.
- Este índice y los 12 skills fueron escritos a partir de: (a) lectura directa
  de `sp-mrp.sql` (≈65 stored procedures, proyecto sigma-icf) para extraer la
  lógica de negocio real de cada ruta, y (b) inspección del código de UI
  (`+page.js`/`+page.ts`) de cada ruta para confirmar parámetros y campos
  expuestos. No se ha validado todavía en vivo contra `/chat` — si un patrón
  falla, usar el descubrimiento de schema de la sección anterior en vez de
  asumir que la entidad no sirve.
