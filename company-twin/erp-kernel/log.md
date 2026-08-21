# ERP Kernel — Log de cambios del bundle

Historial de promociones del ERP Kernel (capa universal Intelisis). Más nuevo primero.

## 2026-08-20

- **Update** `index.md` §Capacidades OData — regla de **tipos compatibles en operadores**:
  comparar una fecha con comillas (`le '2026-12-31'`) falla con
  `A binary operator with incompatible types` (DateTimeOffset vs String); fechas siempre
  sin comillas y en ISO. Regla de `$filter query parameter is not well formed` (sintaxis
  rota: paréntesis/comillas/operador). Promovido de `odata-read_records` (×10) y
  `odata-aggregate_records` (×4).
- **Update** `sp-reportes-mrp.md` — **firmas verificadas en vivo**: `@Semana` es
  **REQUERIDO** en `programa_produccion_concentrado_centro` (antes `+Semana?`);
  `@ID` REQUERIDO en `fcppplan_semana`. `web_art_explosion_material` acepta SOLO
  `Usuario/Ejercicio/Periodo` (rechaza `FechaEmision`/`FechaD`/`Semana` con
  `InvalidArguments`); el error interno `varchar→datetime out-of-range` es del SP/snapshot,
  no del llamador (respaldo: `read_records(ExplocionMatCF)`). Promovido de
  `req-programa_produccion_concentrado_centro-semana` (×10), `req-fcppplan_semana-id` (×2),
  `fecha-web_art_explosion_material` (×8), `fecha-web_art_material_req_prorrateo` (×1),
  `fecha-vaca_presupuesto_forecast_semanal` (×1).
- **Update** `mcp-tools.md` — documentado `buscar_registro` como Custom Tool con `@campo`
  REQUERIDO (además de `entidad`/`termino`/`primero` numérico). Promovido de
  `req-buscar_registro-campo` (×1).

## 2026-08-17

- **Corrección** regla "Campos en UPPERCASE" de `index.md` §Capacidades OData — era una
  sobre-generalización (promovida 2026-08-05 de los primeros `fld-read_records-*`) que causó
  25+ errores `Invalid field` en entidades camelCase (p.ej. `FECHAEMISION` en Compra — el
  campo real es `FechaEmision`). Nueva regla: casing POR VISTA, verificar con
  `read_records(<Ent>, first:1)`.
- **Creation** `casing.md` — `type: Intelisis Casing Reference`: mapa camelCase vs UPPERCASE
  por entidad (verificado con selects de skills, linter 0 críticos) + tabla de correcciones
  que resuelve por cross-referencia los ~25 learnings ambiguos del buffer ICF
  (`FECHAEMISION`→`FechaEmision`, `FOLIO`→`MovID`, `EXISTENCIA`→`Disponible`,
  `VARIEDAD`→`VariedadCF`, `ANO`→`Ano`, `UNIDAD`→ArtDisponibleDesc,
  `APARTADO`/`DISPMENOSAPARTADO`→ArtDisponible, etc.).
- **Hook** `agent/hooks/memory.ts` — el hint de campo inexistente ya NO afirma "UPPERCASE" a
  ciegas; apunta a casing.md + `read_records(first:1)`.

## 2026-08-13

- **Update** `art.md` — **higiene de conocimiento (capa de fábrica)**: el concepto ahora
  declara SOLO lo operativo (schema, estatus universales `ALTA`/`BAJA`, patrones). Se
  eliminaron del body la sección "Variabilidad entre instalaciones" y los datos duros
  (conteos, comparativas cross-tenant), que son metadata de la fábrica — el agente no
  debe recibirlos. **Evidencia de la verificación 2026-08-13 (fábrica, no runtime)**:
  campos TPS=363 / ICF=338 / MARMOLES=358; estatus TPS ALTA 41,777·BAJA 1,113 / ICF
  ALTA 16,998·BAJA 4,881·BLOQUEADO 774·PROTOTIPO 5 / MARMOLES ALTA 12,380·BAJA 70;
  `Descripcion1` TPS varchar(1000), ICF/MARMOLES varchar(100); `AlmacenROP` solo ICF
  (27 valores); totales TPS 42,890 / ICF 22,658 / MARMOLES 12,450.
- **Update** `art.md` (corrección previa, misma fecha): "380 campos" → ver evidencia
  arriba (338–363 según instalación).
- **Delete** conceptos Delta por tenant (`/companies/icf/art-icf.md`,
  `/companies/tps/art-tps.md`, `/companies/marmoles/art-marmoles.md`) — eran metadata
  de fábrica (conteos cross-tenant) que contaminaba al runtime. El conocimiento
  operativo de estatus del tenant vive ahora en el Company Twin del tenant sin números.
## 2026-08-05

- **Update** Migración de metadata a **OKF v0.2** (ADR-006): `timestamp` → `generated: { by, at }`
  (actor `copilot/sigma-meta-fabrica`) en los 28 conceptos del kernel; `# Citations` →
  `sources` frontmatter en `mcp-tools.md`. `okf_version: "0.2"` en el index raíz.
- **Creation** `sp-planart.md` — `type: Attested Computation`: cómputo sancionado de la
  explosión MRP (`spPlanArt` / tool `planeacion_mrp`), con `runtime`, `parameters`,
  `executor` y `attester`. Promovido desde `planeacion-mrp.md` como mecanismo de Governance
  (attestation del act).
