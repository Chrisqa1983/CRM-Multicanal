import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema/messaging";
import { eq, asc } from "drizzle-orm";
import { sendZernioOutboundMessage } from "@/lib/zernio/inbox-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const list = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.sentAt));

    // Resetear contador de no leídos al abrir el chat
    await db
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(eq(conversations.id, id));

    return NextResponse.json({
      success: true,
      messages: list,
    });
  } catch (error: any) {
    console.error("[Messages API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, senderId } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, message: "El texto del mensaje es obligatorio." },
        { status: 400 }
      );
    }

    const created = await sendZernioOutboundMessage({
      conversationId: id,
      text: text.trim(),
      senderId,
    });

    return NextResponse.json({
      success: true,
      message: created,
    });
  } catch (error: any) {
    console.error("[Send Message Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al enviar mensaje vía Zernio" },
      { status: 500 }
    );
  }
}
