#!/usr/bin/env node
/**
 * Asegura que el estado durable del workflow de Eve (`.eve/.workflow-data`)
 * viva realmente en `.data/eve-workflow` (que NUNCA se purga), vía un symlink.
 *
 * Por qué: `rm -rf .eve` era el purge habitual de este repo y borraba las
 * conversaciones (Eve no puede continuar una sesión sin su estado de workflow:
 * runs/steps/streams/waits). Con este symlink, aunque borres TODO `.eve/`,
 * las conversaciones sobreviven en `.data/` y se re-enlazan en el próximo
 * arranque → continuar una sesión SIEMPRE funciona.
 *
 * No bloquea el arranque: si algo falla, loguea y sale 0.
 */
import { existsSync, lstatSync, mkdirSync, symlinkSync, renameSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const eveDir = join(root, '.eve');
const source = join(eveDir, '.workflow-data');
const target = join(root, '.data', 'eve-workflow');

function log(...a) {
  console.log('[ensure-eve-workflow]', ...a);
}

function isSymlink(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}

function isEmptyDir(p) {
  try { return readdirSync(p).length === 0; } catch { return false; }
}

function makeLink() {
  mkdirSync(target, { recursive: true });
  rmSync(source, { recursive: true, force: true }); // borra dir/symlink residual
  symlinkSync(target, source, 'dir');
  log('ok: .eve/.workflow-data →', target);
}

try {
  mkdirSync(eveDir, { recursive: true });
  mkdirSync(join(root, '.data'), { recursive: true });

  if (isSymlink(source)) {
    log('ok: .eve/.workflow-data ya es symlink →', target);
    process.exit(0);
  }

  const sourceExists = existsSync(source);

  if (!sourceExists || isEmptyDir(source)) {
    // No hay datos previos (o dir vacío): creamos el symlink directo.
    makeLink();
  } else if (!existsSync(target) || isEmptyDir(target)) {
    // Migración: mover el estado existente a .data/ (no destructivo).
    if (existsSync(target)) rmSync(target, { recursive: true, force: true }); // dir vacío
    renameSync(source, target);
    symlinkSync(target, source, 'dir');
    log('migrado .eve/.workflow-data →', target, '(conversaciones conservadas)');
  } else {
    // Ambos tienen datos: fusionar (copiar) y reemplazar por symlink.
    cpSync(source, target, { recursive: true, force: true });
    rmSync(source, { recursive: true, force: true });
    symlinkSync(target, source, 'dir');
    log('fusionado .eve/.workflow-data →', target);
  }
} catch (err) {
  // Nunca bloquear el arranque del dev server.
  console.error('[ensure-eve-workflow] ERROR (no bloquea el arranque):', err.message);
  process.exit(0);
}
