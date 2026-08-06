# ERP Kernel — Log de cambios del bundle

Historial de promociones del ERP Kernel (capa universal Intelisis). Más nuevo primero.

## 2026-08-05

- **Update** Migración de metadata a **OKF v0.2** (ADR-006): `timestamp` → `generated: { by, at }`
  (actor `copilot/sigma-meta-fabrica`) en los 28 conceptos del kernel; `# Citations` →
  `sources` frontmatter en `mcp-tools.md`. `okf_version: "0.2"` en el index raíz.
- **Creation** `sp-planart.md` — `type: Attested Computation`: cómputo sancionado de la
  explosión MRP (`spPlanArt` / tool `planeacion_mrp`), con `runtime`, `parameters`,
  `executor` y `attester`. Promovido desde `planeacion-mrp.md` como mecanismo de Governance
  (attestation del act).
