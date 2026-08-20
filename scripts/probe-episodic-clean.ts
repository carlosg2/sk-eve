// ── Probe: la memoria episódica ya no expone "tenant" al prompt ─────────────
// Verifica que getEpisodicContext (la vía de fuga encontrada) sanitiza el
// contenido: fragmentos viejos con "en este tenant...", "para este tenant (ICF)"
// se neutralizan a lenguaje de empresa antes de inyectarse al prompt.
//
// Uso: nvm use 24; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-episodic-clean.ts
import { getEpisodicContext } from "../agent/lib/session-search.js";
import { cleanTwinText } from "../agent/lib/twin-clean.js";

// ── 1) Saneamiento directo de patrones típicos de memoria ────────────────────
const samples = [
  "Para el resto de esta conversación, ten en cuenta este hecho: en este tenant el módulo de cuentas por pagar (CXP) y tesorería no está disponible.",
  "El valor estático fijo \"MASERP\" para este tenant (ICF) — es el usuario ERP que corre la explosión.",
  "consultar el twin para la política (ejercicio/periodo actual del tenant ICF).",
  "Nota: el módulo CXP no está publicado en este tenant, responder Dato no disponible.",
  "El tenant activo es Industrias Campo Fresco.",
  "Ante preguntas de ese módulo en ICF → responder Dato no disponible sin probar el MCP.",
];
let fail = 0;
for (const s of samples) {
  const clean = cleanTwinText(s);
  const hit = /tenant/i.test(clean);
  if (hit) { fail++; console.log(`❌ aún dice tenant: "${clean}"`); }
  else console.log(`✅ "${clean.slice(0, 90)}"`);
}

// ── 2) Búsqueda real contra el espejo (debe matchear y salir limpio) ─────────
const queries = ["tenant", "cuentas por pagar", "MASERP", "política aprobación"];
for (const q of queries) {
  const hits = getEpisodicContext(q, { limit: 3, maxChars: 600 });
  let dirty = 0;
  for (const h of hits) if (/tenant/i.test(h.content)) dirty++;
  console.log(`\nquery "${q}" → ${hits.length} hits, ${dirty} con tenant`);
  for (const h of hits.slice(0, 2)) {
    console.log(`  [${h.type}] ${h.content.slice(0, 120).replace(/\n/g, " ")}`);
  }
  if (dirty > 0) fail++;
}

console.log(fail === 0 ? "\n✅ PROBE OK — 0 fugas de tenant" : `\n❌ ${fail} fugas`);
process.exit(fail === 0 ? 0 : 1);
