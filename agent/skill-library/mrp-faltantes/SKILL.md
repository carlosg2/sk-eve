---
tenant: icf
description: >
  Use when the user asks sobre faltante de materia prima, insumos o
  concentrado por familia (versión agregada). Corresponde a la ruta
  "Faltantes de Materia" del portal MRP legacy (sigma-icf). Para el caso
  general de faltante de insumos/materia prima, usa primero el skill
  `gap-abasto` — este skill solo agrega la variante "por familia" que
  gap-abasto no cubre.
---

# Skill: MRP — Faltantes de Materia (ruta completa: insumos + materia prima + concentrado)

> **Este skill es SOLO procedural.** Para el detalle de schema y el método
> principal de insumos/materia prima, ver primero la skill `gap-abasto`
> (cargar con `load_skill('gap-abasto')`) — **no lo dupliques aquí**. Este
> documento solo agrega lo que gap-abasto no cubre: la vista
> "Faltante de Concentrado" (agregada por familia).

## Origen (portal legacy sigma-icf, ruta `/faltantes`)

Esta ruta del portal muestra **3 tablas en paralelo**, cada una alimentada por
un stored procedure distinto pero con la MISMA base de datos
(`ExplocionMatCF`, la explosión de materiales corrida por `Usuario`):

1. `spWebFCFaltanteInsumos` → artículos `Grupo = 'INSUMOS DE PRODUCCION'`.
2. `spWebFCFaltanteMateriaPrima` → artículos con `SeProduce = 0` (excluye
   insumos y "SIN CLASIFICAR").
3. `spWebFCFaltanteConcentrado` → **la misma lógica y filtro que (2)**
   (`SeProduce = 0`, excluye insumos y "sin clasificar"), pero agregada por
   `FamiliaCF` (`GROUP BY Familia`, `HAVING SUM(Faltante) > 0`) en vez de por
   artículo individual — es un "resumen por familia" de la variante (2), NO
   una fuente de datos distinta.

## Qué usar

**Casos 1 y 2 (insumos / materia prima por artículo)** → usa **directamente**
los tools dedicados `faltante_insumos`/`faltante_materia_prima` documentados en
la skill `gap-abasto` (cargar con `load_skill('gap-abasto')`). No hay diferencia
con lo que ya está implementado ahí.
**Caso 3 (concentrado por familia)** → SP del portal **`web_fcfaltante_concentrado`**
(parámetros `Usuario, Ejercicio, Periodo`): devuelve el grid EXACTO de
`Familia · Inventario Requerido · Disponibilidad ICF · Faltante`.
**Caso 3 (faltante de concentrado, agregado por familia)** — no existe un tool
dedicado para esta agregación. Usar `aggregate_records` sobre `ExplocionMatCF`
agrupando por `FamiliaCF` (verificado 2026-08-06 contra el MCP real):

```
# Patrón canónico (verificado OK): faltante de concentrado por familia
aggregate_records(ExplocionMatCF,
  filter: "Usuario eq 'MASERP' and SeProduce eq false",
  groupby: ["FamiliaCF"], function: "sum", field: "InvRequerido")
```

⚠️ Notas verificadas (2026-08-06):
- `SeProduce` es **booleano** (`false`/`true`), NO entero: `SeProduce eq 0` →
  `BadRequest` (incompatible types Edm.Boolean/Edm.Int32). Usar `eq false`.
- `groupby` debe ser **array** `["FamiliaCF"]`: como string el DAB lo IGNORA
  y devuelve un solo total sin desglosar.
- La familia del faltante es el **`FamiliaCF` de `ExplocionMatCF`**; NO intentar
  el join a `Art.FamArtCF` (ese campo es `null` en `Art` — verificado).

## Formatos de pantalla (obligatorios)

| Tabla | Columnas |
|---|---|
| **Faltantes de Materia Prima** | `Artículo · Descripción · Inventario Requerido · Disponibilidad ICF · Inventario Almacenado AVC · Solicitud Traspaso AVC (Estatus) · Inventario Almacenado PBC · Solicitud Traspaso PBC (Estatus) · Existencias AVC · Solicitud Préstamo Compra AVC (Estatus) · Existencias PBC · Solicitud Préstamo Compra PBC (Estatus) · Arribos AVC · Redirección Arribo AVC (Estatus) · Faltante · Inv Min · Inv Max` |
| **Faltantes de Insumos** | las columnas que devuelve el tool `faltante_insumos` (misma estructura del portal) |
| **Faltante de Concentrado** | `Familia · Inventario Requerido · Disponibilidad ICF · Faltante` |

Regla: reproducir EXACTAMENTE estas columnas/encabezados (del portal MRP, ruta
`/faltantes`). **Prohibido inventar columnas** ni consolidaciones que el portal
no muestre; cuando el cruce involucre almacenes (AVC/PBC), mostrar los estatus
de las solicitudes como vienen del ERP.

## Limitaciones

- No hay tool dedicado para "faltante por familia" — usar el patrón de arriba
  (verificado OK contra el MCP el 2026-08-06).
- Si el usuario simplemente pregunta "¿qué falta comprar?" sin mencionar
  "familia"/"concentrado", **usa siempre `gap-abasto` primero** — este skill
  solo aplica cuando la pregunta pide explícitamente el nivel de agregación
  por familia.
