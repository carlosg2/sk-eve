<script lang="ts">
	import type { PageData } from "./$types";
	import StudioShell from "../components/StudioShell.svelte";

	let { data }: { data: PageData } = $props();
</script>

<StudioShell {data} deepLinkPath={data.deepLinkPath} />
