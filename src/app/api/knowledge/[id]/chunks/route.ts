import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentChunks, knowledgeDocuments } from "@/db/schema/ai";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de documento requerido" },
        { status: 400 }
      );
    }

    const [doc] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const chunks = await db
      .select({
        id: documentChunks.id,
        chunkIndex: documentChunks.chunkIndex,
        content: documentChunks.content,
        createdAt: documentChunks.createdAt,
      })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, id))
      .orderBy(asc(documentChunks.chunkIndex));

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        filename: doc.filename,
        totalChunks: doc.totalChunks,
      },
      chunks: chunks.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[Knowledge Chunks Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al obtener fragmentos" },
      { status: 500 }
    );
  }
}
