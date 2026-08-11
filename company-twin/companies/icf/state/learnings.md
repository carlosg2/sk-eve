# ICF — Buffer de aprendizajes (bandeja de entrada, efímero)

**Esto es un BUFFER, no un destino.** El hook `agent/hooks/memory.ts` anexa entradas
aquí cuando una tool falla; el agente las lee al inicio de sesión para no repetir errores.

## Reglas aprendidas

- [pendiente] ventad-sin-importe / ventad-sin-descripcion — schema de `VentaD` (verificar si ya está en `erp-kernel/ventad.md`; si no, promover ahí).
- [pendiente] movtipo-lookup — patrón procedural para ventas/compras por tipo semántico (verificar skill destino de ventas/compras).
- [pendiente] almacen-c-fresco — catálogo de almacenes de ICF (ubicar en el twin ICF, p.ej. `policies/operaciones-policy.md` o un concepto de almacenes).

> Promovidos el 2026-08-05 vía protocolo de la meta-fábrica: `ent-inexistente-*` →
> `companies/icf/modulos.md`; `fld-read_records-*` (UPPERCASE) → `erp-kernel/index.md`
> § Capacidades OData; `buscar-registro`/`odata-no-in`/`params-sin-dolar`/`empresa-incf`
> ya cubiertos en instructions/kernel/twin.
>
> **Fase frijol-negro (2026-08-05, validado en UI):** clasificación por familia del
> sistema Forecast CF promovida a `erp-kernel/artfamfc.md` + `erp-kernel/resumenplaneacioncf.md`
> (verificadas en vivo: ArtFamFC con Familia/StockMinimo/StockMaximo/TiempoEntrega;
> ResumenPlaneacionCF mapea Articulo→FamiliaCF/VariedadCF; `FamArtCF` NO existe);
> `erp-kernel/artmaterial.md` (BOM, shape result.value) creado (el modelo fallaba con
> "concepto no encontrado"); patrón procedural en `agent/skill-library/icf/SKILL.md`
> (Patrón 0.2: ArtFamFC + ResumenPlaneacionCF, `primero` SIEMPRE numérico — string no
> limita y devuelve cientos de filas); `mrp-cf` corregido (ResumenPlaneacionCF SÍ existe,
> antes marcada como EntityNotFound — la verdad de runtime read_records first:60 la validó).
> Impacto validado: pregunta frijol negro 919k→136k tokens input (-85%), 302→135s,
> 22→14 calls, 1→0 errores, cache 44%→62%.
- [ent-inexistente-ArtAlm] La entidad 'ArtAlm' NO existe en el MCP del tenant activo (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada. _(2026-08-05T16:34:53.353Z)_
- [ent-inexistente-UtLogEjcProMrp] La entidad 'UtLogEjcProMrp' NO existe en el MCP del tenant activo (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada. _(2026-08-05T18:41:13.214Z)_
- [fld-read_records-apartado] El campo 'Apartado' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'APARTADO', no 'Apartado'. _(2026-08-06T07:35:40.182Z)_
- [ent-inexistente-DimTiempoSemana] La entidad 'DimTiempoSemana' NO existe en el MCP del tenant activo (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada. _(2026-08-06T07:52:57.637Z)_
- [fld-read_records-familiacf] El campo 'FAMILIACF' no existe en 'read_records' (BadRequest). Quitar el campo del select o usar la vista correcta (ej. ArtDisponibleDesc en vez de ArtDisponible para Descripcion1). _(2026-08-06T07:55:16.771Z)_
- [fld-read_records-ano] El campo 'ANO' no existe en 'read_records' (BadRequest). Quitar el campo del select o usar la vista correcta (ej. ArtDisponibleDesc en vez de ArtDisponible para Descripcion1). _(2026-08-06T09:17:46.126Z)_

> **Promovido el 2026-08-06 (E2E plan S31):** `fld-read_records-ano` (CalendarioFC) →
> `mrp/mrp-forecast-arribos.md` (nota: CalendarioFC es camelCase `Ano`/`Semana`/`FechaD`/`FechaA`,
> NO UPPERCASE) + notas matizadas en `mrp/mrp-plan-produccion.md` y `mrp-inicio` (el UPPERCASE es
> ESPECÍFICO de `ForecastPlanProduccion`, no generalizar). `ForecastPlanProduccion` UPPERCASE
> promovido al mismo doc + skills `mrp-concentrado`/`mrp-inicio`. Hook `deriveLearning` ampliado
> (shape "Could not find a property named X").
- [fld-read_records-unidad] El campo 'Unidad' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'UNIDAD', no 'Unidad'. _(2026-08-06T10:06:17.125Z)_

> **Clasificado 2026-08-06 (E2E icf, turno wrun_01KZB8JVF5TJHSGXK5WJ3AFNT0):** el
> hint UPPERCASE del hook NO aplica aquí — la causa real fue el patrón viejo del
> skill (snapshot anterior al fix): pedir `Apartado`/`DispMenosApartado` en
> `ArtDisponibleDesc` (no existen en esa vista) y `Unidad` en `ArtDisponible`
> (vista mínima de 6 campos, sin Unidad). Verdad verificada: `Unidad` camelCase
> SÍ existe en `ArtDisponibleDesc` (devuelve "Pz"). Lección ya cubierta por
> `agent/skill-library/icf` (select corregido sin Apartado/DispMenosApartado) y
> `mrp-cf` (ArtDisponible solo para agregados numéricos). No promover a UPPERCASE.
- [fld-read_records-grupo] El campo 'Grupo' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'GRUPO', no 'Grupo'. _(2026-08-06T11:27:55.232Z)_
- [fld-read_records-descripcion] El campo 'Descripcion' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'DESCRIPCION', no 'Descripcion'. _(2026-08-07T00:12:25.548Z)_
- [fld-read_records-periodo] El campo 'Periodo' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'PERIODO', no 'Periodo'. _(2026-08-07T04:10:00.207Z)_
- [fld-aggregate_records-ejercicio] El campo 'Ejercicio' no existe en 'aggregate_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'EJERCICIO', no 'Ejercicio'. _(2026-08-07T04:10:14.058Z)_
- [fld-read_records-cantidad] El campo 'Cantidad' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'CANTIDAD', no 'Cantidad'. _(2026-08-07T04:11:15.524Z)_
- [fld-read_records-centrotrabajo] El campo 'CentroTrabajo' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'CENTROTRABAJO', no 'CentroTrabajo'. _(2026-08-07T04:11:33.565Z)_
- [fld-read_records-variedad] El campo 'Variedad' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'VARIEDAD', no 'Variedad'. _(2026-08-10T08:42:33.274Z)_
- [fld-read_records-articulo] El campo 'Articulo' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'ARTICULO', no 'Articulo'. _(2026-08-11T08:42:16.444Z)_
- [fld-read_records-fecha] El campo 'Fecha' no existe en 'read_records' (BadRequest). Los campos DAB/Intelisis son UPPERCASE: usar 'FECHA', no 'Fecha'. _(2026-08-11T08:47:47.282Z)_
