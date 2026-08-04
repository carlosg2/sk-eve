import { defineDynamic, defineInstructions } from "eve/instructions";
import { loadActiveAgent } from "../lib/runtime-config.js";

// Composición runtime del harness por agente: al iniciar sesión inyecta el
// `instructions.md` del agente activo (tenant + agente en runtime.json), editado
// desde /studio. Devuelve null cuando no hay agente activo, dejando el prompt
// base intacto.
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
      if (agent.skills.length) {
        parts.push("", `## Skills de ${agent.name}`, "");
        for (const skill of agent.skills) {
          parts.push(`### ${skill.slug}`);
          if (skill.description) parts.push(`_${skill.description}_`);
          parts.push("", skill.body.trim(), "");
        }
      }
      return defineInstructions({ markdown: parts.join("\n") });
    },
  },
});
