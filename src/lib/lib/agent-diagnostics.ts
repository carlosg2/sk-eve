// Diagnóstico compartido del agente. Fuente única de verdad para los DevTools
// de / y /chat: separa tiempo de MODELO vs TOOLS, calcula throughput (tok/s),
// cache hit% y detecta anti-patrones (paginación, narración, resultados
// enormes, errores, cache frío). Evita duplicar la lógica entre superficies.

export type StreamEv = { type: string; data?: Record<string, unknown> };
export type Warning = { level: "error" | "warn" | "info"; msg: string };

const SENSITIVE_FIELD_RE = /^(?:authorization|api.?key|token|secret|password|contrasena|contraseña|clabe|cuentaBanco|provCuenta|telefonos?|eMail\d*|contacto\d*)$/i;

export type Diagnostics = {
	turnMs: number;
	steps: number;
	modelTime: number;
	toolTime: number;
	toolCalls: number;
	inputTok: number;
	outputTok: number;
	cacheRead: number;
	cacheWrite: number;
	tokPerSec: number;
	cacheHit: number;
	warnings: Warning[];
};

/** Redacta secretos, datos bancarios y contacto personal sin mutar el evento original. */
export function redactSensitiveData(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSensitiveData);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [
			key,
			SENSITIVE_FIELD_RE.test(key) ? "[REDACTADO]" : redactSensitiveData(fieldValue),
		])
	);
}

/** Des-anida el envoltorio MCP { content: [{ type:"text", text }] } → JSON limpio. */
export function unwrapMcpOutput(output: unknown): string {
	const content = (output as { content?: unknown })?.content;
	if (Array.isArray(content)) {
		const texts = content
			.filter((c) => c?.type === "text" && typeof c.text === "string")
			.map((c) => c.text as string);
		if (texts.length) {
			return texts
				.map((t) => {
					try {
						return JSON.stringify(redactSensitiveData(JSON.parse(t)), null, 2);
					} catch {
						return t;
					}
				})
				.join("\n");
		}
	}
	if (output === null || output === undefined) return "null";
	if (typeof output === "string") return output;
	try {
		return JSON.stringify(redactSensitiveData(output), null, 2);
	} catch {
		return String(output);
	}
}

/** Etiqueta amigable para el usuario a partir de un tool name (indicador live). */
export function friendlyToolLabel(name: string, input: Record<string, unknown> = {}): string {
	const entity = String(input.entidad ?? input.entity ?? "");
	if (/buscar_registro/.test(name)) {
		if (entity === "Prov") return "Buscando proveedor…";
		if (entity === "Cte") return "Buscando cliente…";
		if (/^Art/.test(entity)) return "Buscando artículo…";
		return "Buscando coincidencias…";
	}
	if (/aggregate_records/.test(name)) return "Calculando totales…";
	if (/read_records/.test(name)) {
		if (entity === "Compra") return "Consultando compras…";
		if (entity === "Venta") return "Consultando ventas…";
		if (/^ArtDisponible/.test(entity)) return "Consultando existencias…";
		return "Consultando el ERP…";
	}
	if (/describe_entities/.test(name)) return "Revisando estructura…";
	if (/query_company_twin/.test(name)) return "Consultando conocimiento…";
	if (/create_record|update_record|delete_record|execute_entity|afectar|cambiar_situacion/.test(name))
		return "Preparando cambio…";
	return "Trabajando…";
}

/**
 * Calcula el diagnóstico agregado de un turno.
 * @param events lista de eventos del stream del agente
 * @param tsOf   función que devuelve el timestamp (ms epoch) de un evento
 */
export function computeDiagnostics(
	events: StreamEv[],
	tsOf: (ev: StreamEv, idx: number) => number
): Diagnostics {
	const warnings: Warning[] = [];
	let modelTime = 0,
		toolTime = 0,
		steps = 0,
		toolCalls = 0;
	let inputTok = 0,
		outputTok = 0,
		cacheRead = 0,
		cacheWrite = 0;
	let pendingStepTs: number | null = null;
	let pendingToolTs: number | null = null;
	const entityReads: Record<string, number> = {};

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		const d = (ev.data ?? {}) as Record<string, any>;
		const ts = tsOf(ev, i);
		switch (ev.type) {
			case "step.started":
				pendingStepTs = ts;
				break;
			case "actions.requested": {
				if (pendingStepTs != null) {
					modelTime += ts - pendingStepTs;
					pendingStepTs = null;
				}
				pendingToolTs = ts;
				toolCalls += (d.actions ?? []).length;
				for (const a of d.actions ?? []) {
					const name: string = a.name ?? a.toolName ?? a.tool ?? "tool";
					const input = a.input ?? a.arguments ?? {};
					if (/read_records/.test(name)) {
						const ent = String(input.entity ?? "?");
						entityReads[ent] = (entityReads[ent] ?? 0) + 1;
						const first = Number(input.first ?? 0);
						if (first >= 100 || input.after) {
							warnings.push({
								level: "warn",
								msg: `Paginación: read_records ${ent} first=${first}${input.after ? " +after" : ""} → usa buscar_registro (LIKE en servidor)`,
							});
						}
					}
				}
				break;
			}
			case "action.result": {
				if (pendingToolTs != null) {
					toolTime += ts - pendingToolTs;
					pendingToolTs = null;
				}
				const r = d.result;
				if (r) {
					const name = r.toolName || r.name || "tool";
					if (d.status === "rejected") {
						warnings.push({ level: "info", msg: `${name} rechazado en gate HITL` });
					} else if (d.error || r.isError) {
						warnings.push({
							level: "error",
							msg: `Error en ${name}: ${unwrapMcpOutput(d.error ?? r.output).replace(/\s+/g, " ").slice(0, 90)}`,
						});
					} else {
						const out = unwrapMcpOutput(r.output);
						if (out.length > 8000) {
							const advice = /buscar_registro/.test(name)
								? "la tool devuelve filas completas; proyecta la respuesta en servidor"
								: "limita select/first";
							warnings.push({
								level: "warn",
								msg: `Resultado grande (~${Math.round(out.length / 1000)}k chars) de ${name} → ${advice}; se reenvía cada step`,
							});
						}
					}
				}
				break;
			}
			case "message.completed": {
				const content: string = (d.content ?? "").trim();
				if (content) {
					const followedByTool = events.slice(i + 1).some((e) => e.type === "actions.requested");
					const badStart =
						/^(Voy|Déjame|Dejame|Ahora|Necesito|Vamos|Primero|Permíteme|Permiteme|Para|Realizando)\b/i.test(
							content
						);
					if (followedByTool) {
						warnings.push({
							level: badStart ? "warn" : "info",
							msg: `Narración entre tools: "${content.slice(0, 50)}…" (tokens = segundos)`,
						});
					}
				}
				break;
			}
			case "step.completed": {
				if (pendingStepTs != null) {
					modelTime += ts - pendingStepTs;
					pendingStepTs = null;
				}
				steps++;
				// Eve emite el usage APLANADO (protocol/message): inputTokens, outputTokens,
				// cacheReadTokens, cacheWriteTokens. Aceptamos también los nombres de ai-sdk
				// y providerMetadata.anthropic por robustez ante cambios de versión.
				const u = (d.usage ?? {}) as Record<string, number>;
				const pm = ((d.providerMetadata as any)?.anthropic ?? {}) as Record<string, number>;
				inputTok += u.inputTokens ?? u.promptTokens ?? 0;
				outputTok += u.outputTokens ?? u.completionTokens ?? 0;
				cacheRead +=
					u.cacheReadTokens ?? u.cachedInputTokens ?? u.cacheReadInputTokens ?? pm.cacheReadInputTokens ?? 0;
				cacheWrite +=
					u.cacheWriteTokens ?? u.cacheCreationInputTokens ?? pm.cacheCreationInputTokens ?? 0;
				break;
			}
			default:
				break;
		}
	}

	const first = events.length ? tsOf(events[0], 0) : 0;
	const last = events.length ? tsOf(events[events.length - 1], events.length - 1) : 0;
	const turnMs = Math.max(0, last - first);
	const tokPerSec = modelTime > 0 ? outputTok / (modelTime / 1000) : 0;
	// Eve/AI SDK ya incluye los tokens leídos y escritos en inputTokens.
	// Sumarlos otra vez duplicaría el denominador y reduciría artificialmente el hit rate.
	const cacheHit = inputTok > 0 ? cacheRead / inputTok : 0;

	for (const [ent, n] of Object.entries(entityReads)) {
		if (n >= 3)
			warnings.push({
				level: "warn",
				msg: `${n}× read_records sobre ${ent} en un turno → paginación bruta, usa buscar_registro`,
			});
	}
	if (steps >= 2 && cacheRead === 0 && cacheWrite === 0) {
		warnings.push({
			level: "info",
			msg: `Sin métricas de cache — ¿middleware de prompt-cache activo? (reinicia el server)`,
		});
	} else if (steps >= 2 && cacheRead === 0 && cacheWrite > 0) {
		warnings.push({ level: "info", msg: `Cache escrito pero 0 lecturas — el prefijo cambia entre steps` });
	}
	if (steps > 0 && modelTime / steps > 15000) {
		warnings.push({
			level: "warn",
			msg: `Modelo lento: ${(modelTime / steps / 1000).toFixed(1)}s/step (~${tokPerSec.toFixed(0)} tok/s) → revisa tier Anthropic o usa Haiku para búsquedas`,
		});
	}
	if (toolCalls > 0 && toolTime === 0) {
		warnings.push({
			level: "info",
			msg: "Duración MCP no medible: call/result llegaron agrupados; el tiempo total sí es fiable",
		});
	}

	return {
		turnMs,
		steps,
		modelTime,
		toolTime,
		toolCalls,
		inputTok,
		outputTok,
		cacheRead,
		cacheWrite,
		tokPerSec,
		cacheHit,
		warnings,
	};
}
