import { defineDynamic, defineInstructions } from "eve/instructions";

// Anti-patrón: el modelo repite la MISMA tool call con el MISMO input en un
// mismo turno (visto en vivo: aggregate_records con el mismo filtro 2-3×
// seguidas). Este defineDynamic escanea el historial del input en cada
// `step.started`, detecta llamadas idénticas repetidas y añade un aviso al
// prompt para que reutilice el resultado previo. Avisa UNA vez por duplicado
// por sesión (estado por sessionId) para no saturar el prompt.

type ToolCallPart = { type?: string; toolName?: string; args?: unknown; input?: unknown; arguments?: unknown };
type MessageLike = { role?: string; content?: unknown };

/** Cuenta tool calls del historial: key = toolName + input normalizado. */
function collectCalls(messages: unknown): Map<string, number> {
	const counts = new Map<string, number>();
	if (!Array.isArray(messages)) return counts;
	for (const msg of messages as MessageLike[]) {
		const content = msg?.content;
		if (!Array.isArray(content)) continue;
		for (const part of content as ToolCallPart[]) {
			if (part?.type !== "tool-call" || !part.toolName) continue;
			// El part tool-call real expone los argumentos en `input`
			// (verificado en llm-io.jsonl: type/toolCallId/toolName/input).
			const args = part.input ?? part.args ?? part.arguments ?? {};
			const key = `${part.toolName}:${JSON.stringify(args)}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	return counts;
}

const warnedBySession = new Map<string, Set<string>>();

export default defineDynamic({
	events: {
		// ⚠️ Blindado: corre en cada step.started. Si lanza por un shape de
		// messages inesperado, crashearía el runtime de Eve (refresh de página).
		"step.started": (input: any) => {
			try {
				const sessionId = String(input?.session?.id ?? "?");
				const counts = collectCalls(input?.modelInput?.messages);

				const dupKeys: string[] = [];
				for (const [key, count] of counts) {
					if (count >= 2 && !warnedBySession.get(sessionId)?.has(key)) {
						dupKeys.push(key);
					}
				}
				if (!dupKeys.length) return null;

				const warned = warnedBySession.get(sessionId) ?? new Set<string>();
				for (const key of dupKeys) warned.add(key);
				warnedBySession.set(sessionId, warned);

				return defineInstructions({
					markdown: [
						"## ⚠️ Duplicados detectados (auto)",
						"Repetiste tool calls con el MISMO input en este turno:",
						"",
						...dupKeys.map((k) => `- ${k} (${counts.get(k)}×)`),
						"",
						"Reutiliza el resultado previo. No vuelvas a invocar el mismo tool con el mismo filtro/select.",
					].join("\n"),
				});
			} catch {
				return null; // nunca romper el step por el detector de duplicados
			}
		},
	},
});
