---
type: Intelisis Entity
title: ArtAlm — Configuración de planeación de artículo por almacén
description: Parámetros de planeación (mínimo, lote, múltiplos) de un artículo por almacén/subcuenta/empresa. Puede no existir para un artículo.
resource: dbo.ArtAlm
layer: erp-kernel
tenant: null
tags: [art, alm, mrp, planeacion, lote, sugerido-compra]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Configuración de planeación de [Art](art.md) por almacén/subcuenta. Insumo directo del
cálculo de requerimiento neto (RN) y política de lote del sugerido de compra.

- **PK:** `Articulo` + `SubCuenta` + `Almacen` + `Empresa` (compuesta)
- **⚠️ Puede no existir un renglón para un artículo dado.** Ausencia de configuración
  **no excluye** el artículo del cálculo: continuar con los defaults de abajo.

# Schema (campos operativos)

| Campo | Tipo | Notas |
|---|---|---|
| `Articulo` | varchar | FK → [Art](art.md) |
| `SubCuenta` | varchar | Parte de la llave compuesta |
| `Almacen` | varchar | FK → [Alm](alm.md) |
| `Empresa` | varchar | FK → [Empresa](empresa.md) |
| `Minimo` | decimal | Inventario de seguridad (IS) |
| `LoteOrdenar` | varchar | `LOTE POR LOTE` \| `CANTIDAD FIJA` \| `CANTIDAD MINIMA` \| `MULTIPLOS` |
| `CantidadOrdenar` | decimal | Cantidad fija/mínima de orden (según `LoteOrdenar`) |
| `MultiplosOrdenar` | decimal | Múltiplo de redondeo del sugerido |
| `PuntoOrden` | decimal | Punto de reorden (ROP), si está configurado explícitamente |

# Defaults obligatorios cuando NO existe renglón en ArtAlm

| Campo | Default |
|---|---|
| `Minimo` (IS) | `0` |
| `LoteOrdenar` | `LOTE POR LOTE` |
| `CantidadOrdenar` | `1` |
| `MultiplosOrdenar` | `1` |

# Política de lote (aplicación sobre RN)

```
ROP_base = RN
LOTE POR LOTE          -> ROP = RN (sin redondeo por múltiplo)
CANTIDAD FIJA           -> ROP = max(RN, CantidadOrdenar), redondeado a múltiplo
CANTIDAD MINIMA / MULTIPLOS -> ROP = max(RN, CantidadOrdenar), redondeado a múltiplo
ROP = CEILING(ROP / MultiplosOrdenar) * MultiplosOrdenar
```

# Patrones de consulta

```
# Config de planeación de un artículo en un almacén/empresa
read_records(ArtAlm, filter="Articulo eq '<ART>' and Almacen eq '<ALM>' and Empresa eq '<EMP>'", select="Articulo,SubCuenta,Almacen,Minimo,LoteOrdenar,CantidadOrdenar,MultiplosOrdenar")
```

# Relaciones

* [Art](art.md) · [Alm](alm.md) · [Empresa](empresa.md)
* [PlanArtOP](planartop.md) — resultado de la explosión que usa estos parámetros.
