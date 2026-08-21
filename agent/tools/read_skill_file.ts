import { defineTool } from "eve/tools";
import { z } from "zod";

// Lee un archivo hermano de un skill del catálogo por código (`ctx.getSkill`),
// sin depender de que el modelo adivine paths absolutos del sandbox. Eve valida
// tanto el slug como el path relativo (`assertSafeSkillId` /
// `assertSafeSkillRelativePath`): rechaza `..`, `/` absoluto y `\`.
//
// Solo funciona con archivos que el skill declara en su package (`files` en
// `defineSkill`, montados desde `agent/skill-library/<slug>/` por
// `loadScopedSkills`). Los archivos se materializan al sandbox en
// `session.started` y se leen on-demand: NO agregan tokens por turno.
export default defineTool({
  description:
    "Lee un archivo hermano de un skill del catálogo (references/, scripts/, templates/, assets/) por slug y path package-relative. " +
    "Úsalo cuando un SKILL.md cargado con load_skill referencie un archivo de apoyo (tabla, script, plantilla) que no esté inline.",
  inputSchema: z.object({
    skill: z
      .string()
      .describe("Slug del skill, p.ej. 'mrp-produccion'. Solo slugs del catálogo del agente activo."),
    path: z
      .string()
      .describe("Path package-relative dentro del skill, p.ej. 'references/cobertura.md' o 'scripts/explosion.py'."),
  }),
  async execute({ skill, path }, ctx) {
    try {
      const content = await ctx.getSkill(skill).file(path).text();
      return { ok: true, skill, path, content };
    } catch (err) {
      return {
        ok: false,
        skill,
        path,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
