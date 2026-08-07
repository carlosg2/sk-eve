#!/usr/bin/env node
/**
 * MIGRACIÓN ÚNICA (ya ejecutada el 2026-08-06, 83MB → 13.4MB): elimina los
 * eventos de streaming (deltas) del espejo SQLite y recupera el espacio
 * (VACUUM).
 *
 * Desde el refactor, `appendEvent` (agent/lib/session-store.ts) ya NO guarda
 * `reasoning.appended` / `message.appended` (ruido transitorio): la info vital
 * para auditar vive en los eventos COMPLETADOS (`reasoning.completed` con el
 * razonamiento final, `message.completed` con el mensaje final) + `meta.at`
 * (tiempos) + `step.completed.usage` (tokens) + `actions.requested`/
 * `action.result` (tools con duración). Los deltas NUNCA se vuelven a
 * acumular, así que este script NO es de mantenimiento recurrente.
 *
 * Solo tiene sentido correrlo en un entorno cuya BD se haya generado ANTES
 * del refactor (otra máquina, compañero, o un backup viejo con deltas).
 *
 * Uso:  node scripts/prune-deltas.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { statSync } from 'node:fs';

const DB_PATH = '.data/sessions.sqlite3';

function main() {
  const before = statSync(DB_PATH).size;
  const db = new DatabaseSync(DB_PATH);

  const del = db
    .prepare("DELETE FROM events WHERE type IN ('reasoning.appended','message.appended')")
    .run();
  console.log(`deltas eliminados: ${del.changes}`);

  db.exec('VACUUM');
  db.close();

  const after = statSync(DB_PATH).size;
  console.log(`tamaño del archivo: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
}

try {
  main();
} catch (err) {
  console.error('ERROR eliminando deltas:', err.message);
  process.exit(1);
}
