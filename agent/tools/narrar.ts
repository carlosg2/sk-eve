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
    "Narra en voz alta una frase corta mientras trabajas (canal de voz).",
    "SOLO cuando el Client context del turno indica voice.active: true.",
    "⚠️ NUNCA repitas ni parafrasees la pregunta del usuario ni lo ya dicho: di la ACCIÓN que estás ejecutando (verbo + módulo) en general, 4-8 palabras, sin eco.",
    "Úsala en transiciones de fase (empezar a consultar un módulo) y cuando encuentres un hallazgo que valga la pena decir en voz alta (desviación, faltante, dato clave).",
    "Habla de MÓDULOS de negocio (compras, ventas, inventario, producción, proveedores, existencias, plan de producción), NUNCA de tablas, entidades, campos, tools, filtros ni mecánica.",
    "Frases de 4 a 12 palabras, prosa hablada natural, sin datos crudos.",
    "Máximo 1-2 llamadas por fase de trabajo. No la llames si solo repetiría la pregunta o lo ya dicho; el usuario también ve la pantalla.",
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
