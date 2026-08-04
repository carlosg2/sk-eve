---
type: Tenant Profile
title: Mármoles
description: Perfil de despliegue del tenant Mármoles (planeación/MRP, sugerido de compra).
layer: company
tenant: marmoles
company_name: Mármoles
erp_company: N/D (multiempresa — resolver siempre con catálogo Empresa)
mcp_url: https://api2.maserp.mx/marmoles/mcp
tags: [perfil, runtime, conexion, mrp, sugerido-compra]
---

# Mármoles

Perfil activo del tenant `marmoles`. Instalación de Intelisis **multiempresa**: no existe
un código de empresa fijo para este tenant — cada corrida debe resolver la `Empresa` contra
el catálogo (ver [Empresa](/erp-kernel/empresa.md)) y confirmarla con el usuario antes de
calcular cualquier sugerido de compra o MRP.

El agente por defecto de este tenant es [Sugerido de Compra](agents/sugerido-compra/agent.md),
construido a partir de las guías operativas de planeación entregadas por el equipo de negocio
(cargadas mediante el skill global `sugerido-compra`, ver `agent/skills/sugerido-compra/SKILL.md`).

La política operativa vive en [Sugerido de Compra — Política](policies/sugerido-compra-policy.md).
