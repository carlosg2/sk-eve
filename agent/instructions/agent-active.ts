import { defineDynamic, defineInstructions } from "eve/instructions";
import { loadActiveAgent } from "../lib/runtime-config.js";

// Composición runtime del harness por agente: al iniciar sesión inyecta el
// `instructions.md` del agente activo (tenant + agente en runtime.json), editado
// desde /studio. Las skills ya NO se inyectan aquí: el agente activo advierte su
// catálogo scopeado on-demand vía `agent/skills/library.ts` (`load_skill`).
// Devuelve null cuando no hay agente activo, dejando el prompt base intacto.
export default defineDynamic({
  events: {
    "session.started": async () => {
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
      return defineInstructions({ markdown: parts.join("\n") });
    },
  },
});
