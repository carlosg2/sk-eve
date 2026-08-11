// Probe de fábrica — P1 memoria episódica (branch autoresearch/p1-memoria-episodica).
// Valida el mecanismo FTS5 contra el espejo REAL (.data/sessions.sqlite3) ANTES
// de hacer E2E en /chat: (1) reindexación incremental funciona, (2) búsqueda
// FTS5 devuelve hits de sesiones previas para preguntas recurrentes típicas,
// (3) getEpisodicContext filtra a tipos de valor (message/reasoning) y excluye
// la sesión indicada.
//
// Cómo correrlo (Node 24 + resolve-hook TS del repo):
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-p1-memoria.ts
import { reindexSearchableEvents, getEpisodicContext, searchEpisodicMemory } from "../agent/lib/session-search.ts";

const QUERIES = [
  "¿cómo vamos con los faltantes de frijol negro para surtir los pedidos de venta?",
  "plan de producción de la semana 31 piezas y kilos por familia",
  "stock de seguridad de la familia AJO materia prima",
  "arribos de compra próximas semanas",
];

async function main() {
  console.log("=== P1 memoria episódica — probe contra .data/sessions.sqlite3 ===");

  console.log("\n[1] reindexSearchableEvents() ...");
  const indexed = reindexSearchableEvents();
  console.log(`    indexados en esta pasada: ${indexed} (0 = ya al día)`);

  console.log("\n[2] búsquedas FTS5 por query recurrente (getEpisodicContext, limit 3, maxChars 1600)");
  for (const q of QUERIES) {
    const hits = getEpisodicContext(q, { limit: 3, maxChars: 1_600 });
    console.log(`\n  Q: "${q}"`);
    if (hits.length === 0) {
      console.log("     → 0 hits");
      continue;
    }
    for (const h of hits) {
      console.log(
        `     - ${h.type} | sesión …${h.sessionId.slice(-8)} | rank ${h.ageRank} | ${h.content.length} chars`,
      );
      console.log(`       "${h.content.slice(0, 140).replace(/\n/g, " ")}…"`);
    }
  }

  console.log("\n[3] excludeSessionId en acción (getEpisodicContext con sesión falsa)");
  const q = QUERIES[0];
  const excl = getEpisodicContext(q, { limit: 3, excludeSessionId: "wrun_NO_EXISTE" });
  console.log(`     hits con exclude inexistente: ${excl.length}`);
  if (excl[0]) {
    const excl2 = getEpisodicContext(q, { limit: 3, excludeSessionId: excl[0].sessionId });
    const leak = excl2.some((h) => h.sessionId === excl[0].sessionId);
    console.log(`     excluyendo la sesión del top hit: ${excl2.length} hits, ¿fuga de la excluida? ${leak}`);
  }

  console.log("\n[4] searchEpisodicMemory (snippets, para inspección)");
  const snaps = searchEpisodicMemory(q, { limit: 3 });
  for (const s of snaps) {
    console.log(`     - ${s.type} | …${s.sessionId.slice(-8)} | snippet: "${s.snippet.slice(0, 90)}…"`);
  }

  console.log("\n✓ Probe terminado. Si hay hits de message/reasoning para las queries recurrentes, el mecanismo está listo para E2E.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
