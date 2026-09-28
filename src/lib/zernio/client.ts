import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface ZernioConfig {
  apiKey: string;
  webhookSecret: string;
  defaultAccountId: string;
  baseUrl: string;
}

export interface ZernioAccount {
  id: string;
  platform: "whatsapp" | "instagram" | "facebook" | string;
  displayName: string;
  username?: string;
  status: "active" | "inactive" | string;
  profilePicture?: string;
  phone?: string;
}

export interface ZernioPingResult {
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  message: string;
  userId?: string;
  accounts?: ZernioAccount[];
}

/**
 * Obtiene la configuración activa de Zernio (desde variables de entorno en memoria)
 */
export function getZernioConfig(): ZernioConfig {
  return {
    apiKey: process.env.ZERNIO_API_KEY || "",
    webhookSecret: process.env.ZERNIO_WEBHOOK_SECRET || "",
    defaultAccountId: process.env.ZERNIO_DEFAULT_ACCOUNT_ID || "6a98fed177555aae01cb66bf",
    baseUrl: process.env.ZERNIO_BASE_URL || "https://api.zernio.com",
  };
}

/**
 * Enmascara una clave secreta para visualización segura en la UI
 * Ejemplo: sk_ff6da04ead0886dc5da5823cbc9460044d3ebeb4ba40639a952095413ebd843d -> sk_ff6d...843d
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 10) return "••••••••";
  return `${secret.slice(0, 7)}...${secret.slice(-4)}`;
}

/**
 * Retorna la configuración enmascarada para ser consumida de forma segura por el Frontend
 */
export function getMaskedZernioConfig() {
  const config = getZernioConfig();
  return {
    hasApiKey: Boolean(config.apiKey),
    maskedApiKey: maskSecret(config.apiKey),
    hasWebhookSecret: Boolean(config.webhookSecret),
    maskedWebhookSecret: maskSecret(config.webhookSecret),
    defaultAccountId: config.defaultAccountId,
    baseUrl: config.baseUrl,
    isConfigured: Boolean(config.apiKey && !config.apiKey.includes("mock")),
  };
}

/**
 * Verifica la conectividad con la API de Zernio realizando verificación de clave y consulta de cuentas
 */
export async function pingZernio(customConfig?: Partial<ZernioConfig>): Promise<ZernioPingResult> {
  const activeConfig = {
    ...getZernioConfig(),
    ...customConfig,
  };

  const startTime = Date.now();

  // Si no hay API key configurada
  if (!activeConfig.apiKey) {
    return {
      ok: false,
      latencyMs: 0,
      message: "No se ha configurado ninguna API Key de Zernio.",
    };
  }

  // Si es una clave de prueba o mock local
  if (activeConfig.apiKey.startsWith("zn_test_mock") || activeConfig.apiKey.includes("simulation")) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return {
      ok: true,
      latencyMs: 65,
      statusCode: 200,
      message: "Modo Simulación Activo: Conexión emulada para pruebas locales.",
      userId: "user_sandbox_01",
      accounts: [
        {
          id: activeConfig.defaultAccountId || "6a98fed177555aae01cb66bf",
          platform: "whatsapp",
          displayName: "WhatsApp Sandbox",
          username: "+52 1 55 0000 0000",
          status: "active",
        },
      ],
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const baseUrl = activeConfig.baseUrl.replace(/\/$/, "");
    
    // 1. Verificación de autenticación con /v1/auth/verify
    const authVerifyUrl = `${baseUrl}/v1/auth/verify`;
    const verifyRes = await fetch(authVerifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeConfig.apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;

    if (!verifyRes.ok) {
      clearTimeout(timeoutId);
      const errorText = await verifyRes.text().catch(() => "");
      return {
        ok: false,
        latencyMs,
        statusCode: verifyRes.status,
        message: `Error de autenticación Zernio (${verifyRes.status}): API Key inválida o revocada.`,
      };
    }

    const authData = await verifyRes.json();

    // 2. Consulta de cuentas vinculadas (/v1/accounts)
    let accounts: ZernioAccount[] = [];
    try {
      const accountsRes = await fetch(`${baseUrl}/v1/accounts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeConfig.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        if (Array.isArray(accountsData.accounts)) {
          accounts = accountsData.accounts.map((acc: any) => ({
            id: acc._id || acc.id,
            platform: acc.platform,
            displayName: acc.displayName || acc.platform,
            username: acc.username,
            status: acc.platformStatus || (acc.isActive ? "active" : "inactive"),
            profilePicture: acc.profilePicture,
            phone: acc.platform === "whatsapp" ? acc.username : undefined,
          }));
        }
      }
    } catch (accountsErr) {
      console.warn("No se pudieron cargar las cuentas de Zernio:", accountsErr);
    }

    clearTimeout(timeoutId);

    return {
      ok: true,
      latencyMs,
      statusCode: 200,
      message: "Conexión exitosa con la API de Zernio. Credenciales verificadas.",
      userId: authData.userId,
      accounts,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    if (error.name === "AbortError") {
      return {
        ok: false,
        latencyMs,
        message: "Tiempo de espera agotado al conectar con Zernio (> 7000ms).",
      };
    }

    return {
      ok: false,
      latencyMs,
      message: error.message || "Error de red al conectar con la API de Zernio.",
    };
  }
}

/**
 * Valida la firma criptográfica HMAC-SHA256 enviada por los webhooks de Zernio
 */
export function verifyZernioWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret?: string
): boolean {
  const secret = webhookSecret || process.env.ZERNIO_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(computedSignature, "utf-8");
    const providedBuffer = Buffer.from(
      signatureHeader.replace(/^sha256=/, ""),
      "utf-8"
    );

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    console.error("Error verificando firma de webhook Zernio:", err);
    return false;
  }
}

/**
 * Actualiza las variables de entorno de Zernio tanto en memoria como persistiendo en el archivo .env
 */
export async function saveZernioConfig(newConfig: Partial<ZernioConfig>): Promise<{ success: boolean; message: string }> {
  try {
    if (newConfig.apiKey !== undefined && newConfig.apiKey !== "") {
      process.env.ZERNIO_API_KEY = newConfig.apiKey;
    }
    if (newConfig.webhookSecret !== undefined && newConfig.webhookSecret !== "") {
      process.env.ZERNIO_WEBHOOK_SECRET = newConfig.webhookSecret;
    }
    if (newConfig.defaultAccountId !== undefined && newConfig.defaultAccountId !== "") {
      process.env.ZERNIO_DEFAULT_ACCOUNT_ID = newConfig.defaultAccountId;
    }
    if (newConfig.baseUrl !== undefined && newConfig.baseUrl !== "") {
      process.env.ZERNIO_BASE_URL = newConfig.baseUrl;
    }

    // Persistir en el archivo .env local para sobrevivir reinicios
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");

      const updateKey = (key: string, value: string | undefined) => {
        if (!value) return;
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      };

      if (newConfig.apiKey) updateKey("ZERNIO_API_KEY", newConfig.apiKey);
      if (newConfig.webhookSecret) updateKey("ZERNIO_WEBHOOK_SECRET", newConfig.webhookSecret);
      if (newConfig.defaultAccountId) updateKey("ZERNIO_DEFAULT_ACCOUNT_ID", newConfig.defaultAccountId);
      if (newConfig.baseUrl) updateKey("ZERNIO_BASE_URL", newConfig.baseUrl);

      fs.writeFileSync(envPath, envContent, "utf-8");
    }

    return {
      success: true,
      message: "Credenciales de Zernio guardadas y aplicadas exitosamente.",
    };
  } catch (error: any) {
    console.error("Error guardando credenciales de Zernio:", error);
    return {
      success: false,
      message: error.message || "Error al persistir la configuración.",
    };
  }
}

/**
 * Desconecta la cuenta activa de Zernio, limpiando variables en memoria y en el archivo .env
 */
export async function disconnectZernio(): Promise<{ success: boolean; message: string }> {
  try {
    process.env.ZERNIO_API_KEY = "";
    process.env.ZERNIO_WEBHOOK_SECRET = "";
    process.env.ZERNIO_DEFAULT_ACCOUNT_ID = "";

    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");

      const clearKey = (key: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=`);
        }
      };

      clearKey("ZERNIO_API_KEY");
      clearKey("ZERNIO_WEBHOOK_SECRET");
      clearKey("ZERNIO_DEFAULT_ACCOUNT_ID");

      fs.writeFileSync(envPath, envContent, "utf-8");
    }

    return {
      success: true,
      message: "Cuenta de Zernio desconectada exitosamente. Puedes conectar una nueva cuenta en cualquier momento.",
    };
  } catch (error: any) {
    console.error("Error desconectando Zernio:", error);
    return {
      success: false,
      message: error.message || "Error al desconectar la cuenta de Zernio.",
    };
  }
}

