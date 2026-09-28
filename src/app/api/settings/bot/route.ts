import { NextRequest, NextResponse } from "next/server";
import { validateOpenRouterModel } from "@/lib/agent/config";
import { getUnifiedBotConfig, saveUnifiedBotConfig } from "@/lib/agent/bot-settings";

export async function GET() {
  try {
    const config = await getUnifiedBotConfig();
    const [modelValidation, fallbackValidation] = await Promise.all([
      validateOpenRouterModel(config.model),
      validateOpenRouterModel(config.fallbackModel),
    ]);

    return NextResponse.json({
      success: true,
      config,
      ai: {
        model: config.model,
        fallbackModel: config.fallbackModel,
        validation: {
          model: modelValidation,
          fallbackModel: fallbackValidation,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Error al obtener configuración del bot" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Si es solo una solicitud de validación de modelo
    if (body.action === "validate" || (body.model && typeof body.enabled !== "boolean" && !body.channelOverrides)) {
      const model = body.model || "";
      const result = await validateOpenRouterModel(model);
      return NextResponse.json({
        success: true,
        result,
      });
    }

    // Si es una solicitud de guardado de configuración
    const toSave = body.config || body;
    const updated = await saveUnifiedBotConfig(toSave);

    return NextResponse.json({
      success: true,
      config: updated,
      message: "Configuración del bot guardada y aplicada correctamente en el servidor.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Error al procesar configuración del bot" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
