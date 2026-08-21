---
tenant: icf
description: >
  Use when el usuario inicia una conversación sobre el módulo MRP/Forecast (FC) y aún no se ha validado la sesión: capturar y validar Usuario (contra la tabla Usuario), Ejercicio y Periodo, y confirmar el calendario de semanas y el presupuesto CONCLUIDO del periodo. Corresponde al contrato de sesión del portal MRP.
---

# Skill: MRP — Sesión (contrato de sesión dinámica)

> **Este skill es SOLO procedural.** Schema: [mrp-soporte](`mrp-soporte`)
> (`Usuario`), [mrp-forecast-arribos](`mrp-forecast-arribos`)
> (`DIM_TIEMPO_SEMANA`, `CalendarioFC`), [mrp-vaca](`mrp-vaca`)
> (`VacaPresupuestoVtaCon`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`.

## Cuándo usarlo

Al arrancar una conversación **sobre MRP** (o cuando el usuario cambia de
ejercicio/periodo), presentar el cuestionario de sesión y validarlo. Una vez
validado, **no volver a pedirlo** en la misma conversación (cache de sesión en
el contexto del turno).

## Contrato de sesión (cuestionario)

```
Usuario  : [__________]  -> obligatorio, en MAYÚSCULAS (ej. MASERP, MASERP)
Ejercicio: [ 2026 ]      -> lista: año del periodo (por omisión el actual)
Periodo  : [ 8 ]         -> lista: 1..12 (por omisión el mes actual)
```

## Pasos

### 1. Validar el Usuario (tabla `Usuario`)

```
read_records(Usuario, filter: "Usuario eq '<USUARIO>'",
  select: "Usuario,Nombre,DefEmpresa,Estatus")
```

- 0 filas → el usuario **no existe** → pedir otro (o responder "Dato no
  disponible" si no se resuelve).
- `Estatus` ≠ `ALTA` → usuario **bloqueado** → pedir otro.
- Con fila → sesión válida: `{ usuario, nombre, empresa: DefEmpresa }`.

⚠️ **NUNCA seleccionar `Contrasena` ni `PIN`** (la tabla los tiene; son datos
sensibles de solo lectura). Solo los campos del select de arriba.

### 2. Confirmar el periodo (semanas disponibles)

```
read_records(DIM_TIEMPO_SEMANA,
  filter: "Anio eq <EJERCICIO> and MES eq <PERIODO>",
  select: "SEMANA,FECHAINICIO,FECHAFIN",
  orderby: ["SEMANA asc"])
```

- `PrimerSemana = min(SEMANA)`, `NumeroSemanas = count(SEMANA)`, `NombreMes`
  se deriva del `MES`.
- Alternativa por usuario del proceso: `CalendarioFC`
  (`filter: "Usuario eq '<USUARIO>' and Ano eq <EJERCICIO> and Mes eq <PERIODO>"`,
  campos camelCase `NoSemana, Semana, FechaD, FechaA`).

### 3. Validar el presupuesto del ejercicio (CONCLUIDO)

```
read_records(VacaPresupuestoVtaCon,
  filter: "Ejercicio eq <EJERCICIO>",
  select: "ID,Version,Estatus,SemanaMRP")
```

- Debe existir al menos un encabezado con `Estatus = 'CONCLUIDO'` para operar
  sobre el ejercicio. Si no, advertir que el periodo no está listo.

### 4. Usuario de los snapshots del módulo FC

Los datos del módulo FC (`ResumenPlaneacionCF`, `WebInicio`, `BalanceFC`,
`Arribos12`, ...) son **scratch por el usuario que corrió el proceso** en el
portal. Regla:

- Consultar los snapshots con **el Usuario de la sesión validada**.
- Si no hay datos con ese usuario, reintentar con `MASERP` (usuario que corre
  el proceso por default en ICF) y **advertir** que el dato corresponde a la
  corrida de MASERP, no a la sesión.
- Nunca inventar un usuario.

## Formato de salida (confirmación de sesión)

```
Usuario: <USUARIO> · Periodo: <EJERCICIO>-<PERIODO> (<nombreMes>)
Semanas: [<PrimerSemana>..<UltimaSemana>] · Núm.: <n>
Sesión lista. ¿Qué módulo ejecuto (forecast, modelado, programa, materiales, arribos, análisis)?
```

`<nombreMes>` se resuelve del calendario del periodo (paso 2, ej. Periodo 8 →
"Agosto"); la ventana `[<PrimerSemana>..<UltimaSemana>]` y `<n>` también
salen del calendario.

## Reglas

- Solo lectura. La validación de sesión NO escribe nada.
- **Usuario SIEMPRE en MAYÚSCULAS** al validar (tabla `Usuario`) y al
  consultar los snapshots del módulo FC.
- **PIN nunca por la conversación**: el PIN se maneja por terminal; el agente
  nunca lo pide ni lo acepta por chat (en su lugar, usuario por default
  confirmado, ej. `MASERP`).
- **Cache de sesión**: no re-pedir/re-validar la sesión en la misma
  conversación; recargar solo si cambia ejercicio/periodo.
- Los otros skills `mrp-*` usan el `Usuario` de sesión como contexto; por
  default siguen funcionando con `MASERP` si el usuario no dio otro.
- Si el usuario no menciona ejercicio/periodo y ya hay una sesión en el turno,
  no re-preguntar (continuar con la sesión activa).
