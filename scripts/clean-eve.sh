#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# Purga SEGURA del runtime de Eve — elimina SOLO cachés/snapshots de compilación
# y PRESERVA las conversaciones.
#
#   · .eve/.workflow-data  → estado durable de Eve (runs/steps/streams/waits).
#                            Vive en .data/eve-workflow (symlink); NUNCA se borra.
#   · .data/               → SQLite (sessions, events, llm_inputs, ...). NUNCA.
#
# Sustituye al viejo `rm -rf .eve node_modules/.vite`, que borraba las
# conversaciones y obligaba al modo "recuperada".
#
# Uso:  ./scripts/clean-eve.sh
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ Purga segura de cachés de Eve (las conversaciones se conservan)"

# Snapshots / cachés de compilación del dev runtime (esto es lo único que
# realmente hay que purgar tras cambios de versión de Eve o estados stale).
rm -rf .eve/dev-runtime .eve/cache .eve/dev-hosts
rm -f  .eve/dev-server-state.v1.json .eve/dev-cleanup-intent.*.json .eve/sveltekit-dev-server.json

# Logs efímeros ya migrados a SQLite (.data/) — redundantes, se pueden borrar.
rm -f  .eve/llm-io.jsonl .eve/traces.jsonl

# Caché de Vite (bundle de deps).
rm -rf node_modules/.vite

echo "▶ OK. Conversaciones intactas en .eve/.workflow-data → .data/eve-workflow"
