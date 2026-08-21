// ── Saneamiento del Company Twin para el runtime ─────────────────────────────
// El Company Twin físico es la fuente de la fábrica (OKF, con rutas por capas:
// /erp-kernel/, /companies/<tenant>/). El agente NO debe ver esa estructura:
// es metadata de la fábrica que puede contaminar su respuesta. Este helper
// proyecta el contenido a una vista plana y sana:
//   - Enlaces y menciones de rutas de capa → nombre corto del concepto
//     (último segmento, como lo resuelve query_company_twin).
//   - La noción de capas ("layer", "ERP Kernel", "universal") → lenguaje neutro.
// Blindado: nunca lanza (un fallo devuelve el body original).

const PATH_PREFIX = /(?:\/)?(?:company-twin\/)?(?:erp-kernel|companies)\//gi;
// Captura cualquier ruta de capa (con o sin prefijo company-twin/ y con
// cualquier profundidad de segmentos) → devuelve el nombre corto.
const SHORT_ID_RE = /(?:\/)?(?:company-twin\/)?(?:erp-kernel|companies)\/(?:[a-z0-9_-]+\/)*([a-z0-9_-]+?)(?:\.md)?/gi;

/** Extrae el nombre corto (último segmento) de una ruta de capa. */
function lastSegment(path: string): string {
  const m = path.match(/([^/]+?)(?:\.md)?$/);
  return m ? m[1] : path;
}

export function cleanTwinBody(body: string): string {
  try {
    let out = body;
    // 1. Enlaces markdown [texto](/company-twin/erp-kernel/a/b/c.md) → [texto](c)
    out = out.replace(
      /\]\(((?:\/)?(?:company-twin\/)?(?:erp-kernel|companies)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.md)\)/gi,
      (_m, path: string) => `](${lastSegment(path)})`,
    );
    // 2. Rutas sueltas en prosa → nombre corto (sin ruta de fábrica)
    out = out.replace(SHORT_ID_RE, (_m, name: string) => name);    // ── 2b. NOMENCLATURA REAL (raíz, 2026-08-20): neutralizar TODO wikilink de
    // documento del twin para que el modelo no lo confunda con un skill. El
    // runtime distingue TRES fuentes con nombres explícitos:
    //   · skill         → se carga con `load_skill('<slug>')` (catálogo del agente)
    //   · concepto      → se lee con `query_company_twin('<id>')` (Company Twin / ERP Kernel)
    //   · tool del ERP  → se invoca directo (read_records, aggregate_records…)
    // Cualquier slug con extensión `.md` que sobreviva aquí parece un skill al
    // modelo (p.ej. `mrp-plan-produccion` desde `[..](mrp-plan-produccion.md)`)
    // → `load_skill("mrp-plan-produccion")` → error. Se anota como CONCEPTO.
    // 2b.1 Enlaces markdown relativos [texto](id.md) → texto (concepto: id)
    out = out.replace(
      /\[([^\]]+)\]\(([a-z0-9_-]+)(?:\.md)?\)/gi,
      (_m, text: string, id: string) => `${text} (concepto del Company Twin: ${id})`,
    );
    // 2b.2 Backticks con .md → nombre (concepto del Company Twin)
    out = out.replace(/`([a-z0-9_-]+)\.md`/gi, "$1 (concepto del Company Twin)");
    // 2b.3 Menciones sueltas id.md en prosa → id (concepto del Company Twin)
    out = out.replace(/\b([a-z0-9_-]+)\.md\b/gi, "$1 (concepto del Company Twin)");    // 3. Noción de capas y del concepto "tenant" en prosa → lenguaje de
    //    empresa/neutro. El agente trabaja con UNA empresa y no debe hablar
    //    de tenants, capas ni del kernel. Reglas en orden específico + una
    //    pasada final de normalización gramatical.
    out = out
      // ── tenant ──
      .replace(/\bmulti-?tenant\b/gi, "multiempresa")
      .replace(/\bdel tenant activo\b/gi, "de la empresa")
      .replace(/\b(?:el |un |al |este |ese )?tenant activo\b/gi, "la empresa")
      .replace(/\bdel tenant\b/gi, "de la empresa")
      .replace(/\bal tenant\b/gi, "a la empresa")
      .replace(/\bpara el tenant\b/gi, "para la empresa")
      .replace(/\b(?:el |un |este |ese )tenant\b/gi, "la empresa")
      .replace(/\botros tenants\b/gi, "otras empresas")
      .replace(/\blos tenants\b/gi, "las empresas")
      .replace(/\btenants?\b/gi, "empresa")
      // ── capas / kernel ──
      .replace(/\blayer:\s*(?:erp-kernel|company)\b/gi, "")
      .replace(/\blayer:\s*/gi, "")
      .replace(/\blayer\s+(?:erp-kernel|company)\b/gi, "")
      .replace(/\b(?:en )?la capa (?:erp-kernel|company)\b/gi, "")
      .replace(/\(\s*erp-kernel\s*\)/gi, "")
      .replace(/\b(?:el |del |al |un )?kernel universal\b/gi, "el sistema")
      .replace(/\berp-kernel\b/gi, "")
      .replace(/\bERP Kernel\b/gi, "conocimiento general del sistema")
      .replace(/\bdel kernel\b/gi, "del sistema")
      .replace(/\bal kernel\b/gi, "al sistema")
      .replace(/\b(?:el |un |este |ese )kernel\b/gi, "el sistema")
      .replace(/\b(?:el |un |este |ese )?kernel\b/gi, "el sistema")
      .replace(/\buniversal\b/gi, "general")
      .replace(/\brestringe a\s*/gi, "")
      .replace(/\bcapa de capacidad de ejecuci[oó]n\b/gi, "capacidad de ejecución")
      // ── jerga de infraestructura → lenguaje operativo (2026-08-19) ──
      // El twin físico lo escribe la fábrica (con su vocabulario técnico); la
      // proyección que ve el runtime lo traduce a lenguaje operativo. El agente
      // no debe repetir "MCP/DAB/EntityNotFound/describe_entities/BD" al usuario.
      // ── jerga de proceso (SP / tools / métricas) → lenguaje operativo ──
      .replace(/\b(?:los |las )?SPs de carga\b(?![\w-])/gi, "las rutinas de carga")
      .replace(/\b(?:el |un )?SP de carga\b(?![\w-])/gi, "la rutina de carga")
      .replace(/\b(?:los |las )?SPs de reporte\b(?![\w-])/gi, "las consultas de reporte")
      .replace(/\b(?:los |las )?SPs de cumplimiento\b(?![\w-])/gi, "las consultas de cumplimiento")
      .replace(/\bTool MCP\b(?![\w-])/gi, "Función")
      .replace(/\b37 tools\b(?![\w-])/gi, "varias funciones")
      .replace(/\bcustom[- ]tools?\b(?![\w-])/gi, "funciones")
      .replace(/\btool ([a-z0-9_]+)\b(?![\w-])/gi, "función $1")
      .replace(/\btools\/list\b/gi, "la lista de funciones disponibles")
      .replace(/\b(?:los |las |unos |unas )?SPs\b(?![\w-])/gi, "las rutinas")
      .replace(/\b(?:el |un |este )?SP\b(?![\w-])/gi, "la rutina")
      .replace(/(?<![\w-])\btools\b(?![\w-])/gi, "funciones")
      .replace(/\bEntityNotFound\b/gi, "entidad no definida")
      .replace(/\bdescribe_entities\b/gi, "catálogo de entidades")
      .replace(/\bel DAB de la empresa\b(?![-\w])/gi, "la fuente de datos de la empresa")
      .replace(/\bnuestro DAB\b(?![-\w])/gi, "el sistema")
      .replace(/\bdel DAB\b(?![-\w])/gi, "de la fuente de datos")
      .replace(/(?<![\w-])\b(?:el |al |un )?DAB\b(?![\w-])/gi, "el sistema")
      .replace(/\bel MCP de esta empresa\b(?![-\w])/gi, "la fuente de datos de esta empresa")
      .replace(/\bel MCP de la empresa\b(?![-\w])/gi, "la fuente de datos de la empresa")
      .replace(/\bdel MCP de\b(?![-\w])/gi, "de la fuente de datos de")
      .replace(/\bdel MCP\b(?![-\w])/gi, "de la fuente de datos")
      .replace(/\ben el MCP\b(?![-\w])/gi, "en la fuente de datos")
      .replace(/\bal MCP\b(?![-\w])/gi, "a la fuente de datos")
      .replace(/\bel MCP\b(?![-\w])/gi, "la fuente de datos")
      .replace(/(?<![\w-])\bMCP\b(?![\w-])/gi, "fuente de datos")
      .replace(/la BD\s*`?Intelisis5000`?/gi, "la base de datos")
      .replace(/`?Intelisis5000`?/gi, "la base de datos")
      .replace(/\bla BD\b/gi, "la base de datos")
      .replace(/\b\(?verificado en (?:runtime|varias corridas)\)?/gi, "")
      // ── normalización gramatical de residuos ──
      .replace(/\bd[ae]l el\b/gi, "del")
      .replace(/\bd[ae]l la\b/gi, "de la")
      .replace(/\bpara la empresa\b/gi, "para esta empresa")
      .replace(/\b(?:el sistema|la empresa)\s+del sistema\b/gi, "el sistema")
      .replace(/\(\s*\)/gi, "")
      .replace(/\(\s+/gi, "(")
      .replace(/\s+\)/gi, ")");
    return out.replace(/[ \t]{2,}/g, " ");
  } catch {
    return body; // blindado: ante cualquier error, servir el body original
  }
}

// Proyección para metadata de búsqueda (título + descripción).
export function cleanTwinText(text: string): string {
  try {
    return cleanTwinBody(text)
      .replace(/\s{2,}/g, " ")
      .trim();
  } catch {
    return text;
  }
}
