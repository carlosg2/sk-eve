---
type: paper
area: mcp
fase: F2
arxiv_id: "2602.01129"
citado_en_tesis: false
verificado: "2026-08-13"
---

# SMCP: Secure Model Context Protocol

**Autores:** Xinyi Hou, Shenao Wang, Yifan Zhang, Ziluo Xue, Yanjie Zhao, Cai Fu, Haoyu Wang
**arXiv:** [2602.01129](https://arxiv.org/abs/2602.01129) · PDF: https://arxiv.org/pdf/2602.01129

## Resumen

El Model Context Protocol (MCP) unifica el acceso a tools, pero su adopción
trae riesgos: **acceso no autorizado, tool poisoning, prompt injection,
escalada de privilegios y ataques de supply chain**. Propone **SMCP**: MCP con
**gestión de identidad unificada, autenticación mutua robusta, propagación de
contexto de seguridad en curso, enforcement de políticas de grano fino y
audit logging comprehensivo**, mostrando la aplicación con ejemplos prácticos.

## Por qué importa para Sigma — LA LAGUNA

Sigma se conecta al ERP **exactamente vía MCP** (DAB custom → `mcp_url` del
tenant). La tesis §4 tiene un modelo de amenazas del canal ("ASI04 Supply Chain:
servidor MCP envenenado / tool poisoning") pero **no conoce la literatura de
seguridad del propio protocolo que usa**:

- El vector #1 que la tesis identifica (indirect prompt injection vía campos de
  datos) entra por este canal; SMCP muestra los controles a nivel protocolo.
- El **approval gate de HITL** de Sigma es un control de aplicación; SMCP aporta
  los controles de infraestructura (identidad, autenticación mutua, audit) que
  hoy no existen en el DAB.
- La "política de grano fino" es el puente al hard-gate de RBAC que F2 pide.

## Takeaways accionables

- En F2, revisar si el MCP remoto de los tenants (`api2.maserp.mx/<tenant>/mcp`)
  tiene algún nivel de autenticación/autorización en el gateway (hoy parece
  abierto por URL); SMCP es el checklist de lo que debería tener.
- El **audit logging a nivel protocolo** (quién llamó qué tool MCP) es
  complemento de la radiografía: aunque el espejo registra lo que el runtime
  hizo, el log del servidor MCP registra lo que el servidor vio — dos fuentes
  para detectar manipulaciones.
- Los mcp.json de VS Code y las conexiones de Eve deberían declarar la identidad
  del agente (clave SMCP) en cada llamada para trazar el origen.

## Enlaces

- Abs: https://arxiv.org/abs/2602.01129 · PDF: https://arxiv.org/pdf/2602.01129
