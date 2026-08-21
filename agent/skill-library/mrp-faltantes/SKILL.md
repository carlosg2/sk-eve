---
tenant: icf
description: >
  Use when el usuario pregunta por faltante de materia prima, insumos o
  concentrado por familia (versión agregada). Corresponde a la ruta
  "Faltantes de Materia" del portal MRP. Para el caso
  general de faltante de insumos/materia prima, usa primero el skill
  `gap-abasto` — este skill solo agrega la variante "por familia" que
  gap-abasto no cubre.
entities: [ExplocionMatCF, ArtMaterial, ArtDisponible, ResumenPlaneacionCF]
twin_concepts: [mrp/mrp-sesion-periodo]
related_skills: [gap-abasto, mrp-sesion, mrp-produccion, mrp-concentrado]
---

# Skill: MRP — Faltantes de Materia (ruta completa: insumos + materia prima + concentrado)

> **Este skill es SOLO procedural.** Para el detalle de schema y el método
> principal de insumos/materia prima, ver primero la skill `gap-abasto`
> (cargar con `load_skill('gap-abasto')`) — **no lo dupliques aquí**. Este
> documento solo agrega lo que gap-abasto no cubre: la vista
> "Faltante de Concentrado" (agregada por familia).

## Periodo vigente (regla determinista)

Si el usuario no menciona ejercicio/periodo, usa el **VIGENTE** derivado de la
fecha actual (año y mes actuales — hoy 2026/8). **NUNCA pruebes variantes** de
periodo (ni 7, ni 12, ni ejercicios anteriores "por si acaso") — eso multiplica
las consultas. Si el usuario pide un periodo específico, usa ESE y solo ese. Las
semanas del periodo salen del calendario (`DIM_TIEMPO_SEMANA`/`CalendarioFC`).

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

> Nota: `web_fcfaltante_concentrado` es el tool dedicado para esta agregación
> (publicado en el MCP). El patrón manual con `aggregate_records` sobre
> `ExplocionMatCF` NO es necesario; usarlo solo como respaldo si el tool falla.
> Si caes a ese respaldo, el `aggregate_records` sobre `ExplocionMatCF` (con
> `groupby: ["FamiliaCF"]`) es una lectura independiente de
> `faltante_insumos`/`faltante_materia_prima` — si las necesitas juntas, agrúpalas
> todas en una misma llamada `read_parallel`.

⚠️ Notas:
- `SeProduce` es **booleano** (`false`/`true`), NO entero: `SeProduce eq 0` →
  `BadRequest` (incompatible types Edm.Boolean/Edm.Int32). Usar `eq false`.
- `groupby` debe ser **array** `["FamiliaCF"]`: como string el DAB lo IGNORA
  y devuelve un solo total sin desglosar.
- La familia del faltante es el **`FamiliaCF` de `ExplocionMatCF`**; NO intentar
  el join a `Art.FamArtCF` (ese campo es `null` en `Art`).

### Las 3 tablas en paralelo — UNA llamada `read_parallel`

El portal muestra las 3 tablas **simultáneamente** y las 3 consultas son **independientes**
entre sí (cada una es su propio stored procedure sobre la misma `ExplocionMatCF`). Cuando
el usuario pida la ruta completa, NO invoques los tools como 3 llamadas en pasos
separados: ejecuta las 3 lecturas en UNA sola llamada `read_parallel` (nombres de tool
SIN prefijo, mismos `args` que en la llamada directa):

```
read_parallel({ operations: [
  { tool: "faltante_insumos", args: { Usuario: "MASERP", Ejercicio: 2026, Periodo: 7 } },
  { tool: "faltante_materia_prima", args: { Usuario: "MASERP", Ejercicio: 2026, Periodo: 7 } },
  { tool: "web_fcfaltante_concentrado", args: { Usuario: "MASERP", Ejercicio: 2026, Periodo: 7 } }
] })
```

Si el usuario pide una sola tabla (p. ej. solo el concentrado por familia), es una sola
operación y no requiere `read_parallel`.

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

- Si el usuario simplemente pregunta "¿qué falta comprar?" sin mencionar
  "familia"/"concentrado", **usa siempre `gap-abasto` primero** — este skill
  solo aplica cuando la pregunta pide explícitamente el nivel de agregación
  por familia.
