import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations } from "@/db/schema/messaging";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const [current] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!current) {
      return NextResponse.json(
        { success: false, message: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    const newAiEnabled = typeof body.aiEnabled === "boolean" ? body.aiEnabled : !current.aiEnabled;
    const newNeedsHuman = typeof body.needsHuman === "boolean" ? body.needsHuman : !newAiEnabled;

    const [updated] = await db
      .update(conversations)
      .set({
        aiEnabled: newAiEnabled,
        needsHuman: newNeedsHuman,
        needsHumanReason: newNeedsHuman ? (body.reason || "Pausado por asesor") : null,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      conversation: updated,
      message: newAiEnabled ? "IA activada para este chat" : "IA pausada (Control Humano activo)",
    });
  } catch (error: any) {
    console.error("[Toggle AI Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al actualizar estado de IA" },
      { status: 500 }
    );
  }
}
