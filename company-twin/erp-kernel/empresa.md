---
type: Intelisis Entity
title: Empresa — Catálogo de empresas
description: Catálogo de empresas del ERP. Instalaciones multiempresa exponen varias filas activas.
resource: dbo.Empresa
layer: erp-kernel
tenant: null
tags: [empresa, maestro, multiempresa, mrp]
timestamp: 2026-08-03T00:00:00Z
mcp_tools: [read_records]
---

# Resumen

Catálogo de empresas del ERP. En instalaciones **multiempresa** (una sola base de datos con
varias razones sociales) hay más de una fila con `Estatus eq 'ALTA'` — el agente **nunca**
debe asumir cuál usar por defecto.

- **PK:** `Empresa` (varchar corto)
- **Estatus:** `ALTA` (activa) | `BAJA`

# Schema

| Campo | Tipo | Notas |
|---|---|---|
| `Empresa` | varchar | PK, clave corta |
| `Nombre` | varchar | Razón social / nombre visible |
| `Estatus` | varchar | `ALTA` \| `BAJA` |

# Regla obligatoria (todo módulo de planeación/MRP)

Antes de calcular cualquier sugerido de compra, MRP o reporte por empresa:

1. Si el usuario ya indicó una `Empresa` válida, úsala directamente.
2. Si no la indicó, consulta primero las empresas activas y pregunta:
   ```
   read_records(Empresa, filter="Estatus eq 'ALTA'", select="Empresa,Nombre")
   ```
3. Muestra el resultado como lista numerada (aunque sea una sola empresa) y **espera
   confirmación del usuario** antes de continuar. No hay empresa "por defecto" válida.

# Patrones de consulta

```
# Empresas activas
read_records(Empresa, filter="Estatus eq 'ALTA'", select="Empresa,Nombre")
```

# Relaciones

* [EmpresaCfg2](empresacfg2.md) — configuración de planeación por empresa (1:1 por `Empresa`).
