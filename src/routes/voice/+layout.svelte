<script lang="ts">
	// /voice hereda el mismo sistema de estilos que /chat (Tailwind v4 + tema
	// del proyecto). Sin este layout la página sale sin estilos: layout.css solo
	// se importaba desde src/routes/chat/+layout.svelte.
	import '../chat/layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { children } = $props();
</script>

<ModeWatcher />

<Tooltip.Provider>
	<div class="style-vega h-full bg-background text-foreground">
		{@render children()}
	</div>
</Tooltip.Provider>
