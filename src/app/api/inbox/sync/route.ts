import { NextRequest, NextResponse } from "next/server";
import { syncZernioInbox } from "@/lib/zernio/inbox-service";

export async function POST(request: NextRequest) {
  try {
    const result = await syncZernioInbox();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Zernio Sync Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al sincronizar con Zernio",
      },
      { status: 500 }
    );
  }
}
