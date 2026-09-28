"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Car,
  HeartPulse,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Award,
  ShieldCheck,
  RefreshCw,
  Sliders,
  ChevronRight,
  User,
  Bot,
} from "lucide-react";
import { AUDIT_SCENARIOS, ConversationTurn, AuditEvaluationResult } from "@/lib/agent/audit-types";

interface BotAuditLabProps {
  currentPrompt: string;
  onApplyPrompt: (newPrompt: string) => void;
}

export default function BotAuditLab({ currentPrompt, onApplyPrompt }: BotAuditLabProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStatusText, setAuditStatusText] = useState("");
  const [liveTurns, setLiveTurns] = useState<Array<{ scenarioIndex: number; turn: ConversationTurn }>>([]);
  const [auditResult, setAuditResult] = useState<AuditEvaluationResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [selectedScenarioFilter, setSelectedScenarioFilter] = useState<number | "all">("all");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [appliedPromptSuccess, setAppliedPromptSuccess] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat cuando entran nuevos turnos en vivo
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [liveTurns]);

  const handleStartAudit = async () => {
    setIsAuditing(true);
    setAuditProgress(5);
    setAuditStatusText("Iniciando simulación entre agentes en vivo...");
    setLiveTurns([]);
    setAuditResult(null);
    setAuditError(null);
    setAppliedPromptSuccess(false);

    try {
      const res = await fetch("/api/agents/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrompt }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Error en el servidor de auditoría: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "turn") {
              setLiveTurns((prev) => [
                ...prev,
                { scenarioIndex: event.scenarioIndex, turn: event.turn },
              ]);
              if (event.progressPct) setAuditProgress(event.progressPct);
              if (event.statusText) setAuditStatusText(event.statusText);
            } else if (event.type === "evaluating") {
              setAuditProgress(event.progressPct || 90);
              setAuditStatusText(
                event.statusText || "El Juez Auditor (LLM-as-a-Judge) está evaluando y optimizando el prompt..."
              );
            } else if (event.type === "evaluation_complete") {
              setAuditProgress(100);
              setAuditResult(event.evaluation);
              setAuditStatusText("Auditoría completada exitosamente.");
            } else if (event.type === "error") {
              setAuditError(event.message || "Error durante la auditoría.");
            }
          } catch (e) {
            console.warn("Error parseando evento SSE:", e);
          }
        }
      }
    } catch (err: any) {
      setAuditError(err.message || "No se pudo conectar con el servicio de auditoría.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApply = () => {
    if (!auditResult?.proposedPrompt) return;
    onApplyPrompt(auditResult.proposedPrompt);
    setAppliedPromptSuccess(true);
    setTimeout(() => setAppliedPromptSuccess(false), 4000);
  };

  const handleCopyPrompt = () => {
    if (!auditResult?.proposedPrompt) return;
    navigator.clipboard.writeText(auditResult.proposedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const filteredTurns = liveTurns.filter((item) => {
    if (selectedScenarioFilter === "all") return true;
    return item.scenarioIndex === selectedScenarioFilter;
  });

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER DE AUDITORÍA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-indigo-900/50 shadow-md">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Laboratorio de Evaluación Multi-Agente • LLM-as-a-Judge</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Auditoría de Calidad y Calibración de Prompts
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Un <strong>Agente Simulador de Prospectos</strong> sostendrá conversaciones multi-turno profundas (5 a 6 turnos)
            con el bot de Seguros Campestre en 4 escenarios realistas. Posteriormente, un <strong>Juez Auditor Senior</strong> evaluará
            el desempeño en tiempo real y te presentará una propuesta de System Prompt optimizado.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartAudit}
              disabled={isAuditing}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Ejecutando Auditoría ({auditProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Iniciar Auditoría Completa (4 Escenarios)</span>
                </>
              )}
            </button>

            {auditResult && !isAuditing && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Auditoría finalizada • Score: {auditResult.overallScore}/100
              </span>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
      </div>

      {/* 2. ESCENARIOS A EVALUAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {AUDIT_SCENARIOS.map((sc, idx) => {
          const isCurrent = isAuditing && liveTurns.some((t) => t.scenarioIndex === idx);
          const isDone = liveTurns.some((t) => t.scenarioIndex === idx && t.turn.turnIndex >= sc.targetTurns * 2);

          return (
            <div
              key={sc.id}
              className={`p-4 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                  : isDone
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    sc.category === "auto"
                      ? "bg-blue-100 text-blue-700"
                      : sc.category === "gastos_medicos"
                      ? "bg-rose-100 text-rose-700"
                      : sc.category === "urgencia"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {sc.category === "auto" ? (
                    <Car className="w-4 h-4" />
                  ) : sc.category === "gastos_medicos" ? (
                    <HeartPulse className="w-4 h-4" />
                  ) : sc.category === "urgencia" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <HelpCircle className="w-4 h-4" />
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100">
                  {sc.targetTurns} turnos
                </span>
              </div>

              <h3 className="text-xs font-bold text-slate-900 leading-tight">{sc.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sc.description}</p>
              <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{sc.clientName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. BARRA DE PROGRESO EN VIVO */}
      {(isAuditing || auditResult) && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              {isAuditing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
              {auditStatusText || "Progreso de la Auditoría"}
            </span>
            <span className="font-mono font-bold text-indigo-600">{auditProgress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${auditProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 4. ERROR SI OCURRE */}
      {auditError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{auditError}</span>
        </div>
      )}

      {/* 5. VISOR DE DIÁLOGO EN VIVO */}
      {liveTurns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                Consola de Diálogo en Vivo ({filteredTurns.length} mensajes)
              </h3>
              <p className="text-[11px] text-slate-500">
                Observa cómo interactúan el cliente simulado y el bot turno a turno.
              </p>
            </div>

            {/* Filtros de Escenarios */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setSelectedScenarioFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedScenarioFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Todos
              </button>
              {AUDIT_SCENARIOS.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenarioFilter(i)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    selectedScenarioFilter === i
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {i + 1}. {sc.clientName.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={chatContainerRef}
            className="p-4 sm:p-6 max-h-[380px] overflow-y-auto space-y-3.5 bg-slate-50/40"
          >
            {filteredTurns.map((item, idx) => {
              const isClient = item.turn.sender === "client";

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-medium text-slate-400">
                    <span className={`font-bold ${isClient ? "text-slate-700" : "text-indigo-600"}`}>
                      {item.turn.senderName}
                    </span>
                    <span>• Turno {item.turn.turnIndex}</span>
                  </div>

                  <div
                    className={`max-w-xl rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                      isClient
                        ? "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                        : "bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{item.turn.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. RESULTADOS DEL JUEZ AUDITOR (LLM-as-a-Judge) */}
      {auditResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Card Principal de Calificación */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex flex-col items-center justify-center shadow-md shadow-indigo-600/20">
                  <span className="text-2xl font-black">{auditResult.overallScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">Score</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Evaluación General del Bot</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        auditResult.overallScore >= 85
                          ? "bg-emerald-100 text-emerald-800"
                          : auditResult.overallScore >= 70
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {auditResult.overallScore >= 85 ? "Sobresaliente" : auditResult.overallScore >= 70 ? "Bueno (Mejorable)" : "Requiere Calibración"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    {auditResult.summary}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-w-[130px]">
                  <span className="text-[10px] text-slate-500 font-semibold block">Empatía y Tono</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.empathyScore}/100</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-w-[130px]">
                  <span className="text-[10px] text-slate-500 font-semibold block">Precisión Técnica</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.technicalAccuracyScore}/100</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-w-[130px]">
                  <span className="text-[10px] text-slate-500 font-semibold block">Formato Canal</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.channelFormatScore}/100</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-w-[130px]">
                  <span className="text-[10px] text-slate-500 font-semibold block">Calificación Lead</span>
                  <span className="text-base font-bold text-slate-900">{auditResult.leadQualificationScore}/100</span>
                </div>
              </div>
            </div>

            {/* Desglose de Fortalezas, Oportunidades y Recomendaciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Fortalezas Observadas
                </h4>
                <ul className="space-y-1.5">
                  {auditResult.strengths.map((str, i) => (
                    <li key={i} className="text-[11px] text-emerald-800 leading-snug flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Puntos a Mejorar
                </h4>
                <ul className="space-y-1.5">
                  {auditResult.weaknesses.map((wk, i) => (
                    <li key={i} className="text-[11px] text-amber-800 leading-snug flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{wk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/80">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Recomendaciones Clave
                </h4>
                <ul className="space-y-1.5">
                  {auditResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-indigo-800 leading-snug flex items-start gap-1.5">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 7. COMPARATIVA DE PROMPTS Y BOTÓN DE APLICAR MEJORAS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Propuesta de Mejora al System Prompt
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  El Juez Auditor integró las correcciones para solventar las debilidades observadas en los 4 escenarios.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-xs"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedPrompt ? "Copiado" : "Copiar"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  {appliedPromptSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-emerald-200" />}
                  <span>{appliedPromptSuccess ? "¡Mejoras Aplicadas con Éxito!" : "Aplicar Mejoras al Bot"}</span>
                </button>
              </div>
            </div>

            {appliedPromptSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>El nuevo System Prompt ha sido guardado y activado directamente en la configuración del bot.</span>
              </div>
            )}

            {/* Comparativa Lado a Lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                  <span>Prompt Actual</span>
                  <span className="text-[10px] text-slate-400 font-mono">{currentPrompt.length} caracteres</span>
                </div>
                <textarea
                  readOnly
                  rows={14}
                  value={currentPrompt}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 px-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Prompt Propuesto por el Juez (Optimizado)
                  </span>
                  <span className="text-[10px] text-indigo-500 font-mono">{auditResult.proposedPrompt.length} caracteres</span>
                </div>
                <textarea
                  readOnly
                  rows={14}
                  value={auditResult.proposedPrompt}
                  className="w-full p-3.5 bg-indigo-50/40 border-2 border-indigo-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none leading-relaxed shadow-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
