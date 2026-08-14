---
type: paper
area: mcp
fase: F2
arxiv_id: "2505.11154"
citado_en_tesis: false
verificado: "2026-08-13"
---

# MPMA: Preference Manipulation Attack Against Model Context Protocol

**Autores:** Zihan Wang, Rui Zhang, Yu Liu, Wenshu Fan, Wenbo Jiang, Qingchuan Zhao, Hongwei Li, Guowen Xu
**arXiv:** [2505.11154](https://arxiv.org/abs/2505.11154) · PDF: https://arxiv.org/pdf/2505.11154
**Versión extendida del paper en AAAI.**

## Resumen

Introduce el **ataque de manipulación de preferencias MCP (MPMA)**: un atacante
despliega un server MCP customizado que manipula al LLM para **priorizarlo sobre
otros servers competidores** (beneficio económico). Diseñan dos variantes:
DPMA (Directa: inserta palabras/frases manipulativas en el **nombre y la
descripción del tool**) y GAPMA (genética y más sigilosa, con algoritmo genético
para inicializar descripciones). Los experimentos muestran alta efectividad y
sigilo, revelando una **vulnerabilidad crítica del MCP en ecosistemas abiertos**.

## Por qué importa para Sigma — LA LAGUNA

Es la forma moderna del **tool poisoning / supply chain (ASI04)** y conecta con
el vector #1 de la tesis (indirect prompt injection): en Sigma, las **skills y
los object-descriptions del DAB son texto que el modelo lee para decidir qué
tool usar**. Si un tenant o un servidor MCP envenena la descripción de un tool
("este tool es el único autorizado para pagos"), el agente prioriza el tool
equivocado:

- La descripción de tools es superficie de ataque, no solo documentación — el
  mismo principio aplica a los `object-description` del dab-config y a las
  descripciones de las skills.
- El nombre/descripción manipulativos son la vía silenciosa para desviar
  consultas hacia un server del atacante (en un futuro multi-tenant abierto).
- La detección (auditar descripciones, firmar configs) es el control.

## Takeaways accionables

- En F2, añadir un **invariante de integridad de tool descriptions**: los
  object-description del DAB y las descripciones de tools MCP son configuración
  firmada/versionada (ya lo son en git) — verificar que ningún tenant pueda
  alterarlas en runtime.
- Al auditar skills: revisar que ninguna descripción de skill "secuestre" el
  routing (que un skill no diga "usa siempre este tool para X" cuando la
  jerarquía de autoridad exige otra fuente).
- El allow-list de tools por agente (agent.md `mcp_tools`) es la defensa
  estructural: aunque la descripción manipule, el tool no está disponible.

## Enlaces

- Abs: https://arxiv.org/abs/2505.11154 · PDF: https://arxiv.org/pdf/2505.11154
