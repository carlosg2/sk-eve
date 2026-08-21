---
tenant: icf
description: >
  Use when the user pregunta por traspasos/movimientos de mercancía
  programados entre almacenes por semana. Corresponde a la ruta "Programa de
  Traspasos" (`/traspasos/[semana]`) del portal MRP.
  ⚠️ Cobertura DAB no confirmada — ver Limitaciones.
---

# Skill: MRP — Programa de Traspasos (⚠️ cobertura DAB no confirmada)

> **Este skill es SOLO procedural** y su **cobertura NO está confirmada**: la
> lógica de negocio exacta de esta ruta no está documentada, y no hay
> entidades de traspaso en el Company Twin. **No prometas datos que no
> puedas respaldar** — verifica primero contra el MCP antes de afirmar.

## Origen (portal legacy sigma-icf, ruta `/traspasos/[semana]`, redirige a la
## semana actual si no se especifica)

Programa semanal de **traspasos entre almacenes** (mover mercancía/materia
prima de un almacén/planta a otro para cubrir un requerimiento de
producción). El flujo de la UI, por los nombres de los SPs invocados:

1. `spMRPAlmArribosLista` — lista de almacenes de arribo disponibles.
2. `spMRPTraspasoSemanaLista` — lista/detalle de traspasos programados para
   la semana.
3. `spFCProgramaTraspasoSemanal` / `spFCProgramaTraspasoSemanalGuardar` —
   leer/guardar el programa de traspasos de la semana (captura editable).
4. `spMRPInvProgramaTraspaso` — inventario disponible para traspasar.

**La lógica de negocio real de estos SPs no está documentada** (no se
confirmaron los campos que calcula, la tabla base o si depende de
`ExplocionMatCF`/`SerieLote` como el resto del módulo).

## Qué hacer si el usuario pregunta por esto

0. **Los arribos proyectados (no traspasos) SÍ existen** y están cubiertos por
   `mrp-arribos` (`Arribos12`/`FCArribos`/`Arribos12S`/`ArribosSub12S`, todos
   confirmados en el MCP). Si el usuario pregunta por llegadas/embarques
   proyectados, usar `mrp-arribos`, no este skill.

1. **Estado confirmado (contra el MCP)**: las
   entidades `ProgramaTraspaso`, `TraspasoSemanal` y `MRPAlmArribos` NO
   existen en el MCP de ICF (`EntityNotFound` confirmado con
   `read_records(..., first: 1)`). NO las pruebes una por una.
2. **RESPONDE LA LIMITACIÓN DE INMEDIATO, sin explorar**: el programa de
   traspasos entre almacenes NO está disponible a través de este agente
   (las 3 entidades no existen). NO intentes reconstruir traspasos con
   `Inv`/`MovTipo`/`CalendarioFC` ni explores el catálogo. Solo si el usuario pide
   explícitamente **movimientos de inventario transaccional real** (no
   traspasos programados), ofrécele `Inv` (del sistema) como alternativa.

## Limitaciones

- Lógica de negocio NO documentada.
- Ninguna entidad de traspasos está en el Company Twin.
- Es probable que este flujo, al ser de **captura/edición** (el SP
  `...Guardar` sugiere escritura), tenga efectos reales en el ERP al igual
  que la autorización del plan semanal (ver `mrp-inicio`) — si llegara a
  descubrirse una entidad real, tratar cualquier escritura con la misma
  cautela (nunca ejecutar transiciones/guardados sin confirmación explícita
  del usuario).
