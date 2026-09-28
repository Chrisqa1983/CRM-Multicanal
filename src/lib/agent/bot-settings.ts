import { db } from "@/db";
import { agentConfigs } from "@/db/schema/ai";
import { eq, inArray } from "drizzle-orm";
import { getFreshAiConfig } from "./config";

export interface UnifiedBotConfig {
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

export const DEFAULT_UNIFIED_CONFIG: UnifiedBotConfig = {
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

/**
 * Obtiene la configuración unificada del bot desde PostgreSQL
 */
export async function getUnifiedBotConfig(): Promise<UnifiedBotConfig> {
  const envAi = getFreshAiConfig();

  try {
    const rows = await db
      .select()
      .from(agentConfigs)
      .where(inArray(agentConfigs.channel, ["master", "whatsapp", "instagram", "facebook"]));

    if (rows.length === 0) {
      return {
        ...DEFAULT_UNIFIED_CONFIG,
        model: envAi.model || DEFAULT_UNIFIED_CONFIG.model,
        fallbackModel: envAi.fallbackModel || DEFAULT_UNIFIED_CONFIG.fallbackModel,
      };
    }

    const masterRow = rows.find((r) => r.channel === "master");
    const waRow = rows.find((r) => r.channel === "whatsapp");
    const igRow = rows.find((r) => r.channel === "instagram");
    const fbRow = rows.find((r) => r.channel === "facebook");

    return {
      enabled: masterRow ? masterRow.enabled : DEFAULT_UNIFIED_CONFIG.enabled,
      model: masterRow?.model || envAi.model || DEFAULT_UNIFIED_CONFIG.model,
      fallbackModel: masterRow?.fallbackModel || envAi.fallbackModel || DEFAULT_UNIFIED_CONFIG.fallbackModel,
      temperature: masterRow?.temperature ?? DEFAULT_UNIFIED_CONFIG.temperature,
      maxTokens: masterRow?.maxTokens ?? DEFAULT_UNIFIED_CONFIG.maxTokens,
      debounceSeconds: masterRow?.debounceSeconds ?? DEFAULT_UNIFIED_CONFIG.debounceSeconds,
      systemPrompt: masterRow?.systemPrompt || DEFAULT_UNIFIED_CONFIG.systemPrompt,
      channelOverrides: {
        whatsapp: { enabled: waRow ? waRow.enabled : true },
        instagram: { enabled: igRow ? igRow.enabled : true },
        facebook: { enabled: fbRow ? fbRow.enabled : true },
      },
    };
  } catch (error) {
    console.error("[BotSettings] Error consultando agentConfigs:", error);
    return {
      ...DEFAULT_UNIFIED_CONFIG,
      model: envAi.model || DEFAULT_UNIFIED_CONFIG.model,
      fallbackModel: envAi.fallbackModel || DEFAULT_UNIFIED_CONFIG.fallbackModel,
    };
  }
}

/**
 * Guarda y persiste la configuración unificada del bot en PostgreSQL
 */
export async function saveUnifiedBotConfig(config: Partial<UnifiedBotConfig>): Promise<UnifiedBotConfig> {
  const current = await getUnifiedBotConfig();
  const merged: UnifiedBotConfig = {
    ...current,
    ...config,
    channelOverrides: {
      ...current.channelOverrides,
      ...(config.channelOverrides || {}),
    },
  };

  const now = new Date();

  // Upsert master config
  await db
    .insert(agentConfigs)
    .values({
      channel: "master",
      enabled: merged.enabled,
      model: merged.model,
      fallbackModel: merged.fallbackModel,
      temperature: merged.temperature,
      maxTokens: merged.maxTokens,
      debounceSeconds: merged.debounceSeconds,
      systemPrompt: merged.systemPrompt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agentConfigs.channel,
      set: {
        enabled: merged.enabled,
        model: merged.model,
        fallbackModel: merged.fallbackModel,
        temperature: merged.temperature,
        maxTokens: merged.maxTokens,
        debounceSeconds: merged.debounceSeconds,
        systemPrompt: merged.systemPrompt,
        updatedAt: now,
      },
    });

  // Upsert channel overrides
  const channels: Array<"whatsapp" | "instagram" | "facebook"> = ["whatsapp", "instagram", "facebook"];
  for (const ch of channels) {
    const isChEnabled = merged.channelOverrides[ch]?.enabled ?? true;
    await db
      .insert(agentConfigs)
      .values({
        channel: ch,
        enabled: isChEnabled,
        model: merged.model,
        fallbackModel: merged.fallbackModel,
        temperature: merged.temperature,
        maxTokens: merged.maxTokens,
        debounceSeconds: merged.debounceSeconds,
        systemPrompt: merged.systemPrompt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: agentConfigs.channel,
        set: {
          enabled: isChEnabled,
          updatedAt: now,
        },
      });
  }

  return merged;
}

/**
 * Comprueba de forma inmediata y ligera si el bot debe responder para un canal dado
 */
export async function isBotActiveForChannel(channel: string): Promise<boolean> {
  try {
    const config = await getUnifiedBotConfig();
    if (!config.enabled) return false;

    const ch = channel.toLowerCase() as "whatsapp" | "instagram" | "facebook";
    if (config.channelOverrides[ch] !== undefined) {
      return config.channelOverrides[ch].enabled;
    }

    return true;
  } catch (err) {
    console.warn("[BotSettings] Error verificando estado de bot para canal:", channel, err);
    return true; // Fallback por defecto seguro
  }
}
