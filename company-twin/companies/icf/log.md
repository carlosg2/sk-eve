# ICF — Log de cambios del bundle

Historial de promociones del Company Twin de ICF. Más nuevo primero.

## 2026-08-06

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
