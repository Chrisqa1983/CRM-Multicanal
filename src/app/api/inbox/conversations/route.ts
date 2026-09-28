import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema/messaging";
import { desc, eq } from "drizzle-orm";
import { pingZernio } from "@/lib/zernio/client";

export async function GET(request: NextRequest) {
  try {
    const list = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.lastMessageAt));

    // Obtener el último mensaje de cada conversación
    const enhanced = await Promise.all(
      list.map(async (conv) => {
        const lastMsg = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.sentAt))
          .limit(1);

        return {
          ...conv,
          lastMessage: lastMsg[0]?.body || "",
          lastMessageType: lastMsg[0]?.type || "text",
        };
      })
    );

    // Canales presentes en las conversaciones actuales
    const dbChannels = Array.from(new Set(list.map((c) => c.channel).filter(Boolean)));

    // Canales activos configurados en Zernio
    let zernioChannels: string[] = [];
    try {
      const ping = await pingZernio();
      if (ping.ok && ping.accounts && ping.accounts.length > 0) {
        zernioChannels = ping.accounts.map((a) => a.platform.toLowerCase());
      }
    } catch (e) {
      console.warn("[Conversations API] Error consultando cuentas de Zernio:", e);
    }

    // Unión de canales únicos conectados
    const connectedChannels = Array.from(
      new Set([...zernioChannels, ...dbChannels])
    ).filter(Boolean);

    const PREFERRED_ORDER = ["whatsapp", "instagram", "facebook"];
    connectedChannels.sort((a, b) => {
      const idxA = PREFERRED_ORDER.indexOf(a);
      const idxB = PREFERRED_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({
      success: true,
      conversations: enhanced,
      connectedChannels: connectedChannels.length > 0 ? connectedChannels : ["whatsapp", "instagram"],
    });
  } catch (error: any) {
    console.error("[Conversations API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
