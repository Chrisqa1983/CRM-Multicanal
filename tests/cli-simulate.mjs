#!/usr/bin/env node

/**
 * CLI Simulation Runner para el CRM Omnicanal
 * Permite simular el envío de un webhook de WhatsApp, Instagram o Facebook
 * directamente desde la terminal para probar la reacción del bot y del Inbox en vivo.
 *
 * Uso:
 *   node tests/cli-simulate.mjs --channel whatsapp --text "Hola quiero informes"
 *   node tests/cli-simulate.mjs --channel instagram --text "¿Tienen citas hoy?"
 *   node tests/cli-simulate.mjs --channel facebook --text "Quiero hablar con un asesor"
 */

import * as http from "node:http";

function createSyntheticWebhookPayload(options) {
  const eventId = `synth_evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const timestamp = new Date().toISOString();

  let senderId = options.senderId;
  if (!senderId) {
    if (options.channel === "whatsapp") senderId = "+525500000000";
    else if (options.channel === "instagram") senderId = "igsid_user_test_99";
    else senderId = "fb_page_scoped_user_88";
  }

  const senderName = options.senderName || "Cliente Simulado";
  const text = options.text || "Hola, requiero información";

  return {
    eventId,
    provider: "zernio",
    channel: options.channel,
    timestamp,
    data: {
      messageId: `wamid_synth_${Date.now()}`,
      conversationId: `conv_synth_${senderId}`,
      sender: {
        id: senderId,
        name: senderName,
        handle: options.channel === "instagram" ? `@${senderName.toLowerCase().replace(/\s+/g, "_")}` : undefined,
      },
      message: {
        type: options.mediaUrl ? "image" : "text",
        text: text,
        mediaUrl: options.mediaUrl,
      },
    },
  };
}

const args = process.argv.slice(2);

function getArg(flag, defaultValue) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

const channel = getArg("--channel", "whatsapp");
const text = getArg("--text", "Hola, me gustaría agendar una cita de valoración");
const senderName = getArg("--name", "Cliente Simulado");
const port = getArg("--port", "3000");

const payload = createSyntheticWebhookPayload({
  channel,
  text,
  senderName,
});

console.log(`\n\x1b[36m🚀 Disparando mensaje sintético de ${channel.toUpperCase()}...\x1b[0m`);
console.log(`  \x1b[2mRemitente:\x1b[0m ${senderName}`);
console.log(`  \x1b[2mMensaje:\x1b[0m   "${text}"\n`);

const postData = JSON.stringify(payload);

const req = http.request(
  {
    hostname: "localhost",
    port: parseInt(port, 10),
    path: "/api/webhooks/zernio",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      "x-simulation-event": "true",
    },
    timeout: 5000,
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`\x1b[32m✔ Webhook recibido exitosamente por el CRM (HTTP ${res.statusCode})\x1b[0m`);
        console.log(`  \x1b[2mRespuesta:\x1b[0m ${body}`);
        console.log(`\x1b[33m⚡ Abre tu navegador en http://localhost:${port}/inbox para ver el chat en vivo y la respuesta de la IA.\x1b[0m\n`);
      } else {
        console.error(`\x1b[31m✖ El servidor respondió con error: HTTP ${res.statusCode}\x1b[0m`);
        console.error(`  ${body}\n`);
      }
    });
  }
);

req.on("error", (err) => {
  console.error(`\x1b[31m✖ No se pudo conectar al servidor local en http://localhost:${port}\x1b[0m`);
  console.error(`  Asegúrate de que el CRM esté corriendo con 'npm run dev'. (${err.message})\n`);
});

req.write(postData);
req.end();
