// Probe de FÁBRICA: valida el commentary channel (fusión total de los dos
// brains) — con voice.active en el clientContext, el agente debe:
//   1) llamar la tool `narrar` DURANTE el turno (narración en vivo del cerebro),
//   2) emitir **SPEECH:** al final (resumen hablado),
//   3) responder con cuerpo completo para la pantalla.
// Crea una sesión vía el SDK de Eve con clientContext de voz y reporta todo.
//
// Cómo correrlo:
//   nvm use 24 >/dev/null 2>&1; node --import ./scripts/ts-hook.mjs \
//     --experimental-strip-types scripts/probe-voice-commentary.ts
import { Client } from "eve/client";

const HOST =
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.EVE_HOST ??
  "http://localhost:5173";

async function main() {
  const client = new Client({ host: HOST });
  const session = client.session({});
  const q = process.argv[2] ?? "¿Qué tenemos de frijol negro en el almacén?";
  console.log(`[probe] host=${HOST}`);
  console.log(`[probe] pregunta: ${q}`);
  await session.send({
    message: q,
    clientContext: { voice: { active: true, state: "listening" } },
  });

  const narrarCalls: string[] = [];
  let speech = "";
  let finalAnswer = "";
  let finished = false;
  const timeout = Date.now() + 240_000; // DeepSeek lento

  for await (const ev of session.stream({ startIndex: 0, follow: true })) {
    const d = (ev.data ?? {}) as Record<string, unknown>;
    if (ev.type === "actions.requested") {
      const actions = ((d?.actions as unknown[]) ?? []) as Record<string, unknown>[];
      for (const a of actions) {
        const name = String(a?.name ?? a?.toolName ?? a?.tool ?? "");
        if (name === "narrar") {
          const input = (a?.input ?? a?.arguments ?? {}) as Record<string, unknown>;
          narrarCalls.push(String(input?.texto ?? ""));
        }
      }
    }
    if (ev.type === "message.completed") {
      const m = (d?.message ?? {}) as { text?: string };
      if (typeof m?.text === "string") {
        finalAnswer = m.text;
        const sp = finalAnswer.match(
          /\*\*?SPEECH\*\*?:\s*([\s\S]*?)(?=\n\s*\*\*?INSIGHT\*\*?:|$)/i,
        );
        if (sp) speech = sp[1].trim();
      }
    }
    if (
      ev.type === "turn.completed" ||
      ev.type === "turn.failed" ||
      ev.type === "session.completed"
    ) {
      finished = true;
      break;
    }
    if (Date.now() > timeout) break;
  }

  console.log(`[probe] turno terminado: ${finished ? "sí" : "TIMEOUT"}`);
  console.log(`[probe] llamadas narrar (${narrarCalls.length}):`);
  for (const n of narrarCalls) console.log(`  - ${n}`);
  console.log(`[probe] SPEECH: ${speech || "(ninguno)"}`);
  console.log(`[probe] respuesta (primeros 300): ${finalAnswer.slice(0, 300)}`);
  const ok = narrarCalls.length > 0 && speech.length > 0 && finalAnswer.length > 0;
  console.log(`[probe] RESULTADO: ${ok ? "PASS (narrar + SPEECH + respuesta)" : "REVISAR"}`);
}

main().catch((err) => {
  console.error("[probe] error:", err);
  process.exit(1);
});
