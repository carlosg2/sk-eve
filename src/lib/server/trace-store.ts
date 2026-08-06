// Trace store: persiste un resumen por turno (JSONL) para minería offline y
// tendencias. Es la fuente de verdad del ciclo de self-improvement: permite ver
// mejora/degradación (turnMs, steps, tokens, cache, errores) y analizar
// trayectorias pasadas sin depender de la memoria efímera del navegador.
//
// Escritura: el chat hace POST /api/traces al cerrarse cada turno.
// Lectura: GET /api/traces (lista + tendencia) para el DevTools / inspector.

import { appendFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export type TraceTool = {
	name: string;
	state: string;
	inputKey: string;
	outputLen: number;
};

export type TurnTrace = {
	sessionId: string;
	turn: number;
	at: string;
	turnMs: number;
	steps: number;
	toolCalls: number;
	inputTok: number;
	outputTok: number;
	cacheRead: number;
	cacheHit: number;
	errors: number;
	warnings: number;
	status: string;
	tools: TraceTool[];
};

export type TraceTrend = {
	count: number;
	avgTurnMs: number;
	avgSteps: number;
	avgCalls: number;
	avgInputTok: number;
	avgCacheHit: number;
	totalErrors: number;
};

function resolveRoot(): string {
	let dir = process.cwd();
	for (let i = 0; i < 8; i++) {
		if (existsSync(join(dir, "package.json"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return process.cwd();
}

const TRACE_PATH = join(resolveRoot(), ".eve", "traces.jsonl");

/** Anexa un resumen de turno (append-only, una línea JSON por turno). */
export async function appendTrace(rec: TurnTrace): Promise<void> {
	try {
		await mkdir(dirname(TRACE_PATH), { recursive: true });
		await appendFile(TRACE_PATH, JSON.stringify(rec) + "\n");
	} catch {
		// Nunca romper el turno por un fallo de escritura del log.
	}
}

/** Lee los últimos `limit` traces (los más nuevos al final). */
export async function readTraces(limit = 500): Promise<TurnTrace[]> {
	let raw = "";
	try {
		raw = await readFile(TRACE_PATH, "utf8");
	} catch {
		return [];
	}
	const out: TurnTrace[] = [];
	for (const line of raw.split("\n")) {
		const s = line.trim();
		if (!s) continue;
		try {
			out.push(JSON.parse(s) as TurnTrace);
		} catch {
			// línea corrupta: ignorar
		}
	}
	return out.slice(-Math.max(1, limit));
}

/** Agregados simples sobre los traces para el DevTools (tendencia). */
export function computeTrend(traces: TurnTrace[]): TraceTrend | null {
	if (!traces.length) return null;
	const n = traces.length;
	const sum = (f: (t: TurnTrace) => number) => traces.reduce((acc, t) => acc + f(t), 0);
	return {
		count: n,
		avgTurnMs: Math.round(sum((t) => t.turnMs) / n),
		avgSteps: sum((t) => t.steps) / n,
		avgCalls: sum((t) => t.toolCalls) / n,
		avgInputTok: Math.round(sum((t) => t.inputTok) / n),
		avgCacheHit: sum((t) => t.cacheHit) / n,
		totalErrors: sum((t) => t.errors),
	};
}
