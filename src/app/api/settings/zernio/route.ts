import { NextRequest, NextResponse } from "next/server";
import { getMaskedZernioConfig, pingZernio, saveZernioConfig, disconnectZernio } from "@/lib/zernio/client";
import { getFreshAiConfig, validateOpenRouterModel } from "@/lib/agent/config";

export async function GET(request: NextRequest) {
  try {
    const config = getMaskedZernioConfig();
    const ping = await pingZernio();

    // Resolver la URL pública real para el webhook de Zernio
    let webhookUrl = "";
    let isPublic = false;

    // 1. Variable explícita en .env
    if (process.env.WEBHOOK_PUBLIC_URL && process.env.WEBHOOK_PUBLIC_URL.trim()) {
      webhookUrl = process.env.WEBHOOK_PUBLIC_URL.trim();
      isPublic = true;
    } else if (
      process.env.NEXT_PUBLIC_APP_URL &&
      !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") &&
      !process.env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")
    ) {
      const base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
      webhookUrl = `${base}/api/webhooks/zernio`;
      isPublic = true;
    } else {
      // 2. Comprobar si ngrok está corriendo localmente
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600);
        const ngrokRes = await fetch("http://127.0.0.1:4040/api/tunnels", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (ngrokRes.ok) {
          const tunnelData = await ngrokRes.json();
          const httpsTunnel =
            tunnelData.tunnels?.find((t: any) => t.proto === "https") ||
            tunnelData.tunnels?.[0];
          if (httpsTunnel?.public_url) {
            webhookUrl = `${httpsTunnel.public_url}/api/webhooks/zernio`;
            isPublic = true;
          }
        }
      } catch (err) {
        // ngrok no disponible
      }
    }

    // 3. Fallback a origen de la petición si no hay URL pública
    if (!webhookUrl) {
      const origin = request.headers.get("origin") || request.nextUrl.origin || "http://localhost:3000";
      webhookUrl = `${origin}/api/webhooks/zernio`;
      isPublic = !origin.includes("localhost") && !origin.includes("127.0.0.1");
    }

    const freshAi = getFreshAiConfig();
    const [modelValidation, fallbackValidation] = await Promise.all([
      validateOpenRouterModel(freshAi.model),
      validateOpenRouterModel(freshAi.fallbackModel),
    ]);

    return NextResponse.json({
      success: true,
      config,
      status: ping.ok ? "connected" : "error",
      ping,
      ai: {
        ...freshAi,
        validation: {
          model: modelValidation,
          fallbackModel: fallbackValidation,
        },
      },
      webhookUrl,
      isPublicWebhookUrl: isPublic,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al obtener configuración de Zernio",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, webhookSecret, defaultAccountId, baseUrl } = body;

    // Si el usuario envió una clave nueva, probamos primero si es válida o si se desea forzar el guardado
    if (apiKey && apiKey.trim() !== "") {
      const testResult = await pingZernio({
        apiKey: apiKey.trim(),
        baseUrl: baseUrl?.trim() || undefined,
      });

      // Si no se especificó cuenta pero Zernio devolvió cuentas activas, auto-asignamos la principal
      let resolvedAccountId = defaultAccountId !== undefined ? defaultAccountId.trim() : undefined;
      if (!resolvedAccountId && testResult.accounts && testResult.accounts.length > 0) {
        resolvedAccountId = testResult.accounts[0].id;
      }

      // Guardamos la configuración
      const saveResult = await saveZernioConfig({
        apiKey: apiKey.trim(),
        webhookSecret: webhookSecret !== undefined ? webhookSecret.trim() : undefined,
        defaultAccountId: resolvedAccountId,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : undefined,
      });

      return NextResponse.json({
        success: saveResult.success,
        message: saveResult.message,
        testResult,
        defaultAccountId: resolvedAccountId,
      });
    }

    // Si solo actualiza los otros campos sin cambiar la API Key
    const saveResult = await saveZernioConfig({
      webhookSecret: webhookSecret !== undefined ? webhookSecret.trim() : undefined,
      defaultAccountId: defaultAccountId !== undefined ? defaultAccountId.trim() : undefined,
      baseUrl: baseUrl !== undefined ? baseUrl.trim() : undefined,
    });

    return NextResponse.json({
      success: saveResult.success,
      message: saveResult.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al guardar configuración de Zernio",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const result = await disconnectZernio();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error al desconectar la cuenta de Zernio",
      },
      { status: 500 }
    );
  }
}

