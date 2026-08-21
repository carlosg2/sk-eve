import { defineDynamic, defineSkill } from "eve/skills";
import { loadActiveAgent, loadScopedSkills } from "../lib/runtime-config.js";

// Resolver dinámico del catálogo: en vez de autorar las skills como estáticas
// (que Eve advertiría a TODO agente), advierte SOLO las del agente activo —
// intersección de su membresía (`agent.skills`) con la visibilidad por tenant
// del catálogo (`agent/skill-library/*/SKILL.md`). Resuelve en `session.started`
// para no romper el prompt cache (los cambios de skill re-ingestan a precio no
// cacheado si se resuelven por step/turn). Devuelve un map nombrado por slug, así
// el modelo ve `mrp-arribos`, `cxp`, etc. igual que antes de la migración.
export default defineDynamic({
  events: {
    "session.started": () => {
      const agent = loadActiveAgent();
      if (!agent) return null;
      const skills = loadScopedSkills(agent);
      if (skills.length === 0) return null;
      return Object.fromEntries(
        skills.map((skill) => [
          skill.slug,
          defineSkill({
            description: skill.description ?? undefined,
            markdown: skill.markdown,
            // Archivos hermanos (references/, scripts/, templates/, assets/...):
            // Eve los materializa al sandbox en session.started; el modelo los
            // lee on-demand con read_skill_file / read_file del sandbox.
            ...(Object.keys(skill.files).length > 0 ? { files: skill.files } : {}),
          }),
        ]),
      );
    },
  },
});
