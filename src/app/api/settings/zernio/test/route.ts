import { NextRequest, NextResponse } from "next/server";
import { pingZernio, getZernioConfig } from "@/lib/zernio/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey, baseUrl } = body;

    const currentConfig = getZernioConfig();
    const effectiveApiKey = apiKey && apiKey.trim() !== "" ? apiKey.trim() : currentConfig.apiKey;
    const effectiveBaseUrl = baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : currentConfig.baseUrl;

    const result = await pingZernio({
      apiKey: effectiveApiKey,
      baseUrl: effectiveBaseUrl,
    });

    return NextResponse.json({
      success: result.ok,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al ejecutar prueba de conexión",
      },
      { status: 500 }
    );
  }
}
