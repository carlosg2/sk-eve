// Resolve-hook de Node para ejecutar TS del proyecto sin bundler:
// resuelve imports `./x.js` a `./x.ts` cuando existe (type-stripping de Node 24).
import { registerHooks } from "node:module";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.endsWith(".js") && !specifier.startsWith("node:")) {
			try {
				return nextResolve(specifier.replace(/\.js$/, ".ts"), context);
			} catch {
				// caer al .js original
			}
		}
		return nextResolve(specifier, context);
	},
});
