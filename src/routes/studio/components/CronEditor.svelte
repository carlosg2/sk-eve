<script lang="ts">
	import { Input } from "$lib/components/ui/input/index.js";

	/**
	 * Editor visual de frecuencia estilo "SQL Server Agent → Job Schedule
	 * Properties": convierte un cron de 5 campos en controles (frecuencia
	 * diaria/semanal/mensual + hora) y viceversa. Solo serializa lo que un cron
	 * de 5 campos puede expresar; los campos que no mapean (Duration, Enabled)
	 * se omiten a propósito para no crear datos falsos.
	 */

	type Props = {
		/** Cron de 5 campos (min hora dom mes dow). */
		cron: string;
		/** Se invoca cada vez que un control cambia el cron resultante. */
		onchange: (cron: string) => void;
	};

	let { cron, onchange }: Props = $props();

	let freqType = $state<"daily" | "weekly" | "monthly">("daily");
	let freqEvery = $state(1); // recurs every N días/semanas/meses
	let weekDays = $state<number[]>([1]); // 0=domingo … 6=sábado
	let monthlyDay = $state(1);
	let dailyMode = $state<"once" | "every">("once"); // una vez a las | cada N
	let onceTime = $state("09:00"); // HH:MM
	let everyInterval = $state(1);
	let everyUnit = $state<"minute" | "hour">("minute");

	const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"] as const;
	const DAY_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

	/** Parsea un cron de 5 campos hacia el estado visual. Best-effort. */
	function parseIntoProps(c: string) {
		const parts = c.trim().split(/\s+/);
		if (parts.length < 5) return;
		const [minF, hourF, domF, , dowF] = parts;

		// Frecuencia diaria "cada N": `*/N` en minuto u hora.
		if (/^\*\//.test(minF) || /^\*\//.test(hourF)) {
			dailyMode = "every";
			if (/^\*\//.test(minF)) {
				everyUnit = "minute";
				everyInterval = parseInt(minF.slice(2), 10) || 1;
			} else {
				everyUnit = "hour";
				everyInterval = parseInt(hourF.slice(2), 10) || 1;
			}
			if (minF === "0" || /^\d+$/.test(minF)) {
				const hh = /^\d+$/.test(hourF) ? hourF : "0";
				onceTime = `${hh.padStart(2, "0")}:${minF.padStart(2, "0")}`;
			}
		} else {
			dailyMode = "once";
			const hh = /^\d+$/.test(hourF) ? hourF : "0";
			const mm = /^\d+$/.test(minF) ? minF : "0";
			onceTime = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
		}

		if (/^\d+$/.test(domF) && domF !== "*") {
			freqType = "monthly";
			monthlyDay = Math.min(31, Math.max(1, parseInt(domF, 10)));
			freqEvery = 1;
		} else if (/^[0-6]$/.test(dowF) || /^[0-6](,[0-6])+$/.test(dowF)) {
			freqType = "weekly";
			weekDays = [...new Set(dowF.split(",").map((d) => parseInt(d, 10)))].sort();
			if (weekDays.length === 0) weekDays = [1];
			freqEvery = 1;
		} else {
			freqType = "daily";
			freqEvery = 1;
		}
	}

	// Sincroniza estado visual ← cron externo (sin re-emitir en bucle).
	let lastEmitted = $state<string | null>(null);
	$effect(() => {
		if (cron !== lastEmitted) {
			lastEmitted = cron;
			parseIntoProps(cron);
		}
	});

	/** Serializa el estado visual a un cron de 5 campos válido. */
	function propsToCron(): string {
		let min: string;
		let hour: string;
		if (dailyMode === "every") {
			if (everyUnit === "minute") {
				min = `*/${everyInterval}`;
				hour = "*";
			} else {
				min = "0";
				hour = `*/${everyInterval}`;
			}
		} else {
			const [hh, mm] = onceTime.split(":").map((p) => p.trim());
			min = (mm || "0").padStart(2, "0");
			hour = (hh || "0").padStart(2, "0");
		}
		let dom = "*";
		let dow = "*";
		if (freqType === "monthly") {
			dom = String(monthlyDay);
		} else if (freqType === "weekly") {
			dom = "*";
			dow = [...weekDays].sort((a, b) => a - b).join(",");
		}
		// daily: si "cada N días" con N>1 → `*/N` en dom (aproximación fiel del
		// cron de 5 campos: cada N días del mes, desde el día 1).
		if (freqType === "daily" && freqEvery > 1) dom = `*/${freqEvery}`;
		return [min, hour, dom, "*", dow].join(" ");
	}

	function emit() {
		const c = propsToCron();
		lastEmitted = c;
		onchange(c);
	}

	/** Descripción humana estilo SSMS ("Ocurre cada día a las 07:00…"). */
	const summary = $derived.by(() => {
		const parts: string[] = [];
		if (freqType === "daily") {
			parts.push(
				freqEvery <= 1 ? "Ocurre cada día" : `Ocurre cada ${freqEvery} días del mes`,
			);
		} else if (freqType === "weekly") {
			const names =
				weekDays.length === 7
					? "todos los días"
					: weekDays.map((d) => DAY_FULL[d]).join(", ");
			parts.push(`Ocurre cada semana los ${names}`);
		} else {
			parts.push(`Ocurre cada mes el día ${monthlyDay}`);
		}
		if (dailyMode === "once") {
			parts.push(`a las ${onceTime}`);
		} else if (everyUnit === "minute") {
			parts.push(
				`cada ${everyInterval === 1 ? "minuto" : `${everyInterval} minutos`}`,
			);
		} else {
			parts.push(`cada ${everyInterval === 1 ? "hora" : `${everyInterval} horas`}`);
		}
		return `${parts.join(" ")}.`;
	});

	/** Alterna un día de la semana en el modo semanal. */
	function toggleDay(d: number) {
		weekDays = weekDays.includes(d)
			? weekDays.filter((x) => x !== d)
			: [...weekDays, d].sort((a, b) => a - b);
		if (weekDays.length === 0) weekDays = [d]; // nunca vacío
		emit();
	}
</script>

<div class="space-y-3">
	<!-- Frecuencia -->
	<div class="rounded-lg border border-border bg-muted/20 p-3">
		<div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
			Frecuencia
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-[13px] text-foreground">Ocurre:</span>
			<div class="flex overflow-hidden rounded-md border border-border">
				<button
					type="button"
					onclick={() => {
						freqType = "daily";
						emit();
					}}
					class="px-3 py-1 text-xs transition-colors {freqType === 'daily'
						? 'bg-foreground text-background'
						: 'bg-background text-muted-foreground hover:bg-muted'}"
				>
					Diario
				</button>
				<button
					type="button"
					onclick={() => {
						freqType = "weekly";
						emit();
					}}
					class="border-l border-border px-3 py-1 text-xs transition-colors {freqType === 'weekly'
						? 'bg-foreground text-background'
						: 'bg-background text-muted-foreground hover:bg-muted'}"
				>
					Semanal
				</button>
				<button
					type="button"
					onclick={() => {
						freqType = "monthly";
						emit();
					}}
					class="border-l border-border px-3 py-1 text-xs transition-colors {freqType === 'monthly'
						? 'bg-foreground text-background'
						: 'bg-background text-muted-foreground hover:bg-muted'}"
				>
					Mensual
				</button>
			</div>
			<div class="flex items-center gap-1.5">
				<span class="text-[13px] text-muted-foreground">Recurs every:</span>
				<Input
					type="number"
					min="1"
					max="30"
					value={freqEvery}
					oninput={(e) => {
						freqEvery = Math.max(1, Math.min(30, parseInt(e.currentTarget.value, 10) || 1));
						emit();
					}}
					class="h-7 w-14 font-mono text-xs"
				/>
				<span class="text-[13px] text-muted-foreground">
					{freqType === "daily" ? "día(s)" : freqType === "weekly" ? "semana(s)" : "mes(es)"}
				</span>
			</div>
		</div>

		{#if freqType === "weekly"}
			<div class="mt-2 flex items-center gap-1">
				<span class="mr-1 text-[13px] text-muted-foreground">en:</span>
				{#each DAY_LABELS as label, i (label + i)}
					<button
						type="button"
						onclick={() => toggleDay(i)}
						title={DAY_FULL[i]}
						class="size-7 rounded-md border text-xs font-medium transition-colors {weekDays.includes(i)
							? 'border-foreground/40 bg-foreground text-background'
							: 'border-border bg-background text-muted-foreground hover:bg-muted'}"
					>
						{label}
					</button>
				{/each}
			</div>
		{:else if freqType === "monthly"}
			<div class="mt-2 flex items-center gap-1.5">
				<span class="text-[13px] text-foreground">Día</span>
				<Input
					type="number"
					min="1"
					max="31"
					value={monthlyDay}
					oninput={(e) => {
						monthlyDay = Math.max(1, Math.min(31, parseInt(e.currentTarget.value, 10) || 1));
						emit();
					}}
					class="h-7 w-14 font-mono text-xs"
				/>
				<span class="text-[13px] text-muted-foreground">de cada mes</span>
			</div>
		{/if}
	</div>

	<!-- Frecuencia diaria (hora) -->
	<div class="rounded-lg border border-border bg-muted/20 p-3">
		<div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
			Frecuencia diaria
		</div>
		<div class="space-y-1.5">
			<label class="flex items-center gap-2 text-[13px] text-foreground">
				<input
					type="radio"
					name="daily-mode"
					checked={dailyMode === "once"}
					onchange={() => {
						dailyMode = "once";
						emit();
					}}
					class="accent-foreground"
				/>
				Ocurre una vez a las:
				<Input
					type="time"
					value={onceTime}
					oninput={(e) => {
						onceTime = e.currentTarget.value || "09:00";
						emit();
					}}
					class="h-7 w-28 font-mono text-xs"
				/>
			</label>
			<label class="flex items-center gap-2 text-[13px] text-foreground">
				<input
					type="radio"
					name="daily-mode"
					checked={dailyMode === "every"}
					onchange={() => {
						dailyMode = "every";
						emit();
					}}
					class="accent-foreground"
				/>
				Ocurre cada:
				<Input
					type="number"
					min="1"
					max="59"
					value={everyInterval}
					oninput={(e) => {
						everyInterval = Math.max(1, Math.min(59, parseInt(e.currentTarget.value, 10) || 1));
						emit();
					}}
					class="h-7 w-14 font-mono text-xs"
				/>
				<select
					value={everyUnit}
					onchange={(e) => {
						everyUnit = e.currentTarget.value as "minute" | "hour";
						emit();
					}}
					class="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-foreground/30"
				>
					<option value="minute">minuto(s)</option>
					<option value="hour">hora(s)</option>
				</select>
			</label>
		</div>
	</div>

	<!-- Resumen + cron resultante -->
	<div class="rounded-lg border border-border bg-muted/20 p-3">
		<div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
			Resumen
		</div>
		<p class="text-[13px] leading-relaxed text-foreground">{summary}</p>
		<div class="mt-2 flex items-center gap-2">
			<span class="text-[11px] text-muted-foreground">Cron:</span>
			<code class="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
				{propsToCron()}
			</code>
			<span class="text-[11px] text-muted-foreground">(UTC)</span>
		</div>
	</div>
</div>
