import fs from "fs";
import path from "path";

export interface AiModelConfig {
  model: string;
  fallbackModel: string;
  embeddingsModel: string;
}

export interface ModelValidationResult {
  valid: boolean;
  id: string;
  name?: string;
  contextLength?: number;
  message?: string;
  suggestions?: string[];
}

let modelsCache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Consulta el catálogo público de modelos de OpenRouter con caché en memoria
 */
export async function fetchOpenRouterModels(): Promise<any[]> {
  const now = Date.now();
  if (modelsCache && now - modelsCache.timestamp < CACHE_TTL_MS) {
    return modelsCache.data;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        modelsCache = {
          timestamp: now,
          data: json.data,
        };
        return json.data;
      }
    }
  } catch (err) {
    console.warn("[OpenRouter] Error al consultar catálogo de modelos:", err);
  }

  return modelsCache ? modelsCache.data : [];
}

/**
 * Valida si un ID de modelo existe en el catálogo de OpenRouter
 */
export async function validateOpenRouterModel(modelId: string): Promise<ModelValidationResult> {
  const trimmed = (modelId || "").trim();
  if (!trimmed) {
    return { valid: false, id: trimmed, message: "El ID del modelo no puede estar vacío." };
  }

  const models = await fetchOpenRouterModels();
  if (models.length === 0) {
    // Si no se pudo conectar con OpenRouter (offline o timeout), no bloqueamos de forma forzada
    return {
      valid: true,
      id: trimmed,
      name: trimmed,
      message: "No se pudo conectar con OpenRouter para verificar el catálogo en este momento.",
    };
  }

  const found = models.find((m) => m.id.toLowerCase() === trimmed.toLowerCase());
  if (found) {
    return {
      valid: true,
      id: found.id,
      name: found.name || found.id,
      contextLength: found.context_length,
    };
  }

  // Buscar sugerencias parecidas
  const searchPart = trimmed.split("/")[1] || trimmed;
  const suggestions = models
    .filter((m) => m.id.toLowerCase().includes(searchPart.toLowerCase()))
    .slice(0, 3)
    .map((m) => m.id);

  return {
    valid: false,
    id: trimmed,
    message: `El modelo "${trimmed}" no existe en el catálogo de OpenRouter.`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Lee la configuración de modelos directamente desde el archivo .env en disco
 * para garantizar sincronización en tiempo real sin requerir reinicio del servidor.
 */
export function getFreshAiConfig(): AiModelConfig {
  let model = process.env.AI_MODEL || "google/gemini-2.5-flash";
  let fallbackModel = process.env.AI_FALLBACK_MODEL || "anthropic/claude-3.5-haiku";
  let embeddingsModel = process.env.EMBEDDINGS_MODEL || "openai/text-embedding-3-small";

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");

      const matchModel = content.match(/^AI_MODEL\s*=\s*(.+)$/m);
      if (matchModel && matchModel[1]) {
        model = matchModel[1].trim().replace(/^["']|["']$/g, "");
      }

      const matchFallback = content.match(/^AI_FALLBACK_MODEL\s*=\s*(.+)$/m);
      if (matchFallback && matchFallback[1]) {
        fallbackModel = matchFallback[1].trim().replace(/^["']|["']$/g, "");
      }

      const matchEmbeddings = content.match(/^EMBEDDINGS_MODEL\s*=\s*(.+)$/m);
      if (matchEmbeddings && matchEmbeddings[1]) {
        embeddingsModel = matchEmbeddings[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (err) {
    console.warn("[AI Config] Error al leer archivo .env:", err);
  }

  return { model, fallbackModel, embeddingsModel };
}
