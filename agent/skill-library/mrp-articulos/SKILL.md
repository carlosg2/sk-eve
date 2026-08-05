---
tenant: icf
description: >
  Use when the user asks sobre prototipos de artículo/receta nueva, costeo o
  lista de materiales de un artículo en desarrollo, o autorización/rechazo de
  un prototipo. Corresponde a la ruta "Artículos" (Art Prototipo) del portal
  MRP legacy (sigma-icf).
---

# Skill: MRP — Artículos / Prototipos (⚠️ cobertura DAB no confirmada)

> **Este skill es SOLO procedural**, pero a diferencia de los demás skills MRP,
> **la funcionalidad de esta ruta puede no estar expuesta todavía vía DAB/MCP.**
> Verifica antes de prometer datos al usuario.

## Origen (portal legacy sigma-icf, ruta `/articulos`)

Interfaz para gestionar **prototipos de artículo** (nuevas fórmulas/recetas en
desarrollo antes de convertirse en artículo de producción normal). El UI tiene
4 pestañas: **Autorización**, **Costos**, **Materiales**, **Progreso** — es
decir, el flujo es: capturar/ver la lista de materiales (BOM) del prototipo →
calcular su costo → dar seguimiento a avance → autorizar o rechazar el
prototipo para que pase a producción real.

Los stored procedures fuente identificados por nombre en el código de la UI
(`spArtPrototipoCosto`, `spArtPrototipoLista`, `spArtPrototipoMaterial`,
`spCambiarSituacionArtPrototipo`, `spRechazarSituacionArtPrototipo`) **NO
están presentes en `sp-mrp.sql`** (el único archivo `.sql` fuente disponible
del proyecto sigma-icf) — no se pudo verificar su lógica de negocio real, y no
hay ninguna entidad `ArtPrototipo*` documentada actualmente en el Company Twin
(`company-twin/companies/icf/mrp/*`).

## Qué hacer si el usuario pregunta por esto

1. **Primero intenta descubrimiento de schema** — no asumas que la entidad no
   existe en DAB solo porque no está documentada en el Twin:
   ```
   read_records(ArtPrototipo, first: 1)
   read_records(ArtPrototipoD, first: 1)
   read_records(ArtPrototipoMaterial, first: 1)
   ```
   Si alguna responde con datos/columnas reales, úsala y **repórtale al equipo
   que se documente en el Twin** (no la documentes tú mismo con datos
   inventados).
2. Si ninguna existe o el tool regresa error de entidad desconocida, **dile al
   usuario explícitamente que esta información (prototipos de artículo,
   costeo, autorización) no está disponible todavía a través de este agente**
   — no inventes una respuesta ni la confundas con `Art`/`ArtMaterial`
   (catálogo de artículos de producción normal, erp-kernel), que es un
   concepto distinto (artículo YA en producción, no prototipo en desarrollo).
3. No intentes ejecutar `spCambiarSituacionArtPrototipo`/
   `spRechazarSituacionArtPrototipo` vía `execute_entity` sin confirmar antes
   con el usuario — son transiciones de estatus con efectos reales en el ERP.

## Limitaciones

- Lógica de negocio NO verificada contra fuente SQL (a diferencia del resto de
  skills MRP de este set).
- Ninguna entidad de prototipos está en el Company Twin — este skill existe
  para dar contexto de la INTENCIÓN de la ruta, no para generar patrones de
  consulta con nombres de columna reales (se desconocen).
