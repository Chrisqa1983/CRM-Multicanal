import { NextRequest, NextResponse } from "next/server";
import { searchKnowledgeBase } from "@/lib/knowledge/rag-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = (body.query || "").trim();
    const topK = typeof body.topK === "number" ? body.topK : 4;
    const minSimilarity = typeof body.minSimilarity === "number" ? body.minSimilarity : 0.3;

    if (!query) {
      return NextResponse.json(
        { success: false, message: "La consulta no puede estar vacía" },
        { status: 400 }
      );
    }

    const matches = await searchKnowledgeBase(query, topK, minSimilarity);

    return NextResponse.json({
      success: true,
      query,
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error("[Knowledge Search Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al realizar búsqueda vectorial" },
      { status: 500 }
    );
  }
}
