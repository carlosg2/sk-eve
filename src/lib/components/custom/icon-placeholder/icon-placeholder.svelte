<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import SquareIcon from "@lucide/svelte/icons/square";
	import type { SVGAttributes } from "svelte/elements";

	type SvgProps = SVGAttributes<SVGSVGElement>;

	// Minimal stub of the sigma-tps design-system icon component. Only the lucide
	// names the dropdown-menu indicators use are wired; the other library props are
	// accepted and ignored so the existing call sites compile unchanged.
	type Props = {
		hugeicons?: string;
		lucide?: string;
		tabler?: string;
		phosphor?: string;
		remixicon?: string;
		class?: string;
	};

	let {
		lucide,
		class: className,
		hugeicons: _hugeicons,
		tabler: _tabler,
		phosphor: _phosphor,
		remixicon: _remixicon,
		...restProps
	}: Props & Omit<SvgProps, "class"> = $props();

	const Icon = $derived(
		lucide === "CheckIcon"
			? CheckIcon
			: lucide === "MinusIcon"
				? MinusIcon
				: lucide === "ChevronRightIcon"
					? ChevronRightIcon
					: SquareIcon
	);
</script>

<Icon class={className} {...restProps as unknown as object} />
