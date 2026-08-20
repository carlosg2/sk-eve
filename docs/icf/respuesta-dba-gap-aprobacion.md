# Respuesta de la fábrica — APROBACIÓN para publicar P0 + P1 (28 SPs)

**Fecha:** 2026-08-19 · **De:** Fábrica Sigma (sk-eve) · **Para:** DBA/Backend (integración DAB ICF)
**BD:** `Intelisis5000` (alimenta el MCP de ICF, `https://api2.maserp.mx/icf/mcp`)

---

## 1. Decisión

✅ **SE APRUEBA la publicación de P0 completo (10 SPs) + P1 (18 SPs) = 28 entidades**,
con el patrón estándar que confirmaste (permiso `execute`, REST/GraphQL off, descripción
pública sin referencias internas, `mcp.custom-tool: true`).

Pasos de despliegue aceptados: agregar al `dab-config-icf.json` → `dab validate` →
**reiniciar DAB-ICF**. Tras el reinicio, la fábrica verificará en vivo (sección 4).

---

## 2. ⚠️ `spFCCentroCapacidadReal` (2 parámetros OUTPUT) — SÍ publicar

**Confirmado contra el código del DAB fork** (`src/Core/Resolvers/MsSqlQueryBuilder.cs`,
ramas de stored procedures con OUTPUT, líneas 291-339):

```sql
-- El DAB genera esto automáticamente cuando la entidad declara params OUTPUT:
DECLARE @CapacidadHras float; DECLARE @CapacidadPzas float;
EXECUTE dbo.spFCCentroCapacidadReal @Usuario = @p0, @Centro = @p1,
       @CapacidadHras = @CapacidadHras OUTPUT, @CapacidadPzas = @CapacidadPzas OUTPUT;
SELECT @CapacidadHras AS [CapacidadHras], @CapacidadPzas AS [CapacidadPzas]
```

El DAB **declara las variables, las pasa con `OUTPUT` y emite un `SELECT @param AS [param]`**
como columnas del result set. El tool `execute_entity` devuelve ese result set en `value`
(mismo camino que cualquier SP): **el cliente MCP SÍ consume las salidas**. No hay bloqueo;
publicar igual que el resto.

**Condición para la publicación de este SP:** declarar los 2 OUTPUT en la entidad
(`parameters` con su tipo) para que el DAB los detecte como `IsOutput` y genere el SELECT
de salida. Si se omiten, el SP se ejecuta pero sin devolver los valores.

---

## 3. Aprobaciones específicas

| Item | Decisión |
|---|---|
| P0 — 10 SPs de carga (`spFCAsignarBasesDefaul`, `spArtCentroDefaul`, `spArtCentroBalanceo`, `spWebForecast12`, `spWebForecastFam12S`, `spWebForecastBBC12`, `spWebForecastArribos12`, `spWebForecastArribosMateriaPrima12`, `spWebForecastArribosInsumo12`, `spWebInicio`) | ✅ **Aprobar y publicar** |
| P1 — 18 SPs de reporte (Desglose, Cobertura MP, Req. prorrateado, Explosión, Faltante concentrado, Cumplimiento ×2, Concentrado ×2, Inicio concentrado, Capacidad real, Histórico, Arribos ×2, FCArribosVaca, Vaca presupuesto, Plan semana) | ✅ **Aprobar y publicar** |
| `spFCCentroCapacidadReal` (OUTPUT ×2) | ✅ **Aprobar** — OUTPUT soportado por el DAB (confirmado en código) |
| `spWebSigmaEjecucion` (@SQL dinámico) | 🚫 **NO publicar** (confirmado) |
| `spWebFCCargaCorrida` (envolvente) | ⏸️ **Opcional / no bloquea** — si lo creas, publicamos `CargaCorridaFC` con el snippet; mientras tanto el agente usa la cadena de 11 SPs (ya aprobados) |
| P2 — reportes restantes | ⏸️ **Opcional / siguiente paso** — se puede agregar con el mismo patrón si se quiere cobertura total del portal (no bloquea la entrega) |

**Notas confirmadas:**
- Booleanos (`EnSilencio`, `Historico`): enviar `true`/`false`, no `"1"` (DAB: `cannot be
  resolved ... with type "Boolean"`).
- Nombres de tools en el MCP: DAB genera el custom tool con el nombre de la entidad en
  minúsculas (ej. `webdesgloseforecast`, `webcoberturamateriaprima`, `fccentrocapacidadreal`).

---

## 4. Verificación que hará la fábrica tras el reinicio

```
1. mcpListTools → deben aparecer los 28 SPs nuevos como tools
   (ej. webdesgloseforecast, webcoberturamateriaprima, fccentrocapacidadreal, webinicio, ...)
2. Probe con execute_entity:
   - fccentrocapacidadreal { Usuario: MASERP, Centro: <X> } → value con CapacidadHras/CapacidadPzas
   - webdesgloseforecast { Usuario: MASERP } → filas del desglose (formato portal)
3. E2E en /chat con el agente (sesión nueva):
   - "desglose de forecast del periodo activo" → usa el SP si aplica (o consulta propia)
   - "capacidad del centro X" → value con CapacidadHras/CapacidadPzas
4. Linter de conocimiento (node scripts/check-knowledge.ts) → 0 críticos
```

Si algún tool no aparece o devuelve error de parámetros, la fábrica reportará el nombre
exacto del tool y el error para ajuste.

---

## 5. Pendientes

1. **Publicar P0+P1 (28 entidades)** → `dab validate` → reiniciar DAB-ICF → avisar a la fábrica.
2. **`spFCCentroCapacidadReal`**: declarar los 2 OUTPUT en la entidad (no omitirlos).
3. **`spWebFCCargaCorrida`** (opcional): si decides crearlo, usamos `CargaCorridaFC` como tool
   único; mientras tanto el agente no lo necesita.
4. **Fecha oficial del periodo** (opcional): si prefieres re-correr la corrida con `@FechaEmision`
   2026/8 oficial en vez del fallback 2026-07-29, indícala y se re-corre (solo afecta snapshots 12S).
