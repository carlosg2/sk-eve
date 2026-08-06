# Protocolo de pruebas y evaluación — Meta-fábrica (Copilot)

Referencia operativa de la **fábrica** (VS Code Copilot) para hacer evaluaciones
completas, rápidas y con evidencia. Complementa `../.github/skills/promote-learnings/SKILL.md`
(compilar conocimiento) y `../.github/copilot-instructions.md` (operación). **El agente
runtime nunca ejecuta esto** — es herramienta de la fábrica para validar y decidir.

Regla de oro: **toda evaluación se apoya en la evidencia recopilada (radiografía durable),
no en la impresión visual**. Antes/después de un cambio se mide con las mismas fuentes.

---

## 1. Fuentes de evidencia (dónde está TODO lo que recopila el runtime)

Todas las piezas de la radiografía del self-improvement:

| Fuente | Qué contiene | Dónde | Sobrevive al purge (`rm -rf .eve`)? |
|---|---|---|---|
| **Espejo de eventos** (tabla `events`) | TODO el stream: mensajes, reasoning (el *por qué*), tool calls input/output (el *cómo*), errores, HITL | `.data/sessions.sqlite3` | ✅ sí (fuera de `.eve/`) |
| **Inputs reales al LLM** (tabla `llm_inputs`) | instructions (system resuelto) + messages por step | `.data/sessions.sqlite3` | ✅ sí |
| **Resúmenes de turno** (tabla `turn_summaries`) | tokens in/out, cache, steps, calls, errores, duración, status, tools | `.data/sessions.sqlite3` | ✅ sí |
| **Índice de sesiones** (tabla `sessions`) | título, activo, turnos, archivado | `.data/sessions.sqlite3` | ✅ sí |
| `llm-io.jsonl` / `traces.jsonl` | legacy (los mismos datos, en `.eve/`) | `.eve/` | ❌ no — usar SQLite |
| **Inspector de `/chat`** | status, tokens, DIAGNOSTICS, TRACE, warnings, `trend:` | UI en vivo | — (efímero) |
| **Learnings buffer** | errores capturados → conocimiento crudo por promover | `company-twin/companies/<t>/state/learnings.md` | ✅ sí |
| **Evals** | gates de regresión (4): schema, eficiencia, aprobación, entidades | `evals/*.eval.ts` + `npx eve eval` | — |
| **Linter de conocimiento** | entidades/campos vs MCP real (verdad de runtime) | `scripts/check-knowledge.ts` | — |
| **Git** | commits por tema = decisiones de la fábrica | `git log` | ✅ sí |

### Endpoints de lectura (los únicos que necesitas para evaluar)

```bash
# Radiografía por turno: pregunta + respuesta + tools + tokens + errores + status
curl -s 'http://localhost:5173/api/audit/turns?limit=50'
curl -s 'http://localhost:5173/api/audit/turns?sessionId=<id>&limit=50'

# Inputs reales al LLM por step
curl -s 'http://localhost:5173/api/audit/llm?limit=50&sessionId=<id>'

# Razonamiento reconstruido de una sesión (concatenación de reasoningDelta por turno)
# ⚠️ Consolidado: /api/audit/reasoning se eliminó (2026-08-06); usa
# /api/audit/turn (devuelve reasoning completo + razonamiento por step en timeline).

# Vista HOLÍSTICA de un turno (todo en una llamada): question/answer/reasoning/tools/hitl/métricas
curl -s 'http://localhost:5173/api/audit/turn?sessionId=<id>&turnId=turn_0'

# Página navegable de auditoría (la forma holística de VERLO todo):
#   http://localhost:5173/audit
#   → elige sesión → lista de turnos (métricas) → clic: TRAYECTORIA SECUENCIAL
#   (timeline) con razonamiento por paso, tool calls con input/output y duración,
#   tokens por step, mensajes y HITL, ordenados con tiempo relativo (t+).

# Resúmenes + tendencia (inspector / DevTools)
curl -s 'http://localhost:5173/api/traces?limit=50'

# Sesiones del sidebar
curl -s 'http://localhost:5173/api/sessions'
```

### Consultas SQL directas al corpus (minería/evaluación)

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('.data/sessions.sqlite3');
// turnos con errores (candidatos a learnings)
console.log(db.prepare(\"SELECT sessionId,turn,errors,inputTok,turnMs FROM turn_summaries WHERE errors>0 ORDER BY id DESC\").all());
// turnos más caros (a optimizar)
console.log(db.prepare(\"SELECT sessionId,turn,inputTok,turnMs,steps,toolCalls FROM turn_summaries ORDER BY inputTok DESC LIMIT 10\").all());
// evolución de tokens por turno (mejora/degradación)
console.log(db.prepare(\"SELECT sessionId,turn,at,inputTok,cacheHit,errors FROM turn_summaries ORDER BY id ASC LIMIT 100\").all());
// tools usados y su frecuencia
console.log(db.prepare(\"SELECT tools FROM turn_summaries\").all().flatMap(r=>JSON.parse(r.tools||'[]')).map(t=>t.name).reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{}));
// eventos de un tipo (ej. errores HITL / reasoning)
console.log(db.prepare(\"SELECT type,COUNT(*) n FROM events GROUP BY type\").all());
"
```

---

## 2. Receta de evaluación completa (checklist por cambio)

Usar SIEMPRE que se implemente una mejora (feature, fix, optimización, skill, evals).

1. **Baseline antes del cambio**: corre un turno E2E representativo de la feature en `/chat`
   (sesión nueva), registra del inspector: `status`, `tokens in/out`, `turnMs`, `steps`,
   `calls`, `cache hit`, `errors`, `warnings`, y los baselines históricos de la §5.
2. **Haz el cambio** (código/conocimiento). No olvides que una sesión activa usa el SNAPSHOT
   del `session.started` — para validar necesitas "Reiniciar conversación" (sesión nueva).
3. **Tipos**: `npm run check` (con `nvm use 24`) + `get_errors` en los archivos tocados.
4. **Conocimiento**: `node scripts/check-knowledge.ts` (linter vs MCP real, debe dar **0
   críticos**; los WARN CONOCIDO/KERNEL son esperados) y, si toca skills/twin, asegura que
   el gap se declara donde corresponde.
5. **Evals** (gate de governance): descubre con `node_modules/.bin/eve eval --list`, corre
   con `node_modules/.bin/eve eval --url http://127.0.0.1:62803/ --timeout 360000`
   (el puerto del dev server real). Deben pasar 4/4. Si un eval es NO determinista (el modelo
   varía la ruta), valida el **invariante**, no la ruta (ver §6).
6. **E2E post-cambio**: sesión nueva en `/chat`, turno de la feature, lee el inspector
   (`status: ready`, 0 errores, métricas). Compara con el baseline (§3).
7. **Persistencia**: verifica que la radiografía quedó guardada: `SELECT COUNT(*)` de
   `turn_summaries`/`llm_inputs` de la sesión nueva y/o `curl /api/audit/turns` → debe traer
   question + answer + métricas.
8. **Registra** el resultado en la memoria del repo (`/memories/repo/sk-eve.md`) con las
   métricas antes/después y cualquier hallazgo (gotcha, no determinismo, warning). Si el
   cambio toca conocimiento → skill promote-learnings (compilar + vaciar buffer).

---

## 3. Ciclo de prueba E2E estándar (navegador)

1. Navega a `http://localhost:5173/chat` (NO `/`).
2. **Reiniciar conversación** (botón o `page.evaluate` sobre el botón) — nueva sesión = nuevo
   snapshot con los cambios.
3. Escribe en `Escribe tu mensaje…` y envía (el botón Enviar a veces no responde a
   `click_element`; fallback `page.evaluate(() => document.querySelector('button[type="submit"]').click())`).
4. Espera a que desaparezca `Detener` o el inspector muestre `status: ready|error` (polling con
   `waitForTimeout`; los turnos de DeepSeek tardan 10s–5min — usa timeouts amplios).
5. Lee la región accesible **`Agent inspector`** (`pre[aria-label="Inspector (texto plano · sin
   screenshots)"]`): status, tokens, DIAGNOSTICS (steps/times/cache/warnings), TRACE, `trend:`.
   NO uses screenshots para diagnóstico textual ni abras DevTools.
6. Para el trace completo (sin truncado de `read_page`), usa `page.locator('pre[aria-label="Inspector..."]').textContent()`.
7. Verifica la respuesta del modelo en el log de mensajes (que sea real y correcta, no un loop
   ni "Dato no disponible" injustificado).

---

## 4. Baselines de referencia (métricas conocidas — para comparar)

| Turno | Tokens in | Tiempo | Steps | Calls | Errores | Notas |
|---|---|---|---|---|---|---|
| frijol negro (post F0-1+F1, 2026-08-06) | **78.7k** | 98s | 4 | 6 | 0 | original 919k/302s/22 calls/1 err |
| gap-abasto (post F1, 2026-08-06) | **50k** | 69s | 3 | 3 | 0 | cache 78% |
| gap-abasto (Fase A) | 46.9k | 62s | 3 | 3 | 0 | — |
| mrp-cf AJO (stock seguridad) | ~130k | 133s | 9 | 13 | 0 | eval exige ≤10 calls |
| plan producción S31 (post-P0) | 70.6k | — | 4 | 7 | 0 | antes 608k/17 steps/4 err |

Regla: una mejora real debe **reducir tokens/calls/tiempo o eliminar errores** sin perder
calidad de respuesta. Si una métrica empeora, revisa warnings del inspector (paginación,
resultados grandes, modelo lento) antes de concluir.

---

## 5. Gotchas de evaluación (lee antes de concluir cualquier cosa)

- **Sesión = snapshot**: los cambios en skills/kernel/middleware NO se ven en la sesión
  activa. Reiniciar conversación (o purge completo si el runtime sirve código stale).
- **Cobertura del razonamiento = desde el alta del espejo (2026-08-06 06:43)**: las sesiones
  anteriores a esa fecha no tienen eventos espejados (se perdieron con purges previos).
  A partir de ahí TODO queda: razonamiento (fidelidad 1:1 con `reasoning.completed`),
  mensajes, tools, errores, HITL.
- **Subagentes espejados** (2026-08-06): el hook `*` guarda TAMBIÉN los eventos de
  subagentes (su razonamiento es evidencia para diagnosticar). El índice del sidebar
  (`sessions`) los sigue filtrando — están en `events` pero no en el sidebar.
- **Razonamiento + narración**: DeepSeek a veces narra en texto normal entre tools (va a
  `message.appended`, no a `reasoning`). El razonamiento *formal* está completo en
  `reasoning.*`; el cuadro completo = reasoning + messages juntos.
- **llm-io captura PRE-middleware**: el `planTag` del lóbulo frontal sale `null` en
  `/api/audit/turns` (el input se captura en `step.started`, antes del middleware que lo
  inyecta). El plan es determinista del mensaje (`planContextSync`) — derivable, no lo tomes
  como fallo de la radiografía.
- **No recargar la página durante un turno activo** → sesiones huérfanas de Eve + Docker
  saturando. Si pasa: matar puertos 5173/5174/5175, `docker rm -f` contenedores eve,
  `rm -rf .eve node_modules/.vite`, `npm run dev`.
- **Purge = pérdida de sesiones Eve**: `rm -rf .eve` borra `.eve/.workflow-data` (estado
  real de Eve). La radiografía SQLite sobrevive (diseño), pero las sesiones físicas no.
- **DeepSeek es lento** (13–57 tok/s): timeouts amplios en evals (300–360s) y en el polling
  del navegador. "Modelo lento" en warnings NO es un bug de tu cambio.
- **No determinismo del modelo**: la misma pregunta puede usar rutas distintas (p.ej.
  aprobación vía `ask_question` vs `create_record` + gate). Los evals deben validar el
  INVARIANTE (parqueó en HITL / no ejecutó escritura), no la ruta exacta.
- **Inspector trunca**: ventana de 300 eventos y bloques de 2k chars (para no bloquear el
  hilo). Para payloads completos usa `textContent()` o el espejo SQLite.
- **`first`/`primero` como string** = bug de 524k chars: el hardening (`normalizeMcpArgs`)
  lo coacciona, pero un warning "Resultado grande" sigue siendo señal de que el modelo no
  siguió el patrón del skill — investiga el skill antes de culpar al modelo.
- **Evals con `--url`**: el dev server expone un puerto interno (ej. 62803); usa
  `eve eval --list` para descubrir y `--url http://127.0.0.1:<puerto>/` para correr.

---

## 6. Decidir qué promover (puente con promote-learnings)

La radiografía alimenta al skill promote-learnings: un turno con errores o fricciones
repetidas es un candidato a learning. Al promover:

1. Extrae del espejo `events` el tool que falló + su error (para el `[key]` del buffer).
2. Mide el costo del patrón problemático (tokens/steps) en `turn_summaries` para justificar
   el cambio.
3. Tras compilar y validar, re-mide el mismo turno (post-cambio) y registra la mejora en la
   memoria del repo — cierra el ciclo con evidencia, no con opinión.

---

## 7. Evaluación de CALIDAD de respuestas (exactitud + congruencia) — 2026-08-06

Las métricas de la §1-2 (errores de tool, tokens, steps) miden la EJECUCIÓN, no la
CALIDAD del contenido. Para "graduar" un skill (tesis: los evals deciden cuándo
sube de etapa) hace falta medir la respuesta: ¿contiene los datos correctos? y
¿es reproducible?

**`scripts/eval-calidad.ts`** — evaluador de la fábrica (v2, refactor 2026-08-06)
que:
- Lanza N repeticiones de una pregunta EN PARALELO (vía `POST /eve/v1/session`,
  sin esperar entre corridas — las sesiones son independientes; no saturar con
  >3-4 a la vez por DeepSeek). O reutiliza sesiones ya hechas con `SKIP_LANZAR=1`
  (mismo título en el índice) para no gastar LLM al re-evaluar.
- **Probe de VERDAD EN VIVO**: cada caso consulta el MCP real (aggregate/read)
  y calcula los valores esperados del snapshot ACTUAL — NADA hardcodeado. Si el
  snapshot cambia (ej. re-planean la semana 31), el evaluador lo detecta solo.
- **EXACTITUD REAL**: por invariante se EXTRAE el valor que el modelo reportó
  (números cerca de la etiqueta/familia en la respuesta) y se compara contra la
  verdad del probe (tolerancia ±2%). No es "menciona la palabra", es "el dato
  es correcto".
- **CONGRUENCIA REAL**: fingerprint de los valores EXTRAÍDOS por corrida (no de
  booleanos). A=697000 vs B=700000 → fingerprints distintos → congruencia baja.
- **MÉTRICAS COMPLETAS**: steps, calls, tokIn, tokOut, cache, err, warnings,
  duración (de la radiografía durable).
- **MINERÍA DE CONOCIMIENTO**: por invariante fallido se persiste un HALLAZGO
  (dato-faltante / dato-incorrecto / skill) → insumo directo para
  promote-learnings y para "graduar" skills.
- Persiste cada corrida en la tabla `evaluaciones` (`.data/sessions.sqlite3`,
  auditable, sobrevive al purge) y expone la tendencia en
  `GET /api/audit/evaluaciones` (exactitud media, congruencia, eficiencia y
  hallazgos por caso).

Uso:
```bash
node --experimental-strip-types --import ./scripts/ts-hook.mjs scripts/eval-calidad.ts
N=3 node ...  scripts/eval-calidad.ts          # repeticiones por caso
CASO=plan-s31-familias node ...                # un solo caso
SKIP_LANZAR=1 node ...                          # reutiliza sesiones ya hechas
BASE=http://localhost:5173 node ...             # el server escucha en ::1 → usar localhost
MCP_URL=<url> node ...                          # override del MCP del tenant activo
```

⚠️ **Por qué v1 daba "100%/100%" falso (lección validada 2026-08-06)**: el
usuario detectó que era "demasiado bello". Causas reales: (1) la exactitud solo
verificaba que la respuesta CONTENÍA el substring (un modelo que mencionaba las
familias/números pasaba aunque reportara datos INCORRECTOS); (2) la congruencia
media el acuerdo con la MODA de booleanos — si todas las corridas fallaban igual,
daba 100% aunque TODAS estuvieran mal; (3) los valores esperados eran
hardcodeados y no se re-verificaban contra el snapshot real (cuando re-planearon
la semana 31, la verdad pasó de 697k a 1,045k pz y el v1 seguía "acertando" con
el substring viejo). La v2 mide contra la VERDAD (probe MCP) y por VALORES
extraídos, no por presencia.

⚠️ **Bugs de runtime encontrados al construir v2** (todos corregidos):
1. **Shape del MCP ICF**: `aggregate_records` devuelve `{ result: { items: [] } }`
   (NO `{ items }` directo) — el probe inicial no leía nada y no evaluaba (el
   auto-calibrado se negó a evaluar sin verdad, correcto).
2. **Parseo de números**: `replace(",", ".")` solo reemplazaba la PRIMERA coma →
   `"3,154,344.99"` daba `[]` y `"70,435.91"` daba `70.43591` (3 órdenes menor).
   Fix: si hay coma Y punto, el decimal es el separador más cercano al final;
   con un solo separador, decimal si hay exactamente uno con ≤2 dígitos.
3. **Congruencia inflada**: con todas las corridas en fingerprints DISTINTOS
   (`mejor=1`), el edge case `count===mejor` marcaba TODAS como congruentes →
   100%. Fix: congruencia=1 solo si `mejor > 1 && count === mejor` (acuerdo real).
4. **esperarTurno prematuro**: `/api/audit/turns` deriva `status:"completed"` por
   DEFAULT aunque el turno siga EN CURSO (sin turn_summary, `turnMs=null`). El
   evaluador persistía evaluaciones vacías (0 calls/0 tok) mientras los turnos
   corrían en background (contenedores Docker del sandbox "Up"). Fix: exigir
   `turnMs != null` (el turn_summary se escribió = turno CERRADO de verdad).
5. **Proxy /eve 502**: `.eve/sveltekit-dev-server.json` stale (apunta al runtime
   Eve interno muerto) → `POST /eve/v1/session` 502. Fix: kill + `rm -f` del
   archivo + `npm run dev` (el gotcha del package.json).

⚠️ **Regla de oro de los invariantes (lección validada 2026-08-06)**: los valores
esperados deben **derivarse de la verdad de runtime** (probe MCP), NO asumirse.
El primer golden de `faltante-concentrado` asumía "Frijol Negro" y daba 67% falso;
el faltante real de aquel snapshot era "Mitades claras"+"Frijol Media Oreja". En
v2 no hay golden: el probe calcula la verdad en vivo y el evaluador mide contra
ella. Un evaluador que da "100% perfecto" en todo es sospechoso: revisar que no
esté midiendo presencia de strings hardcodeados en vez de la verdad.

Demo validada (2026-08-06, v2): re-evaluar sesiones viejas contra la verdad
ACTUAL dio **0% de exactitud** (el modelo reportó el snapshot viejo 697k vs la
verdad nueva 1,045k) — el evaluador ya NO da 100% falso; la minería lista
"qué conocimiento falta" por invariante para promover. La tendencia en
`/api/audit/evaluaciones` es la base para "graduar" un skill (pasar de
"no verificado" a "verificado" con calidad reproducible y datos correctos).

