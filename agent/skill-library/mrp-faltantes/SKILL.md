---
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
> principal de insumos/materia prima, ver primero
> [gap-abasto/SKILL.md](/agent/skills/gap-abasto/SKILL.md) — **no lo dupliques
> aquí**. Este documento solo agrega lo que gap-abasto no cubre: la vista
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
[gap-abasto](/agent/skills/gap-abasto/SKILL.md). No hay diferencia con lo que
ya está implementado ahí.

**Caso 3 (faltante de concentrado, agregado por familia)** — no existe un tool
dedicado para esta agregación. Dos opciones, en este orden de preferencia:

```
# Opción A (preferida): llamar faltante_materia_prima y agregar client-side
# por familia, SI el resultado incluye un campo de familia (verificar primero
# con una corrida real — el schema documentado de faltante_materia_prima no
# incluye Familia explícitamente, puede requerir un join manual contra Art
# para obtener FamArtCF por cada Articulo devuelto).
faltante_materia_prima(Usuario: "CGARZA", Ejercicio: 2026, Periodo: 7)
# luego: read_records(Art, filter: "Articulo eq 'X' or ...", select: "Articulo,FamArtCF")
# y agrupar Faltante por FamArtCF en el análisis.

# Opción B (fallback, más cara): reconstruir la agregación directamente sobre
# ExplocionMatCF (mismo filtro que faltante_materia_prima) agrupando por FamiliaCF.
aggregate_records(ExplocionMatCF,
  filter: "Usuario eq 'CGARZA' and SeProduce eq 0",
  groupby: "FamiliaCF", function: "sum", field: "InvRequerido")
```

## Limitaciones

- No hay tool dedicado para "faltante por familia" — usar la Opción A/B de
  arriba, ninguna probada en vivo todavía.
- Si el usuario simplemente pregunta "¿qué falta comprar?" sin mencionar
  "familia"/"concentrado", **usa siempre `gap-abasto` primero** — este skill
  solo aplica cuando la pregunta pide explícitamente el nivel de agregación
  por familia.
