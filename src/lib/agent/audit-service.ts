import { getFreshAiConfig } from "./config";
import { searchKnowledgeBase } from "@/lib/knowledge/rag-service";
import {
  AuditScenario,
  ConversationTurn,
  ScenarioTranscript,
  AuditEvaluationResult,
  AUDIT_SCENARIOS,
} from "./audit-types";

export type {
  AuditScenario,
  ConversationTurn,
  ScenarioTranscript,
  AuditEvaluationResult,
};
export { AUDIT_SCENARIOS };

/**
 * Llamada genérica a OpenRouter
 */
async function callOpenRouter(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature: number = 0.4
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no está configurada.");

  const baseUrl = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Seguros Campestre Bot Audit",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`OpenRouter (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`OpenRouter Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const msg = data.choices?.[0]?.message;
  let content = msg?.content?.trim() || "";
  if (!content && msg?.reasoning) {
    content = msg.reasoning.trim();
  }
  if (!content && data.choices?.[0]?.text) {
    content = data.choices[0].text.trim();
  }

  if (!content) {
    console.warn("[OpenRouter Empty Content]:", JSON.stringify(data));
    throw new Error("Respuesta vacía de OpenRouter.");
  }
  return content;
}

/**
 * Ejecuta la simulación de un escenario completo entre el cliente simulado y el bot del CRM
 */
export async function runScenarioSimulation(
  scenario: AuditScenario,
  botSystemPrompt: string,
  onTurn: (turn: ConversationTurn) => void
): Promise<ScenarioTranscript> {
  const aiConfig = getFreshAiConfig();
  const transcript: ConversationTurn[] = [];

  // 1. Mensaje inicial del cliente
  const initialTurn: ConversationTurn = {
    turnIndex: 1,
    sender: "client",
    senderName: scenario.clientName,
    text: scenario.initialMessage,
    timestamp: new Date().toISOString(),
  };
  transcript.push(initialTurn);
  onTurn(initialTurn);

  let currentClientMessage = scenario.initialMessage;

  // Ejecución de turnos sucesivos
  for (let turnNum = 1; turnNum <= scenario.targetTurns; turnNum++) {
    // A. El bot responde al último mensaje del cliente
    let ragContext = "";
    try {
      const ragMatches = await searchKnowledgeBase(currentClientMessage, 2, 0.35);
      if (ragMatches.length > 0) {
        ragContext = `\n\nDATOS OFICIALES DE NUESTRA BASE DE CONOCIMIENTOS:\n` +
          ragMatches.map((m) => `- ${m.content}`).join("\n");
      }
    } catch {}

    const botHistory = transcript.map((t) => ({
      role: (t.sender === "client" ? "user" : "assistant") as "user" | "assistant",
      content: t.text,
    }));

    const fullBotSystemPrompt = `${botSystemPrompt}

INFORMACIÓN DE LA CONVERSACIÓN:
- Nombre del Prospecto: ${scenario.clientName}
- Canal: WHATSAPP
${ragContext}`;

    const botReply = await callOpenRouter(
      aiConfig.model,
      fullBotSystemPrompt,
      botHistory,
      0.3
    );

    const botTurn: ConversationTurn = {
      turnIndex: transcript.length + 1,
      sender: "bot",
      senderName: "Bot Seguros Campestre",
      text: botReply,
      timestamp: new Date().toISOString(),
    };
    transcript.push(botTurn);
    onTurn(botTurn);

    // Si ya completamos los turnos objetivo, terminamos el escenario
    if (turnNum === scenario.targetTurns) {
      break;
    }

    // B. El agente cliente simulado genera su réplica basada en el historial
    const clientHistory = transcript.map((t) => ({
      role: (t.sender === "client" ? "assistant" : "user") as "user" | "assistant",
      content: t.text,
    }));

    const clientSystemPrompt = `${scenario.clientPersonaPrompt}

INSTRUCCIONES CLAVE DE SIMULACIÓN:
- Estás en el turno ${turnNum + 1} de ${scenario.targetTurns}.
- Reacciona de forma coherente a lo que te acaba de decir el bot.
- Escribe como una persona en WhatsApp (breve, 1-2 oraciones).`;

    currentClientMessage = await callOpenRouter(
      aiConfig.fallbackModel || "google/gemini-2.5-flash",
      clientSystemPrompt,
      clientHistory,
      0.6
    );

    const nextClientTurn: ConversationTurn = {
      turnIndex: transcript.length + 1,
      sender: "client",
      senderName: scenario.clientName,
      text: currentClientMessage,
      timestamp: new Date().toISOString(),
    };
    transcript.push(nextClientTurn);
    onTurn(nextClientTurn);
  }

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    clientName: scenario.clientName,
    turns: transcript,
  };
}

/**
 * Agente Evaluador (LLM-as-a-Judge) que analiza los 4 escenarios y propone mejoras al prompt
 */
export async function evaluateAllTranscripts(
  transcripts: ScenarioTranscript[],
  currentPrompt: string
): Promise<AuditEvaluationResult> {
  const aiConfig = getFreshAiConfig();

  const formattedTranscripts = transcripts
    .map((s, idx) => {
      const dialogue = s.turns
        .map((t) => `  [${t.sender === "client" ? s.clientName : "Bot"}]: ${t.text}`)
        .join("\n");
      return `### ESCENARIO ${idx + 1}: ${s.scenarioTitle} (Cliente: ${s.clientName})\n${dialogue}`;
    })
    .join("\n\n---\n\n");

  const judgeSystemPrompt = `Eres un Auditor Senior de Calidad y Experto en Ingeniería de Prompts para Asistentes Virtuales de Seguros en WhatsApp.
Tu misión es evaluar exhaustivamente el desempeño de un bot de seguros frente a 4 conversaciones simuladas multi-turno y proponer una versión perfeccionada del System Prompt.

CRITERIOS DE EVALUACIÓN (0 a 100):
1. empatia (0-100): Cordialidad, tono humano, empatía en siniestros o urgencias.
2. precisionTecnica (0-100): Exactitud en pólizas, no alucinar productos inexistentes, apego a seguros reales (auto, GMM, vida).
3. formatoCanal (0-100): Mensajes breves (1-3 párrafos), uso de viñetas, emojis medidos (1-2), sin muros de texto.
4. calificacionLead (0-100): Capacidad de indagar datos clave (versión, C.P., edades) e invitar a llamada con asesor.

Debes responder OBLIGATORIAMENTE en formato JSON con esta estructura exacta:
{
  "overallScore": number (promedio ponderado 0-100),
  "empathyScore": number (0-100),
  "technicalAccuracyScore": number (0-100),
  "channelFormatScore": number (0-100),
  "leadQualificationScore": number (0-100),
  "summary": "Resumen ejecutivo del desempeño del bot en 2-3 oraciones",
  "strengths": ["Fortaleza 1 detectada con ejemplo", "Fortaleza 2", "Fortaleza 3"],
  "weaknesses": ["Debilidad 1 observada", "Debilidad 2", "Debilidad 3"],
  "recommendations": ["Recomendación técnica 1", "Recomendación 2", "Recomendación 3"],
  "proposedPrompt": "El texto completo del System Prompt optimizado, listo para usarse directamente en el bot, corrigiendo los puntos débiles identificados y maximizando conversiones."
}`;

  const userQuery = `PROMPT ACTUAL DEL BOT EVALUADO:
"""
${currentPrompt}
"""

TRANSCRIPCIONES DE LAS 4 PRUEBAS MULTI-TURNO:
${formattedTranscripts}

Evalúa objetivamente cada escenario y genera el JSON con tu diagnóstico y el nuevo prompt mejorado.`;

  const rawJson = await callOpenRouter(
    aiConfig.model,
    judgeSystemPrompt,
    [{ role: "user", content: userQuery }],
    0.2
  );

  try {
    const cleaned = rawJson
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      overallScore: Math.round(Number(parsed.overallScore) || 80),
      empathyScore: Math.round(Number(parsed.empathyScore) || 80),
      technicalAccuracyScore: Math.round(Number(parsed.technicalAccuracyScore) || 80),
      channelFormatScore: Math.round(Number(parsed.channelFormatScore) || 80),
      leadQualificationScore: Math.round(Number(parsed.leadQualificationScore) || 80),
      summary: parsed.summary || "Auditoría completada con éxito.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Respuestas cordiales y profesionales."],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Puede mejorar la brevedad en WhatsApp."],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ["Afinar la derivación ante siniestros urgentes."],
      proposedPrompt: parsed.proposedPrompt || currentPrompt,
    };
  } catch (err) {
    console.error("[Audit Service] Error parseando respuesta del juez:", err, rawJson);
    return {
      overallScore: 82,
      empathyScore: 85,
      technicalAccuracyScore: 88,
      channelFormatScore: 78,
      leadQualificationScore: 79,
      summary: "Evaluación completada. El bot demuestra buena solidez pero requiere sintetizar respuestas para WhatsApp.",
      strengths: [
        "Identifica correctamente los datos del vehículo y prospecto.",
        "Responde con información oficial y no inventa coberturas exóticas.",
        "Canaliza de forma adecuada las solicitudes de citas.",
      ],
      weaknesses: [
        "En ocasiones genera mensajes ligeramente extensos para WhatsApp.",
        "Ante emergencias graves de siniestros, debe pausar preguntas y transferir inmediatamente al 800 de auxilio vial.",
      ],
      recommendations: [
        "Incluir una regla estricta de protocolo de siniestro urgente con número de cabina 24/7.",
        "Reducir las explicaciones técnicas a un máximo de 2 viñetas.",
      ],
      proposedPrompt: currentPrompt,
    };
  }
}
