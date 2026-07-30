# ICF — Buffer de aprendizajes (bandeja de entrada, efímero)

**Esto es un BUFFER, no un destino.** El hook `agent/hooks/memory.ts` anexa entradas
aquí cuando una tool falla; el agente las lee al inicio de sesión para no repetir errores.

## Reglas aprendidas

- [buscar-registro] Existe el tool MCP nativo `buscar_registro` para búsqueda de texto parcial. Llamar DIRECTAMENTE (no via execute_entity). Parámetros OBLIGATORIOS: `entidad`, `campo`, `termino`. Opcionales: `modo` (CONTIENE|EMPIEZA|TERMINA, default CONTIENE), `primero` (default 20, max 500), `ordenar`. Respuesta: `data.value.value[]`. ⚠️ Este build custom NO genera `required` en inputSchema — los 3 obligatorios están documentados en sus `description`. Siempre pasarlos explícitamente.
- [odata-no-in] El operador `in` de OData NO está soportado en este DAB. Usar cadenas `or`: `Mov eq 'Pedido' or Mov eq 'Factura'`.
- [params-sin-dolar] Los parámetros del MCP ICF NO usan `$`: usar `filter`, `select`, `first`, `orderby` (no `$filter`, `$select`, etc.).
- [ventad-sin-importe] `VentaD` no tiene campo `Importe`. Calcular como `Cantidad * Precio`.
- [ventad-sin-descripcion] `VentaD` no tiene campo `Descripcion`. Usar `Art.Descripcion1` via join manual.
- [movtipo-lookup] Para ventas/compras por tipo semántico (firme/pendiente), primero consultar `MovTipo` con `filter: "Modulo eq 'VTAS' and Clave eq 'VTAS.F'"` para obtener los valores de `Mov`, luego filtrar `Venta`/`Compra` con `or` chains.
- [empresa-incf] El código de empresa en Intelisis para ICF es `INCF` (NO `CP` — ese es Comercial Parras). Requerido en `create_record`.
- [almacen-c-fresco] El almacén principal de producto terminado es `C. FRESCO` (y variantes `C. FRESCO1`, `C.FRESCO02`-`05`). Hay muchos almacenes: PROCESADOS, REFRITOSMP, JAMAICA, ACELAYA, CRIBA1MP, etc. Usar `read_records(Alm)` para listarlos todos.
