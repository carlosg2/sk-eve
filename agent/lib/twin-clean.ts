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
    out = out.replace(SHORT_ID_RE, (_m, name: string) => name);
    // 3. Noción de capas y del concepto "tenant" en prosa → lenguaje de
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
