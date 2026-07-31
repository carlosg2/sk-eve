<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import MessageSquare from '@lucide/svelte/icons/message-square';

	import { Chat } from "@ai-sdk/svelte";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import ImageIcon from "@lucide/svelte/icons/image";
	import MessageCircleDashedIcon from "@lucide/svelte/icons/message-circle-dashed";
	import PaperclipIcon from "@lucide/svelte/icons/paperclip";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";
	import TelescopeIcon from "@lucide/svelte/icons/telescope";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import * as MessageScroller from "$lib/components/ui/message-scroller/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import MessageAnimated from "$lib/components/message-animated.svelte";
	import { createChat, getMessageText } from "$lib/lib/ai.svelte.js";

	const chat = createChat()
		.user("¿Cuál es el estado general del inventario esta semana?")
		.sleep(800)
		.assistant(
			`## Diagnóstico semanal de inventario

Encontré **3 alertas críticas** y **2 oportunidades de ahorro** que quiero mostrarte antes de que abras el día.

---

### 🔴 Alertas críticas

| Artículo | SKU | Stock actual | Mínimo | Días para agotarse |
|---|---|---|---|---|
| Válvula compuerta 2" | SKU-0482 | **4 uds** | 20 uds | ~2 días |
| Brida ciega DN100 | SKU-1130 | **0 uds** | 5 uds | Agotado |
| Empaque PTFE 1/8" | SKU-0219 | 31 uds | 50 uds | ~6 días |

> ⚠️ La brida DN100 tiene **2 órdenes de compra abiertas desde hace 12 días** sin confirmación de fecha de entrega. Proveedor no ha respondido.

---

### 🟡 Alertas de tendencia

El consumo de **Empaque PTFE** aumentó **+40%** vs el mes anterior. Si el ritmo continúa, el mínimo de 50 uds quedará corto para la siguiente quincena.

---

¿Genero las requisiciones de compra para los tres artículos ahora?`
		)
		.user("Sí, genera las requisiciones. ¿A qué proveedor le asignas cada una?")
		.sleep(1000)
		.assistant(
			`## Requisiciones pre-llenadas ✓

Analicé **historial de precios** (últimos 6 meses), **tiempos de entrega reales** y **calificación de proveedor** para seleccionar la mejor opción en cada caso:

| Artículo | Proveedor asignado | Precio unit. | Lead time | Calificación |
|---|---|---|---|---|
| Válvula compuerta 2" | Ferreaceros del Norte | $487.00 | 3 días | ⭐⭐⭐⭐⭐ |
| Brida ciega DN100 | Grupo Industrial Reyes | $1,240.00 | 5 días | ⭐⭐⭐⭐ |
| Empaque PTFE 1/8" | Plastimundo S.A. | $38.50 | 1 día | ⭐⭐⭐⭐⭐ |

---

### ⛔ Bloqueo detectado — Brida DN100

Grupo Industrial Reyes tiene una **factura vencida de $14,200** (30 días de mora). El sistema bloqueará la emisión de la orden hasta que **Cuentas por Pagar** la libere.

**Opciones:**
1. Esperar la liberación y proceder con los 3 artículos
2. Proceder solo con Válvula y Empaque PTFE hoy, y marcar la brida como pendiente
3. Cambiar proveedor de brida (alternativa: Tubacero Noreste, lead time 7 días, +8% precio)

¿Cuál prefieres?`
		)
		.user("Procede con las dos y avísame cuando estén autorizadas.")
		.sleep(900)
		.assistant(
			`## REQ-2024-0891 y REQ-2024-0892 enviadas a autorización ✓

Ambas requisiciones están en flujo. Aquí el detalle:

\`\`\`
REQ-2024-0891  Válvula compuerta 2"   Cant: 30 uds   Importe: $14,610.00
REQ-2024-0892  Empaque PTFE 1/8"      Cant: 500 uds  Importe: $19,250.00
                                       ─────────────────────────────────
                                       Total:          $33,860.00
\`\`\`

---

### ⚠️ Alerta en flujo de autorización

El autorizador asignado, **Ing. Ramírez**, acumula **7 documentos pendientes con más de 48 hrs sin revisar**. Le envié una notificación automática con prioridad alta.

Tiempo estimado de autorización basado en su historial: **~4 horas** en horario laboral.

---

### 💡 Algo que deberías saber antes de autorizar

El **Proyecto Planta Norte (OT-445)**, programado para iniciar el próximo lunes, tiene asignado en su presupuesto de materiales **300 uds de Empaque PTFE** — el **60%** de la cantidad que acabo de requisicionar.

Si OT-445 arranca en fecha, las 500 uds se agotarán en ~10 días en lugar de las 3 semanas estimadas originalmente.

¿Quieres que ajuste la cantidad ahora, antes de que el Ing. Ramírez autorice?`
		)
		.user("Buena observación. Ajusta la cantidad al doble para OT-445.")
		.sleep(700)
		.assistant(
			`## REQ-2024-0892 actualizada ✓

| Campo | Antes | Después |
|---|---|---|
| Cantidad | 500 uds | **1,000 uds** |
| Precio unitario | $38.50 | **$35.42** ¹ |
| Importe total | $19,250.00 | **$35,420.00** |
| Autorizador | Ing. Ramírez | **Gerente de Operaciones** ² |

> ¹ Plastimundo aplica descuento del **8%** en pedidos > 800 uds. Ahorro generado: **$3,080.00**
> ² El importe supera el límite de autorización individual del Ing. Ramírez ($30,000), por lo que el flujo escala automáticamente.

---

### Resumen del día

- ✅ **REQ-2024-0891** — Válvula 2" → $14,610 → pendiente Ing. Ramírez
- ✅ **REQ-2024-0892** — Empaque PTFE × 1,000 uds → $35,420 → pendiente Gerente de Operaciones
- 🔄 **Brida DN100** — bloqueada hasta liberar factura vencida con Grupo Industrial Reyes

Ambas requisiciones están listas para **firma electrónica**. Te aviso en cuanto el Gerente de Operaciones las firme. ¿Algo más?`
		);
	const initialMessages = chat.get({ count: 0 });
	const transport = chat.transport({ chunkDelayMs: 20 });
	const chatState = new Chat({
		messages: initialMessages,
		transport,
	});
	const nextMessage = $derived(chat.next({ after: chatState.messages }));
	const isBusy = $derived(chatState.status === "submitted" || chatState.status === "streaming");

	function resetConversation() {
		chatState.messages = initialMessages;
	}
</script>

<div class="flex h-full flex-col bg-background">
	<!-- Header -->
	<div class="flex h-9 shrink-0 items-center justify-between px-3">
		<div class="flex items-center gap-2">
			<MessageSquare class="size-3.5 text-muted-foreground" />
			<span class="text-xs font-medium">Chat IA</span>
		</div>
		<div class="flex items-center gap-0.5">
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class="size-6"
							aria-label="Reiniciar conversación"
							onclick={resetConversation}
							disabled={isBusy}
						>
							<RotateCwIcon class="size-3.5" />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="bottom"><p>Reiniciar</p></Tooltip.Content>
			</Tooltip.Root>
		</div>
	</div>
	<Separator />

	<MessageScroller.Provider>
		<div class="flex min-h-0 flex-1 flex-col">
			{#if chatState.messages.length === 0}
				<Empty.Root class="flex-1">
					<Empty.Header>
						<Empty.Media variant="icon">
							<MessageCircleDashedIcon />
						</Empty.Media>
						<Empty.Title>Chat IA</Empty.Title>
						<Empty.Description>¿En qué puedo ayudarte?</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<MessageScroller.Root class="flex-1">
					<MessageScroller.Viewport>
						<MessageScroller.Content aria-busy={isBusy} class="p-4">
							{#each chatState.messages as message (message.id)}
								<MessageAnimated
									{message}
									scrollAnchor={message.role === "user"}
								/>
							{/each}
						</MessageScroller.Content>
					</MessageScroller.Viewport>
					<MessageScroller.Button />
				</MessageScroller.Root>
			{/if}

			<!-- Input -->
			<div class="shrink-0 border-t p-3">
				<form
					onsubmit={(event) => {
						event.preventDefault();
						if (!nextMessage || isBusy) return;
						void chatState.sendMessage(nextMessage);
					}}
				>
					<InputGroup.Root>
						<div class="h-14 w-full px-3 py-2.5">
							<span
								class="line-clamp-2 opacity-60 data-[status=ready]:opacity-100"
								data-status={chatState.status}
							>
								{#if nextMessage}
									{getMessageText(nextMessage)}
								{:else}
									<span class="text-muted-foreground text-xs">
										Sin mensajes. Reinicia la conversación.
									</span>
								{/if}
							</span>
						</div>
						<InputGroup.Addon align="block-end" class="pt-1">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<InputGroup.Button
											{...props}
											aria-label="Adjuntar"
											type="button"
											size="icon-sm"
											variant="outline"
										>
											<PlusIcon />
										</InputGroup.Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content
									align="start"
									side="top"
									class="w-44"
									portalProps={{ disabled: true }}
								>
									<DropdownMenu.Item>
										<PaperclipIcon />
										Adjuntar archivo
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item>
										<ImageIcon />
										Crear imagen
									</DropdownMenu.Item>
									<DropdownMenu.Item>
										<TelescopeIcon />
										Deep Research
									</DropdownMenu.Item>
									<DropdownMenu.Item>
										<GlobeIcon />
										Búsqueda web
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
							<InputGroup.Button
								type="submit"
								variant="default"
								size="icon-sm"
								disabled={!nextMessage || isBusy}
								class="ml-auto"
							>
								<ArrowUpIcon />
								<span class="sr-only">Enviar</span>
							</InputGroup.Button>
						</InputGroup.Addon>
					</InputGroup.Root>
				</form>
			</div>
		</div>
	</MessageScroller.Provider>
</div>
