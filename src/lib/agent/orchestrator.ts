import fs from "fs";
import path from "path";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema/messaging";
import { eq, desc } from "drizzle-orm";
import { getFreshAiConfig } from "./config";
import { searchKnowledgeBase } from "@/lib/knowledge/rag-service";
import { sendZernioOutboundMessage } from "@/lib/zernio/inbox-service";
import { isBotActiveForChannel, getUnifiedBotConfig } from "./bot-settings";

/**
 * Carga el prompt base específico del canal o usa el prompt maestro
 */
function getChannelPrompt(channel: string): string {
  try {
    const promptPath = path.resolve(process.cwd(), "src", "lib", "agent", "prompts", `${channel}.prompt.txt`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, "utf-8").trim();
    }
  } catch (err) {
    console.warn(`[Agent Orchestrator] No se pudo leer prompt para canal ${channel}:`, err);
  }

  return `Eres el Asistente Virtual Oficial de Seguros Campestre.
Te especializas en protección patrimonial y seguros (gastos médicos mayores, automóviles, vida y daños).
Ayudas a prospectos a cotizar pólizas, coordinar citas con asesores patrimoniales y resolver dudas frecuentes.
Sé cordial, conciso, empático y profesional.`;
}

/**
 * Realiza la llamada HTTP a OpenRouter con soporte para reintento con modelo de respaldo
 */
async function callOpenRouterChat(
  model: string,
  fallbackModel: string,
  apiKey: string,
  systemPrompt: string,
  chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const modelsToTry = [model, fallbackModel].filter(Boolean);
  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[Agent Orchestrator] Consultando modelo OpenRouter: ${currentModel}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Seguros Campestre CRM",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`OpenRouter HTTP ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      const msg = data.choices?.[0]?.message;
      let reply = msg?.content?.trim() || "";
      if (!reply && msg?.reasoning) {
        reply = msg.reasoning.trim();
      }
      if (!reply && data.choices?.[0]?.text) {
        reply = data.choices[0].text.trim();
      }

      if (reply) {
        return reply;
      }
      throw new Error("Respuesta vacía recibida del modelo.");
    } catch (err: any) {
      console.warn(`[Agent Orchestrator] Falló intento con modelo ${currentModel}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo generar respuesta con ninguno de los modelos configurados.");
}

/**
 * Orquesta la respuesta automática del agente de IA para un mensaje entrante
 */
export async function triggerAiResponse(conversationId: string, incomingUserMessage: string): Promise<void> {
  try {
    // 1. Obtener la conversación actualizada
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      console.warn(`[Agent Orchestrator] Conversación ${conversationId} no encontrada.`);
      return;
    }

    // 2. Validar si la IA está activa y si no requiere intervención humana exclusiva
    if (!conversation.aiEnabled || conversation.needsHuman) {
      console.log(`[Agent Orchestrator] IA inactiva o conversación asignada a humano (${conversationId}).`);
      return;
    }

    const channel = conversation.channel || "whatsapp";

    // Validar si el bot está encendido globalmente y para este canal específico
    const isChannelActive = await isBotActiveForChannel(channel);
    if (!isChannelActive) {
      console.log(`[Agent Orchestrator] Bot desactivado globalmente o para canal ${channel}. Omitiendo respuesta.`);
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("[Agent Orchestrator] OPENROUTER_API_KEY no configurada.");
      return;
    }

    const botConfig = await getUnifiedBotConfig();
    const aiConfig = getFreshAiConfig();
    const selectedModel = botConfig.model || aiConfig.model;
    const selectedFallback = botConfig.fallbackModel || aiConfig.fallbackModel;

    // 3. Cargar historial reciente de la conversación para contexto
    // IMPORTANTE: Ordenar DESCendente para tomar los más recientes y luego invertir a cronológico
    const historyRowsRaw = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.sentAt))
      .limit(10);

    const historyRows = historyRowsRaw.reverse();

    // Filtro de frescura de sesión: Si los mensajes previos son de hace más de 24 horas,
    // evitamos contaminar un nuevo saludo con temas obsoletos de días anteriores.
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const freshHistoryRows = historyRows.filter((msg) => {
      const msgTime = new Date(msg.sentAt).getTime();
      return nowMs - msgTime < TWENTY_FOUR_HOURS_MS;
    });

    const formattedHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const msg of freshHistoryRows) {
      if (!msg.body || msg.body.startsWith("[Archivo")) continue;
      const role = msg.direction === "inbound" ? "user" : "assistant";
      formattedHistory.push({
        role,
        content: msg.body,
      });
    }

    // Si el último mensaje del historial no es el mensaje actual, lo añadimos
    const lastMsg = formattedHistory[formattedHistory.length - 1];
    if (!lastMsg || lastMsg.content !== incomingUserMessage) {
      formattedHistory.push({ role: "user", content: incomingUserMessage });
    }

    // 4. Búsqueda de información semántica en la Base de Conocimiento (RAG)
    let ragContext = "";
    try {
      const matches = await searchKnowledgeBase(incomingUserMessage, 3, 0.35);
      if (matches.length > 0) {
        ragContext = `\n\n--- INFORMACIÓN DE LA BASE DE CONOCIMIENTOS OFICIAL (Usa estos datos prioritariamente para responder con precisión) ---\n` +
          matches.map((m, i) => `[Documento: ${m.filename} - Fragmento ${i + 1}]:\n${m.content}`).join("\n\n");
      }
    } catch (ragErr) {
      console.warn("[Agent Orchestrator] Error en consulta RAG:", ragErr);
    }

    // 5. Detectar solicitud explícita de asesor humano
    const humanKeywords = /\b(humano|persona|asesor|agente humano|hablar con alguien|ejecutivo)\b/i;
    const requestsHuman = humanKeywords.test(incomingUserMessage);

    // 6. Construir prompt del sistema
    const basePrompt = botConfig.systemPrompt || getChannelPrompt(channel);
    const clientName = conversation.participantName || "Cliente";

    const systemPrompt = `${basePrompt}

DATOS DE LA SESIÓN:
- Nombre del Prospecto / Cliente: ${clientName}
- Canal de Comunicación: ${channel.toUpperCase()}

REGLAS DE ACTUACIÓN:
1. Responde de forma amable y concisa según el estilo del canal.
2. Si el cliente solicita explícitamente hablar con una persona, confirma con empatía que has canalizado su solicitud a un asesor de Seguros Campestre y que se comunicará en breve.
3. Si el usuario te pregunta por precios, coberturas, requisitos o deducibles, básate en la información provista.
${ragContext}`;

    // 7. Llamar a OpenRouter
    const aiResponseText = await callOpenRouterChat(
      selectedModel,
      selectedFallback,
      apiKey,
      systemPrompt,
      formattedHistory
    );

    if (!aiResponseText) {
      console.warn("[Agent Orchestrator] OpenRouter devolvió texto vacío.");
      return;
    }

    // 8. Si solicitó humano, marcar la conversación para hand-off
    if (requestsHuman) {
      await db
        .update(conversations)
        .set({
          needsHuman: true,
          needsHumanReason: "Solicitado por el cliente",
          aiEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
      console.log(`[Agent Orchestrator] Conversación ${conversationId} transferida a humano.`);
    }

    // 9. Despachar el mensaje de respuesta de la IA
    await sendZernioOutboundMessage({
      conversationId,
      text: aiResponseText,
      senderType: "ai",
    });

    console.log(`[Agent Orchestrator] Respuesta de IA enviada a conversación ${conversationId}`);
  } catch (err: any) {
    console.error(`[Agent Orchestrator Error en conversación ${conversationId}]:`, err);
  }
}
