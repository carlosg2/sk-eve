#!/usr/bin/env python3
"""
Sanitiza el conocimiento del AGENTE (skills + erp-kernel + company twin de ICF,
EXCEPTO log.md que es bitácora de la fábrica) quitando marcas de PROCESO de la
meta-fábrica que contaminan al runtime:
  - fechas de validación (verificado/validado/publicado/corroborado 2026-XX-XX)
  - menciones a la fábrica / meta-fábrica / probes / E2E / linter / evals / DBA
  - "Schema verificado <fecha>" -> "Schema"
  - "EntityNotFound verificado <fecha>" -> "EntityNotFound"
  - "(verificado)" / "(validado)" / "(verificado OK)" como marcador suelto
  - rutas absolutas /agent/skill-library/...
Conserva los HECHOS de negocio (el resto del texto).

Uso:  python3 scripts/sanitize-knowledge.py [--dry-run]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Rutas inyectables al agente (skills + kernel + twin ICF), excluyendo log.md.
TARGETS = [
    ROOT / "agent" / "skill-library",
    ROOT / "company-twin" / "erp-kernel",
    ROOT / "company-twin" / "companies" / "icf",
]

# (regex, reemplazo, descripción) — orden importa (más específico primero)
RULES = [
    # --- fechas de validación con contexto (conservar lo que sigue tras ':')
    (r"Schema verificado 2026-\d{2}-\d{2}:", "Schema:", "Schema verificado <fecha>:"),
    (r"schema verificado 2026-\d{2}-\d{2}:", "schema:", "schema verificado <fecha>:"),
    (r"shape verificado en ICF, 2026-\d{2}-\d{2}", "", "shape verificado en ICF, <fecha>"),
    (r"\(verificado 2026-\d{2}-\d{2}[^)]*\)", "", "paréntesis 'verificado <fecha> ...'"),
    (r"\(validado 2026-\d{2}-\d{2}[^)]*\)", "", "paréntesis 'validado <fecha> ...'"),
    (r"\(publicado 2026-\d{2}-\d{2}[^)]*\)", "", "paréntesis 'publicado <fecha> ...'"),
    (r"\(corroborado 2026-\d{2}-\d{2}[^)]*\)", "", "paréntesis 'corroborado <fecha> ...'"),
    (r"\(2026-\d{2}-\d{2}, verificado en vivo\)", "", "(<fecha>, verificado en vivo)"),
    (r"\(verificados en vivo contra el MCP, 2026-\d{2}-\d{2}\)", "", "(verificados en vivo contra el MCP, <fecha>)"),
    (r"\(verificados en vivo 2026-\d{2}-\d{2}, UPPERCASE\)", "", "(verificados en vivo <fecha>, UPPERCASE)"),
    (r"\(verificado en vivo ICF, 2026-\d{2}-\d{2}[^)]*\)", "", "(verificado en vivo ICF, <fecha>...)"),
    (r"\(verificado contra el DAB fork\)", "", "(verificado contra el DAB fork)"),
    (r"\(verificado con selects de skills, linter 0 críticos\)", "", "(verificado con selects de skills, linter 0 críticos)"),
    (r"\(verificado OK contra el MCP el 2026-\d{2}-\d{2}\)", "", "(verificado OK contra el MCP el <fecha>)"),
    (r"\(regla — validado E2E 2026-\d{2}-\d{2}\)", "", "(regla — validado E2E <fecha>)"),
    (r"\(regla de eficiencia — validado E2E 2026-\d{2}-\d{2}\)", "", "(regla de eficiencia — validado E2E <fecha>)"),
    # --- marcadores sueltos
    (r"\(verificado\)", "", "(verificado)"),
    (r"\(validado\)", "", "(validado)"),
    (r"\(verificado OK\)", "", "(verificado OK)"),
    (r"\(verificados\)", "", "(verificados)"),
    (r"\(verificados — BD real\)", "", "(verificados — BD real)"),
    (r"\(campos operativos verificados en vivo, empresa [a-z-]+\)", "", "(campos operativos verificados en vivo, empresa X)"),
    (r"\(camelCase — verificados\)", "", "(camelCase — verificados)"),
    (r"\(ese campo es `null` en `Art` — verificado\)", "(ese campo es `null` en `Art`)", "(ese campo es null — verificado)"),
    (r"\(schema no verificado\)", "", "(schema no verificado)"),
    (r"\(módulo no publicado\)", "", "(módulo no publicado)"),
    # --- en línea (sin paréntesis)
    (r"EntityNotFound, verificado 2026-\d{2}-\d{2}", "EntityNotFound", "EntityNotFound, verificado <fecha>"),
    (r"EntityNotFound verificado 2026-\d{2}-\d{2}", "EntityNotFound", "EntityNotFound verificado <fecha>"),
    (r"verificado 2026-\d{2}-\d{2}/2\d: ", "", "verificado <fecha>…: "),
    (r"verificado 2026-\d{2}-\d{2}/2\d", "", "verificado <fecha>/…"),
    (r"verificado 2026-\d{2}-\d{2} contra el MCP real", "", "verificado <fecha> contra el MCP real"),
    (r"verificado 2026-\d{2}-\d{2}: ", "", "verificado <fecha>: "),
    (r"verificado 2026-\d{2}-\d{2}", "", "verificado <fecha>"),
    (r"validado 2026-\d{2}-\d{2}: ", "", "validado <fecha>: "),
    (r"validado 2026-\d{2}-\d{2}", "", "validado <fecha>"),
    (r"publicado 2026-\d{2}-\d{2}: ", "", "publicado <fecha>: "),
    (r"publicado 2026-\d{2}-\d{2}", "", "publicado <fecha>"),
    (r"corroborado 2026-\d{2}-\d{2}", "", "corroborado <fecha>"),
    (r" verificado en vivo 2026-\d{2}-\d{2}", "", "verificado en vivo <fecha>"),
    (r", verificado en vivo", "", ", verificado en vivo"),
    # --- fechas sueltas: SOLO las que son marcador de proceso (no datos OData)
    # Regla segura: fecha sola entre paréntesis (verificado: ninguna es dato OData;
    # las fechas OData van dentro de comillas de query o con ge/le).
    (r"\(2026-\d{2}-\d{2}\)", "", "fecha sola entre paréntesis"),
    # --- fechas de proceso restantes (verbos + fechas sueltas en contexto)
    (r"verificado en vivo 2026-\d{2}-\d{2}; antes", "antes", "verificado en vivo <fecha>; antes"),
    (r"verificado en vivo 2026-\d{2}-\d{2}", "", "verificado en vivo <fecha>"),
    (r"publicada el 2026-\d{2}-\d{2} \(antes", "(antes", "publicada el <fecha> (antes"),
    (r"publicada el 2026-\d{2}-\d{2}", "publicada", "publicada el <fecha>"),
    (r"Validado 2026-\d{2}-\d{2}: ", "Ejemplo: ", "Validado <fecha>: "),
    (r"Desde 2026-\d{2}-\d{2} el SP", "Desde que se publicó, el SP", "Desde <fecha> el SP"),
    (r"Columnas confirmadas \(2026-\d{2}-\d{2}, con datos reales\):", "Columnas:", "Columnas confirmadas (<fecha>, con datos reales):"),
    (r"Schema verificado en vivo con `read_records`:", "Schema:", "Schema verificado en vivo con read_records:"),
    (r"\(verificado `Semana eq 31`", "(evidencia: `Semana eq 31`", "(verificado Semana eq 31"),
    (r"corregida 2026-\d{2}-\d{2}\)", ")", "regla corregida <fecha>"),
    (r"promovida el 2026-\d{2}-\d{2} de los primeros", "de los primeros", "promovida el <fecha> de los primeros"),
    (r"Al 2026-\d{2}-\d{2} la tabla", "La tabla", "Al <fecha> la tabla"),
    (r"2026-\d{2}-\d{2}\*\* \(antes solo existía", "(antes solo existía", "<fecha>** (antes solo existía"),
    (r"\*\*2026-\d{2}-\d{2}\*\* \(config", "(config", "**<fecha>** (config"),
    (r"Publicado: \*\*2026-\d{2}-\d{2}\*\* \(respuesta del DBA; verificado en vivo — 11 tools", "Publicado: tool del MCP (11 tools", "Publicado: **<fecha>** (respuesta del DBA…"),
    (r"verificado: 90 filas, S32=3,978,128\).", "(90 filas, S32=3,978,128).", "verificado: 90 filas…"),
    (r"\(publicada completa 2026-\d{2}-\d{2}\)", "(completa)", "(publicada completa <fecha>)"),
    (r"en el MCP de marmoles el 2026-\d{2}-\d{2}\.", "en el MCP de marmoles.", "en el MCP de marmoles el <fecha>"),
    (r"\(antes EntityNotFound; el", "(antes EntityNotFound; el", "antes EntityNotFound (sin fecha)"),
    (r"verificado `ge '01/01/2026'` devolvió", "evidencia: `ge '01/01/2026'` devolvió", "verificado ge 01/01/2026"),
    (r"\(`https://api2.maserp.mx/icf/mcp`, 2026-\d{2}-\d{2}\)", "(`https://api2.maserp.mx/icf/mcp`)", "mcp url con fecha"),
    (r"el MCP de ICF \(`https://api2.maserp.mx/icf/mcp`, 2026-\d{2}-\d{2}\)", "el MCP de ICF (`https://api2.maserp.mx/icf/mcp`)", "mcp url con fecha (variante)"),
    (r"más alto visto en E2E \.", "más alto visto.", "más alto visto en E2E"),
    (r"\(E2E:", "(", "(E2E:"),
    (r"Anti-patrón visto en E2E 2026-\d{2}-\d{2}\s*\(23 calls / ~316k tokens\)", "Anti-patrón: 23 calls / ~316k tokens", "Anti-patrón E2E (calls/tokens)"),
    (r"Estado verificado \(2026-\d{2}-\d{2},probe contra el MCP real\)", "Estado verificado (contra el MCP real)", "Estado verificado probe"),
    (r"No se ha validado todavía en vivo contra `/chat` — si un patrón", "Si un patrón", "No validado contra /chat"),
    (r"No se ha validado en vivo end-to-end contra el MCP remoto de `marmoles` todavía — nombres", "Nombres", "No validado end-to-end marmoles"),
    (r"verificado en los datos", "presente en los datos", "verificado en los datos"),
    (r"`selects validados en agent/skill-library/\* \(linter check-knowledge, 0 críticos, 2026-\d{2}\)`", "`selects del catálogo (linter 0 críticos)`", "linter en casing frontmatter"),
    (r"`buffer state/learnings.md \(25\+ errores Invalid field, 2026-\d{2}-\d{2}\.\.[0-9]{2}\)`", "`buffer state/learnings.md (25+ errores Invalid field)`", "buffer learnings en casing"),
    (r"verificado con selects de skills, linter 0 críticos", "validado por el catálogo", "linter en log"),
    (r"\(verificado con selects de skills, linter 0 críticos\)", "(validado por el catálogo)", "linter en log parentético"),
    (r"_E2E 2026-\d{2}-\d{2}\)_", "_", "E2E en itálicas"),
    # --- learnings buffer: timestamps ISO y sesiones del runtime (ruido para el agente)
    (r" \(sesión wrun_[A-Z0-9]+\)", "", "sesión wrun en learnings"),
    (r" _\(20\d{2}-\d{2}-\d{2}T[0-9:.]+Z\)_", "", "timestamp ISO en learnings"),
    (r"20\d{2}-\d{2}-\d{2}T[0-9:.]+Z", "", "timestamp ISO suelto"),
    (r"\(20\d{2}-\d{2}-\d{2}\.\.[0-9]{2}\)", "", "rango de fechas de proceso"),
    # --- referencias a la fábrica / proceso
    (r"vía protocolo de la meta-fábrica \(skill promote-learnings\)", "", "vía protocolo de la meta-fábrica (skill promote-learnings)"),
    (r"vía protocolo de la meta-fábrica", "", "vía protocolo de la meta-fábrica"),
    (r"Promovido el 2026-\d{2}-\d{2} vía protocolo de la meta-fábrica[^:]*:", "", "Promovido el <fecha> vía protocolo…"),
    (r"/agent/skill-library/", "", "ruta absoluta /agent/skill-library/"),
    (r"\(ver [a-z-]+/SKILL\.md\)", "", "(ver skill/SKILL.md)"),
    (r"\(probe [a-z0-9-]+\.ts\)", "", "(probe X.ts)"),
    (r"\bprobe ", "\bprobe ", "probe (no-op)"),  # no-op para listar
    # --- fechas con contexto de proceso entre paréntesis (con verbo en la frase)
    (r"\(publicada 2026-\d{2}-\d{2}, campos ", "(campos ", "(publicada <fecha>, campos"),
    (r"\(publicado 2026-\d{2}-\d{2}, ", "(", "(publicado <fecha>, "),
    (r"\(verificado 2026-\d{2}-\d{2} contra el MCP de ICF, ", "(", "(verificado <fecha> contra el MCP de ICF, "),
    (r"\(2026-\d{2}-\d{2}, `read_records` en vivo\)", "", "(<fecha>, read_records en vivo)"),
    (r"2026-\d{2}-\d{2} \(read_records first:\d+ OK\)\. ", "", "<fecha> (read_records first:N OK). "),
    (r"\(referencia validada 2026-\d{2}-\d{2}[^)]*\)", "", "(referencia validada <fecha>…)"),
    (r"\(verificado en vivo 2026-\d{2}-\d{2}\)", "", "(verificado en vivo <fecha>)"),
    (r"\(2026-\d{2}-\d{2}, verificado en vivo\)", "", "(<fecha>, verificado en vivo)"),
    (r"\(2026-\d{2}-\d{2}/2\d\)", "", "(<fecha>/…)"),
    # NOTA: NO hay regla genérica de fecha suelta entre paréntesis — las fechas
    # sin verbo de proceso pueden ser datos de negocio (ej. filtros OData). Se
    # revisan manualmente con grep tras el pase automático.
    (r"\b2026-\d{2}-\d{2}/2\d\b", "", "fecha con barra"),
]


def sanitize(text: str) -> tuple[str, list[str]]:
    changes: list[str] = []
    # Reglas multilínea (fecha en línea siguiente) — DOTALL sobre el bloque afectado
    multiline = [
        # (publicada\n2026-08-19, campos ...
        (r"\(publicada\s*\n?\s*2026-\d{2}-\d{2}, campos ", "(campos ", "multiline (publicada <fecha>, campos"),
        (r"\(publicada\s*\n?\s*2026-\d{2}-\d{2}\)", "(publicada)", "multiline (publicada <fecha>)"),
        (r"\(publicado\s*\n?\s*2026-\d{2}-\d{2}\)", "(publicado)", "multiline (publicado <fecha>)"),
        (r"\(publicadas\s*\n?\s*2026-\d{2}-\d{2}\)", "(publicadas)", "multiline (publicadas <fecha>)"),
        (r"\(verificado\s*\n?\s*2026-\d{2}-\d{2}[:;,]", "(verificado", "multiline (verificado <fecha>:"),
        (r"\(verificado\s*\n?\s*2026-\d{2}-\d{2}\)", "(verificado)", "multiline (verificado <fecha>)"),
        (r"\(validado\s*\n?\s*2026-\d{2}-\d{2}\)", "(validado)", "multiline (validado <fecha>)"),
        (r"\(EntityNotFound verificado\s*\n?\s*2026-\d{2}-\d{2}\)", "(EntityNotFound)", "multiline EntityNotFound verificado"),
        (r"verificados OK\s*2026-\d{2}-\d{2}\)", "verificados OK)", "multiline verificados OK <fecha>"),
        (r"Estado verificado \(2026-\d{2}-\d{2}, linter contra el MCP real\)", "Estado verificado (contra el MCP real)", "Estado verificado (linter)"),
        (r"Estado verificado \(2026-\d{2}-\d{2}, probe contra el MCP real\)", "Estado verificado (contra el MCP real)", "Estado verificado (probe)"),
        (r"E2E 2026-\d{2}-\d{2}:", "E2E:", "E2E <fecha>:"),
        (r"Anti-patrón visto en E2E 2026-\d{2}-\d{2}\s*\n?\s*\((\d+) calls / ~(\d+) tokens\)", "Anti-patrón: ($1 calls / ~$2 tokens)", "Anti-patrón visto en E2E (calls/tokens)"),
        (r"\(anti-patrón visto en E2E 2026-\d{2}-\d{2}\)", "(anti-patrón)", "(anti-patrón visto en E2E)"),
        (r"validados contra el MCP el 2026-\d{2}-\d{2}", "validados contra el MCP", "validados contra el MCP el <fecha>"),
        (r"\(patrones verificados contra el MCP 2026-\d{2}-\d{2};", "(patrones verificados contra el MCP;", "patrones verificados contra el MCP <fecha>"),
        (r"Un turno E2E \(2026-\d{2}-\d{2}\) declaró", "Un turno declaró", "Un turno E2E (<fecha>) declaró"),
        (r"reunión de descubrimiento ICF 2026-\d{2}-\d{2} \(", "reunión de descubrimiento ICF (", "reunión de descubrimiento ICF <fecha>"),
        (r"\(verificadas en vivo contra el MCP ICF, 2026-\d{2}-\d{2}\)", "(verificadas contra el MCP ICF)", "(verificadas en vivo contra el MCP ICF, <fecha>)"),
        (r"Notas verificadas \(2026-\d{2}-\d{2}\):", "Notas:", "Notas verificadas (<fecha>):"),
        (r"\(entidades verificadas 2026-\d{2}-\d{2}\):", "(entidades verificadas):", "(entidades verificadas <fecha>):"),
        (r"Desde 2026-\d{2}-\d{2} el MCP", "Desde entonces el MCP", "Desde <fecha> el MCP"),
        (r"y verificado en vivo en el MCP de marmoles \(2026-\d{2}-\d{2}\)", "y verificado en el MCP de marmoles", "y verificado en vivo ... (<fecha>)"),
        (r"\(todas publicadas y verificadas en vivo, 2026-\d{2}-\d{2}\)", "(todas publicadas y verificadas)", "(todas publicadas y verificadas en vivo, <fecha>)"),
        (r"### Schema verificado —", "### Schema —", "### Schema verificado —"),
        (r"\(usar `DimTiempoSemana` — publicada\s*\n?\s*2026-\d{2}-\d{2}, campos ", "(usar `DimTiempoSemana` — campos ", "(usar DimTiempoSemana — publicada <fecha>, campos"),
        (r"`DimTiempoSemana` \(publicada\s*\n?\s*2026-\d{2}-\d{2}, campos ", "`DimTiempoSemana` (campos ", "DimTiempoSemana (publicada <fecha>, campos"),
        (r"no se ha validado todavía en vivo contra `/chat`", "no validado contra `/chat`", "no validado todavía en vivo"),
        (r"`ArtDisponibleVaca` NO existe en el MCP ICF — verificado\)", "`ArtDisponibleVaca` NO existe en el MCP ICF)", "ArtDisponibleVaca — verificado)"),
        (r"\(verificado en los datos\)", "(verificado)", "(verificado en los datos)"),
        (r"\(verificado 2026-\d{2}-\d{2}\)", "(verificado)", "verificado <fecha> en paréntesis simple"),
        (r"campo verificado en `CentroFCTemp`", "campo presente en `CentroFCTemp`", "campo verificado en CentroFCTemp"),
        (r"Agregados por el equipo backend \(2026-\d{2}-\d{2}\):", "Agregados por el equipo backend:", "Agregados por el equipo backend (<fecha>):"),
        (r"Agregados por el equipo backend \(2026-\d{2}-\d{2}\)", "Agregados por el equipo backend", "Agregados por el equipo backend (<fecha>)"),
    ]
    for pattern, repl, desc in multiline:
        new, n = re.subn(pattern, repl, text)
        if n:
            changes.append(f"  {desc} x{n}")
        text = new

    for pattern, repl, desc in RULES:
        if desc == "probe (no-op)":
            continue
        new, n = re.subn(pattern, repl, text)
        if n:
            changes.append(f"  {desc} x{n}: {pattern}")
        text = new
    return text, changes


def main() -> None:
    dry = "--dry-run" in sys.argv
    total_files = 0
    for target in TARGETS:
        if not target.exists():
            continue
        for path in sorted(target.rglob("*.md")):
            if "log.md" in path.name:
                continue
            raw = path.read_text()
            clean, changes = sanitize(raw)
            if clean == raw:
                continue
            total_files += 1
            rel = path.relative_to(ROOT)
            print(f"### {rel}")
            for c in changes:
                print(c)
            if not dry:
                path.write_text(clean)
    print(f"\nArchivos con cambios: {total_files}  ({'DRY-RUN, sin escribir' if dry else 'escritos'})")


if __name__ == "__main__":
    main()
