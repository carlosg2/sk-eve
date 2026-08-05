---
description: >
  Use when the user pregunta por configuración/capacidad de centros de
  trabajo y estaciones (turnos, capacidad real, balanceo de carga). Corresponde
  a la ruta "Modelado de Centros" (`/modelado3`) del portal MRP legacy
  (sigma-icf).
---

# Skill: MRP — Modelado de Centros (capacidad y balanceo)

> **Este skill es SOLO procedural.** Schema: [mrp-centros-estaciones.md](/company-twin/companies/icf/mrp/mrp-centros-estaciones.md)
> y [mrp-explosion.md](/company-twin/companies/icf/mrp/mrp-explosion.md) (`BalanceFC`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"CGARZA"`**.

## Origen (portal legacy sigma-icf, ruta `/modelado3`; existe un duplicado
`/modelado4` idéntico — el nav real solo enlaza `modelado3`)

Vista de configuración de **capacidad de centros de trabajo**: por cada
`Centro` (catálogo `spCFCentroLista`) se cargan las "bases" de capacidad
(`spFCBasesjson` — un JSON por centro con parámetros de turnos/velocidad,
capturado en `CentroFCTemp`/`EstacionTFCTemp` durante la sesión) y se cruzan
contra el forecast asignado a ese centro (`spBalanceFC`, que corresponde
conceptualmente a la tabla `BalanceFC`).

Distintos **tipos de centro** (Envasado/Cribado, Maquila, Cribado Mitades,
etc. — ver `EstacionTFC.Tipo`) usan fórmulas de capacidad distintas
(piezas/minuto × minutos turno × núm. estaciones activas, etc.); el detalle
exacto de cada fórmula vive en `spFCCentroCapacidadReal` (mismo SP que usa la
ruta `inicio` para `CapacidadHrs`) — no se transcribió aquí línea por línea,
usar el valor ya calculado en `CentroFC`/`WebInicio` en vez de recalcularlo.

## Patrón 1 — Configuración de un centro específico

```
read_records(Centro, filter: "Centro eq '<C>'", select: "Centro,Descripcion")
read_records(CentroFC, filter: "Centro eq '<C>'")   # sin select: descubrir columnas reales primero
```

## Patrón 2 — Estaciones de un centro y su tipo

```
read_records(EstacionTFC, filter: "Centro eq '<C>'", select: "Estacion,Descripcion,Tipo,Centro")
```

## Patrón 3 — Selección/temp de la sesión de modelado (por usuario)

```
read_records(CentroFCTemp, filter: "Usuario eq 'CGARZA'")
read_records(EstacionTFCTemp, filter: "Usuario eq 'CGARZA'")
read_records(ArtCentroTemp, filter: "Usuario eq 'CGARZA'")
```

Estas 3 tablas son **temporales de la sesión de captura activa** — no
confiar en su contenido para reportes históricos ni compararlas entre
usuarios distintos.

## Limitaciones

- Los SPs `spArtCentroBalanceoCantidad`/`spBalanceFC` (específicos de
  `modelado3`/`modelado4`) **no están presentes en `sp-mrp.sql`** — la
  fórmula exacta de balanceo de carga no se pudo verificar contra fuente; el
  patrón de arriba se basa en las entidades ya documentadas
  (`CentroFC`/`EstacionTFC`/`*Temp`), no en la lógica interna del balanceo.
- Ninguna de estas tablas tiene PK física declarada (salvo `Centro`) — usar
  `read_records(<Entidad>, first: 1)` sin `select` para descubrir columnas
  reales si el `select` propuesto falla.
