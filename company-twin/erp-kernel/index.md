# ERP Kernel — Intelisis (universal)

Conocimiento estructural de Intelisis, compartido por todos los clientes.
`tenant: null`. Cambia lento (con releases del ERP). El kernel jamás contiene
datos de un cliente ni políticas locales.

# Ciclo de vida de movimientos (universal)

Todos los movimientos (CXP, Dinero, etc.) siguen el mismo ciclo:
`SINAFECTAR` (borrador) → `PENDIENTE` (afectado, pendiente) → `CONCLUIDO` · `CANCELADO`.
Las transiciones se ejecutan con el SP [Afectar](afectar.md), no con `update_record`.

# Entidades — módulo CXP / Tesorería

* [CXP](cxp.md) - Cuentas por Pagar (cabecera).
* [CxpD](cxpd.md) - Detalle de CXP.
* [CtaDinero](ctadinero.md) - Cuentas bancarias.
* [Dinero](dinero.md) - Tesorería (movimientos bancarios).
* [DineroD](dinerod.md) - Detalle de tesorería.

# Entidades — módulo VTAS / COMS / ART (ICF)

* [Venta](venta.md) - Cabecera de ventas (pedidos, facturas).
* [VentaD](ventad.md) - Detalle de ventas (renglones de artículos).
* [Compra](compra.md) - Cabecera de compras (órdenes, entradas).
* [CompraD](comprad.md) - Detalle de compras.
* [Art](art.md) - Artículos (catálogo maestro).
* [ArtDisponible / ArtDisponibleDesc](artdisponible.md) - Disponibilidad de inventario por almacén.
* [Cte](cte.md) - Clientes (catálogo maestro).
* [Prov](prov.md) - Proveedores (catálogo maestro).
* [MovTipo](movtipo.md) - Tipos de movimiento por módulo (claves VTAS.P, VTAS.F, COMS.O, COMS.F).
* [Alm](alm.md) - Almacenes (catálogo maestro).

# Entidades — módulo MRP / Planeación de compras

* [Empresa](empresa.md) - Catálogo de empresas (instalaciones multiempresa).
* [EmpresaCfg2](empresacfg2.md) - Configuración de planeación por empresa (TipoPeriodo, Horizonte).
* [ArtAlm](artalm.md) - Configuración de planeación de artículo por almacén (IS, lote, múltiplos).
* [ArtMaterial](artmaterial.md) - Lista de materiales (BOM): insumos por artículo producible.
* [ArtFamFC](artfamfc.md) - Familias del sistema Forecast CF (clasificación fina por producto).
* [ResumenPlaneacionCF](resumenplaneacioncf.md) - Grid maestro FC: fila por artículo con FamiliaCF y semanas S1..S54/P1..P54.
* [PlanArtOP](planartop.md) - Órdenes planeadas resultado de la explosión MRP (sugerido de compra oficial).
* [PlaneacionMRP](planeacion-mrp.md) - SP `spPlanArt`, fuente de verdad que prevalece sobre cálculo manual.

# Stored procedures (escritura de estatus)

* [Afectar](afectar.md) - Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR).
* [CambiarSituacion](cambiar-situacion.md) - Cambio de sub-estado dentro del Estatus.

# Contrato de ejecución (MCP)

* [Contrato de MCP tools](mcp-tools.md) - Parámetros y formas de respuesta reales de los 7 DML tools + tools custom (verificado contra el DAB fork).

# Capacidades OData (DAB)

Capacidad transversal del **motor** (aplica a **todas** las entidades). Fuente única:
los módulos no la repiten, solo apuntan aquí. El contrato completo de parámetros y respuestas
de cada tool vive en [Contrato de MCP tools](/erp-kernel/mcp-tools.md).

* **Operadores de filtro:** `eq, ne, gt, ge, lt, le, and, or, not`.
* **NO soportados en filtro:** `contains`, `startswith`, `endswith`, `regex`. El OData URI parser
  de este binario sigma-dab no implementa funciones de texto. Para texto parcial (ej. proveedor
  por nombre) trae candidatos con `read_records` sin filtro y filtra client-side, o resuelve
  la clave exacta primero con `aggregate groupby:[Campo]`.
* **`HAVING` SÍ soportado** (verificado): `aggregate_records` acepta `having` (object) con
  operadores `eq, neq, gt, gte, lt, lte, in`. Ej.: `having: { gt: 40 }`. Requiere `groupby`.
  **No** simules HAVING en cliente.
* **`orderby`:** en `read_records` es un **array** (`["Saldo desc"]`) — pasar string falla;
  en `aggregate_records` es un **string** de dirección (`"desc"`).
* **`select`** en `read_records` es un **string** coma-separado (`"ID,Saldo"`), no un array.
* **Paginación por cursor:** `read_records` devuelve `after`; `aggregate_records` (con
  `groupby` + `first`) devuelve `endCursor` + `hasNextPage`. Reenvía el cursor en `after`.
* **Sin `JOIN`:** no existe JOIN nativo. Recomendado: una **view** o un **stored proc**
  (`execute_entity`) que encapsule el join. Alternativa: encadenar tool calls (FK en paso 1,
  entidad dependiente en paso 2 con `campo eq 'v1' or campo eq 'v2'`).
* **Fechas sin comillas:** `Vencimiento le 2026-12-31`.
* **Strings con comillas simples:** `Estatus eq 'PENDIENTE'`.
* **Campos en UPPERCASE:** los nombres de columnas de Intelisis/DAB se referencian en MAYÚSCULAS
  (`SEMANA`, `PORPRODUCIR`, `DESCRIPCION1`). Usar minúsculas (`semana`) falla con
  `BadRequest: Invalid field to be returned requested/used in filter`. (Promovido del buffer
  `fld-read_records-*`, 2026-08-05.)
