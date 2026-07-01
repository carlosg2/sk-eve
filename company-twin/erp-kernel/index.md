# ERP Kernel — Intelisis (universal)

Conocimiento estructural de Intelisis, compartido por todos los clientes.
`tenant: null`. Cambia lento (con releases del ERP). El kernel jamás contiene
datos de un cliente ni políticas locales.

# Ciclo de vida de movimientos (universal)

Todos los movimientos (CXP, Dinero, etc.) siguen el mismo ciclo:
`SINAFECTAR` (borrador) → `PENDIENTE` (afectado, pendiente) → `CONCLUIDO` · `CANCELADO`.
Las transiciones se ejecutan con el SP [Afectar](afectar.md), no con `update_record`.

# Entidades

* [CXP](cxp.md) - Cuentas por Pagar (cabecera). Facturas pendientes de pago a proveedores.
* [CxpD](cxpd.md) - Detalle de CXP (líneas de aplicación).
* [Prov](prov.md) - Proveedores (catálogo maestro).
* [CtaDinero](ctadinero.md) - Cuentas bancarias / de dinero.
* [Dinero](dinero.md) - Tesorería (movimientos bancarios).
* [DineroD](dinerod.md) - Detalle de tesorería.

# Stored procedures (escritura de estatus)

* [Afectar](afectar.md) - Transiciones de estatus (AFECTAR/CANCELAR/AUTORIZAR).
* [CambiarSituacion](cambiar-situacion.md) - Cambio de sub-estado dentro del Estatus.

# Reglas OData (DAB)

* Fechas **sin comillas**: `Vencimiento le 2026-12-31`.
* Strings **con comillas simples**: `Estatus eq 'PENDIENTE'`.
