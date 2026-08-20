# ICF — Buffer de aprendizajes (bandeja de entrada, efímero)

**Esto es un BUFFER, no un destino.** El hook `agent/hooks/memory.ts` anexa entradas
aquí cuando una tool falla; el agente las lee al inicio de sesión para no repetir errores.

## Reglas aprendidas

- [pendiente] movtipo-lookup — patrón procedural para ventas/compras por tipo semántico
  (sin evidencia de sesión/error en el buffer: requiere confirmar el caso real antes de
  compilar; candidato: refinar `agent/skill-library/icf/SKILL.md`, que ya cubre compras
  por proveedor).
> **Promovido (buffer vaciado por la fábrica):**
> - `fld-read_records-*` / `fld-aggregate_records-*` (casing, ~25 entradas) → RESUELTAS
>   con cross-referencia en `erp-kernel/casing.md` (mapa camelCase vs UPPERCASE por entidad
>   + tabla de correcciones de campo) y regla corregida en `erp-kernel/index.md` (la regla
>   genérica "UPPERCASE" (regla antigua) era una sobre-generalización). Colapsadas y vaciadas.
> - `fld-read_records-familiacf` / `-ano` (UPPERCASE que NO existe; el campo real es
>   camelCase) → cubierto por `erp-kernel/resumenplaneacioncf.md` + `mrp/mrp-forecast-arribos.md`.
> - `ent-inexistente-CXP` → `companies/icf/modulos.md` .
> - `ent-inexistente-ArtAlm` / `-UtLogEjcProMrp` / `-DimTiempoSemana` → `modulos.md`
>   (lista "No disponible") + `mrp/mrp-forecast-arribos.md` (DimTiempoSemana marcada
>   NO existe; antes estaba documentada como vigente).
> - `[pendiente] ventad-sin-importe/descripcion` → cubierto por `erp-kernel/ventad.md`
>   (no existen `Importe`/`Descripcion` en VentaD; usar `ImporteDetalle` / join con
>   `Art.Descripcion1`).
> - `[pendiente] almacen-c-fresco` → cubierto por `companies/icf/policies/operaciones-policy.md`
>   (almacén de producto terminado `C. FRESCO` + variantes).
> - Hook enriquecido : las entradas NUEVAS llevan entidad real, hint de
>   campo correcto por caso y `sessionId` (trazabilidad a la radiografía).
>> Promovidos: `ent-inexistente-*` →
> `companies/icf/modulos.md`; `fld-read_records-*` (UPPERCASE) → `erp-kernel/index.md`
> § Capacidades OData; `buscar-registro`/`odata-no-in`/`params-sin-dolar`/`empresa-incf`
> ya cubiertos en instructions/kernel/twin.
>
> **Fase frijol-negro (validado en UI):** clasificación por familia del
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
- [fld-read_records-importe] El campo 'Importe' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-cantidad] El campo 'Cantidad' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-claveprodserv] El campo 'ClaveProdServ' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-descripcion] El campo 'Descripcion' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [ent-inexistente-EmpresaCfg2] La entidad 'EmpresaCfg2' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [fld-read_records-folio] El campo 'Folio' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-estatus] El campo 'Estatus' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-fecha] El campo 'Fecha' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-fechaalta] El campo 'FechaAlta' no existe en 'Prov' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('Prov', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-aggregate_records-articulo] El campo 'Articulo' no existe en 'UV_QV_PPTOCOMPRA' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('UV_QV_PPTOCOMPRA', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-centro] El campo 'Centro' no existe en 'BalanceFC' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('BalanceFC', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-existencia] El campo 'Existencia' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-ciudad] El campo 'Ciudad' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-cp] El campo 'CP' no existe en 'read_records' (BadRequest). El UPPERCASE es ESPECÍFICO de vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA — verificar el nombre real del campo en erp-kernel/casing.md (puede ser camelCase o requerir otra vista, ej. ArtDisponibleDesc en vez de ArtDisponible).
- [fld-read_records-movtipoid] El campo 'MovTipoID' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [fld-read_records-listaprecios] El campo 'ListaPrecios' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
- [ent-inexistente-DimTiempoSemana] ~~La entidad 'DimTiempoSemana' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.~~ **OBSOLETO: `DimTiempoSemana` ya es consultable. No promover este learning — `modulos.md` se actualizó para quitarla de la lista de no disponibles.**
- [ent-inexistente-InvD] La entidad 'InvD' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [ent-inexistente-SaldoInv] La entidad 'SaldoInv' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [ent-inexistente-InvSerieLote] La entidad 'InvSerieLote' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [ent-inexistente-InvDisp] La entidad 'InvDisp' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [ent-inexistente-DimTiempoSemanaIso] La entidad 'DimTiempoSemanaIso' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada.
- [fld-read_records-centrotrabajo] El campo 'CentroTrabajo' no existe en 'read_records' (BadRequest). El casing NO es universal: la mayoría de entidades son camelCase (p.ej. 'FechaEmision' en Compra). Verificar el campo real en erp-kernel/casing.md o con read_records('read_records', first:1) antes de asumir UPPERCASE (solo vistas como ForecastPlanProduccion/UV_QV_PPTOCOMPRA lo son).
