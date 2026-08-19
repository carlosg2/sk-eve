# Integración del agente MRP (Daniel) en el tenant ICF — Recursos DAB solicitados al DBA

**Fecha:** 2026-08-19 · **Origen:** `Dani/agente MRP/` (Motor IA MRP) · **DAB actual:** `docs/icf/dab-config-icf.json`
**Objetivo:** listar los objetos de base de datos que hay que dar de alta/verificar en el DAB del
MCP de ICF (`https://api2.maserp.mx/icf/mcp`) **antes** de integrar y probar el agente.

---

## 1. Resumen ejecutivo

El agente de Daniel es un **Motor IA MRP completo** (sesión, forecast, modelado de centros,
programa de producción, explosión de materiales/faltantes, arribos a 12 semanas, indicadores).
Su arquitectura es **"estructura propia"**: consulta y escribe **tablas directamente**
(vía el MCP del DAB), **NO usa los stored procedures del sistema como motor** (solo como
referencia del resultado esperado).

El DAB actual de ICF ya publica **casi todo el módulo FC/MRP** (69 entidades, incluidas todas
las tablas de trabajo `*Temp`, `ResumenPlaneacionCF`, `ForecastPlan*`, `WebInicio`, etc.).
La brecha real para la integración son **4 objetos que NO están publicados** y **columnas a
confirmar** en objetos ya publicados.

> ⚠️ **No se solicitan stored procedures nuevos.** El agente no los ejecuta como motor. Los
> únicos SP del DAB actual (`FaltanteInsumos`, `FaltanteMateriaPrima`, `buscar_registro`) son
> atajos opcionales; el agente de Daniel calcula los faltantes por su cuenta.

---

## 1.1 Corroboración en vivo (2026-08-19, ANTES de empezar el DBA)

Se verificó contra **dos fuentes**: la BD `Intelisis5000` (copia local vía MssqlMcp) y el
**MCP remoto de ICF** (`https://api2.maserp.mx/icf/mcp`, probe `scripts/probe-dab-icf-entidades.ts`).

### A. Las 4 entidades SOLICITADAS ya existen en la BD — solo falta publicarlas en el DAB

| Entidad | Existe en BD | En el DAB hoy | Evidencia |
|---|---|---|---|
| `Usuario` | ✅ tabla (`dbo.Usuario`) | ❌ `EntityNotFound` | columnas confirmadas: `Usuario, Nombre, DefEmpresa, Sucursal, Estatus` + `Contrasena` (⚠️ no exponer en descriptions) |
| `UV_QV_FILLRATE` | ✅ vista (`dbo.UV_QV_FILLRATE`) | ❌ `EntityNotFound` | ⚠️ **ROTA en la copia local**: binding a BD `CAMPOFRESCO` inexistente. En producción el DBA debe confirmar que compila (ver §2) |
| `AuxiliarU` | ✅ tabla (`dbo.AuxiliarU`) | ❌ `EntityNotFound` | 1,630,848 filas; `IDAuxU` NULL; clave compuesta no 100% única → definir key-fields (ver §2) |
| `MovSituacionFCL` | ✅ tabla (`dbo.MovSituacionFCL`) | ❌ `EntityNotFound` | 2 filas reales: `FC/Articulo`, `FC/Plan Semanal` |

### B. Columnas de entidades YA publicadas — TODAS confirmadas en el MCP remoto

| Entidad | Columnas verificadas con `read_records` real | Estado |
|---|---|---|
| `Art` | `Grupo, SeProduce, FamArtCF, GramajeFC, Factorstock, CentroDef, ArribosFC, GranelFC, ArticuloVACA, AlmacenROP, Estatus` | ✅ (nombre real **`ArticuloVACA`**, todo en mayúsculas) |
| `ArtFamFC` | `Familia, TiempoEntrega, StockMinimo, StockMaximo` | ✅ (SÍ existen en Intelisis5000, con datos reales) |
| `DIM_TIEMPO_SEMANA` | `Anio, MES, SEMANA, FECHAINICIO, FECHAFIN` | ✅ **cubre 2026** (semana 1 = 2025-12-29 → 2026-01-04) |
| `Alm` | `Almacen, MateriaPrimaCF, GranelCF, EmpacadoCF` | ✅ |
| `CentroFC` | `Centro, Descripcion, Grupo, SubGrupo, Forecast, Estatus` | ✅ (CRIBACF: `CAMPO FRESCO / GRANOS Y SEMILLAS / Forecast=true`) |
| `WebInicio` | `Usuario, CentroTrabajo, Inventario` | ✅ (con datos reales, ej. CRIBACF2 = 299,032) |

> ⚠️ **Hallazgo de casing**: el campo de `Art` es **`ArticuloVACA`** (no `ArticuloVaca`). Los
> skills del agente de Daniel lo escriben `ArticuloVaca` — en OData/DAB habrá que usar el nombre
> exacto `ArticuloVACA` (o verificar cómo lo normaliza el DAB al publicar).

---

## 2. SOLICITUD AL DBA — 4 entidades NUEVAS a dar de alta en el DAB

| # | Entidad DAB | Objeto DB | Tipo | Columnas que usa el agente | Uso en el agente (skill) | Permisos sugeridos |
|---|---|---|---|---|---|---|
| 1 | `Usuario` | `dbo.Usuario` | tabla | `Usuario, Nombre, DefEmpresa, Estatus, Sucursal` | Validación de sesión (`skill-nucleo` §3, `skill-sesion` §2) y joins de histórico (`skill-forecast` F3) | **read** |
| 2 | `UV_QV_FILLRATE` | `dbo.UV_QV_FILLRATE` | vista | `NO_ARTICULO, FECHA_REMISION, CANTIDAD_EMBARCADA, RECHAZO` | **Venta real** (kg embarcados − rechazo): `skill-forecast` F2, `skill-materiales` M1/M4/M7, `skill-analisis` I1 | **read** |
| 3 | `AuxiliarU` | `dbo.AuxiliarU` | tabla | `Rama, Empresa, Grupo, Cuenta, Fecha, CargoU, AbonoU` | **Saldo de inventario** (ledger contable de existencias): `skill-forecast` F2 "Inventario Semanal" | **read** |
| 4 | `MovSituacionFCL` | `dbo.MovSituacionFCL` | tabla | `Modulo, Mov, ID` | Catálogo de movimientos por módulo para el **workflow de situaciones**: `skill-programa` §1 | **read** |

### Detalle por entidad

**1. `Usuario` — CRÍTICA (bloquea la sesión del agente)**
- El agente inicia cada sesión validando `Usuario` (`SELECT Usuario, Nombre, DefEmpresa FROM Usuario WHERE Usuario = @usuario`) y la usa en el histórico de forecast (F3).
- ✅ Corroborado (2026-08-19): existe en BD con `Usuario, Nombre, DefEmpresa, Sucursal, Estatus` y datos reales (ej. `AAGARCIA · AGUSTIN ARELLANO GARCIA · INCF`). En el DAB da `EntityNotFound`.
- ⚠️ Contiene la columna `Contrasena` (hash). **Exponer solo lectura** y, en la config, no incluirla en ningún `object-description`; el skill del agente nunca debe seleccionarla.

**2. `UV_QV_FILLRATE` — CRÍTICA (venta real)**
- Es la fuente de **venta real embarcada** que alimenta: inventario semanal (F2), cadena neta de materiales (M1), faltantes (M4) y forecast vs ventas (I1).
- ✅ Columnas confirmadas en la BD: `NO_ARTICULO, FECHA_REMISION (varchar), CANTIDAD_EMBARCADA, RECHAZO, CANT_ENTREGADA, PENDIENTE, ID, MOV, ESTATUS` …
- ⚠️⚠️ **HALLAZGO CRÍTICO (2026-08-19)**: la vista **existe pero NO compila en la copia local** — su definición referencia la BD `CAMPOFRESCO` (`Invalid object name 'CAMPOFRESCO.DBO.UV_QV_FILLRATE' ... binding errors`), que **no está en el servidor local**. **El DBA debe confirmar que en producción (`WIN-VPHPNBJGH4Q`) la vista resuelve** (que la BD/objetos referenciados existan) **ANTES de publicarla**, o el DAB fallará al consultarla.
- Definir `key-fields` para la vista (aproximación: `NO_ARTICULO + FECHA_REMISION`).

**3. `AuxiliarU` — necesaria (inventario semanal)**
- Ledger de movimientos contables de inventario; el agente calcula el **saldo inicial** con `SUM(CargoU − AbonoU)` filtrando `Rama='INV'`, `Empresa='INCF'`, `Cuenta=<artículo>` y uniendo `Alm` por `Grupo=Almacen` (`EmpacadoCF=1`).
- ✅ Columnas confirmadas: `ID, Empresa, Rama, Mov, MovID, Grupo, Cuenta, SubCuenta, Fecha, Cargo, Abono, CargoU, AbonoU, Ejercicio, Periodo, Sucursal, Renglon, RenglonSub, IDAuxU`.
- ⚠️ Datos (2026-08-19): **1,630,848 filas**, `IDAuxU` todos NULL (no sirve como llave), y la clave compuesta `Empresa|Modulo|ModuloID|Renglon|RenglonSub` NO es 100% única (1,531,136 distinct). **Definir key-fields con el DBA** (la PK real de producción puede existir) o exponer una **vista filtrada `Rama='INV'`** para reducir volumen. Solo lectura.

**4. `MovSituacionFCL` — menor (workflow)**
- Lista de movimientos por módulo usada por el portal de programa/situaciones. Sin ella, el workflow funciona con `MovSituacionFC` + `MovSituacionUsuarioFC` (ya publicadas), pero el catálogo de movimientos queda incompleto.
- ✅ Corroborado (2026-08-19): existe en BD con columnas `Modulo, Mov, ID` y **solo 2 filas** (`FC/Articulo`, `FC/Plan Semanal`). En el DAB da `EntityNotFound`.

---

## 3. Columnas a CONFIRMAR en entidades ya publicadas (no son alta nueva)

> ✅ **ESTADO 2026-08-19: TODAS CONFIRMADAS** contra el MCP remoto real (probe `scripts/probe-dab-icf-entidades.ts`). La tabla queda como registro de lo verificado y del único matiz de casing (`ArticuloVACA`).

| Entidad (ya publicada) | Columnas que usa el agente | Estado verificado |
|---|---|---|
| `Art` | `Grupo, SeProduce, FamArtCF, GramajeFC, Factorstock, CentroDef, Estatus, ArribosFC, GranelFC, ArticuloVACA, AlmacenROP` | ✅ expuestas (nombre real **`ArticuloVACA`**) |
| `CentroFC` | `Grupo, SubGrupo, Forecast` | ✅ expuestas (CRIBACF: `CAMPO FRESCO / GRANOS Y SEMILLAS / true`) |
| `WebInicio` | `Inventario` | ✅ expuesta (con datos) |
| `ArtFamFC` | `TiempoEntrega, StockMinimo, StockMaximo` | ✅ expuestas (SÍ existen en Intelisis5000, con datos) |
| `Alm` | `MateriaPrimaCF, GranelCF, EmpacadoCF` | ✅ expuestas |
| `DIM_TIEMPO_SEMANA` | `Anio, MES, SEMANA, FECHAINICIO, FECHAFIN` | ✅ **cubre 2026** |
| `Prod` / `ProdD` / `MovTipo` | `Empresa, FechaEmision, Estatus, Articulo, Cantidad, Centro` / `Clave, Modulo` | (ya usadas por los skills actuales; sin cambios) |

> El agente **NO necesita** `ArtVarFC` (usa la columna `VariedadCF` de `ResumenPlaneacionCF`),
> ni `ExplocionMatCF` como dato estable (BOM fuente = `ArtMaterial`, ya publicada).

---

## 4. Decisiones de diseño de la integración (no bloquean al DBA, pero afectan la config)

1. **Escritura (el cambio más grande vs el agente actual de sk-eve).**
   El agente de Daniel **escribe**: carga inicial (genera `ResumenPlaneacionCF`, `ArtCentroTemp`,
   `CentroFCTemp`, `EstacionTFCTemp`, `BalanceFC`, `ForecastArtFam12`, `FCArribos`, `CalendarioFC`),
   edita el forecast (`P1..P54`), genera plan semanal (`ForecastPlanSemanal/D`) y guarda balanceos.
   Todas esas tablas **ya tienen permiso `*`** en el DAB → `create_record`/`update_record` funcionan.
   ⚠️ **Cuidado**: la carga inicial hace **`DELETE ... WHERE Usuario = @usuario`** (bulk).
   El `delete_record` del DAB borra **por llave**, no en bulk. Estrategia a decidir: (a) un SP
   "reset de corrida" como excepción (contradice la filosofía no-SP), (b) borrar fila por fila
   (ineficiente), o (c) que la regeneración sea idempotente sin borrar (update/upsert).

2. **Sesión de usuario: fijo vs dinámico.**
   El stack sk-eve hoy usa `Usuario` fijo del módulo FC: **`"CGARZA"`**. El agente de Daniel
   pide Usuario/Ejercicio/Periodo en la conversación y valida contra la tabla `Usuario`.
   Decisión: ¿validar sesión dinámica (necesita `Usuario` expuesto) o mantener `CGARZA` fijo
   (no necesitaría la tabla)? Recomendación: exponer `Usuario` igual — habilita la sesión
   dinámica y el histórico F3 sin bloqueo.

3. **`UV_QV_FILLRATE` y `DIM_TIEMPO_SEMANA` (datos, no schema).**
   Si la vista de ventas está vacía localmente o el calendario no cubre 2026, las métricas de
   venta real y el rango de semanas fallarán silenciosamente (dará 0 / dato no disponible).

---

## 5. Snippets de configuración DAB sugeridos (para agregar a `dab-config-icf.json`)

```jsonc
"Usuario": {
  "description": "Catálogo de usuarios del ERP (validación de sesión). Solo lectura; NO seleccionar la columna Contrasena.",
  "source": { "object": "dbo.Usuario", "type": "table" },
  "mcp": { "dml-tools": true },
  "graphql": { "enabled": true, "type": { "singular": "Usuario", "plural": "Usuarios" } },
  "rest": { "enabled": true, "path": "/usuario" },
  "permissions": [{ "role": "anonymous", "actions": [{ "action": "read" }] }]
},
"UV_QV_FILLRATE": {
  "description": "Venta real embarcada por artículo/fecha (CANTIDAD_EMBARCADA - RECHAZO). Fuente de venta real del MRP FC. Solo lectura.",
  "source": { "object": "dbo.UV_QV_FILLRATE", "type": "view", "key-fields": ["NO_ARTICULO", "FECHA_REMISION"] },
  "health": { "enabled": false },
  "mcp": { "dml-tools": true },
  "graphql": { "enabled": true, "type": { "singular": "UvQvFillRate", "plural": "UvQvFillRates" } },
  "rest": { "enabled": true, "path": "/uv-qv-fillrate" },
  "permissions": [{ "role": "anonymous", "actions": [{ "action": "read" }] }]
},
"AuxiliarU": {
  "description": "Ledger contable de movimientos de inventario (Rama/Grupo/Cuenta/Fecha, CargoU/AbonoU). Base del saldo de inventario. Solo lectura.",
  "source": { "object": "dbo.AuxiliarU", "type": "table", "key-fields": ["<definir con el DBA>"] },
  "mcp": { "dml-tools": true },
  "graphql": { "enabled": true, "type": { "singular": "AuxiliarU", "plural": "AuxiliarUs" } },
  "rest": { "enabled": true, "path": "/auxiliar-u" },
  "permissions": [{ "role": "anonymous", "actions": [{ "action": "read" }] }]
},
"MovSituacionFCL": {
  "description": "Catálogo de movimientos por módulo para el workflow de situaciones FC. Solo lectura.",
  "source": { "object": "dbo.MovSituacionFCL", "type": "table", "key-fields": ["Modulo", "Mov", "ID"] },
  "mcp": { "dml-tools": true },
  "graphql": { "enabled": true, "type": { "singular": "MovSituacionFCL", "plural": "MovSituacionFCLs" } },
  "rest": { "enabled": true, "path": "/mov-situacion-fcl" },
  "permissions": [{ "role": "anonymous", "actions": [{ "action": "read" }] }]
}
```

> **Nota `AuxiliarU`:** confirmar con el DBA las columnas de llave (o si conviene exponer una
> vista derivada tipo `AuxiliarUInv` ya filtrada a `Rama='INV'` para reducir volumen).

---

## 6. Checklist para el DBA

> ✅ = corroborado por la fábrica (2026-08-19); el DBA respondió el mismo día — ver **§8 (Respuesta del DBA)**.

- [x] ✅ Los 4 objetos **ya existen en la BD** (`Usuario`, `UV_QV_FILLRATE`, `AuxiliarU`, `MovSituacionFCL`).
- [x] ✅ **`UV_QV_FILLRATE`**: verificada en producción — **RESUELTA** (el developer comentó la rama legacy de `CAMPOFRESCO`; la vista compila, 118,573 filas). Publicada (read) — ver §8.3.
- [x] ✅ `dbo.Usuario` dada de alta (read) — PK `Usuario`; `Contrasena` no incluida en descriptions.
- [x] ✅ `dbo.AuxiliarU` dada de alta (read) — key-fields `ID` (PK identity verificada; no se usa vista `Rama='INV'`).
- [x] ✅ `dbo.MovSituacionFCL` dada de alta (read) — key-fields `Modulo+Mov+ID` (PK real).
- [x] ✅ Columnas confirmadas en el MCP remoto: `Art.Grupo/SeProduce/FamArtCF/GramajeFC/Factorstock/CentroDef/ArribosFC/GranelFC/ArticuloVACA/AlmacenROP` (nombre real **`ArticuloVACA`**).
- [x] ✅ Columnas confirmadas: `CentroFC.Grupo/SubGrupo/Forecast`, `WebInicio.Inventario`, `Alm.MateriaPrimaCF/GranelCF/EmpacadoCF`, `ArtFamFC.TiempoEntrega/StockMinimo/StockMaximo`.
- [x] ✅ `DIM_TIEMPO_SEMANA` **cubre 2026** (2008–2026).

---

## 7. Mapa: necesidades del agente → entidades del DAB (cobertura completa)

| Dominio del agente (skill) | Entidades que usa | En DAB ICF actual |
|---|---|---|
| Núcleo/sesión | `Usuario` · `ArtFamFC` · `DIM_TIEMPO_SEMANA` · `VacaPresupuestoVtaCon(D)` · `ResumenPlaneacionCF` | ✅ todo |
| Forecast | `ResumenPlaneacionCF` · `VacaPresupuestoVtaCon(D)` · `AuxiliarU` · `Alm` · `UV_QV_FILLRATE` · `Prod/ProdD/MovTipo` · `ForecastHist` · `Usuario` | ✅ todo |
| Modelado | `CentroFC` · `EstacionTFC` · `ArtCentroTemp` · `CentroFCTemp` · `EstacionTFCTemp` · `BalanceFC` · `Art` | ✅ todo |
| Programa | `WebInicio` · `ForecastPlanProduccion` · `ResumenPlaneacionCF` · `CentroFC` · `ForecastPlanSemanal(D)` · `MovSituacionFC` · **`MovSituacionFCL`** · `MovSituacionUsuarioFC` · `DIM_TIEMPO_SEMANA` · `Art` · `BalanceFC` · `Prod/ProdD/MovTipo` | ✅ todo |
| Materiales | `ArtMaterial` · `Art` · `ResumenPlaneacionCF` · `ArtDisponible` · `ARTDISPONIBLEVACA` · `UV_QV_FILLRATE` · `Prod/ProdD/MovTipo` · `UT_MAX_MIN_COMPRA` · `Alm` · `CentroFC` | ✅ todo |
| Arribos | `ForecastArtFam12` · `Arribos12S` · `ForecastBBC12` · `ArtFamFC` · `Art` · `ArtDisponible` · `ARTDISPONIBLEVACA` · `Alm` · `Compra/CompraD/Prov` · `CalendarioFC` | ✅ todo |
| Análisis | `ResumenPlaneacionCF` · `Art` · `Prod/ProdD/MovTipo` · `UV_QV_FILLRATE` · `DIM_TIEMPO_SEMANA` | ✅ todo |

---

## 8. RESPUESTA DEL DBA (2026-08-19) — alta completada en `dab-config-icf.json`

> Respuesta formal a la solicitud del agente MRP (Daniel). Las 4 entidades quedaron **dadas de
> alta en `c:\Tools\dab-config-icf.json`** y verificadas directamente en **producción**
> (`WIN-VPHPNBJGH4Q` / `Intelisis5000`), no solo en la copia local.

### 8.1 Estado de la solicitud

| # | Entidad DAB | Objeto DB | Key-fields definidos | Estado |
|---|---|---|---|---|
| 1 | `Usuario` | `dbo.Usuario` (tabla) | PK `Usuario` (auto) | ✅ Publicada (read) |
| 2 | `UV_QV_FILLRATE` | `dbo.UV_QV_FILLRATE` (vista) | `NO_ARTICULO` + `FECHA_REMISION` | ✅ Publicada (read) — fix del developer, ver §8.3 |
| 3 | `AuxiliarU` | `dbo.AuxiliarU` (tabla) | `ID` (identity) | ✅ Publicada (read) |
| 4 | `MovSituacionFCL` | `dbo.MovSituacionFCL` (tabla) | `Modulo` + `Mov` + `ID` | ✅ Publicada (read) |

### 8.2 Dudas de key-fields resueltas (verificadas en producción)

**`AuxiliarU` → key-fields `["ID"]`.** Se consultó el catálogo real de llaves en `Intelisis5000`:
la tabla **tiene PK física `priAuxiliarU` sobre la columna `ID`** (identity, NOT NULL) y los datos
lo confirman: **1,630,848 filas con 1,630,848 `ID` distintos**. La duda del documento (clave
compuesta `Empresa|Modulo|ModuloID|Renglon|RenglonSub` no 100% única, `IDAuxU` NULL) queda **sin
efecto**: `IDAuxU` es una columna distinta de `ID`, y al usar `ID` como llave **no hace falta**
exponer una vista filtrada `Rama='INV'`.

**`MovSituacionFCL` → key-fields `["Modulo","Mov","ID"]`.** PK física `priMovSituacionFCL`
verificada (compuesta de 3 columnas). Solo 2 filas en producción.

**`Usuario` → PK `Usuario` (auto).** PK física `priUsuario` sobre la columna `Usuario` (669 filas).
La columna `Contrasena` queda expuesta en el esquema (DAB no oculta columnas a nivel config);
mitigación confirmada: **solo lectura** y no incluirla en `object-description` ni en los skills.

### 8.3 `UV_QV_FILLRATE` — RESUELTA (fix del developer, 2026-08-19)

**Problema detectado (antes):** la vista **no compilaba** porque su definición incluía

```sql
UNION ALL
SELECT ... FROM CAMPOFRESCO.DBO.UV_QV_FILLRATE   -- rama "versión anterior"
```

y la BD **`CAMPOFRESCO` no existe en `WIN-VPHPNBJGH4Q`** (verificado contra `sys.databases`),
rompiendo el binding de toda la vista. La validación de DAB fallaba:

```
fail: Cannot obtain Schema for entity UV_QV_FILLRATE ... Invalid object name 'CAMPOFRESCO.DBO.UV_QV_FILLRATE'.
Could not use view or function 'dbo.UV_QV_FILLRATE' because of binding errors.
```

**Fix aplicado (opción b):** un developer **comentó la rama legacy `UNION ALL` de `CAMPOFRESCO`**;
la vista ahora usa solo los datos locales de `VENTA`/`VENTAD`.

**Verificación post-fix (2026-08-19, en producción):**
- ✅ La vista **compila y regresa datos**: **118,573 filas · 704 artículos** · rango
  `FECHA_REMISION` **01/02/2020 → 31/12/2025** (`NO_ARTICULO, FECHA_REMISION, CANTIDAD_EMBARCADA,
  RECHAZO, CANT_ENTREGADA, ESTATUS` con datos reales).
- ✅ `dab validate` (CLI 2.0.0) **ya no reporta error** para la entidad (`Cannot obtain Schema: 0`,
  `binding errors: 0`, sin fallo de key-fields).
- ⚠️ **Matiz de llave:** el par `NO_ARTICULO + FECHA_REMISION` **no es único** (118,573 filas vs
  52,325 pares; `ID+NO_ARTICULO` tampoco: 116,450). La vista no tiene llave natural. Al ser entidad
  **solo lectura** y usarse siempre con filtros (nunca read por PK), es aceptable; DAB solo
  advertirá de la no unicidad.

**Estado:** ✅ lista para desplegar junto con las otras 3.

### 8.4 Validación del config

- Sintaxis JSON: ✅ válida; **73 entidades** (69 previas + 4 nuevas).
- `dab validate` (CLI local v2.0.0): las 3 entidades publicables **no generan error de entidad**;
  solo falla `UV_QV_FILLRATE` por el binding de `CAMPOFRESCO`.
- Nota: el CLI local reporta ~1 aviso `allOf` por entidad porque la URL del `$schema` v2.0.0 da
  404 — es ruido de la herramienta local, afecta igual a las 69 entidades previas y **no** es un
  problema del config (el MCP desplegado usa este formato hoy).

### 8.5 Checklist actualizado para el DBA

- [x] ✅ `Usuario` dada de alta (read) — PK `Usuario`.
- [x] ✅ `AuxiliarU` dada de alta (read) — key-fields `ID` (PK identity verificada). No se usa vista filtrada.
- [x] ✅ `MovSituacionFCL` dada de alta (read) — key-fields `Modulo+Mov+ID` (PK real).
- [x] ✅ **`UV_QV_FILLRATE` RESUELTA**: el developer comentó la rama legacy de `CAMPOFRESCO` (§8.3);
      la vista compila (118,573 filas) y la entidad valida en DAB. Publicada (read).
- [x] ✅ Columnas confirmadas (sin cambios vs. §3).

---

### Siguiente paso
Las **4 entidades están listas** para desplegar en el MCP de ICF
(`https://api2.maserp.mx/icf/mcp`): `Usuario`, `AuxiliarU`, `MovSituacionFCL` y `UV_QV_FILLRATE`
(esta última ya con el fix del developer, §8.3). Pendiente solo el despliegue/release del config
actualizado (`dab-config-icf.json`).
