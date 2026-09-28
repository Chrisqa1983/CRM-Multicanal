import { NextRequest, NextResponse } from "next/server";
import { verifyZernioWebhookSignature } from "@/lib/zernio/client";
import { processIncomingZernioWebhook } from "@/lib/zernio/inbox-service";
import { triggerAiResponse } from "@/lib/agent/orchestrator";

/**
 * Webhook unificado de Zernio para eventos de WhatsApp, Instagram y Facebook
 * Cumple con el SLA de respuesta < 150 ms especificado en la arquitectura
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-zernio-signature") || request.headers.get("x-hub-signature-256");

    // En desarrollo o modo simulación permitimos si no hay firma estricta configurada
    const hasSecret = Boolean(process.env.ZERNIO_WEBHOOK_SECRET);
    if (hasSecret && signatureHeader) {
      const isValid = verifyZernioWebhookSignature(rawBody, signatureHeader);
      if (!isValid) {
        console.warn("[Zernio Webhook] Firma HMAC inválida recibida.");
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const eventId = payload.id || payload.event_id || payload.eventId || `evt_${Date.now()}`;
    const eventType = payload.type || payload.event || "message.received";

    // Procesar y persistir en la base de datos de manera inmediata
    const ingestResult = await processIncomingZernioWebhook(payload);

    // Disparar orquestador de IA para mensajes entrantes (desacoplado en segundo plano)
    if (ingestResult.success && ingestResult.conversationId && ingestResult.isInboundText && ingestResult.incomingText) {
      triggerAiResponse(ingestResult.conversationId, ingestResult.incomingText).catch((err) => {
        console.error("[Zernio Webhook] Error en orquestador de IA:", err);
      });
    }

    console.log(
      `[Zernio Webhook] Evento procesado [${eventType}] ID: ${eventId} en ${Date.now() - startTime}ms`,
      ingestResult
    );

    return NextResponse.json({
      received: true,
      eventId,
      ingestResult,
      processedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error("[Zernio Webhook Error]:", error);
    return NextResponse.json(
      { error: "Error al procesar webhook", details: error.message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    gateway: "Zernio Webhook Listener",
    timestamp: new Date().toISOString(),
  });
}
