import { defineTool } from "eve/tools";
import { z } from "zod";

// ── Canal de comentario hablado (fusión total de los dos brains) ────────────
// El agente de texto (DeepSeek) narra EN VIVO por el canal de voz mientras
// trabaja, SOLO cuando el turno llegó por voz (Client context voice.active).
// La UI intercepta esta tool-call en `actions.requested` y la encola en la
// cola de voz serializada (speakNarration): el texto va ÚNICAMENTE al canal
// hablado y NUNCA aparece como tool en el feed ni en el razonamiento visible
// (la UI la filtra) — así el canal escrito mantiene la regla de "ejecuta en
// silencio" mientras la voz escucha un comentario contextual real.
//
// Es READ-ONLY y sin HITL: no ejecuta nada, solo canaliza una frase a la voz.
// Blindado: un fallo aquí nunca debe romper el turno (convención del repo).
export default defineTool({
  description: [
    "Narra en voz alta un HALLAZGO que valga la pena, mientras trabajas (canal de voz). SOLO cuando el Client context del turno indica voice.active: true.",
    "⚠️ El PROGRESO (qué vas a hacer / en qué módulo estás trabajando) NO se narra con esta tool: la interfaz ya lo dice por voz con una frase de módulo. NO uses narrar para acciones de arranque ni transiciones de fase.",
    "Úsala SOLO cuando encuentres algo digno de decir en voz alta: una desviación, un faltante, una alerta, un dato clave o una conclusión sorprendente (p.ej. 'Ojo, solo tenemos trece por ciento de cobertura…', 'El faltante más grande es de 22 mil kilos…').",
    "⚠️ NUNCA repitas ni parafrasees la pregunta del usuario ni lo ya dicho; NUNCA narres la pregunta de aclaración que vas a hacer (HITL) — la interfaz la muestra y la lee.",
    "Habla de MÓDULOS de negocio y datos en prosa natural, 4-12 palabras, sin mecánica (tablas/entidades/campos/tools/filtros).",
    "Máximo 1-2 llamadas por turno, y solo si el hallazgo aporta. Si no hay hallazgo, NO la llames.",
  ].join(" "),
  inputSchema: z.object({
    texto: z
      .string()
      .min(1)
      .max(160)
      .describe("Frase corta en español para decir en voz alta (módulo de negocio, no mecánica)."),
  }),
  execute: async ({ texto }) => {
    // No ejecuta nada: la UI intercepta la tool-call en actions.requested y
    // la encola en la cola de voz. Se devuelve un resultado neutro para que
    // el runtime no marque error.
    return { ok: true, canal: "voz" };
  },
});
