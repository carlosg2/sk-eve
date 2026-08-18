// Reproduce la lógica CORREGIDA de correlación de `activitiesByTurn` de
// src/routes/chat/ChatSession.svelte contra eventos reales del session store,
// y detecta desajustes: un action.result cuyo callId no corresponde al tool
// con el que se emparejó (la UI ahora correlaciona por callId, no solo por
// toolName).
//
// Uso: node scripts/debug-tool-matching.mjs <sessionId>
import { DatabaseSync } from 'node:sqlite';

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Uso: node scripts/debug-tool-matching.mjs <sessionId>');
  process.exit(1);
}

const db = new DatabaseSync('.data/sessions.sqlite3');
const rows = db
  .prepare('SELECT type, data, emittedAt FROM events WHERE sessionId = ? ORDER BY emittedAt ASC')
  .all(sessionId);

const EV = rows.map((r) => ({ type: r.type, data: JSON.parse(r.data || '{}') }));

// ── Replica de activitiesByTurn (ChatSession.svelte) ─────────────────────
const byTurn = new Map();
let cur = [];
let toolSeq = 0;
let openReasoning = -1;
const mismatches = [];
const matched = [];

for (const ev of EV) {
  const d = ev.data ?? {};
  if (ev.type === 'turn.started') {
    cur = [];
    byTurn.set(String(d.turnId ?? `turn_${byTurn.size}`), cur);
    toolSeq = 0;
    openReasoning = -1;
  } else if (ev.type === 'reasoning.appended') {
    if (openReasoning === -1) {
      openReasoning = cur.length;
      cur.push({ kind: 'reasoning', key: `r${toolSeq}`, text: '', streaming: true });
    }
  } else if (ev.type === 'reasoning.completed') {
    openReasoning = -1;
  } else if (ev.type === 'actions.requested') {
    const actions = d.actions ?? [];
    for (const a of actions) {
      const rec = a ?? {};
      const name = String(rec.name ?? rec.toolName ?? rec.tool ?? 'tool');
      if (name === 'narrar') continue;
      cur.push({
        kind: 'tool',
        key: `t${toolSeq++}`,
        name,
        state: 'input-available',
        input: rec.input ?? rec.arguments,
        output: undefined,
        callId: rec.callId ?? null, // ← dato que la UI actual NO usa
      });
    }
  } else if (ev.type === 'action.result') {
    const r = d.result ?? {};
    const name = String(r.toolName ?? r.name ?? '');
    const resultCallId = r.callId ?? null;
    let hit = null;
    // Correlación por callId primero (fix 2026-08-15), fallback por nombre.
    if (resultCallId) {
      for (let i = cur.length - 1; i >= 0; i--) {
        const it = cur[i];
        if (it.kind === 'tool' && it.callId === resultCallId && (it.state === 'input-available' || it.state === 'input-streaming')) {
          hit = it;
          it.output = r.output;
          it.state = r.isError ? 'output-error' : 'output-available';
          break;
        }
      }
    }
    if (!hit) {
      for (let i = cur.length - 1; i >= 0; i--) {
        const it = cur[i];
        if (it.kind === 'tool' && it.name === name && (it.state === 'input-available' || it.state === 'input-streaming')) {
          hit = it;
          it.output = r.output;
          it.state = r.isError ? 'output-error' : 'output-available';
          break;
        }
      }
    }
    if (hit) {
      matched.push({ name, input: hit.input, callId: hit.callId, resultCallId });
      if (resultCallId && hit.callId && resultCallId !== hit.callId) {
        mismatches.push({ name, input: hit.input, resultCallId, matchedCallId: hit.callId });
      }
    } else {
      mismatches.push({ name, note: 'SIN tool previo con ese nombre (result huérfano)', resultCallId });
    }
  }
}

console.log(`\nSesión ${sessionId}: ${EV.length} eventos, ${matched.length} results emparejados, ${mismatches.length} DESAJUSTES\n`);

for (const m of mismatches) {
  console.log('── DESAJUSTE ──');
  console.log(`tool: ${m.name}`);
  console.log(`input del tool emparejado: ${JSON.stringify(m.input)?.slice(0, 200)}`);
  console.log(`callId del result: ${m.resultCallId}`);
  console.log(`callId del tool emparejado: ${m.matchedCallId}`);
  if (m.note) console.log(`nota: ${m.note}`);
  console.log('');
}
