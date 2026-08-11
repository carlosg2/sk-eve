<script lang="ts">
	import '../../chat/layout.css';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<div class="style-vega min-h-screen bg-background text-foreground">
	{@render children()}
</div>
<Toaster />
