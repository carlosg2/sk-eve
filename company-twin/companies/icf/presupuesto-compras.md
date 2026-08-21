---
type: Intelisis Module Reference
title: ICF — Presupuesto de compras (UV_QV_PPTOCOMPRA) y control del periodo
description: Cómo ICF controla el gasto de compra: presupuesto por artículo (UV_QV_PPTOCOMPRA, 154 artículos con tope) y compras del periodo por periodo fiscal en Compra. Verificado en vivo contra el MCP.
layer: company
tenant: icf
tags: [icf, compras, presupuesto, finanzas, control, desviaciones]
generated: { by: copilot/sigma-meta-fabrica, at:  }
mcp_tools: [read_records, aggregate_records]
sources:
  - id: reunion-2026-08-05
    resource: requerimientos de finanzas (R-FIN-06/07)
    title: Desviaciones de presupuesto de compra por periodo
    last_modified: 2026-08-05
  - id: verificacion-mcp-2026-08-06
    resource: verificación en vivo contra https://api2.maserp.mx/icf/mcp
    title: UV_QV_PPTOCOMPRA (601 artículos, 154 con MAXCOMPRAKG), Compra julio 2026 (987 movimientos)
    last_modified: 2026-08-06
---

# ICF — Presupuesto de compras y control del periodo

Hechos declarativos de la empresa ICF  para
el control de gasto de compras que pide finanzas (requerimientos R-FIN-06/07 de la
reunión de descubrimiento: "resumen de presupuesto contra compras del
periodo, solo desviaciones" y "autorización del presupuesto de compras").

## Presupuesto de compra por artículo

- **`UV_QV_PPTOCOMPRA`** es el presupuesto de compra (stock de seguridad + tope de
  compra) por artículo. 601 artículos; **154 tienen `MAXCOMPRAKG > 0`**.
- Solo existe a nivel **ARTICULO** (`NIVELAGRUPAMIENTO = 'ARTICULO'`; 0 filas a nivel
  FAMILIA) — la familia se resuelve por el campo `FAMILIA` de cada artículo.
- `MAXCOMPRAKG` = **tope de compra** del artículo (comparar contra lo comprado del
  periodo). `INVMINIMOKG`/`INVMAXIMOKG` = stock de seguridad mínimo/máximo (kg).
- Campos **UPPERCASE**. Schema completo: [mrp/mrp-explosion.md](mrp/mrp-explosion.md).

## Compras del periodo

- El periodo se filtra por el **periodo fiscal del cabecero**: `Compra` con
  `Ejercicio eq <año> and Periodo eq <mes>` (enteros). NO por fechas en `CompraD`
  (`FechaRequerida` viene null en Entrada Compra; el filtro de fecha en esa vista
  falla con `InvalidArguments` por tipo Edm.Date).
- El detalle por artículo es `CompraD` (`ID` → `Compra.ID`), agregable por `Articulo`
  con `sum Cantidad`. `Unidad` puede ser kg o pz según el artículo.
- Referencia de volumen: julio 2026 ≈ 987 movimientos de compra (Entrada Compra,
  Control Calidad, etc.), periodo fiscal `Ejercicio 2026 / Periodo 7`.

## Regla de desviación

- `desv% = ΣCompraD.Cantidad(periodo) / MAXCOMPRAKG × 100`
  - 🔴 >100% **sobre presupuesto** · 🟡 80–100% cerca del tope · 🟢 <80% dentro ·
    ⚪ sin parámetro (`MAXCOMPRAKG` null o sin fila).
- Ejemplo verificado (julio 2026): A6319 (BOLSA CAMPO SANTO) compró 4,366,000 vs
  presupuesto 3,002,400 → +45% 🔴; A5944 (BOLSA PUEBLO RICO) 340,000 vs 76,125 →
  +347% 🔴.
- El procedimiento (cómo ejecutar el cruce) vive en el skill:
  `control-compras` (skill) — aquí solo el
  conocimiento declarativo.
