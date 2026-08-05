---
description: >
  Use when the user pregunta por traspasos/movimientos de mercancía
  programados entre almacenes por semana. Corresponde a la ruta "Programa de
  Traspasos" (`/traspasos/[semana]`) del portal MRP legacy (sigma-icf).
  ⚠️ Cobertura DAB no confirmada — ver Limitaciones.
---

# Skill: MRP — Programa de Traspasos (⚠️ cobertura DAB no confirmada)

> **Este skill es SOLO procedural**, pero al igual que `mrp-articulos`, **la
> lógica de negocio exacta de esta ruta no se pudo verificar contra fuente
> SQL**, y no hay entidades de traspaso documentadas todavía en el Company
> Twin. Verifica antes de prometer datos al usuario.

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

**Ninguno de estos SPs está presente en `sp-mrp.sql`** (único archivo fuente
disponible del proyecto) — no se pudo confirmar la lógica de negocio real
(qué campos calcula, de qué tabla base parte, si depende de
`ExplocionMatCF`/`SerieLote` como el resto del módulo).

## Qué hacer si el usuario pregunta por esto

1. Intenta descubrimiento de schema antes de descartar la posibilidad de que
   exista vía DAB:
   ```
   read_records(ProgramaTraspaso, first: 1)
   read_records(TraspasoSemanal, first: 1)
   read_records(MRPAlmArribos, first: 1)
   ```
2. Si nada existe, informa explícitamente al usuario que **el programa de
   traspasos entre almacenes no está disponible todavía a través de este
   agente** — no lo confundas con movimientos de inventario genéricos del
   ERP (que sí podrían existir en erp-kernel bajo otro nombre; verifica con
   `query_company_twin` antes de descartar).
3. No hay entidad de traspaso en el Twin — si alguna de las llamadas del
   paso 1 sí funciona, repórtalo para que se documente, no la documentes tú
   mismo con datos inventados.

## Limitaciones

- Lógica de negocio NO verificada contra fuente SQL.
- Ninguna entidad de traspasos está en el Company Twin.
- Es probable que este flujo, al ser de **captura/edición** (el SP
  `...Guardar` sugiere escritura), tenga efectos reales en el ERP al igual
  que la autorización del plan semanal (ver `mrp-inicio`) — si llegara a
  descubrirse una entidad real, tratar cualquier escritura con la misma
  cautela (nunca ejecutar transiciones/guardados sin confirmación explícita
  del usuario).
