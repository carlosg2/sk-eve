---
tenant: icf
description: >
  Use when el usuario pregunta por configuración/capacidad de centros de
  trabajo y estaciones (turnos, capacidad real, balanceo de carga). Corresponde
  a la ruta Modelado de Centros (/modelado3) del portal MRP.
---

# Skill: MRP — Modelado de Centros (capacidad y balanceo)

> **Este skill es SOLO procedural.** Schema: [mrp-centros-estaciones.md](`mrp-centros-estaciones`)
> y [mrp-explosion.md](`mrp-explosion`) (`BalanceFC`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`, **`fccentro_capacidad_real`** (SP del portal: capacidad real por centro, devuelve `CapacidadHras`/`CapacidadPzas`; parámetros `Usuario, Centro`).
`Usuario` fijo: **`"MASERP"`**.

## Origen (portal MRP, ruta `/modelado3`; existe un duplicado
`/modelado4` idéntico — el nav real solo enlaza `modelado3`)

Vista de configuración de **capacidad de centros de trabajo**: por cada
`Centro` (catálogo `spCFCentroLista`) se cargan las "bases" de capacidad
(`spFCBasesjson` — un JSON por centro con parámetros de turnos/velocidad,
capturado en `CentroFCTemp`/`EstacionTFCTemp` durante la sesión) y se cruzan
contra el forecast asignado a ese centro (`spBalanceFC`, que corresponde
conceptualmente a la tabla `BalanceFC`).

Distintos **tipos de centro** (Envasado/Cribado, Maquila, Cribado Mitades,
etc.) usan fórmulas de capacidad distintas (piezas/minuto × minutos turno ×
núm. estaciones activas, etc.); el detalle exacto de cada fórmula vive en
`spFCCentroCapacidadReal` (mismo SP que usa la ruta `inicio` para
`CapacidadHrs`) — no se transcribió aquí línea por línea, usar el valor ya
calculado en `CentroFC`/`WebInicio` en vez de recalcularlo. ⚠️ El "tipo" de
centro/estación **no está expuesto como campo DAB** en `EstacionTFC`/`CentroFC`
; el
tipo vive solo en la lógica de los SPs `spFCCentroCapacidadReal`/
`spFCBasesjson`, no es consultable.

## Patrón 1 — Configuración de un centro específico

```
read_records(Centro, filter: "Centro eq '<C>'", select: "Centro,Descripcion")
read_records(CentroFC, filter: "Centro eq '<C>'")   # sin select: descubrir columnas reales primero
```

## Patrón 2 — Estaciones de un centro (tipo no expuesto por DAB)

```
read_records(EstacionTFC, filter: "Centro eq '<C>'", select: "Estacion,Descripcion,Centro")
```

⚠️ `EstacionTFC` no expone el campo `Tipo` por DAB  —
no lo pidas en `select`; el tipo de estación no es consultable.

## Patrón 3 — Selección/temp de la sesión de modelado (por usuario)

`CentroFCTemp`/`EstacionTFCTemp` son **temporales de la sesión de captura
activa** — no confiar en su contenido para reportes históricos ni compararlas
entre usuarios distintos. Schema:

```
# CentroFCTemp: Usuario, Centro, Descripcion, Estatus, DiasHabilies,
#               DiasTiempoExtra, HorasDia, Eficiencia, Tipo
read_records(CentroFCTemp, filter: "Usuario eq 'MASERP'")

# EstacionTFCTemp: Usuario, Estacion, Centro, Descripcion, Estatus,
#                  BolsasxMinutos, TiempoLimpieza, TiempoComida,
#                  TiempoCambiosBobina, TiempoCambioEnfardadora,
#                  CapacidadtnHora, CambioMallas, Turnos, HorasTurnos,
#                  CambiosBolsaPresentacion, CambiosVariedad, CapDiaCr
read_records(EstacionTFCTemp, filter: "Usuario eq 'MASERP'")
```

⚠️ En `CentroFCTemp` el campo **`Tipo` SÍ existe**  — la
limitación de "tipo no expuesto" aplica SOLO al catálogo `EstacionTFC`/`CentroFC`,
no a la tabla temporal de sesión.

## Patrón 4 — Balance de carga por centro (BalanceFC)

`BalanceFC` SÍ está publicada en el MCP ICF : una fila
por artículo con su prioridad, centro y las cantidades balanceadas
(`Venta`/`Producir`/`Inventario` y totales `VentaT`/`ProducirT`/`InventarioT`):

```
read_records(BalanceFC,
  filter: "Usuario eq 'MASERP' and Ejercicio eq 2026 and CtTrabajo eq '<Centro>'",
  select: "Prioridad,CtTrabajo,Concepto,Articulo,Descripcion,Cliente,NombreCte,Programa,Venta,Producir,Inventario,Familia")
```

Usarla para responder "¿qué artículos están asignados al centro X y con qué
carga?" (el portal la alimenta desde `spBalanceFC`).

## Cadena de alimentación (orden de datos)

1. **Asignación artículo → centro:** `Art`/presupuesto → asignación capturada
   en **`ArtCentroTemp`** (tabla temporal por usuario: artículo-centro-programa
   de la sesión de captura — twin `mrp-centros-estaciones.md`; schema no
   enumerado, descubrir sin `select` si hace falta).
2. **Bases de capacidad:** `CentroFC`/`EstacionTFC` (catálogos) → bases
   capturadas en **`CentroFCTemp`**/**`EstacionTFCTemp`** (Patrón 3).
3. Al **guardar el balanceo** se persiste la nueva asignación en
   `ArtCentroTemp`.

## Procedimiento de balanceo de carga (6 pasos)

Procedimiento del portal (skill-modelado de Daniel). **El agente es SOLO
LECTURA: las propuestas de balanceo se presentan al humano antes de aplicar**
(la persistencia la hace el usuario en el portal; el agente no ejecuta DML).

1. **Cargar centros y estaciones:** `CentroFC` (configuración) y `EstacionTFC`
   (estaciones por centro) — Patrones 1 y 2.
2. **Cargar asignación actual:** `ArtCentroTemp` por usuario (qué artículos
   están asignados a cada centro en la sesión de captura):
```
read_records(ArtCentroTemp, filter: "Usuario eq 'MASERP'")
```
3. **Calcular capacidad real** por centro/estación — sección "Capacidad real"
   (días hábiles × horas/día × eficiencia; turnos; bolsas/min).
4. **Calcular carga/ocupación actual por centro:** cruzar la asignación contra
   la capacidad real: `ocupación % = carga asignada / capacidad real × 100`.
   Fuente de carga: `BalanceFC` por `CtTrabajo` (Patrón 4, columnas
   `Venta`/`Producir`/`Inventario`) y/o `ArtCentroTemp`.
5. **Proponer movimientos:** artículos de centros **sobrecargados** (> 100 %)
   → centros con **holgura** (< 100 %). Priorizar por `Prioridad`/carga.
6. **Validar y presentar:** que tras la propuesta cada centro quede ≤ 100 %;
   presentarla al humano. **NO persistir** (solo lectura para el agente).

## Capacidad real por centro/estación (fórmulas)

Refuerzo del cálculo de capacidad (campos ya documentados en Patrón 3:
`CentroFCTemp`: `DiasHabilies`, `HorasDia`, `Eficiencia`; `EstacionTFCTemp`:
`CapDiaCr`, `BolsasxMinutos`, `Turnos`, `HorasTurnos`):

```
CapacidadRealDiaria = HorasDia × Eficiencia              # horas efectivas/día
CapacidadMensual    = CapacidadRealDiaria × DiasHabilies # capacidad del mes (días hábiles)
CapacidadMensual    = CapDiaCr × DiasHabilies            # forma ya calculada (Patrón 3 / pantalla)
```

- `Turnos`/`HorasTurnos` y `BolsasxMinutos` alimentan la fórmula **por tipo de
  estación** (envasado/cribado/maquila…). El tipo no es consultable por DAB y
  la fórmula exacta por tipo vive en los SPs legacy
  (`spFCCentroCapacidadReal`/`spFCBasesjson`) — **usar el valor ya calculado**
  (`CapDiaCr`) en vez de recalcular la fórmula del tipo.
- Ocupación por centro/estación: `carga / CapacidadRealDiaria × 100`.

## Formato de pantalla (obligatorio)

| Pantalla | Columnas |
|---|---|
| **Estaciones de un centro** | `Estación · Descripción · Capacidad Diaria (CapDiaCr) · Capacidad Mensual (= CapDiaCr × DiasHabilies del centro) · tn/Hora (CapacidadtnHora) · Turnos · Horas Turno · Bolsas/min (BolsasxMinutos) · Tiempo Limpieza · Tiempo Comida · Tiempo Cambios Bobina · Tiempo Cambio Enfardadora` |
| **Balance de carga** | `Prioridad · Articulo · Descripción · Cliente · NombreCte · Programa · Venta · Producir · Inventario · Familia` |

Regla: reproducir EXACTAMENTE estas columnas/encabezados (del portal MRP, ruta
`/modelado3`). **Prohibido inventar columnas** ni consolidaciones que el portal
no muestre.

## Limitaciones

- La fórmula interna del balanceo de carga (`spBalanceFC`) no se replica — se
  lee el resultado ya calculado en `BalanceFC` (publicada). Los
  patrones se basan en entidades verificadas contra el MCP.
- Ninguna de estas tablas tiene PK física declarada (salvo `Centro`) — usar
  `read_records(<Entidad>, first: 1)` sin `select` para descubrir columnas
  reales si el `select` propuesto falla.
- `ArtCentroTemp` es scratch de la sesión de captura (schema no enumerado en
  el twin) — si un `select` propuesto falla, descubrir columnas con
  `read_records(ArtCentroTemp, first: 1)`; no comparar entre usuarios/sesiones.
- El balanceo es SOLO propuesta → humano: el agente nunca persiste
  (`create_record`/`update_record` sobre `ArtCentroTemp`/`*Temp` está fuera de
  alcance).
