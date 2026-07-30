import { defineDynamic } from "eve/instructions";
import { defineInstructions } from "eve/instructions";
import { readLearnings } from "../lib/twin-memory.js";

// Memory loop (lado lectura): al iniciar sesión, inyecta los aprendizajes
// acumulados del Company Twin al system prompt. El hook agent/hooks/memory.ts
// es el lado escritura. Juntos cierran el bucle "el agente no olvida".
export default defineDynamic({
  events: {
    "session.started": async () => {
      const learnings = await readLearnings();
      if (!learnings.trim()) return null;
      return defineInstructions({
        markdown: [
          "## Aprendizajes del Company Twin (memoria persistente)",
          "",
          "Reglas aprendidas de errores previos. Respétalas para no repetir fallos:",
          "",
          learnings.trim(),
        ].join("\n"),
      });
    },
  },
});
