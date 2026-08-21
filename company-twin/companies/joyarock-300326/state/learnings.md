# JoyaRock — Aprendizajes del runtime

Reglas operativas aprendidas de errores al consultar el MCP. Se leen al inicio
de sesión para no repetir fallos.

## Reglas aprendidas

- [odata-contains] El MCP no soporta `contains`/`startswith`/`endswith`/`regex`
  en filtros OData. Solo operadores de comparación: eq/ne/gt/ge/lt/le/and/or/not.
  Para texto parcial, trae candidatos y filtra client-side o resuelve la clave
  exacta primero.
- [estatus-abierto] `ABIERTO` no existe en Intelisis. El pendiente de pago es
  `PENDIENTE`. Ciclo: SINAFECTAR→PENDIENTE→CONCLUIDO/CANCELADO.
- [dinero-empresa] Crear un movimiento `Dinero` requiere el campo `Empresa` (ej.
  `JMAR`); suele olvidarse. Resuélvelo de `CtaDinero.Empresa` o config del tenant.
- [mov-valido] `Mov` debe ser un valor existente en MovTipo del módulo. No
  inventar; consultar enums en el Twin (`erp-kernel/cxp`, `erp-kernel/dinero`)
  o `aggregate groupby:[Mov]`.
