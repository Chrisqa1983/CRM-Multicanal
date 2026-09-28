import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema/ai";
import { desc, eq } from "drizzle-orm";
import { deleteKnowledgeDocument } from "@/lib/knowledge/rag-service";

export async function GET() {
  try {
    const docs = await db
      .select({
        id: knowledgeDocuments.id,
        filename: knowledgeDocuments.filename,
        fileSize: knowledgeDocuments.fileSize,
        mimeType: knowledgeDocuments.mimeType,
        totalChunks: knowledgeDocuments.totalChunks,
        createdAt: knowledgeDocuments.createdAt,
      })
      .from(knowledgeDocuments)
      .orderBy(desc(knowledgeDocuments.createdAt));

    return NextResponse.json({
      success: true,
      documents: docs.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[Knowledge API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al listar documentos" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de documento requerido" },
        { status: 400 }
      );
    }

    const deleted = await deleteKnowledgeDocument(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Documento y fragmentos eliminados exitosamente",
    });
  } catch (error: any) {
    console.error("[Knowledge Delete Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al eliminar documento" },
      { status: 500 }
    );
  }
}
