# Gap — agente MRP de Daniel vs. agente sk-eve (asistente-erp ICF)

**Fecha:** 2026-08-19 · **Origen:** `Dani/agente MRP/` (Motor IA MRP) · **Estado:** implementación completada — validación en curso.
**Decisiones previas:** extender `asistente-erp` · solo lectura · sesión dinámica contra `Usuario`.

---

## 1. Diagnóstico (por qué "Daniel responde mejor")

El motor de Daniel impone dos cosas que el agente sk-eve no tenía:

1. **Formato EXACTO de pantalla (regla obligatoria de su constitución).**
   Cada skill define la tabla de "Formatos de pantalla" con las columnas y
   encabezados EXACTOS del portal MRP. La regla: *"un resultado que no siga el
   formato documentado se considera INCORRECTO, aunque los datos sean válidos"*.
   sk-eve responde tablas markdown "limpias" pero genéricas (el modelo elige
   columnas), lo que se siente menos preciso.

2. **Precisión de cálculo (replica la lógica de los SP, no la aproxima).**
   Cadenas netas (nunca forecast bruto), DOH con NULLIF, cumplimiento =
   producido/programado, cobertura con `MIN(...,100)`, redondeos, reglas de
   reorden (`StockMaximo − InventarioFinal` en `N + TiempoEntrega`), etc.
   sk-eve a veces deja que el modelo "interprete" en vez de prescribir la
   fórmula exacta.

Además se detectó **conocimiento stale**: 3 skills siguen afirmando que
`DimTiempoSemana` NO existe, cuando el DBA ya la publicó (2026-08-19).

---

## 2. Comparación dominio por dominio (Daniel vs. sk-eve)

| Dominio (Daniel) | Motor de Daniel | sk-eve (hoy) | Brecha |
|---|---|---|---|
| **Sesión** (skill-nucleo/sesion) | Valida Usuario, Ejercicio, Periodo, calendario, presupuesto CONCLUIDO | `mrp-sesion` creado (2026-08-19) ✅ | ✅ cerrada — queda validar E2E en contexto |
| **Forecast** (skill-forecast) | Desglose S1-S54/P1-P54 + **Inventario Semanal (13 col)** + **Histórico (F3)** | `mrp-forecast` (grid) + AuxiliarU/UV_QV_FILLRATE añadidos | 🟡 falta **formato** del desglose y del inventario semanal (13 col) + **F3 Histórico** (`ForecastHist`+`Usuario`) |
| **Modelado** (skill-modelado) | Centros/estaciones (CentroFCTemp/EstacionTFCTemp), balance (BalanceFC), formato de estación | `mrp-modelado-centros` (parcial) | 🟡 falta formato de estaciones y patrón de lectura de `EstacionTFCTemp`/`BalanceFC` |
| **Programa** (skill-programa) | Programa Mensual (10 col), Plan por semana, Concentrado de Familias, Dashboard (grupos/dona/widgets) | `mrp-inicio`/`mrp-concentrado`/`mrp-dashboard` | 🟡 falta **formato exacto** (Programa Mensual 10 col, Concentrado `Familia|PZ A Producirse|Kilogramos de Uso`) |
| **Materiales** (skill-materiales) | BOM neta, Faltantes MP (22 col)/Insumos (8 col)/Concentrado, Validación P1/P2 con semáforos | `mrp-produccion`/`mrp-faltantes`/`mrp-cf` | 🟡 falta **formato** de Validación (P1/P2) y Faltantes MP/Insumos |
| **Arribos** (skill-arribos) | MP 12S por familia, Insumos 12S por artículo, Embarques MP/BBC (9 renglones), Arribos Pendientes | `mrp-arribos` (patrones 1-3) | 🟡 falta **formato** de los tabs (MP/Insumos/Embarques/Pendientes) |
| **Análisis** (skill-analisis) | Forecast vs Ventas (6 col), Cumplimiento Centros (6 col), Cumplimiento Artículos (9 col) | `mrp-indicadores` (patrones 1-2) | 🟡 falta **formato** de los 3 tabs |
| **Workflow** (skill-programa §situaciones) | Situaciones con permisos (`MovSituacionFC`/`MovSituacionUsuarioFC`/`MovSituacionFCL`) | parcial (solo lectura estatus en mrp-inicio) | 🟢 menor — solo lectura |

**Veredicto:** la cobertura de datos/patrones de sk-eve es **alta** (≈90%);
la brecha principal es **FORMATO de salida** (el "responde en formatos" de
Daniel) + **F3 Histórico** + **formato del Inventario Semanal**. El 10%
restante es detalle de cálculo que el modelo puede replicar si el skill
prescribe la fórmula.

---

## 3. Plan de implementación (priorizado)

### P0 — Higiene: corregir conocimiento stale
- `DimTiempoSemana` YA está publicada → quitar "NO existe" de
  `mrp-cf` (4 menciones), `mrp-concentrado` (1), `mrp-indicadores` (1);
  dejar la alternativa `CalendarioFC` como opción, no como único camino.

### P1 — Formato de pantalla obligatorio en los skills clave
Añadir a cada skill una sección **"Formato de pantalla (obligatorio)"** con las
columnas exactas del portal (tomadas de los skills de Daniel):

| Skill | Formato a añadir |
|---|---|
| `mrp-forecast` | Desglose de Forecast: `Articulo · Descripcion · S32/P32..S36/P36 · Total Inventario · Stock 15 Días` (ventana `[PrimerSemana..+4]`) · Inventario Semanal 13 col · Histórico (`ForecastHist`+`Usuario`) |
| `mrp-inicio` | Programa Mensual: `Centro de Trabajo · Forecast · Piezas programadas · Capacidad Mensual · Horas Programadas · Ocupación · Piezas Libres · Días Hábiles · Días Extra` |
| `mrp-concentrado` | Concentrado de Familias: `Familia | PZ A Producirse | Kilogramos de Uso` + fila `Total` |
| `mrp-indicadores` | Forecast vs Ventas: `Centro de Trabajo · Forecast · Ventas · Cumplimiento · Participación · DOH`; Cumplimiento Centros: `Centro · Programado Kg · Programado Piezas · Producido Kg · Producido Pzas · Cumplimiento`; Cumplimiento Artículos: 9 col |
| `mrp-arribos` | MP 12S por familia / Insumos por artículo / Embarques (9 renglones) / Arribos Pendientes (16+ col) |
| `mrp-faltantes` | Faltantes MP / Insumos / Concentrado (columnas visibles del portal) |
| `mrp-modelado-centros` | Formato de estación: `Estación · Descripción · Capacidad Diaria/Kg · Capacidad Mensual · tn/Hora · Turnos · Horas Turno · Bolsas/min · tiempos` |

Regla transversal que se añadirá a cada skill: **reproducir el formato exacto;
prohibido inventar columnas; si no se conoce el formato, consultar el skill**.

### P2 — Cerrar huecos de patrón
- `mrp-forecast`: añadir **F3 Histórico/versiones** (`ForecastHist` join
  `Usuario` por `Ejercicio`/`Periodo`) y **F2 Inventario Semanal** (saldo
  `AuxiliarU` + venta `UV_QV_FILLRATE` + producción `Prod/ProdD` → 13 col).
- `mrp-modelado-centros`: añadir lectura de `CentroFCTemp`/`EstacionTFCTemp`
  (config por usuario) y `BalanceFC` (balance de carga).

### P3 — Validación
- Linter conocimiento 0 críticos · evals 8/8 · E2E de formatos (1 turno por
  skill editado: concentrado, programa, indicadores, arribos).

---

## 4. Evidencia

- Skills de Daniel: `Dani/agente MRP/.github/skills/*/SKILL.md` (formatos
  exactos, reglas de cálculo).
- Probes validados 2026-08-19: `scripts/probe-dab-icf-entidades.ts`,
  `scripts/probe-dab-icf-patrones-mrp.ts`.
- DAB desplegado (73 entidades) y E2E de sesión/venta/saldo validados.
