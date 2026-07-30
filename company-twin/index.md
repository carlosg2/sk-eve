---
okf_version: "0.1"
---

# Company Twin — Sigma AGI

Bundle OKF (Open Knowledge Format) que representa el conocimiento de Sigma AGI
en capas separadas por velocidad de cambio (Context Stack). Cada concepto es un
archivo markdown con frontmatter tipado y queryable.

# Capas (Context Stack)

* [ERP Kernel](erp-kernel/) - Conocimiento universal de Intelisis. Capa 1, cambia lento. `tenant: null`.
* [Empresas](companies/) - Company Twin por tenant. Capa 3, cambia medio/rápido.
  * [ICF — Industrias Campo Fresco](companies/icf/) — **tenant activo**. Empresa ERP: `CP`. MCP: `https://api2.maserp.mx/icf/mcp`
  * [JoyaRock](companies/joyarock-300326/) — tenant anterior (referencia).

# Convención de frontmatter

Cada concepto declara:
* `type` — tipo de concepto (REQUERIDO por OKF).
* `layer` — capa del Context Stack: `erp-kernel` | `vertical` | `company` | `skill`.
* `tenant` — id del tenant, o `null` si es universal (kernel).
* `tags` — categorización cruzada.
