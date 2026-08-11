<script lang="ts">
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as NativeSelect from "$lib/components/ui/native-select/index.js";
	import * as Questionnaire from "$lib/components/ui/questionnaire/index.js";
	import CheckIcon from "@lucide/svelte/icons/check";
	import CornerDownLeftIcon from "@lucide/svelte/icons/corner-down-left";
	import TimerIcon from "@lucide/svelte/icons/timer";

	// Gate HITL genérica del Atlas (demo de la fábrica). Un solo componente que
	// renderiza TODOS los tipos de pregunta que el agente Sigma puede producir
	// (ver docs/icf/hitl-tipos.md): single-select, multi-select, número, form
	// multi-campo, aprobación (tool-approval), Sí/No, omitible (dismissable) y
	// timeout (auto-cancel). Tras responder colapsa a un resumen Q/A persistente
	// en su posición del transcript.

	type Choice = { value: string; label: string; hint?: string; style?: "primary" | "outline" | "danger" };
	type Field = {
		name: string;
		label: string;
		type?: "text" | "number" | "date";
		placeholder?: string;
		min?: number;
		max?: number;
		options?: { value: string; label: string }[];
	};

	let {
		variant = "single",
		title,
		description,
		choices = [],
		fields = [],
		freeform = false,
		dismissable = false,
		numberMin,
		numberMax,
		numberDefault,
		timeoutMs = null,
		submitLabel = "Responder",
		onsubmit,
		ondismiss,
		onexpire,
	}: {
		variant?: "single" | "multiple" | "number" | "form" | "approval" | "boolean";
		title: string;
		description: string;
		choices?: Choice[];
		fields?: Field[];
		freeform?: boolean;
		dismissable?: boolean;
		numberMin?: number;
		numberMax?: number;
		numberDefault?: number;
		timeoutMs?: number | null;
		submitLabel?: string;
		onsubmit: (summary: string, data: FormData) => void;
		ondismiss?: () => void;
		onexpire?: () => void;
	} = $props();

	const singleItem = $derived({
		name: "respuesta",
		required: true,
		// En un form multi-campo, todos los controles comparten el nombre del item
		// (así el root los ve como "respuesta" → item answered). `multiple: true`
		// evita que `selectControl` borre los demás campos al escribir.
		multiple: variant === "multiple" || variant === "form",
		choices: variant === "single" || variant === "multiple" ? choices.map((c) => ({ value: c.value })) : undefined,
	});

	let submitted = $state(false);
	let summary = $state("");
	let invalidMsg = $state("");

	// Timeout (auto-cancel): countdown visible; al llegar a 0 la gate "expira" y
	// el agente continúa con la política por defecto (como el grace de Copilot).
	let remaining = $state(0);
	let expired = $state(false);
	let progress = $derived(timeoutMs ? remaining / timeoutMs : 0);
	let interval: ReturnType<typeof setInterval> | undefined;

	function stopTimer() {
		if (interval) clearInterval(interval);
		interval = undefined;
	}

	onMount(() => {
		if (!timeoutMs) return;
		remaining = timeoutMs;
		interval = setInterval(() => {
			remaining = Math.max(0, remaining - 100);
			if (remaining === 0 && !submitted) {
				stopTimer();
				expired = true;
				onexpire?.();
			}
		}, 100);
		return stopTimer;
	});

	function labelFor(value: string): string {
		return choices.find((c) => c.value === value)?.label ?? value;
	}

	function buildSummary(data: FormData): string {
		if (variant === "multiple") {
			const values = data.getAll("respuesta").map(String);
			return values.map((v) => labelFor(v)).join(" + ") || "Ninguno";
		}
		if (variant === "form") {
			// Todos los campos comparten name="respuesta"; los leo por índice en
			// el orden de la config (mismo orden del DOM). Los selects se mapean
			// a su label de opción.
			const all = data.getAll("respuesta").map(String);
			return fields
				.map((f, i) => {
					const raw = all[i];
					if (!raw) return "";
					const opt = f.options?.find((o) => o.value === raw);
					return `${f.label}: ${opt?.label ?? raw}`;
				})
				.filter(Boolean)
				.join(" · ");
		}
		return labelFor(String(data.get("respuesta") ?? ""));
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const data = new FormData(event.currentTarget as HTMLFormElement);
		if (variant === "number") {
			const raw = String(data.get("respuesta") ?? "").trim();
			const value = Number(raw);
			if (!raw || Number.isNaN(value) || (numberMin !== undefined && value < numberMin) || (numberMax !== undefined && value > numberMax)) {
				invalidMsg = `Ingresa un valor entre ${numberMin ?? "—"} y ${numberMax ?? "—"}.`;
				return;
			}
		}
		if (variant === "form") {
			const all = data.getAll("respuesta").map(String);
			const missing = fields.filter((f, i) => !all[i]?.trim()).map((f) => f.label);
			if (missing.length) {
				invalidMsg = `Faltan campos: ${missing.join(", ")}.`;
				return;
			}
		}
		invalidMsg = "";
		// El campo libre comparte name="respuesta", así que su texto ya viene en
		// buildSummary (como valor alternativo a las opciones).
		stopTimer();
		summary = buildSummary(data);
		submitted = true;
		onsubmit(summary, data);
	}

	function handleChoice(value: string) {
		stopTimer();
		const label = labelFor(value);
		summary = label;
		submitted = true;
		const data = new FormData();
		data.set("respuesta", value);
		onsubmit(label, data);
	}
</script>

<!-- Expiró (timeout) -->
{#if expired}
	<div
		data-slot="gate-expired"
		class="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 px-3 py-2 text-sm"
	>
		<TimerIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
		<p class="text-muted-foreground">
			<span class="font-medium text-foreground">⏱️ La pregunta expiró.</span>
			El agente canceló la espera (ventana de gracia) y continuó con la política por
			defecto: <span class="font-medium">la compra queda pendiente de autorización de finanzas</span> y
			se notificó al responsable.
		</p>
	</div>
{:else if submitted}
	<!-- Resumen Q/A persistente -->
	<div data-slot="gate-summary" class="flex flex-col gap-1 text-sm">
		<p class="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
			<CheckIcon class="size-3.5" /> Pregunta respondida
		</p>
		<p>
			<span class="text-muted-foreground">Q:</span> <span class="font-medium">{title}</span>
		</p>
		<p>
			<span class="text-muted-foreground">A:</span> <strong>{summary}</strong>
		</p>
	</div>
{:else}
	<div class="flex flex-col gap-3">
		{#if timeoutMs}
			<div class="flex items-center justify-between gap-3">
				<p class="text-xs text-muted-foreground">
					El agente espera tu respuesta antes de reanudar…
				</p>
				<span class="text-xs font-medium tabular-nums" role="timer"
					>{Math.ceil(remaining / 1000)} s</span
				>
			</div>
			<div class="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
				<div
					class="h-full rounded-full bg-amber-500 transition-[width] duration-100 ease-linear"
					style:width="{progress * 100}%"
				></div>
			</div>
		{/if}

		{#if variant === "approval" || variant === "boolean"}
			<!-- Aprobación / Sí-No: botones de acción (tool-approval) -->
			<div class="flex flex-col gap-2">
				{#each choices as choice (choice.value)}
					<Button
						type="button"
						variant={
							choice.style === "danger"
								? "destructive"
								: choice.style === "primary"
									? "default"
									: "outline"
						}
						class="justify-start"
						onclick={() => handleChoice(choice.value)}
					>
						<span class="font-medium">{choice.label}</span>
						{#if choice.hint}
							<span class="ms-auto font-normal opacity-70">{choice.hint}</span>
						{/if}
					</Button>
				{/each}
			</div>
		{:else}
			<!-- Preguntas Questionnaire: single / multiple / number / form -->
			<Questionnaire.Root
				items={[singleItem]}
				autofocus={false}
				onsubmit={handleSubmit}
			>
				<Questionnaire.Item
					name="respuesta"
					required
					multiple={variant === "multiple" || variant === "form"}
				>
					<Questionnaire.Title>{title}</Questionnaire.Title>
					<Questionnaire.Description>{description}</Questionnaire.Description>
					<Questionnaire.Choices>
						{#if variant === "single" || variant === "multiple"}
							{#each choices as choice (choice.value)}
								<Questionnaire.Choice value={choice.value}>
									<span class="font-medium">{choice.label}</span>
									{#if choice.hint}
										<span class="text-muted-foreground">{choice.hint}</span>
									{/if}
								</Questionnaire.Choice>
							{/each}
							{#if freeform}
								<!-- El campo libre comparte name="respuesta": es una ALTERNATIVA
								     a las opciones (al escribir, el root limpia la opción marcada
								     y la respuesta libre queda como valor del item). -->
								<Questionnaire.Input
									aria-label="Otra respuesta"
									name="respuesta"
									placeholder="Otra respuesta (texto libre)…"
								/>
							{/if}
						{:else if variant === "number"}
							<Questionnaire.Input
								aria-label="Cantidad"
								name="respuesta"
								type="number"
								inputmode="numeric"
								min={numberMin}
								max={numberMax}
								value={numberDefault}
								placeholder={`Entre ${numberMin ?? "—"} y ${numberMax ?? "—"}`}
							/>
						{:else}
							{#each fields as field (field.name)}
								{#if field.options}
									<NativeSelect.Root
										aria-label={field.label}
										name="respuesta"
										class="w-full"
									>
										<NativeSelect.Option value="">{field.label}…</NativeSelect.Option>
										{#each field.options as option (option.value)}
											<NativeSelect.Option value={option.value}>{option.label}</NativeSelect.Option>
										{/each}
									</NativeSelect.Root>
								{:else}
									<Questionnaire.Input
										aria-label={field.label}
										name="respuesta"
										type={field.type ?? "text"}
										min={field.min}
										max={field.max}
										placeholder={field.placeholder}
									/>
								{/if}
							{/each}
						{/if}
					</Questionnaire.Choices>
					<Questionnaire.Error />
				</Questionnaire.Item>
				{#if invalidMsg}
					<p class="text-xs font-medium text-destructive">{invalidMsg}</p>
				{/if}
				<Questionnaire.Actions>
					<Questionnaire.Submit>{submitLabel}</Questionnaire.Submit>
				</Questionnaire.Actions>
			</Questionnaire.Root>
		{/if}

		{#if dismissable}
			<button
				type="button"
				class="inline-flex items-center justify-center gap-1.5 rounded-md text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
				onclick={() => {
					stopTimer();
					summary = "Omitida — el agente continuó sin esperar";
					submitted = true;
					ondismiss?.();
				}}
			>
				<CornerDownLeftIcon class="size-3" />
				Continuar sin responder
			</button>
		{/if}
	</div>
{/if}
