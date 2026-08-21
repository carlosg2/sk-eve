# ICF — Log de cambios del bundle

Historial de promociones del Company Twin de ICF. Más nuevo primero.

## 2026-08-20

- **Corrida del ciclo de la fábrica (skill promote-learnings §4)** — buffer regenerado
  (`scripts/regenerar-learnings.ts`, 41 entradas de los fallos de la campaña E2E) +
  tablero `check-cycle.ts`:
  - **Promovido** `modulos.md` — `ArtPrototipo` y `ArtPrototipoMaterial` añadidos a
    "Entidades que no existen" (verificado en vivo con `read_records(first:1)`:
    EntityNotFound; la explosión real es `ArtMaterial`/`web_art_explosion_material`).
    Cubre `ent-inexistente-artprototipo` (×4) y `ent-inexistente-artprototipomaterial` (×3).
  - **RUTEO (no promover más conocimiento)** — la mayoría del buffer son fallos de
    descubrimiento cuya causa raíz ya se corrigió hoy (2026-08-20) en
    `agent/lib/twin-clean.ts` + `agent/instructions/agent-active.ts` (neutralización de
    wikilinks, catálogo exhaustivo de skills, nomenclatura skill↔concepto↔archivo):
    `skill-inexistente-*`, `archivo-inexistente-*`, `concepto-inexistente-*`
    (incl. `uv-qv-pptocompra`, `erp-kernel`, `mrp-explosion`, `attested-computation`,
    `contrato-de-fuente-de-datos-funciones`, `industrias-campo-fresco-perfil-de-despliegue`,
    etc.). Los `fld-read_records-*` canónicos (casing) → ya en `casing.md`/kernel.
    `req-faltante_insumos-ejercicio`/`req-faltante_materia_prima-ejercicio` → ya
    documentados en `agent/skill-library/gap-abasto/SKILL.md`.
  - **Buffer vaciado** — solo queda el encabezado + `[movtipo-lookup] [pendiente]`
    (sin caso real, regla: no compilar sin evidencia).
  - **Verificado en vivo** (probes de fábrica `probe-firmas-sps.ts`,
    `probe-verifica-artprototipo.ts`, `probe-web-art-explosion.ts`): firmas de SPs
    MRP y disponibilidad de entidades, que se promovieron al kernel
    (`sp-reportes-mrp.md`, `mcp-tools.md`, `index.md`) — ver `erp-kernel/log.md`.

## 2026-08-19

- **Corrida del ciclo de la fábrica (skill promote-learnings §4)** — revisión del
  buffer `state/learnings.md` + tablero `scripts/check-cycle.ts` (ventana 14 días):
  - **Bandeja del runtime**: 1 sola entrada `[movtipo-lookup] [pendiente]` (patrón
    procedural ventas/compras por tipo semántico). Buscada evidencia en la
    radiografía (`llm_inputs` últimos 400 registros): **0 casos reales** de
    preguntas de "tipo de movimiento"/"movtipo". Sin evidencia → **se mantiene
    pendiente** (regla: no compilar sin caso real).
  - **Recurrencias del espejo**: 100% **CANÓNICO → RUTEO** (`ent-inexistente-*`
    ×1..×16, `fld-*` casing ×1..×9). El conocimiento ya está en su hogar
    (`modulos.md`, `casing.md`, kernel) — el modelo no lo consulta antes de
    intentar entidades/campos. **NO promover más conocimiento**: señal de
    descubrimiento (revisar ruteo/instructions).
  - **Resultado**: 0 pendientes reales para promover. Buffer intacto (solo el
    `[pendiente]` justificado). Veredicto de la corrida: nada que compilar.

- **Verificación contra lo real (MCP-ICF + MCP del tenant)** de las entidades
  "no disponibles" y del calendario, antes de dejar el conocimiento como
  canónico:
  - `EmpresaCfg2` y `InvD` → **existen en la BD `Intelisis5000` pero no publicadas
    en el MCP** (EntityNotFound real). Documentadas así en `modulos.md`.
  - `SaldoInv`, `InvSerieLote`, `InvDisp` → **NO existen ni en BD ni en MCP**
    (invenciones del modelo). Separadas en `modulos.md` de las "no publicadas".
  - `DIM_TIEMPO_SEMANA` → campos verificados contra el MCP real: `Anio` (el DAB
    normaliza `AÑO` de la BD), `MES`, `SEMANA`, `NMES`, `NSEMANA`, `FECHAINICIO`,
    `FECHAFIN`, `PERIODOCERRADO`. `casing.md` ganó su fila + correcciones
    `DimTiempoSemana`/`FechaInicio`→`DIM_TIEMPO_SEMANA`/`FECHAINICIO`.
- **Protocolo reforzado**: verificar contra lo real antes de promover es ahora
  paso OBLIGATORIO (knowledge-hygiene §5 paso 0 + promote-learnings §4 +
  check-cycle.ts). Probes de referencia: `scripts/probe-verifica-canonicidad.ts`.

## 2026-08-17

- **Promote** buffer `state/learnings.md` — ~30 entradas clasificadas y vaciadas
  (skill promote-learnings): `fld-*` casing → `erp-kernel/index.md` §Capacidades
  OData (ya cubierto); `ent-inexistente-*` → `modulos.md` (ver Update abajo);
  pendientes `ventad-sin-importe/descripcion` y `almacen-c-fresco` ya cubiertos
  en `erp-kernel/ventad.md` y `policies/operaciones-policy.md`. Queda 1
  `[pendiente]` justificado (`movtipo-lookup`).
- **Update** `modulos.md` — añadidas a "No disponible en ICF" (EntityNotFound
  verificado en runtime 2026-08-06/14): `DimTiempoSemana`, `ArtAlm`,
  `UtLogEjcProMrp`.
- **Update** `mrp/mrp-forecast-arribos.md` — `DimTiempoSemana` marcada como **NO
  existe** en el MCP de ICF (antes documentada como vigente; el runtime la marcó
  EntityNotFound). Proxy recomendado: `CalendarioFC`.
- **Hook** `agent/hooks/memory.ts` enriquecido — las entradas nuevas incluyen
  entidad real (extraída del mensaje DAB "on type '...X'"), hint de campo
  correcto por caso (UPPERCASE solo cuando el campo que falló es camelCase) y
  `sessionId` para trazabilidad a la radiografía.
- **Promote (ampliación)** — los ~25 learnings de casing ambiguos resueltos con
  cross-referencia en el nuevo concepto universal `erp-kernel/casing.md` + regla
  corregida en `erp-kernel/index.md` (la regla genérica "UPPERCASE" de 2026-08-05
  era una sobre-generalización; el casing es POR VISTA).

## 2026-08-13

- **Delete** `art-icf.md` — higiene de conocimiento: el concepto Delta (conteos
  cross-tenant, "vs kernel") es metadata de la fábrica y contaminaba al runtime. El
  conocimiento operativo de estatus de Art en ICF (ALTA/BAJA/BLOQUEADO/PROTOTIPO,
  `AlmacenROP` en uso) pasa a `modulos.md` sin números.
- **Evidencia de fábrica (no runtime)**: `dbo.Art` en ICF verificado en vivo 2026-08-13 —
  **338 campos**, estatus `ALTA` 16,998 / `BAJA` 4,881 / `BLOQUEADO` 774 / `PROTOTIPO` 5
  (rango de ejemplo A6326–A6397), `AlmacenROP` en uso (27 valores distinct),
  `Descripcion1` varchar(100), **22,658 artículos**. Conteos para auditoría de la
  fábrica; el agente ve solo los estatus válidos.
- **Creation** (previo, misma fecha) `art-icf.md` — ver Delete arriba; la evidencia de la
  verificación quedó registrada en esta entrada.
## 2026-08-06

- **Creation** `presupuesto-compras.md` — control de gasto de compras del periodo que
  pide finanzas (reunión 2026-08-05, R-FIN-06/07): presupuesto por artículo
  (`UV_QV_PPTOCOMPRA`, 601 artículos / 154 con `MAXCOMPRAKG > 0`, solo nivel ARTICULO),
  compras del periodo por periodo fiscal (`Compra` `Ejercicio/Periodo`; NO fechas en
  `CompraD` — Edm.Date falla), y regla de desviación 🔴🟡🟢⚪ con ejemplo verificado en
  vivo (A6319 +45%, A5944 +347% sobre presupuesto en julio 2026). Nuevo skill
  procedural `agent/skill-library/control-compras/SKILL.md` registrado en
  `agents/asistente-erp/agent.md` (`skills: [..., control-compras]`). Fuente:
  verificación en vivo contra el MCP ICF 2026-08-06 + transcripción de la reunión.

- **Update** `mrp/mrp-plan-produccion.md` — `ForecastPlanProduccion`: campos del
  DAB son **UPPERCASE** (verificado en runtime 2026-08-06: `Semana eq 31` →
  BadRequest "Could not find a property named 'Semana'"; `SEMANA eq 31` → OK;
  campos reales `ID,EJERCICIO,PERIODO,CENTROTRABAJO,SEMANA,SITUACION,RENGLON,
  ARTICULO,DESCRIPCION,FAMILIA,PORPRODUCIR,KILOS,LUN..DOM`). Hallazgo del E2E
  plan S31 (turno wrun_01KZB5DQZXXDCE5YZ0V9QXKMNK): el modelo siguió el skill
  con camelCase → BadRequest → se recuperó con read_records first:1 (8 steps
  vs 4 baseline). Corregidos también `agent/skill-library/mrp-concentrado`
  (Patrón 2) y `agent/skill-library/mrp-inicio` (Patrón 2) a UPPERCASE.
  `agent/hooks/memory.ts` ampliado: `deriveLearning` ahora reconoce el shape
  "Could not find a property named 'X'" (antes solo "Invalid field to be
  returned/used...") para que el buffer capture estos errores de casing.
- **Update** `mrp/mrp-forecast-arribos.md` — `CalendarioFC` con nota de casing
  camelCase (`Ano`/`Semana`/`FechaD`/`FechaA`). Hallazgo del 2º E2E S31
  (wrun_01KZB5S8R8XK23W6T88PXR9RRD): el modelo sobre-generalizó el UPPERCASE de
  `ForecastPlanProduccion` a `CalendarioFC` (`ANO` → BadRequest) en una llamada
  auxiliar (no bloqueó la respuesta). Se matizaron las notas de UPPERCASE en
  twin + `mrp-inicio` para que sean específicas de `ForecastPlanProduccion` y
  no se generalicen a otras vistas FC.

## 2026-08-05

- **Creation** `modulos.md` — cobertura del MCP de ICF (módulos disponibles y NO disponibles;
  CXP/tesorería/cuentas bancarias → `EntityNotFound`). Promovido desde el buffer
  `state/learnings.md` (keys `ent-inexistente-*`, observadas en runtime 2026-08-05) vía
  el protocolo de la meta-fábrica (promote-learnings). Fuente: trazas del hook + linter
  `lint:knowledge`.
- **Update** `modulos.md` — migración de metadata a OKF v0.2 (`timestamp` → `generated`,
  `# Citations` → `sources`; ADR-006).
