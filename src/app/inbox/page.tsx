"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  Clock, 
  Sparkles,
  Search,
  RefreshCw,
  Phone,
  CheckCheck,
  Radio,
  AlertTriangle,
  Zap,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  X
} from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  channel: "whatsapp" | "instagram" | "facebook" | string;
  provider: string;
  externalId: string;
  participantId: string;
  participantName: string;
  participantHandle?: string;
  participantAvatar?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  aiEnabled: boolean;
  needsHuman: boolean;
}

interface MessageItem {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  senderType: "contact" | "agent" | "ai" | "system";
  senderId?: string;
  type: string;
  body: string;
  mediaUrl?: string;
  status: string;
  sentAt: string;
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "WA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d]/g, "");
  // México: 13 dígitos empezando con 521 (e.g. 5216861874312) -> Remover el 1 adicional -> +52 686 187 4312
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    return `+52 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  // México: 12 dígitos empezando con 52 (e.g. 526861874312) -> +52 686 187 4312
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return `+52 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  // 10 dígitos nacionales (e.g. 686 187 4312)
  if (cleaned.length === 10) {
    return `+52 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (raw.startsWith("+")) return raw;
  return `+${raw}`;
}

function ContactAvatar({
  name,
  avatarUrl,
  channel,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  channel?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-xl",
  };

  const hasValidPhoto = avatarUrl && !avatarUrl.includes("unsplash") && avatarUrl.startsWith("http");

  return (
    <div className="relative shrink-0">
      {hasValidPhoto ? (
        <img
          src={avatarUrl!}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full ${
            channel === "whatsapp"
              ? "bg-gradient-to-br from-emerald-500 to-teal-700"
              : channel === "instagram"
              ? "bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500"
              : channel === "facebook"
              ? "bg-gradient-to-br from-blue-600 to-indigo-700"
              : "bg-gradient-to-br from-indigo-500 to-purple-600"
          } text-white font-bold flex items-center justify-center shadow-sm uppercase tracking-wider`}
        >
          {getInitials(name)}
        </div>
      )}
      {channel === "whatsapp" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-sm"
          title="WhatsApp"
        >
          W
        </span>
      )}
      {channel === "instagram" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 border-2 border-white rounded-full flex items-center justify-center text-[6.5px] text-white font-bold shadow-sm"
          title="Instagram"
        >
          IG
        </span>
      )}
      {channel === "facebook" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-sm"
          title="Facebook"
        >
          F
        </span>
      )}
    </div>
  );
}

const CHANNEL_METAS: Record<string, { label: string; activeClass: string }> = {
  whatsapp: {
    label: "WhatsApp",
    activeClass: "bg-white text-emerald-600 shadow-sm font-bold",
  },
  instagram: {
    label: "Instagram",
    activeClass: "bg-white text-pink-600 shadow-sm font-bold",
  },
  facebook: {
    label: "Messenger",
    activeClass: "bg-white text-blue-600 shadow-sm font-bold",
  },
};

export default function InboxPage() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [connectedChannels, setConnectedChannels] = useState<string[]>(["whatsapp", "instagram"]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Cargar lista de conversaciones
  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/inbox/conversations");
      if (!res.ok) throw new Error("Error al obtener conversaciones");
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        setActiveChatId((currentId) => {
          // Si el usuario ya tiene un chat activo y existe en la lista recibida, mantenerlo estrictamente
          if (currentId && data.conversations.some((c: Conversation) => c.id === currentId)) {
            return currentId;
          }
          // Solo si no hay chat seleccionado, activar el primero por defecto
          return data.conversations[0]?.id || null;
        });
        if (Array.isArray(data.connectedChannels) && data.connectedChannels.length > 0) {
          setConnectedChannels(data.connectedChannels);
        }
      }
    } catch (err: any) {
      if (!silent) {
        console.error("Error cargando conversaciones:", err);
        toast.error("No se pudieron cargar las conversaciones");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Cargar mensajes del chat activo
  const fetchMessages = async (convId: string, silent = false) => {
    try {
      const res = await fetch(`/api/inbox/conversations/${convId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.warn("Error obteniendo mensajes:", err);
    }
  };

  // Cargar conversaciones al montar y configurar polling
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Recargar mensajes cuando cambia el chat activo o por polling
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      const interval = setInterval(() => {
        fetchMessages(activeChatId, true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeChatId]);

  const [togglingAi, setTogglingAi] = useState(false);

  // Alternar estado de IA / Control humano para el chat activo
  const handleToggleAi = async () => {
    if (!activeChatId || !activeChat || togglingAi) return;

    setTogglingAi(true);
    const targetState = !activeChat.aiEnabled;

    try {
      const res = await fetch(`/api/inbox/conversations/${activeChatId}/toggle-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: targetState }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(targetState ? "🤖 IA activada para este chat" : "👤 Control humano activo (IA pausada)");
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? { ...c, aiEnabled: targetState, needsHuman: !targetState }
              : c
          )
        );
      } else {
        toast.error(data.message || "No se pudo cambiar el estado de la IA");
      }
    } catch (err: any) {
      toast.error("Error al actualizar estado de IA: " + err.message);
    } finally {
      setTogglingAi(false);
    }
  };

  // Configuración global del bot (para calcular estado efectivo por red)
  const [botConfig, setBotConfig] = useState<{
    enabled: boolean;
    channelOverrides?: {
      whatsapp?: { enabled: boolean };
      instagram?: { enabled: boolean };
      facebook?: { enabled: boolean };
    };
  } | null>(null);
  const [reactivatingBot, setReactivatingBot] = useState(false);

  const fetchBotConfig = async () => {
    try {
      const res = await fetch("/api/settings/bot");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setBotConfig(data.config);
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar la configuración del bot:", e);
    }
  };

  useEffect(() => {
    fetchBotConfig();
  }, []);

  // Reactivación rápida de 1 clic para el canal desde el banner del chat
  const handleQuickReactivateBot = async (channel: string) => {
    setReactivatingBot(true);
    try {
      const chKey = channel.toLowerCase() as "whatsapp" | "instagram" | "facebook";
      const updatedConfig = {
        ...(botConfig || { enabled: true }),
        enabled: true,
        channelOverrides: {
          ...(botConfig?.channelOverrides || {}),
          [chKey]: { enabled: true },
        },
      };

      const res = await fetch("/api/settings/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: updatedConfig }),
      });

      const data = await res.json();
      if (data.success && data.config) {
        setBotConfig(data.config);
        toast.success(`✅ Bot de ${chKey === "whatsapp" ? "WhatsApp" : chKey === "instagram" ? "Instagram" : "Facebook"} reactivado con éxito.`);
      } else {
        toast.error(data.message || "No se pudo reactivar el bot.");
      }
    } catch (err: any) {
      toast.error("Error al reactivar el bot: " + err.message);
    } finally {
      setReactivatingBot(false);
    }
  };

  // Forzar sincronización con la API de Zernio
  const handleSyncZernio = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sincronización completada: ${data.syncedConversations} chats y ${data.syncedMessages} mensajes importados.`);
        await fetchConversations(false);
        if (activeChatId) {
          await fetchMessages(activeChatId);
        }
      } else {
        toast.error(data.message || "Error al sincronizar");
      }
    } catch (err: any) {
      toast.error(err.message || "Fallo de conexión al sincronizar con Zernio");
    } finally {
      setSyncing(false);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId || sending) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await fetch(`/api/inbox/conversations/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al enviar mensaje vía Zernio");
      }

      const channelLabel = activeChat?.channel === "instagram" ? "Instagram" : "WhatsApp";
      toast.success(`Mensaje enviado por ${channelLabel}`);
      await fetchMessages(activeChatId);
      fetchConversations(true);
    } catch (err: any) {
      toast.error(err.message || "No se pudo enviar el mensaje");
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const activeChat = conversations.find((c) => c.id === activeChatId) || conversations[0];

  const channelsText = connectedChannels
    .map((ch) => CHANNEL_METAS[ch]?.label || ch.toUpperCase())
    .join(" & ");

  const filterTabs = [
    { key: "all", label: "Todos", activeClass: "bg-white text-indigo-600 shadow-sm font-bold" },
    ...connectedChannels.map((ch) => ({
      key: ch,
      label: CHANNEL_METAS[ch]?.label || ch.charAt(0).toUpperCase() + ch.slice(1),
      activeClass: CHANNEL_METAS[ch]?.activeClass || "bg-white text-slate-900 shadow-sm font-bold",
    })),
  ];

  const filteredConversations = conversations.filter((chat) => {
    const matchesChannel = selectedChannel === "all" || chat.channel === selectedChannel;
    const matchesSearch =
      !searchQuery ||
      chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.participantId.includes(searchQuery);
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
      {/* 1. Panel Lateral de Conversaciones */}
      <aside className="w-96 flex flex-col bg-white border-r border-slate-200">
        <header className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Mensajes
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Canales: <strong className="text-slate-700 font-semibold">{channelsText || "Conectados"}</strong>
              </p>
            </div>
            <button
              onClick={handleSyncZernio}
              disabled={syncing}
              title="Sincronizar directamente con la API de Zernio"
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-600" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>

          {/* Filtros de Canal Dinámicos */}
          <div
            role="tablist"
            className="grid gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600"
            style={{ gridTemplateColumns: `repeat(${filterTabs.length}, minmax(0, 1fr))` }}
          >
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={selectedChannel === tab.key}
                onClick={() => setSelectedChannel(tab.key)}
                className={`py-1.5 px-2 rounded-md transition-all text-center truncate ${
                  selectedChannel === tab.key
                    ? tab.activeClass
                    : "hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Buscador */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o número..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lista de Chats */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
              Cargando conversaciones reales...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <p>No hay conversaciones activas.</p>
              <button
                onClick={handleSyncZernio}
                className="mt-3 text-indigo-600 font-semibold hover:underline"
              >
                Hacer clic aquí para sincronizar desde Zernio
              </button>
            </div>
          ) : (
            filteredConversations.map((chat) => {
              const isSelected = activeChat && chat.id === activeChat.id;
              const formattedTime = chat.lastMessageAt
                ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div
                  key={chat.id}
                  data-testid="conversation-item"
                  onClick={() => setActiveChatId(chat.id)}
                  className={`py-2.5 px-3 flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected ? "bg-indigo-50/90 border-l-4 border-indigo-600" : "hover:bg-slate-50"
                  }`}
                >
                  <ContactAvatar
                    name={chat.participantName}
                    avatarUrl={chat.participantAvatar}
                    channel={chat.channel}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {chat.participantName || chat.participantId}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">{formattedTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 font-mono font-medium truncate">
                        {chat.channel === "whatsapp"
                          ? formatPhoneDisplay(chat.participantId)
                          : chat.channel === "instagram"
                          ? `@${(chat.participantHandle || chat.participantId).replace(/^[@+]/, "")}`
                          : chat.participantId}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            chat.channel === "whatsapp"
                              ? "bg-emerald-100 text-emerald-800"
                              : chat.channel === "instagram"
                              ? "bg-pink-100 text-pink-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {chat.channel}
                        </span>
                        {chat.unreadCount > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Ventana de Conversación Central */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {activeChat ? (
          <>
            {/* Barra Superior del Chat */}
            <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ContactAvatar
                  name={activeChat.participantName}
                  avatarUrl={activeChat.participantAvatar}
                  channel={activeChat.channel}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {activeChat.participantName || (activeChat.channel === "instagram" ? "Contacto Instagram" : "Contacto")}
                    </h2>
                    <span className="text-xs text-slate-600 font-mono font-medium">
                      {activeChat.channel === "whatsapp"
                        ? formatPhoneDisplay(activeChat.participantId)
                        : `@${(activeChat.participantHandle || activeChat.participantId).replace(/^[@+]/, "")}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {activeChat.channel === "whatsapp" ? (
                      <span className="font-semibold text-emerald-600">WhatsApp Oficial</span>
                    ) : activeChat.channel === "instagram" ? (
                      <span className="font-semibold text-pink-600">Instagram Direct</span>
                    ) : (
                      <span className="font-semibold text-blue-600">Messenger</span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" /> En línea
                    </span>
                  </div>
                </div>
              </div>

              {/* Control / Estado de IA Interactivo con cálculo de Estado Efectivo */}
              {(() => {
                const activeChannel = (activeChat.channel || "whatsapp").toLowerCase();
                const isMasterBotEnabled = botConfig ? botConfig.enabled : true;
                const isChannelBotEnabled = botConfig?.channelOverrides?.[activeChannel as "whatsapp" | "instagram" | "facebook"]?.enabled ?? true;
                const isChannelActive = isMasterBotEnabled && isChannelBotEnabled;
                const isConvAiEnabled = activeChat.aiEnabled && !activeChat.needsHuman;
                const isEffectivelyActive = isChannelActive && isConvAiEnabled;

                return (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      data-testid="ai-status-badge"
                      onClick={handleToggleAi}
                      disabled={togglingAi}
                      title={
                        isEffectivelyActive
                          ? "Clic para pausar la IA y tomar control manual de este chat"
                          : isConvAiEnabled && !isChannelActive
                          ? `La IA está activa para este chat, pero el bot de ${activeChannel === "whatsapp" ? "WhatsApp" : "la red"} está pausado en Ajustes. Haz clic abajo para reactivarlo.`
                          : "Clic para reactivar las respuestas automáticas de la IA para este chat"
                      }
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs ${
                        isEffectivelyActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : isConvAiEnabled && !isChannelActive
                          ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {isConvAiEnabled && !isChannelActive ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isEffectivelyActive
                          ? "IA Activa (Pausar)"
                          : isConvAiEnabled && !isChannelActive
                          ? `IA Suspendida (${activeChannel === "whatsapp" ? "WhatsApp" : "Canal"} Pausado)`
                          : "Control Humano (Activar IA)"}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isEffectivelyActive
                            ? "bg-emerald-500 animate-pulse"
                            : isConvAiEnabled && !isChannelActive
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }`}
                      />
                    </button>

                    {/* Botón para Ocultar / Mostrar Información de Contacto */}
                    <button
                      type="button"
                      onClick={() => setShowContactInfo((prev) => !prev)}
                      title={showContactInfo ? "Ocultar información del contacto para ampliar vista" : "Mostrar información del contacto"}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs ${
                        showContactInfo
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                      }`}
                    >
                      {showContactInfo ? (
                        <>
                          <PanelRightClose className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Ocultar contacto</span>
                        </>
                      ) : (
                        <>
                          <PanelRightOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Ver contacto</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
            </header>

            {/* Banner de Advertencia Contextual cuando la IA está habilitada para el chat pero el canal está apagado en Ajustes */}
            {(() => {
              const activeChannel = (activeChat.channel || "whatsapp").toLowerCase();
              const isMasterBotEnabled = botConfig ? botConfig.enabled : true;
              const isChannelBotEnabled = botConfig?.channelOverrides?.[activeChannel as "whatsapp" | "instagram" | "facebook"]?.enabled ?? true;
              const isChannelActive = isMasterBotEnabled && isChannelBotEnabled;
              const isConvAiEnabled = activeChat.aiEnabled && !activeChat.needsHuman;

              if (isConvAiEnabled && !isChannelActive) {
                const channelName = activeChannel === "whatsapp" ? "WhatsApp" : activeChannel === "instagram" ? "Instagram Direct" : "Facebook";
                return (
                  <div className="bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/50 border-b border-amber-200 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-amber-950 truncate">
                          El bot de {channelName} está pausado en Ajustes
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Este chat tiene la IA habilitada, pero no responderá automáticamente hasta reactivar la red en el servidor.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickReactivateBot(activeChannel)}
                        disabled={reactivatingBot}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 text-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {reactivatingBot ? "Reactivando..." : `Reactivar ${channelName}`}
                      </button>
                      <Link
                        href="/agents"
                        className="px-2.5 py-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-200/50 rounded-lg transition-colors font-semibold flex items-center gap-1 text-xs"
                      >
                        <span>Ajustes</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Historial de Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No hay mensajes registrados en este chat.
                </div>
              ) : (
                messages.map((msg) => {
                  const isClient = msg.direction === "inbound";
                  const isAI = msg.senderType === "ai";
                  const formattedTime = msg.sentAt
                    ? new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-medium text-slate-500">
                          {isClient ? (activeChat.participantName || "Cliente") : isAI ? "Agente IA" : "Asesor Humano"}
                        </span>
                        <span className="text-[10px] text-slate-400">{formattedTime}</span>
                      </div>
                      <div
                        className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isClient
                            ? "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                            : isAI
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-slate-800 text-white rounded-tr-none"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                        {msg.mediaUrl && (
                          <div className="mt-2">
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:underline"
                            >
                              Ver archivo adjunto
                            </a>
                          </div>
                        )}
                      </div>
                      {!isClient && (
                        <span className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5 px-1">
                          <CheckCheck className="w-3 h-3 text-emerald-500" /> Enviado vía Zernio
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compositor de Mensaje */}
            <footer className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent p-2">
                  <textarea
                    name="message"
                    rows={2}
                    value={inputText}
                    disabled={sending}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Escribe una respuesta para enviar por WhatsApp..."
                    className="w-full bg-transparent resize-none border-none text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Sin conversación seleccionada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Selecciona un chat de la lista izquierda o haz clic en "Sincronizar" para traer los mensajes entrantes de WhatsApp.
            </p>
          </div>
        )}
      </main>

      {/* 3. Panel de Contexto del Cliente */}
      {activeChat && showContactInfo && (
        <aside className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shrink-0 animate-in fade-in slide-in-from-right-2 duration-150">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Información del Contacto
            </h3>
            <button
              type="button"
              onClick={() => setShowContactInfo(false)}
              title="Ocultar este panel"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
            <ContactAvatar
              name={activeChat.participantName}
              avatarUrl={activeChat.participantAvatar}
              channel={activeChat.channel}
              size="lg"
            />
            <h2 className="text-base font-bold text-slate-900 mt-3">{activeChat.participantName || "Contacto"}</h2>
            <p className="text-xs text-slate-600 font-mono font-semibold mt-0.5">
              {formatPhoneDisplay(activeChat.participantId)}
            </p>
            <span className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              ● {activeChat.channel === "whatsapp" ? "WhatsApp Verificado" : activeChat.channel === "instagram" ? "Instagram Direct" : "Messenger"}
            </span>
          </div>

          <div className="py-4 space-y-3.5 text-xs border-b border-slate-100">
            <div>
              <span className="text-slate-400 block mb-0.5">Canal de origen</span>
              <span className="font-semibold text-slate-800 capitalize flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeChat.channel === "whatsapp" ? "bg-emerald-500" : activeChat.channel === "instagram" ? "bg-pink-500" : "bg-blue-500"}`} />
                {activeChat.channel === "whatsapp" ? "WhatsApp Cloud API" : activeChat.channel === "instagram" ? "Instagram Direct" : "Facebook Messenger"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Línea conectada en Zernio</span>
              <span className="font-semibold text-slate-800">
                Workcil (+52 686 632 1049)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Identificador del cliente</span>
              <span className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {formatPhoneDisplay(activeChat.participantId)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">ID de conversación Zernio</span>
              <span className="font-mono text-[11px] text-slate-500 break-all">{activeChat.externalId}</span>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={() => fetchMessages(activeChat.id)}
              title="Recargar los mensajes de esta conversación"
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              Refrescar mensajes del chat
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
