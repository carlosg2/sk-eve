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
