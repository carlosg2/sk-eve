# Manual de dominio: Company Twin + ERP Kernel (OKF)

> Referencia de dominio para el conocimiento declarativo de Sigma: el **Company
> Twin** (memoria compartida por tenant) y el **ERP Kernel** (conocimiento
> universal de Intelisis), ambos en formato **OKF v0.2** (Open Knowledge Format).
> Fuente primaria: `company-twin/` (59 archivos markdown). Verificado contra el
> código 2026-08-10.

## 1. La estructura (dos bundles OKF)

```
company-twin/
├── index.md                    # root del bundle OKF (okf_version: "0.2")
├── runtime.json                # { activeTenant, activeAgent }
├── erp-kernel/                 # BUNDLE UNIVERSAL (tenant: null, cambia lento)
│   ├── index.md                # índice con okf_version + ciclo de vida + módulos
│   ├── cxp.md, cxpd.md, venta.md, ventad.md, compra.md, comprad.md…
│   ├── art.md, artalm.md, artdisponible.md, artfamfc.md, artmaterial.md…
│   ├── afectar.md, cambiar-situacion.md   # SPs de estatus
│   ├── sp-planart.md           # Attested Computation (cómputo sancionado)
│   └── mcp-tools.md            # contrato de las 7 tools MCP (verificado)
├── search-projections.json     # proyecciones de búsqueda
└── companies/                  # BUNDLES POR TENANT (cambian medio/rápido)
    ├── icf/                    # TENANT ACTIVO (Industrias Campo Fresco, ERP: INCF)
    │   ├── index.md, profile.md, modulos.md
    │   ├── policies/           # límites de aprobación, reglas operativas
    │   ├── mrp/                # MRP: explosión, forecast, plan, centros
    │   ├── agents/asistente-erp/  # agent.md (manifest) + skills/
    │   └── state/learnings.md  # BUFFER (bandeja de entrada, efímero)
    ├── marmoles/               # tenant con skill sugerido-compra
    ├── joyarock-300326/        # tenant referencia (legacy)
    └── comercial-parras/       # tenant referencia (legacy)
```

## 2. OKF v0.2 (reglas que rigen los archivos)

Cada concepto = 1 archivo markdown con frontmatter. Reglas operativas
(ADR-006 + skill promote-learnings §3):

- **`type` es lo único REQUERIDO**. Recomendados: `title`, `description` (una
  frase, se usa verbatim en index.md), `resource` (URI del asset, ej. `dbo.CXP`),
  `tags`, `generated: { by, at }` (reemplaza `timestamp`; actor según convención:
  `copilot/sigma-meta-fabrica`, `human:<id>`, `process:<id>`).
- **Extensión Sigma**: `layer` (`erp-kernel|vertical|company|skill`) y `tenant`
  (`null` = universal). Preservar claves desconocidas.
- **Provenance/trust/lifecycle**: `sources` (lista con `resource` requerido),
  `verified` (lista de `{ by, at }`), `status: draft|stable|deprecated`,
  `stale_after: YYYY-MM-DD`.
- **Body**: estructura (headings, tablas, code fences), no prosa. Headings
  convencionales: `# Schema`, `# Examples`, `# Computation`.
- **Cross-linking**: enlaces bundle-relativos con `/` (ej. `[Prov](/erp-kernel/prov.md)`).
- **`index.md`**: sin frontmatter (salvo root con `okf_version`), enumera el
  directorio para progressive disclosure.
- **`log.md`**: historial por scope, más nuevo primero, `## YYYY-MM-DD`.
- **`type: Attested Computation`**: cómputos sancionados con `runtime`,
  `parameters`, `executor` (con `receipt`), `attester` (código determinista).
  Patrón: `erp-kernel/sp-planart.md` (spPlanArt = explosión MRP oficial).

## 3. Los conceptos del kernel (qué sabe Sigma de Intelisis)

**~30 conceptos** organizados por módulo en el índice:

| Módulo | Conceptos |
|---|---|
| **CXP/Tesorería** | CXP, CxpD, CtaDinero, Dinero, DineroD |
| **Ventas/Compras/Artículos** | Venta, VentaD, Compra, CompraD, Art, ArtDisponible(Desc), Cte, Prov, MovTipo, Alm |
| **MRP/Planeación** | Empresa, EmpresaCfg2, ArtAlm, ArtMaterial (BOM), ArtFamFC, ResumenPlaneacionCF, PlanArtOP, PlaneacionMRP |
| **SPs de estatus** | Afectar (AFECTAR/CANCELAR/AUTORIZAR), CambiarSituacion |
| **Cómputos sancionados** | spPlanArt (Attested Computation) |
| **Contrato de ejecución** | mcp-tools.md (7 DML tools + customs) |

**Ciclo de vida universal**: `SINAFECTAR` (borrador) → `PENDIENTE` (afectado) →
`CONCLUIDO` · `CANCELADO`. Transiciones con SP `Afectar`, nunca `update_record`.

**Capacidades OData** (en `index.md`, NO duplicadas en módulos): parámetros sin
`$`, casing por vista, fechas sin comillas, strings con comillas simples,
`in`/`contains` NO soportados. Es la fuente canónica que el branch
`experiment/odata-sin-instrucciones` referencia desde el prompt.

## 4. El Company Twin del tenant (ICF — el activo)

- **`profile.md`**: negocio (distribución de granos/semillas), ERP `INCF`,
  MCP `https://api2.maserp.mx/icf/mcp`.
- **`modulos.md`**: qué expone el MCP de ICF y qué NO (CXP/tesorería no está
  publicado → `EntityNotFound`; el agente responde "Dato no disponible" sin
  probar variantes).
- **`policies/`**: límites de aprobación, reglas operativas (presupuesto de
  compras, MRP).
- **`mrp/`**: 7 conceptos (explosión, forecast-arribos, plan-producción,
  centros-estaciones, soporte, índice).
- **`state/learnings.md`**: el BUFFER — bandeja de entrada efímera donde el hook
  `memory.ts` anexa aprendizajes. La fábrica lo compila y vacía (constitución §3).

## 5. El consumidor runtime (cómo se lee el twin)

- **`agent/tools/query_company_twin.ts`**: la tool que el agente usa para
  consultar schema/políticas. Filtra por `tenant` (null o activo) + kernel scope
  del agente. Expone `status`/`stale`/`trust` derivados de `verified` — el
  agente prefiere conceptos no-stale y human-reviewed.
- **`agent/lib/context-planner.ts`**: construye un índice de ruteo (CONCEPTS =
  todos los .md con frontmatter `type`), filtra por visibilidad del agente, y
  precarga (fase A: mapa de ruteo estático en `session.started`; fase B:
  planificador por mensaje — bloqueada en Eve 0.29.2 por carrera de eventos).
- **`agent/lib/twin-memory.ts`**: `readLearnings()` / `recordLearning(key, text)`
  — append-only al buffer del tenant activo con dedupe por `[key]`.

## 6. Oportunidades (conocimiento)

1. **Supersession temporal (ADR-010)**: hoy el twin es append-only + edición
  humana. La regla ontológica ("lo temporal no se guarda como verdad") formalizada
  como *temporal supersession* (hecho nuevo inactiva al viejo con provenance) es
  la evolución hacia el memory graph temporal (F5).
2. **Cross-linking validado**: el linter de conocimiento (`check-knowledge.ts`)
  valida entidades/campos vs MCP real, pero no links rotos del bundle OKF.
3. **`stale_after` como trigger de revisión**: conceptos con fecha de caducidad
  podrían alimentar un watchdog de frescura (¿sigue siendo verdad lo que el
  kernel cree sobre X?).
4. **Vertical/industry layer**: la capa 2 del context stack (retail vs
  manufactura) no tiene bundle propio — hoy vive implícita en los tenants.
5. **El twin como entrada del generador DAB**: `extract_sdk_knowledge.py` +
  `generate_dab_config.py` (repo sigma-dab) pueden alimentar/enriquecer los
  conceptos del kernel automáticamente (probe SDK → conocimiento).

## 7. Gotchas

- **Single source of truth** (constitución §0): cada hecho en UN lugar. Un hecho
  duplicado en kernel + twin + skill es un bug (caso `ABIERTO`→`PENDIENTE` tocó
  4 archivos).
- **El twin restringe, nunca amplía**: una política del tenant que contradice el
  kernel gana (restringe); una que habilita algo que el kernel no permite, no.
- **El runtime NUNCA escribe al twin** (solo al buffer `state/`): la promoción
  es exclusiva de la fábrica.
- **OKF v0.1 sigue siendo consumible** por consumidores v0.2 (fallbacks de la
  spec §13) — no rechazar archivos legacy.
- **El buffer learnings NO es un destino**: si `learnings.md` crece sin
  compilar, la fábrica está atrasada (invariante: tras promote-learnings solo
  queda encabezado o `[pendiente]` justificado).

---

*Fuentes: `company-twin/` (59 archivos), skill promote-learnings §3,
tesis/context-stack.md, ADR-006. Generado 2026-08-10.*
