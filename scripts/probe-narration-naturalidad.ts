// Probe de FÁBRICA: valida las heurísticas de naturalidad conversacional de la
// capa de voz (2026-08-18) contra los casos REALES de la sesión de 20 turnos.
//
//  - narrationEchoesQuestion: la narración del cerebro NO debe repetir la
//    pregunta que el usuario acaba de hacer.
//  - isNearDuplicateNarration: no se deben hablar 2 narraciones casi idénticas
//    en el mismo turno.
//
// Cómo correrlo:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs --experimental-strip-types scripts/probe-narration-naturalidad.ts
//
// ⚠️ REGLA DE SEPARACIÓN: los probes son de la fábrica; el conocimiento del
// agente (skills, twin, instructions) NUNCA referencia esta ruta.
import { narrationEchoesQuestion, isNearDuplicateNarration } from "../src/lib/realtime/voice-naturalidad.ts";

type Case = { label: string; ok: boolean; detail?: string };
const results: Case[] = [];
let pass = 0;
let fail = 0;

function check(label: string, cond: boolean, detail?: string): void {
  results.push({ label, ok: cond, detail });
  if (cond) pass++;
  else fail++;
}

// ── Caso 1: eco de la pregunta (la sesión real lo mostró) ──────────────────
// Usuario: "¿Cuánto inventario tiene el chícharo mitad?"
// Narración real del cerebro: "Buscando el inventario del chícharo mitad…"
check(
  "eco: 'Buscando el inventario del chícharo mitad…' tras preguntar por el chícharo mitad",
  narrationEchoesQuestion("Buscando el inventario del chícharo mitad…", "¿Cuánto inventario tiene el chícharo mitad?") === true,
);

// Usuario: "¿Cuál es el artículo con mayor existencia en C. FRESCO?"
// Narración: "Buscando el artículo con más existencias en C. Fresco…"
check(
  "eco: 'Buscando el artículo con más existencias en C. Fresco…'",
  narrationEchoesQuestion(
    "Buscando el artículo con más existencias en C. Fresco…",
    "¿Cuál es el artículo con mayor existencia en C. FRESCO?",
  ) === true,
);

// Usuario: "¿Cuántas órdenes de compra hubo en mayo?"
// Narración: "Contando las órdenes de compra del mes de mayo…"
check(
  "eco: 'Contando las órdenes de compra del mes de mayo…'",
  narrationEchoesQuestion(
    "Contando las órdenes de compra del mes de mayo…",
    "¿Cuántas órdenes de compra hubo en mayo?",
  ) === true,
);

// Usuario: "¿Cuál es el faltante de frijol más grande?"
// Narración: "Revisando las piezas programadas de la semana treinta y dos…" (NO eco)
check(
  "no-eco: acción de otra semana no es eco de la pregunta de faltante",
  narrationEchoesQuestion(
    "Revisando las piezas programadas de la semana treinta y dos…",
    "¿Cuál es el faltante de frijol más grande?",
  ) === false,
);

// Narración de módulo GENÉRICA (el objetivo): nunca debe marcarse como eco
check(
  "no-eco: 'Revisando existencias…' (módulo genérico, el objetivo)",
  narrationEchoesQuestion("Revisando existencias…", "¿Cuánto inventario tiene el chícharo mitad?") === false,
);
check(
  "no-eco: 'Consulto el catálogo…'",
  narrationEchoesQuestion("Consulto el catálogo…", "¿Cuántos proveedores activos hay en total?") === false,
);

// Hallazgos con dato (no repiten la pregunta): permitidos
check(
  "no-eco: hallazgo 'Ojo, solo tenemos trece por ciento de cobertura…'",
  narrationEchoesQuestion(
    "Ojo, solo tenemos trece por ciento de cobertura…",
    "¿Qué tenemos de frijol negro?",
  ) === false,
);

// ── Caso 2: narraciones duplicadas (2 casi-iguales en el mismo turno) ───────
// La sesión mostró: "Buscando el inventario del chícharo mitad…" +
// "Consulto las existencias del chícharo mitad por almacén…"
check(
  "dup: 'Buscando el inventario del chícharo mitad…' vs 'Consulto las existencias del chícharo mitad por almacén…'",
  isNearDuplicateNarration(
    "Buscando el inventario del chícharo mitad…",
    "Consulto las existencias del chícharo mitad por almacén…",
  ) === true,
);

// Arranque + hallazgo DISTINTOS: no son duplicado
check(
  "no-dup: 'Revisando existencias…' vs 'Ojo, solo trece por ciento de cobertura…'",
  isNearDuplicateNarration("Revisando existencias…", "Ojo, solo trece por ciento de cobertura…") === false,
);

// "Contando las órdenes de compra del mes de mayo…" vs "Sumando el monto comprado en el año…" — distinto
check(
  "no-dup: mayo vs año",
  isNearDuplicateNarration(
    "Contando las órdenes de compra del mes de mayo…",
    "Sumando el monto comprado en el año…",
  ) === false,
);

// ── Reporte ────────────────────────────────────────────────────────────────
console.log(`\n=== probe-narration-naturalidad: ${pass} PASS / ${fail} FAIL ===\n`);
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.label}${r.ok ? "" : ` — ${r.detail ?? ""}`}`);
}
process.exit(fail > 0 ? 1 : 0);
