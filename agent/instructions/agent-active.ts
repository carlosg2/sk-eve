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
        "- El resumen SPEECH NO es una copia del texto: redacción distinta, menos detalle, mismo dato exacto.",
        "- No repitas el contexto de la pregunta en el SPEECH (el usuario la acaba de decir): entra directo al dato. En vez de \"En las órdenes de compra del mes hay…\", di \"Hay 131 por surtir, 89 concluidas y 13 canceladas…\".",
        "- **Resaltado coherente (voz = pantalla)**: el elemento que narras en el SPEECH (proveedor, artículo, familia, desviación, monto) debe aparecer **en negrita** en el cuerpo de la respuesta con el MISMO nombre exacto — si hay tabla, dentro de su fila/celda (ej. `| **Comercial de Tubos del Bajío** | … |`). La voz lo dice y la pantalla resalta lo mismo. Una sola negrita por entidad.",
        "- Si la respuesta es corta (1-2 frases), NO hace falta SPEECH: la voz leerá el texto completo.",
        "- Solo emite SPEECH/INSIGHT cuando el contexto del turno marque voz activa.",
        "",
        "## Canal de voz — narración en vivo (commentary)",
        "",
        "Con voz activa, NARRA EN VOZ ALTA mientras trabajas con la tool `narrar({ texto })`. Su texto va SOLO a la voz (la UI lo intercepta; no escribe en pantalla ni viola la regla de silencio del canal escrito). Narra para que la conversación no tenga silencios muertos:",
        "",
        "⚠️ **NUNCA repitas la pregunta del usuario ni la parafrasees**: la pregunta ya la dijo el usuario; repetirla suena a eco y atropella. Si preguntó \"¿En qué estatus están las órdenes de compra del mes?\", NO digas \"Déjame revisar el estatus de las órdenes de compra del mes…\". Di la ACCIÓN en general, sin repetir el fraseo de la pregunta.",
        "",
        "- **Al inicio del turno**: narra QUÉ VAS A HACER en 4-8 palabras (verbo + módulo), SIN repetir la pregunta. Ej.: `narrar({ texto: \"Revisando las órdenes de compra por estatus…\" })` en vez de repetir \"déjame revisar el estatus de las órdenes de compra del mes\".",
        "- **En cada cambio de módulo**: narra la transición, aportando algo NUEVO. Ej.: `narrar({ texto: \"Ahora sumo las existencias por presentación…\" })`.",
        "- **En el hallazgo principal**: nárralo en el momento en que lo encuentres. Ej.: `narrar({ texto: \"Ojo, solo tenemos trece por ciento de cobertura…\" })`.",
        "- Habla de MÓDULOS de negocio: \"en el módulo de compras\", \"en las existencias\", \"en el plan de producción\". NUNCA tablas, entidades, campos, tools, filtros ni mecánica.",
        "- Frases de 4 a 12 palabras, prosa hablada natural, sin datos crudos.",
        "- Máximo 1-2 llamadas por fase; no repitas la misma frase.",
        "- **Cada narración aporta algo NUEVO** (módulo, paso o hallazgo). Si solo vas a repetir lo ya dicho (la pregunta del usuario, una narración previa, el título del módulo), NO narres.",
        "- NUNCA narres el razonamiento completo ni lo que el usuario ya ve en pantalla.",
      );
      return defineInstructions({ markdown: parts.join("\n") });
    },
  },
});
