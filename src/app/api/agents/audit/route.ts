import { NextRequest } from "next/server";
import {
  AUDIT_SCENARIOS,
  runScenarioSimulation,
  evaluateAllTranscripts,
  ScenarioTranscript,
  ConversationTurn,
} from "@/lib/agent/audit-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const currentPrompt =
      body.currentPrompt ||
      `Eres el Asistente Virtual Oficial y Calificador de Seguros Campestre en WhatsApp.
Tu objetivo es atender amablemente, calificar prospectos en seguros (auto, GMM, vida), invitar a agendar con un asesor y transferir inmediatamente ante siniestros o a solicitud del cliente.`;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: any) {
          const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        try {
          const allTranscripts: ScenarioTranscript[] = [];
          const totalScenarios = AUDIT_SCENARIOS.length;

          sendEvent("init", {
            totalScenarios,
            scenarios: AUDIT_SCENARIOS.map((s) => ({
              id: s.id,
              title: s.title,
              clientName: s.clientName,
              category: s.category,
            })),
          });

          for (let sIdx = 0; sIdx < totalScenarios; sIdx++) {
            const scenario = AUDIT_SCENARIOS[sIdx];

            sendEvent("scenario_start", {
              scenarioIndex: sIdx,
              totalScenarios,
              scenarioId: scenario.id,
              title: scenario.title,
              clientName: scenario.clientName,
            });

            let turnCounter = 0;

            const transcript = await runScenarioSimulation(
              scenario,
              currentPrompt,
              (turn: ConversationTurn) => {
                turnCounter++;
                const approxProgress = Math.min(
                  85,
                  Math.round(((sIdx * 5 + Math.min(turnCounter, 5)) / (totalScenarios * 5)) * 85)
                );

                sendEvent("turn", {
                  scenarioIndex: sIdx,
                  scenarioId: scenario.id,
                  turn,
                  progressPct: approxProgress,
                  statusText: `Evaluando Escenario ${sIdx + 1}/${totalScenarios}: ${scenario.clientName} (Turno ${turn.turnIndex})`,
                });
              }
            );

            allTranscripts.push(transcript);
          }

          // Fase 2: Evaluación con LLM-as-a-Judge
          sendEvent("evaluating", {
            progressPct: 90,
            statusText: "El Juez Auditor (LLM-as-a-Judge) está analizando las 4 conversaciones y generando la propuesta de prompt...",
          });

          const evaluation = await evaluateAllTranscripts(allTranscripts, currentPrompt);

          sendEvent("evaluation_complete", {
            evaluation,
            transcripts: allTranscripts,
            progressPct: 100,
            statusText: "Auditoría completada exitosamente.",
          });

          sendEvent("done", { success: true });
          controller.close();
        } catch (err: any) {
          console.error("[Audit API Stream Error]:", err);
          sendEvent("error", { message: err.message || "Error durante la auditoría del bot." });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[Audit API Route Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
