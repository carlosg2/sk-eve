const DELIMITER_CELL_RE = /^:?-+:?$/;

function splitTableRow(line: string): string[] {
	let trimmed = line.trim();
	if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
	if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
	return trimmed.split("|").map((cell) => cell.trim());
}

function isDelimiterRow(line: string): boolean {
	const trimmed = line.trim();
	if (!trimmed.includes("-") || !trimmed.includes("|")) return false;
	const cells = splitTableRow(trimmed);
	return cells.length > 0 && cells.every((cell) => cell.length > 0 && DELIMITER_CELL_RE.test(cell));
}

function looksLikeTableRow(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.length > 0 && trimmed.includes("|");
}

/**
 * El LLM genera con frecuencia tablas GFM donde la fila separadora
 * (|---|---|---|) tiene menos (o más) columnas que la fila de encabezado.
 * marked/remark-gfm exigen que coincidan exactamente o degradan la tabla
 * completa a texto plano (sin bordes ni celdas). Esta función normaliza la
 * fila separadora para que siempre tenga el mismo número de columnas que el
 * encabezado, antes de pasar el contenido al renderer.
 */
export function normalizeMarkdownTables(content: string): string {
	if (!content.includes("|")) return content;

	const lines = content.split("\n");

	for (let i = 0; i < lines.length - 1; i++) {
		const headerLine = lines[i];
		const delimiterLine = lines[i + 1];

		if (!looksLikeTableRow(headerLine) || !isDelimiterRow(delimiterLine)) continue;

		const headerCells = splitTableRow(headerLine);
		const delimiterCells = splitTableRow(delimiterLine);

		if (headerCells.length === delimiterCells.length) continue;

		const fixedCells = headerCells.map((_, idx) => delimiterCells[idx] ?? "---");
		lines[i + 1] = `| ${fixedCells.join(" | ")} |`;
	}

	return lines.join("\n");
}
