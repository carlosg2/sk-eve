# Manual de dominio: SQL Server / Intelisis (detrás del DAB)

> Referencia de dominio para la capa de datos que el DAB expone: SQL Server
> 2022 (Docker), el esquema Intelisis, vistas, stored procedures y las reglas
> de descubrimiento. Complementa `dab-mastery.md` (el contrato MCP). Fuentes:
> `dab/dab-config.json`, `company-twin/erp-kernel/`, `tools/db_introspect.py`
> del repo sigma-dab. Verificado contra el código 2026-08-10.

## 1. La infraestructura

- **SQL Server 2022** en Docker: contenedor `sv5-sqlserver` (imagen
  `mcr.microsoft.com/mssql/server:2022-latest`), puerto 1433.
- **BD**: por cliente/tenant. Hoy: `JoyaRock_300326` (local, joyarock),
  `INCF` (remota vía `api2.maserp.mx`). **Nueva: `Intelisis5000`** (BD del
  cliente, backup recibido 2026-07-31, 19GB .bak).
- **El agente NUNCA toca SQL directo**: solo vía MCP→DAB (el DAB es la frontera).
  Los probes de la fábrica SÍ pueden consultar SQL (read-only) para descubrir la
  verdad.

## 2. El esquema Intelisis (lo que el DAB expone)

El config declara **~187 entidades** de 3 tipos:

| Tipo | source.type | Ejemplos | Qué son |
|---|---|---|---|
| Tablas | `table` | `dbo.Prov`, `dbo.Art`, `dbo.Compra`, `dbo.Cxp` | Maestros y movimientos |
| Vistas | `view` | `UV_QV_PPTOCOMPRA`, `ArtDisponibleDesc`, `ResumenPlaneacionCF` | Consultas pre-armadas (joins que el DAB no puede hacer) |
| Funciones/SPs | `function`/`stored-procedure` | `fnArtUnidadFactor`, `spAfectar`, `spPlanArt` | Cómputos (vía `execute_entity` o tools dedicados) |

**Patrones del esquema Intelisis (del kernel OKF):**
- **Ciclo de vida de movimientos**: `SINAFECTAR` → `PENDIENTE` → `CONCLUIDO`/`CANCELADO`.
- **Casing por objeto**: UPPERCASE en `ForecastPlanProduccion` (`SEMANA`,
  `EJERCICIO`), camelCase en `CalendarioFC` (`Ano`/`Semana`), `Art`, `Venta`,
  `Compra`. Verificar SIEMPRE con `read_records(entity, first:1)`.
- **Periodo fiscal** (Ejercicio/Periodo) en vez de fechas para filtrar movimientos
  (probe-presupuesto lo validó: filtro por fecha devuelve 0 filas sin error).
- **IDs altos**: los IDs recientes son grandes; filtrar por periodo real, no por
  `ID le N` (lección probe 2).

## 3. El descubrimiento de la verdad: `db_introspect.py` (el probe SQL)

Del repo sigma-dab (`tools/db_introspect.py`, READ-ONLY, SELECT a catálogos del
sistema):

```bash
python tools/db_introspect.py --connection-string "Server=localhost,1433;Database=<bd>;User Id=sa;Password=...;TrustServerCertificate=true" --output-dir <dir>
```

**Output** `db-metadata.json`:
```json
{
  "objects": {
    "Prov": {"type": "table", "key_columns": ["Proveedor"]},
    "CxpSaldo": {"type": "view", "key_columns": ["Empresa","Moneda","Proveedor"]},
    "fnArtUnidadFactor": {"type": "function", "fn_type": "FN"},
    "spAfectar": {"type": "procedure"}
  },
  "_meta": {...}
}
```

**Qué detecta:** auto-detección de tablas vs vistas (+ key columns), filtro de
entidades que no existen, tablas sin PK. Es el **probe que alimenta el
generador** (`generate_dab_config.py`).

## 4. Vistas vs tablas vs funciones (cuándo usar cada una)

| Necesitas… | Usa | Por qué |
|---|---|---|
| CRUD sobre un maestro/movimiento | **Tabla** | DAB hace REST/GraphQL/MCP directo |
| Consulta con joins que el modelo no puede armar | **Vista** | DAB no soporta joins entre entidades; la vista lo encapsula |
| Un cómputo oficial (MRP, impuestos) | **Función/SP** (tool dedicado) | Cómputo sancionado, no improvisado (Attested Computation) |
| Filtro de texto parcial | `buscar_registro` (LIKE servidor) | `contains` OData NO soportado |

**La regla de oro (lección de ICF):** cada consulta que hoy requiere 2-3
`read_records`/`aggregate_records` + joins manuales en skills es candidata a una
**vista** con `object-description` rica → 1 tool call. Es la palanca de
eficiencia #1 (los turnos de 200-430k tokens de la radiografía son el síntoma).

## 5. SPs y funciones clave (del kernel)

| Objeto | Tipo | Uso |
|---|---|---|
| `spAfectar` / `Afectar` | SP | Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR) — tool dedicada `afectar` |
| `spPlanArt` | SP (Attested Computation) | Explosión MRP oficial (sugerido de compra) — fuente de verdad que prevalece |
| `CambiarSituacion` | SP | Cambio de sub-estado |
| `fnArtUnidadFactor` | FN | Factor de conversión de unidades |
| `fnFormaPagoAyudaCaptura` | IF | Formas de pago disponibles para captura |
| `buscar_registro` | tool custom | LIKE en servidor (texto parcial) |

## 6. Oportunidades (la capa de datos)

1. **Probe SQL contra la BD del cliente** (Intelisis5000): `db_introspect.py` →
   `db-metadata.json` → comparar contra el dab-config actual → lista de gaps
   (entidades que faltan, vistas útiles que no existen, tablas sin PK). Es el
   primer probe con datos REALES de cliente.
2. **Vistas para la cola de eficiencia**: los turnos de 200-430k tokens de la
   radiografía (E2E #30=430k, #13=287k) son candidatos a vista.
3. **Key columns para el DAB**: vistas sin PK causan problemas en DAB; el probe
   las detecta y el generador las declara.
4. **Índices**: el probe puede listar índices faltantes para queries frecuentes
   (con cuidado: DBA territory, requiere validación humana).
5. **El SDK de Intelisis como fuente**: `extract_sdk_knowledge.py` (13,826
   archivos .frm/.tbl/.vis) enriquece los conceptos del kernel con campos/tipos
   reales — el pipeline probes→conocimiento completo.

## 8. La verdad real del cliente (Intelisis5000 — probe 2026-08-10)

> Primer probe con datos reales de cliente. Artefacto versionado en sigma-dab:
> `projects/joya/db-metadata/db-metadata-intelisis5000.json` (1.3MB).

**Universo real de la BD del cliente:**

| Objeto | Cantidad | Nota |
|---|---|---|
| Tablas | 4,119 | el config expone ~134 |
| Vistas | 1,963 | el config expone ~31 |
| Stored procedures | 5,749 | — |
| Funciones | 1,312 | 1120 escalares, 47 IF, 145 TVF |
| Tablas sin PK | 1,235 | riesgo DAB (requieren key_columns explícitas) |

**Validación del kernel:** las 23 entidades que el sistema cree conocer (Prov,
Cxp, Venta, Compra, Art, ArtAlm, ArtMaterial, ArtFamFC, Cte, Alm, MovTipo,
Dinero, DineroD, CtaDinero, Empresa, EmpresaCfg2, ResumenPlaneacionCF,
PlanArtOP, ArtDisponible, ArtDisponibleDesc…) **existen todas en la BD del
cliente** ✅ — el conocimiento del kernel no está inventado.

**Gap real encontrado: 265 vistas de negocio no expuestas.** El config expone
~31 vistas; la BD tiene 275 con potencial (filtro por Ppto/Disponible/Saldo/
Forecast/Planeacion/Cxp/Mov/Existencia/Costo). Las más valiosas:

| Vista | Qué da | Por qué importa |
|---|---|---|
| `ArtConCosto`, `ArtCostoCapas`, `ArtCostoEmpresaAlm` | Costos reales por artículo/almacén | el agente no puede responder "¿cuánto cuesta X?" sin joins manuales |
| `ArtExistenciaInv`, `ArtExistenciaReservado`, `ArtDisponibleReservado` | Existencias por estado | el núcleo del negocio (disponibilidad) |
| `AgentSaldo`, `ArtSaldoUSinTarima` | Saldos | consultas financieras de stock |
| `CFDCXCMovImpuesto`, `CFDVentaDMovImpuesto` | Impuestos por movimiento | cumplimiento fiscal/auditoría |

**Lección de interpretación (crítica):** de las 24 entidades del config que el
probe no encontró a primera vista, **12 eran SPs/funciones con prefijo**
(`Afectar` → `spAfectar`, `FormaPagoAyudaCaptura` → `fnFormaPagoAyudaCaptura`,
`RepMovPendientesSurtidoExiste` → existe con prefijo) y `CXP` es case-mismatch
de la tabla `Cxp`. Solo **12 están realmente ausentes** — y son features de OTRO
tenant (joyarock: `VerProvCFDI`, `OrdenCompraPortal`, `BorrarVerCFDI`…) que no
aplican a este cliente. **Un probe sin interpretación genera tickets falsos.**
Regla: prefijos (sp_/fn_/ver_/rep_), case-sensitivity y pertenencia por tenant
se interpretan ANTES de declarar un gap.

**Acción pendiente (NO ejecutada — espera autoresearch):** exponer las vistas
top de negocio en el config con `generate_dab_config.py` + object-description
ricas, en rama, con evals. Cada vista expuesta = 1 tool call en vez de 2-3 joins
manuales = la cola de eficiencia (turnos de 200-430k tokens).

## 9. Gotchas

- **El DAB ignora `--config` con path absoluto**: carga desde CWD (symlink
  `dab-custom/dab-config.json` → `sk-eve/dab/dab-config.json`).
- **Cambios al config requieren restart del DAB** (no aplican en caliente).
- **Nunca SELECT * en probes**: el DAB y el modelo sufren con 100+ columnas.
- **`first`/`primero` como string** = bug de 524k chars (hardening en
  mcp-client.ts lo coacciona, pero es señal de skill desactualizado).
- **La BD del cliente es sagrada**: los probes son READ-ONLY; cualquier vista/SP
  nuevo se crea en staging y se valida antes de tocar producción.

---

*Fuentes: `dab/dab-config.json`, `company-twin/erp-kernel/`, `tools/db_introspect.py`
(sigma-dab), `scripts/probe-*.ts`, tesis v2. Se validará contra la BD real del
cliente (Intelisis5000) cuando esté restaurada. Generado 2026-08-10.*
