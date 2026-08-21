---
okf_version: "0.2"
---
# Industrias Campo Fresco (ICF) — Company Twin

Conocimiento específico de ICF. Código ERP: **`INCF`**.

Negocio: distribución y procesamiento de productos perecederos secos (granos, semillas, avena, frijol).
Empresa ERP: **`INCF`**
MCP: `https://api2.maserp.mx/icf/mcp`

# Contenido

* [Políticas](policies/) - Límites de aprobación y reglas operativas.
* [Módulos disponibles en el MCP](modulos.md) - Qué módulos expone el MCP de ICF y cuáles NO (CXP/tesorería no está disponible → EntityNotFound).
* [Presupuesto de compras (UV_QV_PPTOCOMPRA) y control del periodo](presupuesto-compras.md) - Presupuesto por artículo, compras por periodo fiscal y regla de desviación (tema de la reunión de descubrimiento).
* [MRP / Forecast-Planeación (FC)](mrp/) - Módulo de explosión de materiales, forecast y plan de producción.
* [Estado / Aprendizajes](state/learnings.md) - Buffer de errores y reglas descubiertas en runtime.
