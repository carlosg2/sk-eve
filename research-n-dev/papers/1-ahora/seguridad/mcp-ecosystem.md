---
type: paper
area: mcp
fase: F3
arxiv_id: "2509.25292"
citado_en_tesis: false
verificado: "2026-08-13"
---

# A Measurement Study of Model Context Protocol Ecosystem

**Autores:** Hechuan Guo, Yongle Hao, Yue Zhang, Minghui Xu, Peizhuo Lv, Jiezhi Chen, Xiuzhen Cheng
**arXiv:** [2509.25292](https://arxiv.org/abs/2509.25292) · PDF: https://arxiv.org/pdf/2509.25292

## Resumen

Primer **estudio empírico a gran escala del ecosistema MCP**. Construyen
MCPCrawler y analizan 17,630 entradas de seis mercados: 8,401 proyectos válidos
(8,060 servers y 341 clients). Resultados: **más de la mitad de los proyectos
listados son inválidos o de bajo valor**; los servers enfrentan riesgos
estructurales (monocultivos de dependencias, mantenimiento desigual); los clients
están en una fase transitoria de protocolos y patrones de conexión. Aporta la
primera visión basada en evidencia del ecosistema MCP, sus riesgos y su
trayectoria.

## Por qué importa para Sigma — LA LAGUNA

Sigma usa MCP como el canal hacia el ERP y, en el futuro (F6/F7), hacia más
sistemas. **El ecosistema en el que confía es inmaduro** y este paper lo
cuantifica:

- La decisión de NO depender de servers MCP de terceros (el DAB es un fork
  propio, controlado) queda validada: la mitad del ecosistema es basura.
- Los "monocultivos de dependencias" son el riesgo de supply chain (ASI04) para
  cualquier integración futura.
- La lección de portabilidad: la capa de abstracción de conexiones (hoy
  `runtime-config.ts` → mcp_url por tenant) es lo correcto; la interfaz debe
  permitir cambiar de canal sin reescribir el agente.

## Takeaways accionables

- No agregar servers MCP de terceros sin el mismo escrutinio que el DAB
  (revisar dependencias, mantenimiento, permisos) — o mejor, seguir usando
  servers propios.
- El MssqlMcp.Http remoto (MCP-TPS/ICF/Marmoles) desplegado por el backend es un
  server "propio" — aplicar el checklist del paper (mantenimiento, dependencias)
  antes de exponerlo a más tenants.
- Para producción (P-5): el estado "transitorio" de los clients MCP justifica
  mantener la capa de abstracción fina y no acoplarse a un patrón de conexión
  específico.

## Enlaces

- Abs: https://arxiv.org/abs/2509.25292 · PDF: https://arxiv.org/pdf/2509.25292
