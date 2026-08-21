# ICF — Bandeja de aprendizajes del runtime (canal runtime → meta-fábrica)

Buffer interno de **coordinación**: el runtime anexa señales de error accionables
detectadas al consultar el MCP; la meta-fábrica las promueve a su hogar canónico
(`modulos.md`, `casing.md`, kernel, skills) y vacía esta bandeja. **No se inyecta
al prompt**: el conocimiento al agente llega por el hogar
canónico (query_company_twin + context-planner).

> Promoción 2026-08-20: las 41 entradas del buffer se compilaron a su hogar
> canónico (kernel index.md/sp-reportes-mrp.md/mcp-tools.md, modulos.md del
> tenant) y el buffer se vació. Queda solo el pendiente sin caso real.

## Pendientes por promover

- [movtipo-lookup] [pendiente] Patrón procedural para ventas/compras por tipo semántico:
  requiere confirmar el caso real antes de compilar (candidato: refinar el skill `icf`,
  que ya cubre compras por proveedor).
