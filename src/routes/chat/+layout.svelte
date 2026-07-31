<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { children } = $props();
</script>

<ModeWatcher />

<Tooltip.Provider>
	<div class="style-vega bg-background text-foreground h-screen w-screen">
		{@render children()}
	</div>
</Tooltip.Provider>
