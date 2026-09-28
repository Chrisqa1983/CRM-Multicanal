import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/knowledge/rag-service";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No se proporcionó ningún archivo para subir" },
        { status: 400 }
      );
    }

    // Límite de tamaño: 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "El archivo excede el tamaño máximo permitido de 20 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const doc = await ingestDocument(buffer, file.name, file.type || "application/octet-stream");

    return NextResponse.json({
      success: true,
      document: doc,
      message: `Documento "${file.name}" indexado exitosamente (${doc.totalChunks} fragmentos vectorizados).`,
    });
  } catch (error: any) {
    console.error("[Knowledge Upload Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al procesar e indexar el documento" },
      { status: 500 }
    );
  }
}
