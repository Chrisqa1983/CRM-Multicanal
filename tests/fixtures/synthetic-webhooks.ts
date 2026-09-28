/**
 * Generador de webhooks sintéticos multicanal (WhatsApp, Instagram, Facebook)
 * para pruebas E2E e integración sin gastar saldo en Zernio.
 */

export interface SyntheticEventOptions {
  channel: "whatsapp" | "instagram" | "facebook";
  senderId?: string;
  senderName?: string;
  text?: string;
  mediaUrl?: string;
}

export function createSyntheticWebhookPayload(options: SyntheticEventOptions) {
  const eventId = `synth_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const timestamp = new Date().toISOString();

  let senderId = options.senderId;
  if (!senderId) {
    if (options.channel === "whatsapp") senderId = "+525500000000";
    else if (options.channel === "instagram") senderId = "igsid_user_test_99";
    else senderId = "fb_page_scoped_user_88";
  }

  const senderName = options.senderName || "Cliente Simulado";
  const text = options.text || "Hola, requiero información";

  return {
    eventId,
    provider: "zernio",
    channel: options.channel,
    timestamp,
    data: {
      messageId: `wamid_synth_${Date.now()}`,
      conversationId: `conv_synth_${senderId}`,
      sender: {
        id: senderId,
        name: senderName,
        handle: options.channel === "instagram" ? `@${senderName.toLowerCase().replace(/\s+/g, "_")}` : undefined,
      },
      message: {
        type: options.mediaUrl ? "image" : "text",
        text: text,
        mediaUrl: options.mediaUrl,
      },
    },
  };
}
