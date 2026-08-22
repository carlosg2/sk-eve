# ICF — Bandeja de aprendizajes del runtime (canal runtime → meta-fábrica)

Buffer interno de **coordinación**: el runtime anexa señales de error accionables
detectadas al consultar el MCP; la meta-fábrica las promueve a su hogar canónico
(`modulos.md`, `casing.md`, kernel, skills) y vacía esta bandeja. **No se inyecta
al prompt**: el conocimiento al agente llega por el hogar
canónico (query_company_twin + context-planner).

> Promoción 2026-08-20: las 41 entradas del buffer se compilaron a su hogar
> canónico (kernel index.md/sp-reportes-mrp.md/mcp-tools.md, modulos.md del
> tenant) y el buffer se vació. Queda solo el pendiente sin caso real.
> Corrida 2026-08-20 (2ª): `fecha-web_art_explosion_material` era RUTEO — el
> hecho ya es canónico (`sp-reportes-mrp.md`: el error `varchar→datetime` es
> interno del SP, no del llamador) y se añadió el respaldo al skill
> `mrp-produccion`. `concepto-inexistente-*` → regla de nomenclatura de
> `concept` en instructions + alias UV_QV_PPTOCOMPRA en `presupuesto-compras`.

## Pendientes por promover

- [movtipo-lookup] [pendiente] Patrón procedural para ventas/compras por tipo semántico:
  requiere confirmar el caso real antes de compilar (candidato: refinar el skill `icf`,
  que ya cubre compras por proveedor).
- [fecha-web_art_explosion_material] web_art_explosion_material rechazó el formato de fecha enviado (The conversion of a varchar data type to a datetime data type resulted in an out-of-range ). Documentar en el skill/kernel el formato de fecha exacto que espera el SP (probablemente ISO 'YYYY-MM-DD' sin hora, no ISO completo). [×22] (sesión wrun_01M0KH40CX9KAFW3NM7TK6S22S)
- [concepto-inexistente-mrp-sesion] query_company_twin('mrp-sesion') → concepto no encontrado. El modelo infirió un concepto que no existe en el twin de esta empresa; verificar el nombre real (OKF index) o crearlo. (sesión wrun_01M0H7QQD2A4QWM9XBA8T9VNKF)
- [concepto-inexistente-operaciones-policy-concepto-del-company-twin-] query_company_twin('operaciones-policy (concepto del Company Twin)') → concepto no encontrado. El modelo infirió un concepto que no existe en el twin de esta empresa; verificar el nombre real (OKF index) o crearlo. (sesión wrun_01M0HDVV1C1KGZQ4MKTBT9H918)
- [skill-inexistente-mrp-vaca] El modelo intentó cargar con load_skill un nombre que NO es skill: 'mrp-vaca' (probablemente un concepto del Company Twin o un documento). Solo los slugs del catálogo del agente (agent.md → skills) son skills. (sesión wrun_01M0HDZYAVF7TEC2JRNPK3N4XY)
- [req-programa_produccion_concentrado_centro-semana] Al llamar programa_produccion_concentrado_centro (SP 'or'), falta el parámetro '@Semana' (requerido). Documentar la firma del SP en el skill/kernel para que el modelo pase los parámetros obligatorios. [×3] (sesión wrun_01M0HFEC61WVJNAD6EWKJTM71K)
- [odata-read_records] Filtro OData inválido en read_records: Syntax error: character '<' is not valid at position 48 in 'Usuario eq 'MASERP' and Ano eq 2026 and Mes eq 8</orderby>'.. Revisar la construcción del $filter (tipos compatibles, sintaxis, comillas en fechas). [×3] (sesión wrun_01M0HGWQBFG95CXPTQMPJ2V3FJ)
- [skill-inexistente-mrp-soporte] El modelo intentó cargar con load_skill un nombre que NO es skill: 'mrp-soporte' (probablemente un concepto del Company Twin o un documento). Solo los slugs del catálogo del agente (agent.md → skills) son skills. [×2] (sesión wrun_01M0HH6GWPKHKVS9V13RK37HVZ)
- [ent-inexistente-artprototipod] La entidad 'ArtPrototipoD' NO existe en el MCP de esta empresa (EntityNotFound). Verificar el nombre real en el Company Twin / dab-config. Si un skill la documenta, está desactualizada. (sesión wrun_01M0HGMW9T9H52J3J7HER630J8)
- [req-cfcentra_trabajo_cumplimiento-ejercicio] Al llamar cfcentra_trabajo_cumplimiento (SP 'or'), falta el parámetro '@Ejercicio' (requerido). Documentar la firma del SP en el skill/kernel para que el modelo pase los parámetros obligatorios. (sesión wrun_01M0HGT9HEHWXRBDGGKN85RQ65)
- [skill-inexistente-mrp-plan-produccion] El modelo intentó cargar con load_skill un nombre que NO es skill: 'mrp-plan-produccion' (probablemente un concepto del Company Twin o un documento). Solo los slugs del catálogo del agente (agent.md → skills) son skills. (sesión wrun_01M0HH6GWPKHKVS9V13RK37HVZ)
- [archivo-inexistente-skill-md-] read_file('/workspace/skills/gap-abasto/SKILL.md.') → archivo no encontrado. El conocimiento se lee con query_company_twin / load_skill, no con read_file (paths del sandbox no accesibles). (sesión wrun_01M0JTQCCB5CEX34QYPA0A0B58)
