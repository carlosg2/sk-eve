import { defineDynamic, defineInstructions } from "eve/instructions";
import { loadActiveAgent } from "../lib/runtime-config.js";
import { setCurrentSessionId } from "../lib/current-session.js";

// Composición runtime del harness por agente: al iniciar sesión inyecta el
// `instructions.md` del agente activo (tenant + agente en runtime.json), editado
// desde /studio. Las skills ya NO se inyectan aquí: el agente activo advierte su
// catálogo scopeado on-demand vía `agent/skills/library.ts` (`load_skill`).
// Devuelve null cuando no hay agente activo, dejando el prompt base intacto.
export default defineDynamic({
  events: {
    "session.started": async (ctx) => {
      // Registrar la sesión actual para la memoria episódica (P1.5): el
      // middleware de contexto la excluye de la búsqueda (la sesión en curso
      // ya está en el prompt; la memoria es de sesiones PREVIAS).
      setCurrentSessionId((ctx as { session?: { id?: string } })?.session?.id);
      const agent = loadActiveAgent();
      if (!agent?.instructions.trim()) return null;
      const parts = [
        `## Agente activo: ${agent.name}`,
        "",
        "Instrucciones específicas de este agente (definidas en /studio):",
        "",
        agent.instructions.trim(),
      ];
      // Soft-gate de tools MCP: los hooks de Eve son solo-observación (no pueden
      // vetar una tool call) y la conexión usa allow-list estática, así que el
      // scope por agente se comunica al modelo aquí. Las escrituras siguen
      // gateadas por HITL en la conexión.
      if (agent.mcpTools.length) {
        parts.push(
          "",
          "## Tools del ERP permitidas para este agente",
          "",
          `Usa únicamente estas tools MCP: ${agent.mcpTools.join(", ")}. No invoques otras.`,
        );
      }
      // Canal de voz (Canal-Aware Dual-Brain): cuando la UI activa la voz, cada
      // turno inyecta un `Client context` con `voice.active: true`. El agente
      // responde entonces con respuesta COMPLETA para la pantalla + sección
      // `**SPEECH:**` (resumen hablado) y opcionalmente `**INSIGHT:**`.
      parts.push(
        "",
        "## Canal de voz (resumen hablado)",
        "",
        "Si el `Client context` del turno indica `voice.active: true`, el usuario también te escucha por voz mientras lee la pantalla. Adapta tu salida:",
        "",
        "- El cuerpo de la respuesta (arriba) sigue siendo COMPLETO, con todo el detalle, para la pantalla.",
        "- Añade AL FINAL una línea en negrita `**SPEECH:** <resumen>` para leer EN VOZ ALTA: **1-2 frases cortas (máximo ~30 palabras)** en prosa hablada natural, con SOLO los 2-3 datos más importantes EXACTOS (nombres, montos, fechas, estatus). La voz lo lee verbatim.",
        "- Si hay UN dato accionable que el usuario no ve en la pantalla (alerta, desviación, recomendación), añade después `**INSIGHT:** <dato en una frase>`.",
        "",
        "Reglas:",
        "- **El SPEECH NO empieza directo con el dato crudo**: abre con un PUENTE hablado corto y ACTIVO que describa la acción YA hecha (no el proceso), variado entre turnos. Ejemplos: \"Ya lo tengo —\", \"Aquí tienes:\", \"Revisé las compras:\", \"Te cuento:\", \"El dato es:\", \"Resultado:\".",
        "- **Regla VARIETY (obligatoria)**: NUNCA repitas el mismo puente en turnos consecutivos de la misma sesión; si en el turno anterior abriste con \"Ya lo tengo —\", este turno abre distinto o directamente sin puente (entra al dato: \"Hay 2,585 proveedores activos.\"). La voz suena a grabación si repites el mismo arranque.",
        "- **Estructura del SPEECH**: `[puente activo]` + `[gist de 1 frase con el dato principal]` + `[hasta 2 detalles clave si aportan]` + (solo si es útil) la siguiente acción en 1 frase corta (\"¿Quieres que revise las próximas entregas?\" o similar). NO enumeres todo; la pantalla ya tiene el detalle.",
        "- El resumen SPEECH NO es una copia del texto: redacción distinta, menos detalle, mismo dato exacto.",
        "- No repitas el contexto de la pregunta en el SPEECH (el usuario la acaba de decir): tras el puente, entra directo al dato. En vez de \"En las órdenes de compra del mes hay…\", di \"Ya lo tengo — hay 131 por surtir, 89 concluidas y 13 canceladas…\".",
        "- **Resaltado coherente (voz = pantalla)**: el elemento que narras en el SPEECH (proveedor, artículo, familia, desviación, monto) debe aparecer **en negrita** en el cuerpo de la respuesta con el MISMO nombre exacto — si hay tabla, dentro de su fila/celda (ej. `| **Comercial de Tubos del Bajío** | … |`). La voz lo dice y la pantalla resalta lo mismo. Una sola negrita por entidad.",
        "- Si la respuesta es corta (1-2 frases), NO hace falta SPEECH: la voz leerá el texto completo.",
        "- Solo emite SPEECH/INSIGHT cuando el contexto del turno marque voz activa.",
        "",
        "## Canal de voz — narración en vivo (commentary)",
        "",
        "Con voz activa, el PROGRESO lo narra la INTERFAZ (una frase de módulo determinista: \"Revisando existencias…\", \"Consulto el módulo de compras…\"). TÚ (el cerebro) NO debes narrar qué vas a hacer: la interfaz ya lo cubre y evita ecos.",
        "",
        "Usa la tool `narrar({ texto })` SOLO para HALLAZGOS que valgan la pena decir en voz alta: desviación, faltante, alerta, dato clave, conclusión sorprendente. Ejemplos: `narrar({ texto: \"Ojo, solo tenemos trece por ciento de cobertura…\" })`, `narrar({ texto: \"El faltante más grande es de 22 mil kilos…\" })`.",
        "",
        "⚠️ NUNCA narres con la tool `narrar`: el arranque/transiciones de fase (eso lo dice la interfaz), la pregunta del usuario ni su paráfrasis, ni la pregunta de aclaración HITL (la interfaz la muestra y la lee).",
        "- Máximo 1-2 llamadas de `narrar` por turno, solo si el hallazgo aporta. Si no hay hallazgo, no la llames.",
        "- Habla de MÓDULOS de negocio y datos en prosa natural, 4-12 palabras, sin mecánica (tablas, entidades, campos, tools, filtros).",
        "- **Regla de variedad entre turnos**: no repitas la misma narración en turnos consecutivos de la sesión; usa sinónimos o cambia el orden.",
        "- **Cada narración aporta algo NUEVO** (desviación, faltante, alerta, dato clave o conclusión sorprendente). Si solo vas a repetir lo ya dicho, NO narres.",
      );
      return defineInstructions({ markdown: parts.join("\n") });
    },
  },
});
