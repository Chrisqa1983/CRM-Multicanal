# REGLAS DE DOMINIO Y RESTRICCIONES ARQUITECTÓNICAS DEL CRM OMNICANAL

Estas reglas son obligatorias y deben ser respetadas por cualquier desarrollador o agente de IA que modifique o extienda este repositorio.

---

## 1. Cumplimiento Estricto de las Políticas de Mensajería de Meta

### 1.1. Ventana de 24 Horas en WhatsApp
- **Cálculo:** `isWindowOpen = (now - conversation.lastInboundAt) < 24 * 60 * 60 * 1000`.
- **Restricción Dura en Backend:** En `deliverMessage()` o cualquier endpoint de envío saliente hacia WhatsApp:
  - Si la ventana está cerrada y el mensaje es de texto libre (`type === 'text'`), la petición **DEBE RECHAZARSE** con código HTTP `422 Unprocessable Entity` y código de error `WINDOW_CLOSED`.
  - El único contenido permitido fuera de la ventana son **plantillas aprobadas de Meta (HSM)**.
- **Restricción en Frontend:** El compositor de texto debe deshabilitarse visualmente, mostrando el banner de advertencia y el botón selector de plantillas.

### 1.2. Etiqueta `HUMAN_AGENT` en Instagram y Facebook Messenger
- Si han transcurrido más de 24 horas pero menos de 7 días desde el último mensaje del usuario (`lastInboundAt`), todo mensaje saliente enviado por un operador humano debe inyectar automáticamente `messagingType: "MESSAGE_TAG"` con `messageTag: "HUMAN_AGENT"`.
- Pasados los 7 días, el canal queda cerrado para salida hasta nueva interacción del usuario.

---

## 2. Ingestión Idempotente de Webhooks de Zernio
- **Firma HMAC-SHA256:** Todo webhook en `/api/webhooks/zernio` debe validar la firma contra `request.text()` crudo usando `crypto.timingSafeEqual`.
- **Deduplicación At-Least-Once:** Antes de procesar el evento, se debe ejecutar un `INSERT INTO webhook_events (event_id, ...) ON CONFLICT DO NOTHING RETURNING event_id`. Si no retorna fila, responder de inmediato `200 OK { deduplicated: true }` y terminar.
- **SLA de Respuesta:** Responder HTTP 200 en menos de 200 ms. Toda lógica pesada (RAG, OpenRouter, autorrespuesta) debe ejecutarse de manera asíncrona mediante `after()` o background workers.

---

## 3. Comportamiento de los Agentes de Inteligencia Artificial
- **Pausa Inmediata ante Intervención Humana:** Cuando un asesor humano envía un mensaje manual a través del Inbox, el sistema DEBE actualizar de inmediato `UPDATE conversations SET ai_enabled = false` para ceder el control total.
- **Debounce de Entrada (5 segundos):** Los mensajes entrantes deben acumularse durante 5 segundos antes de disparar la llamada a OpenRouter, evitando que el bot responda de forma fragmentada a clientes que escriben en múltiples frases cortas.
- **Aislamiento por Canal:** El agente de WhatsApp, el de Instagram y el de Facebook nunca deben compartir contexto ni configuraciones. Cada canal tiene su propio modelo en `agent_configs`.
- **Tool Calling:** La IA nunca debe inventar disponibilidad de citas ni confirmar horarios sin antes invocar la herramienta `check_availability` y registrar con `create_booking`.
