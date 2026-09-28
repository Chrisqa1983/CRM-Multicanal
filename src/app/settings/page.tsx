"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Instagram,
  Facebook,
  Zap,
  Server,
  KeyRound,
  Unlink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";

interface ZernioConfigData {
  hasApiKey: boolean;
  maskedApiKey: string;
  hasWebhookSecret: boolean;
  maskedWebhookSecret: string;
  defaultAccountId: string;
  baseUrl: string;
  isConfigured: boolean;
}

interface ZernioAccount {
  id: string;
  platform: "whatsapp" | "instagram" | "facebook" | string;
  displayName: string;
  username?: string;
  status: "active" | "inactive" | string;
  profilePicture?: string;
  phone?: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ZernioConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingSecret, setSavingSecret] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);

  // Form states
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showAdvancedSecret, setShowAdvancedSecret] = useState(false);

  // Visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Status & Accounts
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "error" | "simulated" | "idle">("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [isPublicWebhook, setIsPublicWebhook] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/zernio");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setWebhookUrl(data.webhookUrl || `${window.location.origin}/api/webhooks/zernio`);
        setIsPublicWebhook(Boolean(data.isPublicWebhookUrl));

        if (data.config.isConfigured && data.ping) {
          if (data.ping.ok) {
            setConnectionStatus(data.ping.message.includes("Simulación") ? "simulated" : "connected");
            setLatency(data.ping.latencyMs);
            setStatusMessage(data.ping.message);
            if (Array.isArray(data.ping.accounts)) {
              setAccounts(data.ping.accounts);
            }
          } else {
            setConnectionStatus("error");
            setStatusMessage(data.ping.message);
          }
        } else {
          setConnectionStatus("idle");
          setStatusMessage("No hay ninguna cuenta de Zernio conectada.");
          setAccounts([]);
        }
      }
    } catch (err) {
      setConnectionStatus("error");
      setStatusMessage("No se pudo contactar al servidor local.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/zernio/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setLatency(data.result.latencyMs);
        setConnectionStatus(data.result.message.includes("Simulación") ? "simulated" : "connected");
        setStatusMessage(data.result.message);
        if (Array.isArray(data.result.accounts)) {
          setAccounts(data.result.accounts);
        }
        setFeedback({
          type: "success",
          message: `¡Conexión verificada exitosamente! Latencia: ${data.result.latencyMs} ms.`,
        });
      } else {
        setConnectionStatus("error");
        const errMsg = data.result?.message || data.message || "Error al conectar con Zernio.";
        setStatusMessage(errMsg);
        setFeedback({ type: "error", message: errMsg });
      }
    } catch (err: any) {
      setConnectionStatus("error");
      setStatusMessage(err.message || "Error inesperado al probar conexión.");
      setFeedback({ type: "error", message: "Fallo de red al probar conexión." });
    } finally {
      setTesting(false);
    }
  };

  const handleConnectApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() && !config?.hasApiKey) {
      setFeedback({ type: "error", message: "Por favor ingresa tu API Key de Zernio." });
      return;
    }

    setSavingKey(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/zernio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: "¡Cuenta de Zernio conectada y validada con éxito!",
        });
        setApiKey("");
        await fetchConfig();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al conectar la API Key.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al intentar conectar.",
      });
    } finally {
      setSavingKey(false);
    }
  };


  const handleSaveWebhookSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSecret(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/zernio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookSecret: webhookSecret.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: "Secreto de validación HMAC guardado correctamente.",
        });
        setWebhookSecret("");
        await fetchConfig();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al guardar el secreto de Webhook.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al guardar.",
      });
    } finally {
      setSavingSecret(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/zernio", {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setDisconnectModalOpen(false);
        setConnectionStatus("idle");
        setLatency(null);
        setAccounts([]);
        setStatusMessage("Cuenta de Zernio desconectada.");
        setApiKey("");
        setWebhookSecret("");
        setConfig({
          hasApiKey: false,
          maskedApiKey: "",
          hasWebhookSecret: false,
          maskedWebhookSecret: "",
          defaultAccountId: "",
          baseUrl: "https://api.zernio.com",
          isConfigured: false,
        });
        setFeedback({
          type: "success",
          message: "La cuenta de Zernio ha sido desconectada con éxito.",
        });
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al desconectar la cuenta.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al procesar la desconexión.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopyWebhook = () => {
    if (navigator.clipboard && webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const isConnected = connectionStatus === "connected" || connectionStatus === "simulated";

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Radio className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Conexión Zernio
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configura y administra la conexión de tus canales en 3 sencillos pasos.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {config?.hasApiKey && (
              <button
                onClick={() => setDisconnectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition shadow-sm"
              >
                <Unlink className="w-3.5 h-3.5" />
                Desconectar Cuenta
              </button>
            )}

            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin text-indigo-600" : ""}`} />
              {testing ? "Probando..." : "Probar Conexión"}
            </button>

            <a
              href="https://zernio.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
            >
              Dashboard Zernio
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Banner Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 border shadow-sm ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="flex-1">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3-STEP SETUP FLOW */}
        <div className="space-y-5">
          {/* ========================================================= */}
          {/* PASO 1: API KEY */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition ${
                  config?.hasApiKey
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                }`}
              >
                {config?.hasApiKey ? <Check className="w-4 h-4" /> : "1"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Paso 1: Clave de Acceso (API Key)
                  </h2>
                  {config?.hasApiKey && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Clave Conectada ({config.maskedApiKey})
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Copia tu clave secreta desde tu panel en{" "}
                  <a
                    href="https://zernio.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    zernio.com/dashboard → API Keys
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  . Es lo único que necesitas para conectar el sistema.
                </p>

                <form onSubmit={handleConnectApiKey} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        config?.hasApiKey
                          ? "Pega una nueva clave para reemplazar la actual..."
                          : "Pega aquí tu Zernio API Key (sk_live_...)"
                      }
                      className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      title={showApiKey ? "Ocultar" : "Mostrar"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={savingKey || (!apiKey.trim() && !config?.hasApiKey)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-40 flex items-center gap-2"
                    >
                      {savingKey ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Validando y Conectando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          {config?.hasApiKey ? "Actualizar API Key" : "Conectar y Validar Cuenta"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 2: CANALES DETECTADOS AUTOMÁTICAMENTE */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition ${
                  accounts.length > 0
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {accounts.length > 0 ? <Check className="w-4 h-4" /> : "2"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Paso 2: Canales Detectados Automáticamente
                  </h2>
                  {accounts.length > 0 && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {accounts.length} {accounts.length === 1 ? "canal detectado" : "canales detectados"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  El CRM consulta la API de Zernio y detecta automáticamente tus canales vinculados. Todos los canales conectados reciben y envían mensajes de forma simultánea e independiente.
                </p>

                {accounts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {accounts.map((acc) => {
                      const isWhatsapp = acc.platform === "whatsapp";
                      const isInstagram = acc.platform === "instagram";
                      const isActive = acc.status === "active";

                      return (
                        <div
                          key={acc.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between shadow-xs transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isWhatsapp
                                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                  : isInstagram
                                  ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/25"
                                  : "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                              }`}
                            >
                              {isWhatsapp ? (
                                <MessageSquare className="w-5 h-5" />
                              ) : isInstagram ? (
                                <Instagram className="w-5 h-5" />
                              ) : (
                                <Facebook className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-slate-900 truncate">
                                  {acc.displayName || (isWhatsapp ? "WhatsApp Business" : isInstagram ? "Instagram Direct" : "Facebook")}
                                </h3>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  {acc.platform}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                                {acc.phone || (acc.username ? `@${acc.username}` : acc.id)}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 pl-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                }`}
                              />
                              {isActive ? "Conectado" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                    <p className="text-xs text-slate-500">
                      {config?.hasApiKey
                        ? "No se encontraron canales vinculados aún en tu cuenta de Zernio. Pulsa 'Probar Conexión' para sincronizar."
                        : "Ingresa tu API Key en el Paso 1 para detectar automáticamente tus canales de WhatsApp e Instagram."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PASO 3: ACTIVAR WEBHOOK */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition ${
                  isConnected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                3
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Paso 3: Activar Webhook de Entrada
                  </h2>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  Copia esta URL y pégala en la sección de{" "}
                  <a
                    href="https://zernio.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    Webhooks en Zernio Dashboard
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{" "}
                  para que los mensajes entrantes lleguen en tiempo real a tu bandeja.
                </p>

                {/* Webhook URL Box */}
                <div className="bg-slate-900 rounded-xl p-3.5 relative group text-white mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Callback URL para Zernio:
                    </p>
                    {isPublicWebhook ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        URL Pública Activa
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-md border border-amber-500/30">
                        Localhost (Inicia ngrok para recibir webhooks)
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-emerald-400 break-all pr-10">
                    {webhookUrl || "Cargando URL..."}
                  </div>
                  <button
                    onClick={handleCopyWebhook}
                    className="absolute right-2.5 top-3.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Copiar URL"
                  >
                    {copiedWebhook ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Advanced HMAC Validation (Optional Dropdown) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSecret(!showAdvancedSecret)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between text-xs text-slate-700 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Firma Webhook Secret (Opcional - Seguridad Avanzada HMAC)
                    </span>
                    {showAdvancedSecret ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showAdvancedSecret && (
                    <div className="p-4 bg-white border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-3">
                        Si en la consola de Zernio configuraste un secreto compartido para verificar la autenticidad criptográfica de los eventos entrantes, ingrésalo aquí:
                      </p>

                      <form onSubmit={handleSaveWebhookSecret} className="space-y-3">
                        <div className="relative">
                          <input
                            type={showSecret ? "text" : "password"}
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                            placeholder={
                              config?.hasWebhookSecret
                                ? `Actual: ${config.maskedWebhookSecret}`
                                : "whsec_..."
                            }
                            className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingSecret || !webhookSecret.trim()}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40"
                          >
                            {savingSecret ? "Guardando..." : "Guardar Secreto"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Desconectar Cuenta */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              ¿Desconectar cuenta de Zernio?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Al desconectar la cuenta actual, el CRM dejará de recibir y enviar mensajes en los canales vinculados (WhatsApp, Instagram y Messenger).
            </p>

            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              💡 <strong>Nota:</strong> Las credenciales activas se borrarán del sistema para que puedas conectar una nueva cuenta limpia cuando lo desees.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisconnectModalOpen(false)}
                disabled={disconnecting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {disconnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    Sí, Desconectar Cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
