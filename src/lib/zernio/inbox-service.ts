import { db } from "@/db";
import { conversations, messages, webhookEvents } from "@/db/schema/messaging";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { getZernioConfig } from "./client";

export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d]/g, "");
  // México: 13 dígitos empezando con 521 (e.g. 5216861874312) -> Remover el 1 adicional -> +52 686 187 4312
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    const lada = cleaned.slice(3, 6);
    const p1 = cleaned.slice(6, 9);
    const p2 = cleaned.slice(9);
    return `+52 ${lada} ${p1} ${p2}`;
  }
  // México: 12 dígitos empezando con 52 (e.g. 526861874312) -> +52 686 187 4312
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    const lada = cleaned.slice(2, 5);
    const p1 = cleaned.slice(5, 8);
    const p2 = cleaned.slice(8);
    return `+52 ${lada} ${p1} ${p2}`;
  }
  // 10 dígitos nacionales
  if (cleaned.length === 10) {
    return `+52 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (phone.startsWith("+")) return phone;
  return `+${phone}`;
}

/**
 * Normaliza y almacena un evento de webhook entrante de Zernio
 */
export async function processIncomingZernioWebhook(payload: any) {
  const eventId = payload.id || payload.event_id || payload.eventId || `evt_${Date.now()}`;
  const eventType = payload.event || payload.type || "message.received";

  // 1. Guardar evento en webhook_events para auditoría y deduplicación
  try {
    const existingEvent = await db
      .select({ eventId: webhookEvents.eventId })
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    if (existingEvent.length > 0) {
      console.log(`[Zernio Ingest] Evento ${eventId} ya fue procesado con anterioridad.`);
      return { duplicate: true, eventId };
    }

    await db.insert(webhookEvents).values({
      eventId,
      provider: "zernio",
      payload,
      processed: false,
    });
  } catch (err) {
    console.warn("[Zernio Ingest] Error guardando webhook_events (continuando):", err);
  }

  // 2. Normalizar payload según si proviene de Zernio oficial o del simulador sintético
  let channel = "whatsapp";
  let externalConvId = "";
  let externalMsgId = "";
  let text = "";
  let mediaUrl: string | undefined = undefined;
  let senderId = "";
  let senderName = "Cliente";
  let senderHandle: string | undefined = undefined;
  let senderAvatar: string | null = null;
  let direction: "inbound" | "outbound" = "inbound";
  let sentAt = new Date();

  // Formato oficial de Zernio
  if (payload.message && payload.conversation) {
    const msg = payload.message;
    const conv = payload.conversation;

    channel = msg.platform || payload.account?.platform || conv.platform || "whatsapp";
    externalConvId = conv.id || conv.platformConversationId || msg.conversationId;
    externalMsgId = msg.platformMessageId || msg.id;
    text = msg.text || (msg.attachments && msg.attachments[0]?.url ? "[Archivo adjunto]" : "");
    if (msg.attachments && msg.attachments[0]?.url) {
      mediaUrl = msg.attachments[0].url;
    }
    direction = msg.direction === "outgoing" ? "outbound" : "inbound";
    const rawPhone = msg.sender?.phoneNumber || conv.participantUsername || msg.sender?.id || conv.participantId;
    senderId = channel === "whatsapp" ? formatPhoneNumber(rawPhone) || rawPhone : (msg.sender?.username || rawPhone);
    senderName = msg.sender?.name || conv.participantName || "Cliente";
    senderHandle = conv.participantUsername || msg.sender?.username || senderId;
    senderAvatar = conv.participantPicture || msg.sender?.profilePicture || msg.sender?.instagramProfile?.profilePicture || null;
    if (msg.sentAt) {
      sentAt = new Date(msg.sentAt);
    }
  } else if (payload.data) {
    // Formato de simulación sintética
    const d = payload.data;
    channel = payload.channel || "whatsapp";
    externalConvId = d.conversationId || `conv_${Date.now()}`;
    externalMsgId = d.messageId || `msg_${Date.now()}`;
    text = d.message?.text || "";
    mediaUrl = d.message?.mediaUrl;
    senderId = d.sender?.id ? formatPhoneNumber(d.sender.id) : "+52 686 187 4312";
    senderName = d.sender?.name || "Cliente Simulado";
    senderHandle = d.sender?.handle;
    direction = "inbound";
    if (payload.timestamp) {
      sentAt = new Date(payload.timestamp);
    }
  } else {
    console.warn("[Zernio Ingest] Payload no contiene estructura reconocida de mensaje:", payload);
    return { error: "Estructura de mensaje no reconocida", eventId };
  }

  // 3. Upsert o encontrar la conversación en la BD (robusto contra variantes de id externo o handle)
  const convObj = payload.conversation;
  const altConvId = convObj?.platformConversationId || convObj?.id;

  let conversation = (
    await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.provider, "zernio"),
          or(
            eq(conversations.externalId, externalConvId),
            altConvId ? eq(conversations.externalId, altConvId) : sql`false`,
            and(
              eq(conversations.channel, channel),
              eq(conversations.participantId, senderId)
            ),
            senderHandle ? and(
              eq(conversations.channel, channel),
              eq(conversations.participantHandle, senderHandle)
            ) : sql`false`
          )
        )
      )
      .limit(1)
  )[0];

  const isIncoming = direction === "inbound";

  if (!conversation) {
    const inserted = await db
      .insert(conversations)
      .values({
        channel,
        provider: "zernio",
        externalId: externalConvId,
        participantId: senderId,
        participantName: senderName,
        participantHandle: senderHandle,
        participantAvatar: senderAvatar,
        lastMessageAt: sentAt,
        lastInboundAt: isIncoming ? sentAt : new Date(),
        unreadCount: isIncoming ? 1 : 0,
        status: "open",
        aiEnabled: true,
        needsHuman: false,
        metadata: {
          accountName: payload.account?.displayName || (channel === "whatsapp" ? "Workcil" : "Instagram"),
          accountPhone: payload.account?.username || "",
        },
      })
      .returning();
    conversation = inserted[0];
  } else {
    await db
      .update(conversations)
      .set({
        lastMessageAt: sentAt,
        ...(isIncoming ? { lastInboundAt: sentAt, unreadCount: conversation.unreadCount + 1 } : {}),
        participantName: senderName || conversation.participantName,
        participantHandle: senderHandle || conversation.participantHandle,
        participantAvatar: senderAvatar || conversation.participantAvatar,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));
  }

  // Si tenemos avatar y hay otras conversaciones de la misma persona sin avatar, compartirlo
  if (senderAvatar && senderName && senderName !== "Cliente") {
    try {
      await db
        .update(conversations)
        .set({ participantAvatar: senderAvatar })
        .where(
          and(
            sql`LOWER(participant_name) = LOWER(${senderName})`,
            sql`participant_avatar IS NULL`
          )
        );
    } catch (e) {}
  }

  // 4. Insertar el mensaje si no existe ya
  if (externalMsgId) {
    const existingMsg = await db
      .select({ id: messages.id, senderType: messages.senderType, direction: messages.direction })
      .from(messages)
      .where(eq(messages.externalId, externalMsgId))
      .limit(1);

    if (existingMsg.length === 0 && !isIncoming) {
      // Si es un mensaje saliente, buscar si ya existe en esta conversación enviado en los últimos 60 segundos
      // con el mismo texto (para evitar duplicar con "agent" un mensaje que envió la IA o el CRM)
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const recentOutbound = await db
        .select({ id: messages.id, senderType: messages.senderType })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.direction, "outbound"),
            eq(messages.body, text),
            sql`${messages.sentAt} >= ${sixtySecondsAgo}`
          )
        )
        .limit(1);

      if (recentOutbound.length > 0) {
        // Mensaje ya registrado previamente por el CRM o IA; actualizar externalId y estado
        await db
          .update(messages)
          .set({
            externalId: externalMsgId,
            status: "delivered",
            rawPayload: payload,
          })
          .where(eq(messages.id, recentOutbound[0].id));

        return {
          success: true,
          conversationId: conversation.id,
          externalConvId,
          externalMsgId,
          isInboundText: false,
          incomingText: "",
        };
      }
    }

    if (existingMsg.length === 0) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        channel,
        provider: "zernio",
        externalId: externalMsgId,
        direction,
        senderType: isIncoming ? "contact" : "agent",
        senderId,
        type: mediaUrl ? "image" : "text",
        body: text,
        mediaUrl,
        status: "delivered",
        rawPayload: payload,
        sentAt,
      });
    } else {
      // Actualizar estado de entrega si ya existía
      await db
        .update(messages)
        .set({
          status: "delivered",
          rawPayload: payload,
        })
        .where(eq(messages.id, existingMsg[0].id));
    }
  }

  // 5. Marcar evento como procesado
  try {
    await db
      .update(webhookEvents)
      .set({ processed: true })
      .where(eq(webhookEvents.eventId, eventId));
  } catch (e) {
    // Ignore error marking event
  }

  return {
    success: true,
    conversationId: conversation.id,
    externalConvId,
    externalMsgId,
    isInboundText: isIncoming && Boolean(text && text.trim() !== ""),
    incomingText: text,
  };
}

/**
 * Consulta la API de Zernio e importa directamente todas las conversaciones
 * de TODAS las cuentas conectadas (WhatsApp, Instagram, etc.) y su historial de mensajes
 */
export async function syncZernioInbox() {
  const config = getZernioConfig();
  if (!config.apiKey) {
    throw new Error("No hay ZERNIO_API_KEY configurada.");
  }

  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: "application/json",
  };

  // 1. Obtener TODAS las cuentas activas de Zernio
  let accounts: Array<{ id: string; platform: string; displayName: string; username?: string }> = [];
  try {
    const accRes = await fetch(`${baseUrl}/v1/accounts`, { headers });
    if (accRes.ok) {
      const accData = await accRes.json();
      if (Array.isArray(accData.accounts)) {
        accounts = accData.accounts.map((acc: any) => ({
          id: acc._id || acc.id,
          platform: acc.platform,
          displayName: acc.displayName || acc.platform,
          username: acc.username,
        }));
      }
    }
  } catch (e) {
    console.warn("Error listando cuentas de Zernio:", e);
  }

  // Si no se pudieron listar cuentas dinámicas, usar la predeterminada
  if (accounts.length === 0 && config.defaultAccountId) {
    accounts.push({
      id: config.defaultAccountId,
      platform: "whatsapp",
      displayName: "Workcil",
      username: "+52 686 632 1049",
    });
  }

  if (accounts.length === 0) {
    throw new Error("No se encontró ninguna cuenta vinculada en Zernio.");
  }

  let syncedConvs = 0;
  let syncedMsgs = 0;
  const discoveredAvatars: Record<string, string> = {};

  // 2. Iterar por cada cuenta conectada (WhatsApp, Instagram, Messenger, etc.)
  for (const account of accounts) {
    try {
      const convsUrl = `${baseUrl}/v1/inbox/conversations?accountId=${account.id}`;
      const convsRes = await fetch(convsUrl, { headers });
      if (!convsRes.ok) continue;

      const convsData = await convsRes.json();
      const remoteConvs = convsData.data || [];

      for (const rConv of remoteConvs) {
        const externalConvId = rConv.id;
        const channel = rConv.platform || account.platform || "whatsapp";
        const rawParticipant = rConv.participantUsername || rConv.participantId || "unknown";
        const participantId = channel === "whatsapp" ? formatPhoneNumber(rawParticipant) || rawParticipant : rawParticipant;
        const participantName = rConv.participantName || "Cliente";
        const participantHandle = rConv.participantUsername || participantId;
        const participantAvatar = rConv.participantPicture || null;
        const lastMessageAt = rConv.updatedTime ? new Date(rConv.updatedTime) : new Date();

        if (participantAvatar && participantName) {
          discoveredAvatars[participantName.toLowerCase()] = participantAvatar;
        }

        // Upsert conversation (robusto contra id de plataforma vs id interno)
        let conversation = (
          await db
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.provider, "zernio"),
                or(
                  eq(conversations.externalId, externalConvId),
                  and(
                    eq(conversations.channel, channel),
                    eq(conversations.participantId, participantId)
                  ),
                  participantHandle ? and(
                    eq(conversations.channel, channel),
                    eq(conversations.participantHandle, participantHandle)
                  ) : sql`false`
                )
              )
            )
            .limit(1)
        )[0];

        if (!conversation) {
          const inserted = await db
            .insert(conversations)
            .values({
              channel,
              provider: "zernio",
              externalId: externalConvId,
              participantId,
              participantName,
              participantHandle,
              participantAvatar,
              lastMessageAt,
              lastInboundAt: lastMessageAt,
              unreadCount: rConv.unreadCount || 0,
              status: "open",
              aiEnabled: true,
              needsHuman: false,
              metadata: {
                accountName: account.displayName,
                accountPhone: account.username || "",
              },
            })
            .returning();
          conversation = inserted[0];
          syncedConvs++;
        } else {
          await db
            .update(conversations)
            .set({
              participantName,
              participantHandle,
              participantAvatar: participantAvatar || conversation.participantAvatar,
              lastMessageAt,
              unreadCount: rConv.unreadCount !== undefined ? rConv.unreadCount : conversation.unreadCount,
              metadata: {
                accountName: account.displayName,
                accountPhone: account.username || "",
              },
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));
          syncedConvs++;
        }

        // 3. Obtener mensajes de la conversación
        try {
          const msgsUrl = `${baseUrl}/v1/inbox/conversations/${externalConvId}/messages?accountId=${account.id}`;
          const msgsRes = await fetch(msgsUrl, { headers });
          if (msgsRes.ok) {
            const msgsData = await msgsRes.json();
            const remoteMsgs = Array.isArray(msgsData)
              ? msgsData
              : (msgsData.messages || msgsData.data || []);

            for (const rMsg of remoteMsgs) {
              const externalMsgId = rMsg.id || rMsg.platformMessageId;
              const isIncoming = rMsg.direction === "incoming";
              const body = rMsg.message || (rMsg.attachments && rMsg.attachments[0]?.url ? "[Archivo]" : "");
              const mediaUrl = rMsg.attachments && rMsg.attachments[0]?.url ? rMsg.attachments[0].url : undefined;
              const sentAt = rMsg.sentAt || rMsg.createdAt ? new Date(rMsg.sentAt || rMsg.createdAt) : new Date();

              if (externalMsgId) {
                const existing = await db
                  .select({ id: messages.id })
                  .from(messages)
                  .where(eq(messages.externalId, externalMsgId))
                  .limit(1);

                if (existing.length === 0) {
                  await db.insert(messages).values({
                    conversationId: conversation.id,
                    channel,
                    provider: "zernio",
                    externalId: externalMsgId,
                    direction: isIncoming ? "inbound" : "outbound",
                    senderType: isIncoming ? "contact" : "agent",
                    senderId: rMsg.senderId || participantId,
                    type: mediaUrl ? "image" : "text",
                    body,
                    mediaUrl,
                    status: rMsg.deliveryStatus || "delivered",
                    rawPayload: rMsg,
                    sentAt,
                  });
                  syncedMsgs++;
                }
              }
            }
          }
        } catch (msgErr) {
          console.warn(`[Zernio Sync] Error sincronizando mensajes para conversación ${externalConvId}:`, msgErr);
        }
      }
    } catch (accErr) {
      console.warn(`[Zernio Sync] Error procesando cuenta ${account.id}:`, accErr);
    }
  }

  // 4. Propagar avatares encontrados a conversaciones del mismo contacto que no tengan foto
  for (const [name, avatar] of Object.entries(discoveredAvatars)) {
    try {
      await db
        .update(conversations)
        .set({ participantAvatar: avatar })
        .where(
          and(
            sql`LOWER(participant_name) LIKE ${'%' + name.split(' ')[0] + '%'}`,
            sql`participant_avatar IS NULL`
          )
        );
    } catch (e) {}
  }

  return {
    success: true,
    syncedConversations: syncedConvs,
    syncedMessages: syncedMsgs,
  };
}

/**
 * Envía un mensaje a través de la API de Zernio (o simulación local) y lo almacena en la BD
 */
export async function sendZernioOutboundMessage({
  conversationId,
  text,
  senderId,
  senderType = "agent",
}: {
  conversationId: string;
  text: string;
  senderId?: string;
  senderType?: "agent" | "ai" | "system";
}) {
  const config = getZernioConfig();

  // 1. Obtener la conversación de la BD
  const conversation = (
    await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)
  )[0];

  if (!conversation) {
    throw new Error("Conversación no encontrada en la base de datos.");
  }

  const isSimulation =
    conversation.externalId?.startsWith("conv_synth_") ||
    process.env.SIMULATION_MODE === "true" ||
    config.apiKey?.startsWith("zn_test_mock");

  let sentMessageId = `out_${Date.now()}`;
  let resData: any = { simulated: isSimulation };

  // 2. Si no es simulación, enviar a la API de Zernio
  if (!isSimulation) {
    if (!config.apiKey) {
      throw new Error("No hay ZERNIO_API_KEY configurada.");
    }

    const baseUrl = config.baseUrl.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    let accountId = config.defaultAccountId;
    try {
      const accsRes = await fetch(`${baseUrl}/v1/accounts`, { headers });
      if (accsRes.ok) {
        const accsData = await accsRes.json();
        const matched = accsData.accounts?.find((a: any) => a.platform === conversation.channel);
        if (matched) {
          accountId = matched._id || matched.id;
        }
      }
    } catch (e) {}

    if (!accountId) {
      throw new Error("No se encontró el accountId para este canal.");
    }

    const sendUrl = `${baseUrl}/v1/inbox/conversations/${conversation.externalId}/messages`;

    const response = await fetch(sendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accountId,
        message: text,
      }),
    });

    resData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resData.error || resData.message || `HTTP ${response.status}`;
      throw new Error(`Error al enviar mensaje vía Zernio: ${errorMsg}`);
    }

    sentMessageId =
      resData.data?.messageId ||
      resData.data?.id ||
      resData.messageId ||
      resData.id ||
      sentMessageId;
  }

  const now = new Date();

  // 3. Registrar mensaje saliente en la BD
  const [createdMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      channel: conversation.channel,
      provider: "zernio",
      externalId: sentMessageId,
      direction: "outbound",
      senderType,
      senderId,
      type: "text",
      body: text,
      status: "sent",
      rawPayload: resData,
      sentAt: now,
    })
    .returning();

  // 4. Actualizar fecha de último mensaje en la conversación
  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversation.id));

  return createdMessage;
}
