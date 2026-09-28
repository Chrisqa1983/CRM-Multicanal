"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Save,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Instagram,
  Facebook,
  AlertCircle,
  ExternalLink,
  Sliders,
  Zap,
  ShieldCheck,
  Check,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import BotAuditLab from "@/components/agents/bot-audit-lab";

interface UnifiedBotConfig {
  enabled: boolean;
  model: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  debounceSeconds: number;
  systemPrompt: string;
  channelOverrides: {
    whatsapp: { enabled: boolean };
    instagram: { enabled: boolean };
    facebook: { enabled: boolean };
  };
}

interface ZernioAccount {
  id: string;
  platform: "whatsapp" | "instagram" | "facebook" | string;
  displayName: string;
  username?: string;
  status: "active" | "inactive" | string;
  profilePicture?: string;
  phone?: string;
  isActive?: boolean;
  platformStatus?: string;
}

interface ModelValidationState {
  valid: boolean;
  name?: string;
  message?: string;
  suggestions?: string[];
  isValidating?: boolean;
}

const DEFAULT_UNIFIED_CONFIG: UnifiedBotConfig = {
  enabled: true,
  model: "google/gemini-2.5-flash",
  fallbackModel: "openai/gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 600,
  debounceSeconds: 5,
  systemPrompt: `Eres el Asistente Virtual Oficial y Calificador de Seguros Campestre.

TU MISIÓN PRINCIPAL:
1. Brindar atención rápida, confiable, empática y profesional a prospectos y clientes.
2. Identificar y calificar la necesidad de seguro del usuario:
   - Ramo: Auto, Gastos Médicos Mayores, Vida, Hogar o Negocio.
   - Datos clave: Nombre del prospecto, modelo de vehículo o cobertura buscada, urgencia.
3. Responder dudas frecuentes y coberturas de acuerdo a la información oficial de la aseguradora.
4. Invitar cordialmente a agendar una llamada o cita de asesoría personalizada con un asesor especialista.
5. Si el cliente solicita explícitamente hablar con una persona, o si se trata de un siniestro urgente, notificar cordialmente que un asesor humano del equipo se comunicará de inmediato.

ADAPTACIÓN POR CANAL:
- En WhatsApp: Sé conciso y claro (máximo 2 párrafos breves), usando viñetas para desglosar opciones y 1-2 emojis sutiles.
- En Instagram Direct: Mantén un tono amigable, cálido y dinámico, guiando al usuario con preguntas breves.
- En Facebook Messenger: Utiliza una estructura formal y resolutiva.

REGLAS DE SEGURIDAD:
- No inventes coberturas ni precios exactos si no están confirmados; invita cordialmente a una llamada con un asesor.
- Nunca solicites números de tarjeta de crédito o contraseñas por chat.`,
  channelOverrides: {
    whatsapp: { enabled: true },
    instagram: { enabled: true },
    facebook: { enabled: true },
  },
};



export default function UnifiedAgentPage() {
  const [activeTab, setActiveTab] = useState<"config" | "audit">("config");
  const [config, setConfig] = useState<UnifiedBotConfig>(DEFAULT_UNIFIED_CONFIG);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Estados de validación en tiempo real de OpenRouter
  const [modelValidation, setModelValidation] = useState<ModelValidationState | null>(null);
  const [fallbackValidation, setFallbackValidation] = useState<ModelValidationState | null>(null);

  const modelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar configuración guardada en el servidor y localStorage
  useEffect(() => {
    async function loadBotConfig() {
      try {
        const res = await fetch("/api/settings/bot");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setConfig((prev) => ({
              ...prev,
              ...data.config,
              channelOverrides: {
                ...prev.channelOverrides,
                ...(data.config.channelOverrides || {}),
              },
            }));
            localStorage.setItem("crm_unified_bot_settings", JSON.stringify(data.config));
            return;
          }
        }
      } catch (err) {
        console.warn("No se pudo cargar la configuración del bot desde el servidor:", err);
      }

      try {
        const saved = localStorage.getItem("crm_unified_bot_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig((prev) => ({
            ...prev,
            ...parsed,
            channelOverrides: {
              ...prev.channelOverrides,
              ...(parsed.channelOverrides || {}),
            },
          }));
        }
      } catch (e) {
        console.warn("No se pudo leer la configuración local:", e);
      }
    }

    loadBotConfig();
  }, []);

  // Función para validar un modelo específico vía API
  const validateModelName = useCallback(async (modelName: string, isFallback: boolean) => {
    if (!modelName.trim()) {
      const state = { valid: false, message: "El ID del modelo no puede estar vacío." };
      if (isFallback) setFallbackValidation(state);
      else setModelValidation(state);
      return;
    }

    if (isFallback) setFallbackValidation((prev) => ({ ...(prev || { valid: true }), isValidating: true }));
    else setModelValidation((prev) => ({ ...(prev || { valid: true }), isValidating: true }));

    try {
      const res = await fetch("/api/settings/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const state: ModelValidationState = {
          valid: Boolean(data.result.valid),
          name: data.result.name,
          message: data.result.message,
          suggestions: data.result.suggestions,
          isValidating: false,
        };
        if (isFallback) setFallbackValidation(state);
        else setModelValidation(state);
      }
    } catch (err) {
      console.warn("Error al validar modelo:", err);
      const state: ModelValidationState = { valid: true, isValidating: false };
      if (isFallback) setFallbackValidation(state);
      else setModelValidation(state);
    }
  }, []);

  // Consultar estado en vivo de cuentas vinculadas a Zernio y modelos desde .env
  const fetchAccounts = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch("/api/settings/zernio");
      const data = await res.json();
      if (data.success && data.ping && Array.isArray(data.ping.accounts)) {
        setAccounts(data.ping.accounts);
      } else if (Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        setAccounts([]);
      }

      // Sincronizar automáticamente modelos de IA desde .env
      if (data.ai) {
        setConfig((prev) => {
          const updated = {
            ...prev,
            model: data.ai.model || prev.model,
            fallbackModel: data.ai.fallbackModel || prev.fallbackModel,
          };
          try {
            localStorage.setItem("crm_unified_bot_settings", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        // Aplicar validaciones devueltas por el servidor
        if (data.ai.validation) {
          if (data.ai.validation.model) {
            setModelValidation({
              valid: data.ai.validation.model.valid,
              name: data.ai.validation.model.name,
              message: data.ai.validation.model.message,
              suggestions: data.ai.validation.model.suggestions,
              isValidating: false,
            });
          }
          if (data.ai.validation.fallbackModel) {
            setFallbackValidation({
              valid: data.ai.validation.fallbackModel.valid,
              name: data.ai.validation.fallbackModel.name,
              message: data.ai.validation.fallbackModel.message,
              suggestions: data.ai.validation.fallbackModel.suggestions,
              isValidating: false,
            });
          }
        }

        if (isManual) {
          const isPrimaryValid = data.ai.validation?.model?.valid ?? true;
          const isFallbackValid = data.ai.validation?.fallbackModel?.valid ?? true;

          if (!isPrimaryValid || !isFallbackValid) {
            setErrorMessage(
              `⚠️ Advertencia: ${
                !isPrimaryValid ? `El modelo principal "${data.ai.model}"` : ""
              } ${!isPrimaryValid && !isFallbackValid ? "y " : ""}${
                !isFallbackValid ? `el modelo de respaldo "${data.ai.fallbackModel}"` : ""
              } no existen en el catálogo de OpenRouter. Por favor corrígelos.`
            );
            setTimeout(() => setErrorMessage(null), 8000);
          } else {
            setSyncMessage(
              `Modelos verificados con OpenRouter y sincronizados desde .env (Principal: ${data.ai.model} • Fallback: ${data.ai.fallbackModel})`
            );
            setTimeout(() => setSyncMessage(null), 5000);
          }
        }
      }
    } catch (err) {
      console.error("Error al consultar cuentas y modelos de Zernio:", err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Detectar solo redes que están conectadas y activas en Zernio
  const activeAccountsMap = useMemo(() => {
    const map = new Map<"whatsapp" | "instagram" | "facebook", ZernioAccount>();
    for (const acc of accounts) {
      const plat = acc.platform?.toLowerCase() as "whatsapp" | "instagram" | "facebook";
      if (!["whatsapp", "instagram", "facebook"].includes(plat)) continue;

      const isAccActive =
        acc.status === "active" ||
        acc.status === "connected" ||
        acc.platformStatus === "active" ||
        acc.isActive === true;

      if (isAccActive) {
        if (!map.has(plat) || (acc.displayName && !map.get(plat)?.displayName)) {
          map.set(plat, acc);
        }
      }
    }
    return map;
  }, [accounts]);

  const connectedChannels = useMemo(() => {
    return (["whatsapp", "instagram", "facebook"] as const).filter((channel) =>
      activeAccountsMap.has(channel)
    );
  }, [activeAccountsMap]);

  // Actualizar configuración
  const handleUpdate = <K extends keyof UnifiedBotConfig>(field: K, value: UnifiedBotConfig[K]) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
    setErrorMessage(null);

    // Validación interactiva con debounce
    if (field === "model" && typeof value === "string") {
      if (modelTimerRef.current) clearTimeout(modelTimerRef.current);
      modelTimerRef.current = setTimeout(() => {
        validateModelName(value, false);
      }, 500);
    } else if (field === "fallbackModel" && typeof value === "string") {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        validateModelName(value, true);
      }, 500);
    }
  };

  // Persistir configuración en el servidor y localStorage
  const persistToServer = async (newConfig: UnifiedBotConfig) => {
    try {
      localStorage.setItem("crm_unified_bot_settings", JSON.stringify(newConfig));
      const res = await fetch("/api/settings/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: newConfig }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Error guardando en el servidor:", e);
    }
  };

  // Toggle maestro del bot
  const handleToggleMaster = async (newEnabled: boolean) => {
    const updated = { ...config, enabled: newEnabled };
    setConfig(updated);
    await persistToServer(updated);
  };

  // Toggle de activación del bot por canal específico
  const handleToggleChannel = async (channel: "whatsapp" | "instagram" | "facebook") => {
    const updated = {
      ...config,
      channelOverrides: {
        ...config.channelOverrides,
        [channel]: {
          enabled: !config.channelOverrides[channel]?.enabled,
        },
      },
    };
    setConfig(updated);
    setIsSaved(false);
    await persistToServer(updated);
  };

  // Guardar configuración con validación estricta
  const handleSave = async () => {
    if (modelValidation && !modelValidation.valid) {
      setErrorMessage(`No se puede guardar: El modelo principal "${config.model}" es inválido.`);
      return;
    }

    if (fallbackValidation && !fallbackValidation.valid) {
      setErrorMessage(`No se puede guardar: El modelo de respaldo "${config.fallbackModel}" es inválido.`);
      return;
    }

    try {
      await persistToServer(config);
      setIsSaved(true);
      setErrorMessage(null);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e: any) {
      setErrorMessage("Error al guardar en el servidor: " + e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header Principal */}
      <header className="p-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            Ajustes de Bot
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cerebro unificado de Inteligencia Artificial para prospectar y calificar pólizas en todas tus redes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAccounts(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-60"
            title="Refrescar estado en vivo de las redes y validar modelos en OpenRouter"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Actualizar Redes</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-all shadow-sm"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {isSaved ? "Guardado Exitosamente" : "Guardar Cambios"}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 sticky top-[73px] z-10 shadow-xs">
        <div className="flex items-center gap-6 max-w-5xl">
          <button
            onClick={() => setActiveTab("config")}
            className={`py-3.5 px-1 border-b-2 font-semibold text-xs flex items-center gap-2 transition-all ${
              activeTab === "config"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Configuración del Bot</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3.5 px-1 border-b-2 font-semibold text-xs flex items-center gap-2 transition-all ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Auditoría de Calidad (Agente vs. Agente)</span>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              Lab
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-5xl space-y-6 pb-16">
        {activeTab === "config" ? (
          <>
        {/* Banner de Sincronización Exitosa */}
        {syncMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Banner de Error en Modelo */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-900 text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. SECCIÓN: DESPLIEGUE EN REDES SOCIALES CONECTADAS */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                Despliegue del Bot por Red Social
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detecta automáticamente tus redes activas en Zernio. Activa o pausa las respuestas automáticas para cada canal.
              </p>
            </div>

            {/* Interruptor Maestro Global */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Estado Maestro del Bot:</span>
              <button
                type="button"
                onClick={() => handleToggleMaster(!config.enabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.enabled ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${config.enabled ? "text-indigo-600" : "text-slate-400"}`}>
                {config.enabled ? "Encendido" : "Apagado"}
              </span>
            </div>
          </div>

          {/* Skeleton o Lista de Redes Activas */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 animate-pulse space-y-2">
                  <div className="h-4 w-28 bg-slate-200 rounded"></div>
                  <div className="h-3 w-40 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : connectedChannels.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                No hay redes sociales activas conectadas
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                El bot unificado responderá automáticamente tan pronto vincules tus cuentas en la sección de Conexión Zernio.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ir a Conexión Zernio
              </Link>
            </div>
          ) : (
            <div className={`grid gap-3.5 ${connectedChannels.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-1 md:grid-cols-2"}`}>
              {connectedChannels.map((channel) => {
                const acc = activeAccountsMap.get(channel);
                const isChannelBotActive = config.enabled && (config.channelOverrides[channel]?.enabled ?? true);

                return (
                  <div
                    key={channel}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isChannelBotActive
                        ? "bg-white border-slate-200 shadow-xs"
                        : "bg-slate-50/70 border-slate-200/80 opacity-80"
                    }`}
                  >
                    {/* Identificación de la Red */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          channel === "whatsapp"
                            ? "bg-emerald-500 text-white"
                            : channel === "instagram"
                            ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {channel === "whatsapp" && <MessageSquare className="w-5 h-5" />}
                        {channel === "instagram" && <Instagram className="w-5 h-5" />}
                        {channel === "facebook" && <Facebook className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 capitalize">
                            {channel === "whatsapp" ? "WhatsApp" : channel === "instagram" ? "Instagram Direct" : "Facebook"}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Conectado
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                          {acc?.displayName || "Cuenta"}
                          {acc?.phone ? ` • ${acc.phone}` : acc?.username ? ` • @${acc.username}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch para este canal */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleChannel(channel)}
                        disabled={!config.enabled}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          !config.enabled
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : isChannelBotActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {!config.enabled
                          ? "Pausado Global"
                          : isChannelBotActive
                          ? "Bot Activo"
                          : "Bot en Pausa"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. SECCIÓN: MODELO DE INTELIGENCIA ARTIFICIAL (OpenRouter) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Modelo y Motor de Generación (OpenRouter)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura el modelo LLM que alimentará las respuestas del bot calificador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modelo Principal */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Modelo Principal (OpenRouter ID)
                </label>
                {modelValidation?.isValidating && (
                  <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Verificando...
                  </span>
                )}
              </div>

              <input
                type="text"
                value={config.model}
                onChange={(e) => handleUpdate("model", e.target.value)}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 ${
                  modelValidation && !modelValidation.valid
                    ? "border-rose-400 focus:ring-rose-500 bg-rose-50/30"
                    : "border-slate-200 focus:ring-indigo-500"
                }`}
                placeholder="google/gemini-2.5-flash"
              />

              {/* Estado de validación del Modelo Principal */}
              {modelValidation && (
                <div className="mt-1.5">
                  {modelValidation.valid ? (
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Modelo verificado: {modelValidation.name || config.model}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Modelo inválido o no reconocido en OpenRouter</span>
                      </div>
                      <p className="text-[11px] text-rose-600 font-normal leading-snug">
                        "{config.model}" no existe en el catálogo de OpenRouter. El bot fallará si mantienes este identificador.
                      </p>
                      {modelValidation.suggestions && modelValidation.suggestions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                          <span className="font-semibold text-rose-800">¿Quisiste decir?</span>
                          {modelValidation.suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => handleUpdate("model", sug)}
                              className="px-1.5 py-0.5 bg-white border border-rose-300 rounded font-mono text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}


            </div>

            {/* Modelo Fallback */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Modelo de Respaldo (Fallback Automático)
                </label>
                {fallbackValidation?.isValidating && (
                  <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Verificando...
                  </span>
                )}
              </div>

              <input
                type="text"
                value={config.fallbackModel}
                onChange={(e) => handleUpdate("fallbackModel", e.target.value)}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 ${
                  fallbackValidation && !fallbackValidation.valid
                    ? "border-rose-400 focus:ring-rose-500 bg-rose-50/30"
                    : "border-slate-200 focus:ring-indigo-500"
                }`}
                placeholder="z-ai/glm-5.3-flash"
              />

              {/* Estado de validación del Modelo Fallback */}
              {fallbackValidation && (
                <div className="mt-1.5">
                  {fallbackValidation.valid ? (
                    <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Modelo verificado: {fallbackValidation.name || config.fallbackModel}</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Modelo de respaldo inválido en OpenRouter</span>
                      </div>
                      <p className="text-[11px] text-rose-600 font-normal leading-snug">
                        "{config.fallbackModel}" no existe en el catálogo de OpenRouter. Corrígelo para asegurar que el respaldo funcione.
                      </p>
                      {fallbackValidation.suggestions && fallbackValidation.suggestions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                          <span className="font-semibold text-rose-800">¿Quisiste decir?</span>
                          {fallbackValidation.suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => handleUpdate("fallbackModel", sug)}
                              className="px-1.5 py-0.5 bg-white border border-rose-300 rounded font-mono text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                El CRM conmuta automáticamente a este modelo si el proveedor principal presenta saturación de cuota o latencia elevada.
              </p>
            </div>
          </div>

          {/* Sliders: Temperatura, Max Tokens, Debounce */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Temperatura</label>
                <span className="text-xs font-mono text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {config.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleUpdate("temperature", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 my-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.0 (Preciso / Sin alucinación)</span>
                <span>1.0 (Creativo)</span>
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Límite de Tokens</label>
                <span className="text-xs font-mono text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {config.maxTokens}
                </span>
              </div>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={config.maxTokens}
                onChange={(e) => handleUpdate("maxTokens", parseInt(e.target.value) || 500)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">Longitud máxima de cada respuesta generada</p>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Debounce de Mensajes</label>
                <span className="text-xs font-mono text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {config.debounceSeconds}s
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="15"
                value={config.debounceSeconds}
                onChange={(e) => handleUpdate("debounceSeconds", parseInt(e.target.value) || 5)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">Consolida audios o múltiples textos continuos antes de responder</p>
            </div>
          </div>
        </section>

        {/* 3. SECCIÓN: PROMPT MAESTRO DEL ASISTENTE */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Prompt Maestro del Asistente
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Directivas centrales de prospección, calificación de seguros y reglas de comportamiento aplicables a todas las redes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate("systemPrompt", DEFAULT_UNIFIED_CONFIG.systemPrompt)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              Restablecer plantilla recomendada
            </button>
          </div>

          <textarea
            rows={12}
            value={config.systemPrompt}
            onChange={(e) => handleUpdate("systemPrompt", e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            placeholder="Escribe las instrucciones maestras del bot..."
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>El modelo detecta automáticamente el canal de origen para adaptar el formato y longitud del mensaje.</span>
            <span>{config.systemPrompt.length} caracteres</span>
          </div>
        </section>
          </>
        ) : (
          <BotAuditLab
            currentPrompt={config.systemPrompt}
            onApplyPrompt={(newPrompt) => {
              handleUpdate("systemPrompt", newPrompt);
              try {
                const updated = { ...config, systemPrompt: newPrompt };
                localStorage.setItem("crm_unified_bot_settings", JSON.stringify(updated));
              } catch (e) {
                console.warn("No se pudo guardar en localStorage:", e);
              }
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 3000);
            }}
          />
        )}
      </div>
    </div>
  );
}
