---
name: mrp-cf-analyst
version: 1.0.0
description: |
  Responde preguntas de negocio sobre el sistema MRP/Forecast de Campo Fresco
  (MRPCF5000). Combina el conocimiento de los stored procedures documentados
  en 04_Procedure.sql con consultas directas a la base de datos para entregar
  análisis de inventario, cobertura de materia prima, cumplimiento de
  producción y stock de seguridad — sin necesidad de ejecutar los SPs.
triggers:
  - "¿tenemos materia prima suficiente?"
  - "stock de seguridad"
  - "cobertura de inventario"
  - "plan de producción vs disponible"
  - "estado del MRP"
  - "faltantes de producción"
  - "cumplimiento de producción"
  - "¿cuánto frijol tenemos?"
  - "analiza mi inventario"
  - "¿qué nos falta para producir?"
tools:
  - mcp_mssqlmcp_ReadData
  - read
mutating: false
---

# MRP CF Analyst

## Contract

Dado una pregunta de negocio sobre producción, inventario o materia prima:

1. Identifica qué tablas y lógica de `04_Procedure.sql` responden la pregunta.
2. Construye la consulta SQL mínima y suficiente.
3. Ejecuta contra `MRPCF5000` usando nombres completamente calificados (`MRPCF5000.dbo.<tabla>`).
4. Interpreta el resultado en términos de negocio (no jerga técnica).
5. Señala explícitamente si los datos son de un ejercicio anterior al año actual.

**Garantías:**
- Nunca ejecuta DML (INSERT/UPDATE/DELETE).
- Siempre advierte cuando `DIM_TIEMPO_SEMANA` no cubre el año actual.
- Siempre califica los datos por ejercicio y usuario de sesión.

## Modelo de Datos Clave

```
ResumenPlaneacionCF   — Plan de producción por usuario/artículo (S1–S54 semanas)
ExplocionMatCF        — Explosión de materiales vs disponible (snapshot de sesión)
ArtDisponible         — Inventario actual por almacén y empresa
ArtMaterial           — Lista de materiales (BOM): artículo → materiales
DIM_TIEMPO_SEMANA     — Calendario de semanas por año/mes
UV_QV_PPTOCOMPRA      — Stock mínimo y máximo por artículo (materia prima)
ArtFamFC              — Familias del sistema Forecast CF
CentroFCTemp          — Centros de trabajo y capacidades (sesión de usuario)
```

## Fase 1 — Clasificar la pregunta

| Tipo de pregunta | Tablas principales |
|------------------|--------------------|
| Stock de seguridad | `UV_QV_PPTOCOMPRA`, `Art` |
| Inventario disponible | `ArtDisponible`, `Art`, `Alm` |
| Cobertura de materia prima (30 días) | `ExplocionMatCF`, `ArtMaterial` |
| Plan de producción | `ResumenPlaneacionCF` |
| Cumplimiento real vs plan | `ResumenPlaneacionCF`, `Prod`, `ProdD` |
| Capacidad de centros | `CentroFCTemp`, `EstacionTFCTemp` |
| Forecast vs ventas | `ResumenPlaneacionCF`, `VentaTCalc` |

## Fase 2 — Construir la consulta

### Reglas de construcción

1. Usar siempre `MRPCF5000.dbo.<tabla>` (servidor conectado es diferente).
2. Comenzar con `SELECT TOP 1 *` para validar columnas antes de la query real.
3. Para inventario: filtrar `Empresa = 'INCF'` y `Disponible > 0`.
4. Para el plan: filtrar `Ejercicio = <año más reciente disponible>`.
5. Para explosión de materiales: usar `ExplocionMatCF` si tiene datos; si no,
   cruzar `ArtMaterial` × `ArtDisponible` manualmente.
6. Para 30 días: aproximar como `(4.3 / semanas_totales_del_plan) × plan_total`.

### Consultas base reutilizables (ver `scripts/mrp-cf-analyst.sql`)

- `Q1_stock_seguridad_familia`   — min/max por familia desde `UV_QV_PPTOCOMPRA`
- `Q2_inventario_materia_prima`  — disponible por familia/grupo
- `Q3_cobertura_explosion`       — resumen CUBRE/NO CUBRE desde `ExplocionMatCF`
- `Q4_plan_produccion_familia`   — piezas y kg del plan por familia
- `Q5_cumplimiento_periodo`      — producido vs programado por centro/artículo
- `Q6_calendario_vigencia`       — verifica si `DIM_TIEMPO_SEMANA` cubre hoy

## Fase 3 — Interpretar el resultado

Estructura de respuesta estándar:

```
⚠️  [Advertencia de datos si ejercicio < año actual]

## [Pregunta respondida]

### Resumen ejecutivo
[1-2 oraciones con la respuesta directa]

### Detalle por familia
[tabla con cifras relevantes]

### Conclusión y acción sugerida
[qué hacer con esta información]
```

## Output Format

- Tablas en Markdown para datos tabulares.
- Números con separador de miles.
- Kg siempre en Kg (no convertir a toneladas a menos que se pida).
- Colores semáforo: 🔴 crítico / 🟡 parcial / 🟢 OK.
- Siempre incluir la consulta SQL ejecutada en un bloque colapsable.

## Limitaciones Conocidas

- `DIM_TIEMPO_SEMANA` solo contiene datos hasta diciembre 2024; preguntas
  que requieran semanas de 2025/2026 usan aproximaciones proporcionales.
- `ExplocionMatCF` es un snapshot de la última sesión del usuario `MASERP`;
  puede estar desactualizado si no se reejecutó `spWebArtExplosionMaterial`.
- `ArtFamFC` solo tiene la columna `Familia` — los campos `StockMinimo`,
  `StockMaximo`, `TiempoEntrega` que referencian los procedures no existen
  en esta versión de la base; usar `UV_QV_PPTOCOMPRA` como alternativa.
- El servidor vinculado `[192.168.1.11].INTELISIS5000` (empresa VACA) no
  está disponible desde la conexión MCP actual.
