---
tenant: icf
description: >
  Use when the user pide una vista general / dashboard consolidado de
  producción, ocupación de centros, venta y KPIs generales del periodo.
  Corresponde a la ruta "Dashboard" del portal MRP.
---

# Skill: MRP — Dashboard general

> **Este skill es SOLO procedural.** Schema: [mrp-soporte.md](`mrp-soporte`)
> y [mrp-plan-produccion.md](`mrp-plan-produccion`).

Conexión MCP: **`intelisis-dab`**. Tools: `read_records`, `aggregate_records`.
`Usuario` fijo: **`"MASERP"`**.

## Origen (portal legacy sigma-icf, ruta `/dashboard`)

Vista tipo dashboard con varias gráficas/tablas (`Grupo.svelte`, `Pay.svelte`,
`PieChart.svelte`, `overview.svelte`, `recent-sales.svelte`, `tabla.svelte`).
El `+page.ts` de esta ruta carga el mismo par de SPs que la ruta `inicio`
(`spProgramaProduccionConcentradoCentro` + `spFCPPSemanaLista` +
`spProgramaProdConcentadoCentro` por semana) — **esta ruta reutiliza
prácticamente la misma fuente de datos que "Programa Mensual"** (ver skill
`mrp-inicio`), solo que la presenta con más gráficas y probablemente agrega
KPIs de venta/cobranza (`spWebInicioPay`, `spWebInicioVentaPay` — nombres
referidos por el portal, sin lógica documentada).

## Qué usar primero

**Si el usuario pregunta por ocupación/capacidad/producción por centro**, usa
el mismo patrón que `mrp-inicio` (tabla `WebInicio` + `ForecastPlanProduccion`
por semana/centro) — no dupliques lógica, es la misma fuente.

```
read_records(WebInicio, filter: "Usuario eq 'MASERP'",
  select: "CentroTrabajo,Venta,AProducir,Ocupacion,CapacidadHrs,HorasProgram,PorOcupacion,Inventario")
```

**Si el usuario pregunta por venta/cobranza/pagos** (KPIs de `Pay.svelte`),
esto probablemente corresponde a entidades transaccionales genéricas del ERP
(`Venta`/`VentaD`, o `Dinero`/`CXP` si la empresa tiene esos módulos activos) —
no hay una entidad FC dedicada documentada para esto. Verifica con
`query_company_twin` si la empresa tiene esos módulos antes de asumir.

## Limitaciones

- Solape funcional confirmado con la ruta `inicio` (mismo `+page.ts`/SPs) —
  trata este skill como un "resumen visual" de `mrp-inicio` + posibles KPIs
  de venta/cobranza no verificados.
- `spWebInicioPay`/`spWebInicioVentaPay` no se leyeron en detalle — si el
  usuario pide específicamente pagos/cobranza del dashboard y el patrón de
  `WebInicio` no aplica, declara la limitación y ofrece usar las entidades
  transaccionales genéricas (`Venta`, `Dinero`) en su lugar.
