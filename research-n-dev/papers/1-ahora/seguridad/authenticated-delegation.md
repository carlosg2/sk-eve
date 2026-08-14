---
type: paper
area: delegacion
fase: F2
arxiv_id: "2501.09674"
citado_en_tesis: false
verificado: "2026-08-13"
---

# Authenticated Delegation and Authorized AI Agents

**Autores:** Tobin South, Samuele Marro, Thomas Hardjono, Robert Mahari, Cedric Deslandes Whitney, Dazza Greenwood, Alan Chan, Alex Pentland (MIT Media Lab)
**arXiv:** [2501.09674](https://arxiv.org/abs/2501.09674) · PDF: https://arxiv.org/pdf/2501.09674

## Resumen

Los agentes autónomos crean urgencia en torno a **autorización, accountability y
control de acceso**. Propone un framework de delegación **autenticada,
autorizada y auditable**: humanos delegan permisos y restringen el scope de los
agentes manteniendo cadenas claras de accountability. **Extiende OAuth 2.0 y
OpenID Connect** con credenciales y metadata específicas de agentes
(compatibilidad con la infraestructura web existente), y traduce **permisos en
lenguaje natural a configuraciones de control de acceso auditable** para
restringir capacidades según el modo de interacción.

## Por qué importa para Sigma — LA LAGUNA

La tesis §7 pide un **registro de agentes (Agent Card)** con capacidades, tools y
owner humano — pero sin base formal de cómo un humano autoriza y limita a un
agente. Este paper es esa base:

- Extender OAuth/OIDC para agentes es el mecanismo real detrás del "Agent Card
  firmada criptográficamente" del glosario v2.
- La traducción de permisos en lenguaje natural → control de acceso auditable es
  exactamente el puente entre "políticas del Company Twin" (texto OKF) y el
  "RBAC efectivo (hard-gate)" que la tesis §4.2 pide para F2.
- La "cadena de accountability" cierra el loop de la delegación del paper
  anterior: delegar con autorización y poder auditar quién autorizó qué.

## Takeaways accionables

- Para F2 (seguridad): diseñar el **hard-gate de RBAC sobre tools MCP** (hoy
  soft-gate) como un nivel de autorización delegado con scope y auditable — el
  approval gate de HITL ya existe, falta el nivel de autorización de la
  delegación.
- El Agent Card de cada agente debería ser un **token de autorización con scope**
  (como OAuth), no solo un documento JSON descriptivo: quién lo creó, qué tools,
  con qué límites, hasta cuándo.
- El lenguaje natural → permisos es la evolución de nuestras `policies/*.md`:
  seguir la estructura de este paper para que las políticas del Twin sean
  ejecutables, no solo texto leído por el modelo.

## Enlaces

- Abs: https://arxiv.org/abs/2501.09674 · PDF: https://arxiv.org/pdf/2501.09674
