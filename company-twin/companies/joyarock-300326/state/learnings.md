# JoyaRock — Buffer de aprendizajes (bandeja de entrada, efímero)

**Esto es un BUFFER, no un destino.** Capa `state` del Company Twin. El hook
`agent/hooks/memory.ts` (runtime) **anexa** entradas aquí cuando una tool falla; el agente
las lee al inicio de sesión (vía `agent/instructions/memory.ts`) para no repetir el error
mientras no se han promovido.

La **Meta-fábrica** (VS Code Copilot, prompt `/promote-learnings`) es la única que **promueve**
cada regla a su hogar canónico (ERP Kernel / Company Twin / skill / instructions / dab-config)
y luego **vacía este archivo**. Ver [Constitución del stack](../../../../tesis/constitucion.md).
El runtime nunca reorganiza el conocimiento; solo anexa aquí.

## Reglas aprendidas

- [odata-contains] DAB (sigma-dab, este binario) no soporta `contains`/`startswith`/`endswith`/`regex` en filtros OData. Solo operadores de comparación: eq/ne/gt/ge/lt/le/and/or/not. Para texto parcial, trae candidatos y filtra client-side o resuelve la clave exacta primero.
- [estatus-abierto] `ABIERTO` no existe en Intelisis. El pendiente de pago es `PENDIENTE`. Ciclo: SINAFECTAR→PENDIENTE→CONCLUIDO/CANCELADO.
- [dinero-empresa] Crear un movimiento `Dinero` requiere el campo `Empresa` (ej. `JMAR`); suele olvidarse. Resuélvelo de `CtaDinero.Empresa` o config del tenant.
- [mov-valido] `Mov` debe ser un valor existente en MovTipo del módulo. No inventar; consultar enums en el Twin (`erp-kernel/cxp`, `erp-kernel/dinero`) o `aggregate groupby:[Mov]`.
