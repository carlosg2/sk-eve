# ERP Kernel — Log de cambios del bundle

Historial de promociones del ERP Kernel (capa universal Intelisis). Más nuevo primero.

## 2026-08-13

- **Update** `art.md` — **higiene de conocimiento (capa de fábrica)**: el concepto ahora
  declara SOLO lo operativo (schema, estatus universales `ALTA`/`BAJA`, patrones). Se
  eliminaron del body la sección "Variabilidad entre instalaciones" y los datos duros
  (conteos, comparativas cross-tenant), que son metadata de la fábrica — el agente no
  debe recibirlos. **Evidencia de la verificación 2026-08-13 (fábrica, no runtime)**:
  campos TPS=363 / ICF=338 / MARMOLES=358; estatus TPS ALTA 41,777·BAJA 1,113 / ICF
  ALTA 16,998·BAJA 4,881·BLOQUEADO 774·PROTOTIPO 5 / MARMOLES ALTA 12,380·BAJA 70;
  `Descripcion1` TPS varchar(1000), ICF/MARMOLES varchar(100); `AlmacenROP` solo ICF
  (27 valores); totales TPS 42,890 / ICF 22,658 / MARMOLES 12,450.
- **Update** `art.md` (corrección previa, misma fecha): "380 campos" → ver evidencia
  arriba (338–363 según instalación).
- **Delete** conceptos Delta por tenant (`/companies/icf/art-icf.md`,
  `/companies/tps/art-tps.md`, `/companies/marmoles/art-marmoles.md`) — eran metadata
  de fábrica (conteos cross-tenant) que contaminaba al runtime. El conocimiento
  operativo de estatus del tenant vive ahora en el Company Twin del tenant sin números.
## 2026-08-05

- **Update** Migración de metadata a **OKF v0.2** (ADR-006): `timestamp` → `generated: { by, at }`
  (actor `copilot/sigma-meta-fabrica`) en los 28 conceptos del kernel; `# Citations` →
  `sources` frontmatter en `mcp-tools.md`. `okf_version: "0.2"` en el index raíz.
- **Creation** `sp-planart.md` — `type: Attested Computation`: cómputo sancionado de la
  explosión MRP (`spPlanArt` / tool `planeacion_mrp`), con `runtime`, `parameters`,
  `executor` y `attester`. Promovido desde `planeacion-mrp.md` como mecanismo de Governance
  (attestation del act).
