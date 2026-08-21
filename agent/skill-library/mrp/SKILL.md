---
tenant: icf
description: >
  Use when the user asks about MRP, explosión de materiales, forecast de venta,
  arribos proyectados, plan o programa de producción, capacidad de centros,
  presupuesto VACA, indicadores de cumplimiento, o cualquier
  funcionalidad del portal MRP de la empresa ICF, y no está
  claro todavía cuál de los 13 skills específicos de ruta aplica. Este skill es
  un ÍNDICE — enruta a los skills mrp-* especializados, no reemplaza su
  contenido detallado.
---

# Skill: MRP (ICF) — Índice de rutas

> **Este skill es SOLO un índice/orquestador.** El detalle procedural de cada
> funcionalidad vive en los skills `mrp-*` especializados (uno por cada ruta
> real del portal MRP).

**Sesión**: validar Usuario/Ejercicio/Periodo una sola vez con la skill
`mrp-sesion` (`load_skill('mrp-sesion')`). Los snapshots del módulo FC
(`ResumenPlaneacionCF`, `WebInicio`, ...) son scratch **por el usuario que
corrió el proceso** — usar el Usuario de sesión validado y, si no hay datos,
reintentar con `MASERP` (usuario por default que corre el proceso en ICF)
advirtiendo que el dato es de esa corrida.

## Primero: ¿esto es "MRP/producción" o "compras" (gap de abasto)?

**"¿Qué me falta comprar?"** / "gap de abasto" / "faltante de insumos o materia
prima" (caso general, por artículo) → usar **`gap-abasto`** directamente, no
este índice. Solo si la pregunta pide explícitamente el nivel de agregación
**por familia** ("faltante de concentrado"), usar `mrp-faltantes`.

## Mapa de rutas del portal → skill específico

> Cada skill se carga con `load_skill('<slug>')` — las skills no se "exploran"
> como archivos; el catálogo se expone por slug y se carga on-demand.

| Ruta del portal (sigma-icf) | Qué responde | Skill (`load_skill`) |
|---|---|---|
| Programa de Arribos | Arribos/recepciones proyectados 12 semanas, cobertura, reorden | `mrp-arribos` |
| Artículos (Art Prototipo) | Prototipos de artículo/receta, costeo, autorización — ⚠️ cobertura no confirmada | `mrp-articulos` |
| Concentrado de Familias | Consolidado de piezas/kg a producir por familia | `mrp-concentrado` |
| Dashboard | Vista general/KPIs (solapa con Programa Mensual) | `mrp-dashboard` |
| Faltantes de Materia | Faltante insumos/materia prima/concentrado por familia | `mrp-faltantes` (→ ver primero `gap-abasto`) |
| Desglose de Forecast | Grid maestro S1-S54/P1-P54 por artículo/cliente/centro | `mrp-forecast` |
| Indicadores | Cumplimiento programado vs. producido real, forecast vs. venta | `mrp-indicadores` |
| Programa Mensual (`/inicio`) | Ocupación/capacidad por centro, situación del plan semanal | `mrp-inicio` |
| Inventario Semanal | Presupuesto VACA por semana, lotes PEPS/FIFO | `mrp-inventario` |
| Modelado de Centros | Configuración/capacidad de centros y estaciones, balanceo | `mrp-modelado-centros` |
| Validación de Insumos (`/produccion`) | Cobertura de materiales para producir, alcance, capacidad | `mrp-produccion` |
| Programa de Traspasos | Traspasos entre almacenes por semana — ⚠️ cobertura no confirmada | `mrp-traspasos` |
| Sesión / configuración | Validar usuario, ejercicio, periodo, calendario y presupuesto CONCLUIDO | `mrp-sesion` |

> **¿Pregunta de análisis consolidado (no de una ruta específica)?** Stock de
> seguridad/min-máx (`UV_QV_PPTOCOMPRA`), inventario disponible, cobertura de
> materia prima a 30 días, cumplimiento plan vs. real, capacidad de centros o
> forecast vs. ventas en una sola respuesta → usar
> `mrp-cf` (analista MRP CF) en vez de este índice.

## Patrones comunes a TODO el módulo FC (aplican en los 13 skills)

- **Formato de pantalla obligatorio**: varios skills definen una
  sección **"Formato de pantalla (obligatorio)"** con las columnas/encabezados
  EXACTOS del portal MRP (ruta Desglose de Forecast, Programa Mensual,
  Concentrado, Indicadores, Arribos, Faltantes, Modelado). La respuesta DEBE
  reproducir esas columnas y en ese orden; **prohibido inventar columnas** ni
  consolidaciones que el portal no muestre. Si el skill consultado define esa
  sección, es un requisito de salida, no una sugerencia.
- **Snapshot por usuario**: las tablas de trabajo
  (`ResumenPlaneacionCF`, `ExplocionMatCF`, `BalanceFC`, `WebInicio`, `Arribos12`,
  `CentroFCTemp`, `EstacionTFCTemp`) se sobrescriben cada vez que
  alguien "corre" el proceso en el portal. El agente **solo lee** el resultado
  ya calculado — nunca puede disparar el recálculo.
- **Verificar que el proceso se corrió** antes de reportar "no hay datos": no
  hay bitácora de corridas disponible; usa como proxy que el snapshot esté
  poblado (ej. `CalendarioFC` o `ResumenPlaneacionCF` del Usuario trae filas).
- **Traducir "semana N" a fechas**: resolver las fechas con el calendario del
  periodo (ver `mrp-sesion`); no asumir que la semana 1 es la primera del año
  calendario (depende de cuándo se capturó el forecast).
- **Solo lectura**: el agente es de **solo lectura** sobre este módulo. En
  particular, autorizar el plan semanal (situación `AUTORIZADO`) dispara la
  generación real de Órdenes de Surtido en el ERP (ver `mrp-inicio`) — nunca
  intentar replicar esa escritura.
- **Descubrimiento de schema**: si un `read_records` con `select` falla, usar
  `read_records(<Entidad>, first: 1)` sin `select` para descubrir el schema
  real antes de reintentar — no asumir que la entidad no sirve.
- **Regla >20 filas**: un resultado con más de 20 filas NO se vuelca completo
  de golpe — entregar TOTALES (o el agregado que aplique) y OFRECER un filtro
  antes de listar (ej. filtrar por centro/familia/artículo).
- **Formato GFM de tablas**: toda tabla de respuesta usa cabecero + separador
  `|---|---|` con la MISMA cantidad de columnas que el cabecero (y que cada
  fila de datos).

## Limitaciones generales

- `mrp-articulos` y `mrp-traspasos` cubren rutas cuya lógica de negocio **no
  está confirmada** — tratarlas como cobertura no confirmada, no como patrones
  confiables.
- `WebInicio`/`WebInicioHist` tienen filas duplicadas conocidas por calidad de
  datos histórica — deduplicar o advertirlo si se usan en un reporte.
