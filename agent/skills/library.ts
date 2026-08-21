import { defineDynamic, defineSkill } from "eve/skills";
import { loadActiveAgent, loadScopedSkills } from "../lib/runtime-config.js";
import { compileSkillMarkdown } from "../lib/skill-compiler.js";

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
            description: skill.description ?? "",
            // Markdown COMPILADO en session.started: SKILL.md procedural + la
            // "Vista operativa" con el schema del kernel de cada entidad que el
            // skill declara en su frontmatter (`entities: [...]`) + el "Contexto
            // del Company Twin" con cada concepto del tenant que declara en
            // `twin_concepts` (ej. mrp/mrp-sesion-periodo). Elimina el
            // rediscovery (6+ query_company_twin por turno). Si no hay nada que
            // anexar o algo falla, compileSkillMarkdown devuelve el markdown
            // original.
            markdown: compileSkillMarkdown(skill.dir, skill.markdown, skill.entities, {
              twinConcepts: skill.twinConcepts,
              tenant: agent.tenant,
            }),
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
