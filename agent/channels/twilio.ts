import { twilioChannel } from "eve/channels/twilio";

// Canal Twilio → WhatsApp Business (vía la misma API de Messages).
//
// El canal Twilio NO tiene lógica específica de WhatsApp: trata los números
// como strings opacos. Twilio envía From/To con prefijo "whatsapp:+...", así
// que allowFrom y messaging.from DEBEN llevar el prefijo completo. Las
// respuestas reutilizan el `To` del webhook (que ya trae "whatsapp:"), así que
// el reply funciona sin transformación.
//
// Notas:
// - Voz NO aplica a WhatsApp (las llamadas de WhatsApp no se enrutan a Twilio);
//   las rutas /voice solo sirven sobre la red telefónica normal.
// - Media entrante no soportado: una imagen llega con Body vacío.
// - Dev: usar el sandbox de Twilio (sender = whatsapp:+14155238886). Desde tu
//   WhatsApp normal envía "join <código>" al número del sandbox para activarlo.
// - Producción: requiere sender de WhatsApp Business aprobado (número propio o
//   Messaging Service). Al migrar tu número personal, la app normal deja de
//   funcionar en él.

// Número compartido del sandbox de WhatsApp de Twilio (solo para desarrollo).
const WHATSAPP_SANDBOX = "whatsapp:+14155238886";

// Lista de números permitidos (E.164, con o sin prefijo whatsapp:), separados
// por coma. Ej: TWILIO_WHATSAPP_ALLOW="+5215512345678,+5215522223333".
// Sin configuración → lista vacía → se rechazan TODOS los mensajes entrantes
// (deny-by-default, nunca "*").
function resolveAllowFrom(): string[] {
  const raw = process.env.TWILIO_WHATSAPP_ALLOW?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`));
}

// Remitente de WhatsApp para respuestas. En producción es mejor
// TWILIO_MESSAGING_SERVICE_SID (Messaging Service con sender de WhatsApp
// Business aprobado); en dev cae al sandbox.
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || undefined;
const from = process.env.TWILIO_WHATSAPP_FROM?.trim() || WHATSAPP_SANDBOX;

export default twilioChannel({
  allowFrom: resolveAllowFrom,
  // Credenciales se leen de env vars (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).
  // Para pasar valores directos usar `credentials: { accountSid, authToken }`.
  messaging: messagingServiceSid ? { messagingServiceSid } : { from },
  // Detrás de proxy/túnel: URL pública EXACTA que Twilio va a llamar, para que
  // la verificación de X-Twilio-Signature coincida.
  webhookUrl: process.env.TWILIO_WEBHOOK_URL?.trim() || undefined,
  // Base pública para que el TwiML de voz construya URLs absolutas de callback.
  publicBaseUrl: process.env.TWILIO_PUBLIC_BASE_URL?.trim() || undefined,
  voice: {
    prompt: "Hola, soy el asistente del ERP. Di tu mensaje después del tono.",
    language: "es-MX",
    acknowledgement: "Gracias, te contestaré por mensaje.",
  },
});
