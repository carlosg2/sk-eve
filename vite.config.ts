import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { eveSvelteKit } from 'eve/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		eveSvelteKit(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	server: {
		watch: {
			ignored: [
				// Vite no debe recargar la página por archivos que no son del app:
				// - docs/** (p.ej. "WhatsApp Audio ….html") disparaba page reload en cada boot.
				// - .eve/** (snapshots de Eve) y .data/** (workflow durable) son runtime, no fuente.
				// - company-twin/** es runtime/self-improvement: el hook de memoria escribe
				//   state/learnings.md y eso NO debe disparar HMR/page reload.
				'**/.eve/**',
				'**/.data/**',
				'**/docs/**',
				'**/company-twin/**',
				// references/** = repos clonados de la fábrica (vercel/ai, xai-cookbook):
				// no deben disparar page reload en ningún caso.
				'**/references/**'
			]
		}
	}
});
