import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";

// Sandbox con backend `justbash()` (intérprete bash en JS puro sobre FS virtual
// en `.eve/sandbox-cache/`): sin daemon ni VM, cero overhead de Docker en cada
// boot. Antes el framework caía al backend `docker` por defecto y abría sesiones
// de sandbox en contenedores (`eve: opening sandbox session "root" on backend
// "docker"`), lo que hacía el arranque lento (~120s) y frágil.
//
// Este proyecto NO usa los tools built-in del sandbox (bash/glob deshabilitados
// en `agent/tools/`), así que un backend ligero es suficiente y no hay pérdida
// de capacidad.
//
// El paquete `just-bash` no viene bundleado con Eve: `eve dev` lo instala
// automáticamente (autoInstall: true por defecto); en producción fallaría con
// un error accionable si faltara (no aplica aquí, solo usamos dev).
export default defineSandbox({
  backend: justbash(),
});
