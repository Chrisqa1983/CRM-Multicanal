# ARQUITECTURA TÉCNICA MAESTRA: CRM OMNICANAL PARA AGENCIA DE SEGUROS
## WhatsApp (Zernio) + Bot Calificador IA (OpenRouter) + RAG Pólizas + Handoff Externo a Asesores + Embudo de Leads y Renovaciones

> **Documento de Diseño de Arquitectura, Benchmark Comparativo y Especificación de Implementación**  
> **Fecha:** Septiembre 2026  
> **Vertical:** Agencia de Seguros y Corredurías (Autos, Gastos Médicos, Vida/Ahorro)  
> **Estado:** Aprobado tras sesión de diseño (/brainstorming)

---

## 1. Análisis y Benchmark Comparativo de las 3 Fichas Técnicas

Hemos analizado minuciosamente las tres fichas técnicas de los proyectos de referencia:
1. **`whatsapp-crm-panel` (Ficha Alisha)**: Especialista en robustez de backend, cumplimiento de políticas de Meta, RAG nativo y simulación.
2. **`new-crm-zernio` (Ficha Diego)**: Especialista en abstracción multicanal con Zernio, orquestación de IA por canal y Tool Calling de OpenRouter.
3. **`Workcil` (Ficha Workcil)**: Especialista en experiencia de usuario clínica, normalización telefónica y diseño de interfaz de alta densidad.

### Matriz Comparativa de Capacidades

| Dimensión Técnica | Alisha (`whatsapp-crm-panel`) | Diego (`new-crm-zernio`) | Workcil (`Workcil`) | **El Nuevo CRM Seguros Definitivo** |
| :--- | :--- | :--- | :--- | :--- |
| **Framework Base** | Fastify 5 + React Vite | Next.js 15 (App Router) | Next.js 16 (App Router) | **Next.js 15+ (App Router Full-Stack)** |
| **Proveedor de Conexión** | Meta Graph API directa | **Zernio API (Multi-red)** | Meta Graph API directa | **Zernio API (WhatsApp Central)** |
| **Canales Soportados** | Solo WhatsApp | WhatsApp, Instagram, Messenger | WhatsApp, Instagram | **WhatsApp Centralizado (Línea Oficial)** |
| **Ventana de 24h Meta** | Bloqueo en UI y Backend (`FOR UPDATE`) | Backend `template_only` + Tag 7d | No implementado estrictamente | **Doble validación: Contador vivo en UI + Backend pesimista + Templates HSM** |
| **Plantillas WhatsApp** | Catálogo local con sincronización | Selector integrado | No implementado | **Creador visual + Sincronización + Recordatorios de Renovación de Póliza** |
| **Agente de IA** | Global con debounce 6s y RAG FTS | Independiente por canal con Tool Calling | No implementado | **Bot Calificador (Prompt Seguros, RAG Pólizas, Extracción de Leads)** |
| **Base de Conocimientos (RAG)** | Full-Text Search nativo en PostgreSQL | Herramienta `search_faq` básica | No implementado | **RAG Híbrido (pgvector + FTS léxico para folletos, sumas aseguradas y deducibles)** |
| **Embudo & Operación** | Sin módulo de ventas | Herramienta `create_booking` en IA | Esquema planeado (`patients`) | **Embudo de Leads (Kanban) + Clientes y Pólizas + Handoff Externo con Email** |
| **Sincronización en Tiempo Real** | WebSockets persistentes | Polling HTTP cada 3s | Polling HTTP cada 4s | **Server-Sent Events (SSE) nativo en Next.js (<100ms)** |
| **Autenticación** | Sesiones nativas Argon2id en DB | Cookies / Headers | InsForge BaaS Auth | **Autenticación Nativa con Drizzle ORM + Argon2id + Cookies HTTP-Only** |
| **Simulación / Pruebas** | `SimulatedGraphClient` completo | Scripts de prueba aislados | Mock manual | **Modo Sandbox / Simulación dual para QA sin gastar saldo** |

---

## 2. Decisiones Arquitectónicas Aprobadas

A través del proceso de definición y brainstorming, se acordaron las siguientes bases fundamentales:
1. **Framework y Runtime:** Next.js 15+ App Router con React 19, TypeScript estricto y Tailwind CSS con primitivas Radix/Shadcn UI.
2. **Modelo de Usuarios (Tenancy):** CRM para el equipo de la correduría (1 Administrador/Director + 3 Asesores Especializados por Ramo: Autos, Gastos Médicos, Vida/Ahorro).
3. **Mecanismo de Tiempo Real:** Server-Sent Events (SSE) nativo en Next.js (`GET /api/realtime/stream`) para entrega inmediata de mensajes y estados de entrega sin servicios externos de pago.
4. **Base de Conocimientos (RAG):** Motor Híbrido en PostgreSQL que combina `pgvector` y Full-Text Search (`tsvector` + GIN) para responder dudas exactas sobre deducibles, sumas aseguradas, coberturas y exclusiones con folletos PDF de aseguradoras (GNP, AXA, Mapfre, etc.).
5. **Handoff Externo + Notificación por Email:** Los asesores continúan atendiendo a los clientes desde sus WhatsApps personales. Cuando el bot califica un lead, crea el registro en el CRM y despacha un correo al asesor con enlace directo a la ficha del lead (`/leads/[id]`) para que consulte la conversación y contexto previo antes de chatear.
6. **Embudo de Ventas (Pipeline Kanban):** Panel visual que sustituye al módulo de calendario, organizando los prospectos en etapas claras: `Nuevo (Bot)`, `Pendiente de Asesor`, `En Atención`, `Póliza Emitida (Venta Cerrada)` y `Perdido`.
7. **Directorio de Clientes & Pólizas (Renovaciones):** Al concretarse una venta, el asesor captura los datos de la póliza (número, aseguradora, vigencias y primas) para monitorear la retención de cartera y activar alertas de renovación anual.
8. **Plantillas y Ventana de 24 Horas:** Uso de plantillas HSM aprobadas para reactivar clientes o enviar avisos formales de renovación cuando la ventana de 24h ha vencido.
9. **Autenticación y Seguridad:** Sistema nativo con Drizzle ORM, hashing Argon2id, tokens de sesión criptográficos en cookies HTTP-only seguras y cifrado AES-256-GCM para API Keys y secretos.
10. **Modo Simulación (Sandbox):** Entorno de pruebas desacoplado para simular mensajes de clientes, respuestas automáticas y webhooks sin consumir saldo de Zernio.

---

## 3. Diagrama de Arquitectura Global

```
                               ┌────────────────────────────────────────────────┐
                               │           Zernio Omnichannel Gateway           │
                               │        (WhatsApp, Instagram, Facebook)         │
                               └───────────────────────┬────────────────────────┘
                                                       │ Webhook HTTP POST (Firma HMAC-SHA256)
                                                       ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NEXT.JS 15+ APP ROUTER BACKEND                                                                        │
│                                                                                                       │
│  [POST /api/webhooks/zernio]                                                                          │
│    ├── 1. Verificación timingSafeEqual(HMAC_SHA256, signature)                                       │
│    ├── 2. Deduplicación atómica (INSERT ON CONFLICT DO NOTHING en webhook_events)                    │
│    ├── 3. Persistencia de Conversación y Mensaje Inbound (actualiza last_inbound_at)                  │
│    ├── 4. Emisión a Stream SSE (evento message:new hacia los navegadores)                            │
│    └── 5. Respuesta HTTP 200 OK (< 150 ms)                                                           │
│                                                                                                       │
│  [Background Job: Next.js after() / Debounce Worker (5s)]                                             │
│    ├── Mutex por conversación (Previene ejecuciones paralelas)                                        │
│    ├── Validación: ¿Conversación tiene ai_enabled = true?                                             │
│    ├── Carga de configuración del canal (agent_configs WHERE channel = ?)                             │
│    ├── Ejecución del Orquestador de IA (OpenRouter API):                                              │
│    │     ├── RAG Híbrido: (pgvector <=> query_embedding) + ts_rank(tsvector, websearch_query)       │
│    │     └── Tool Calling: qualify_insurance_lead, search_faq, notify_advisor_email                  │
│    ├── Despacho Saliente (deliverMessage):                                                            │
│    │     ├── Validación ventana 24h Meta (WhatsApp: template_only / IG/FB: tag HUMAN_AGENT)           │
│    │     ├── Envío HTTP a Zernio Inbox API                                                            │
│    │     └── Emisión a Stream SSE (evento message:new de salida)                                      │
│    └── Notificación Transaccional (Resend / SMTP):                                                    │
│          └── Envío de Email con link a /leads/[id] al asesor especialista                             │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CAPA DE PERSISTENCIA (PostgreSQL 16 + pgvector)                                                       │
│                                                                                                       │
│  • users & sessions (Argon2id, HTTP-only Cookies)                                                     │
│  • conversations, messages, contact_identities (Normalización Omnicanal Zernio)                       │
│  • agent_configs (WhatsApp, Instagram, Facebook - Prompts de Seguros y Modelos OpenRouter)            │
│  • knowledge_documents & document_chunks (pgvector 1536d + tsvector GIN - Folletos de Seguros)        │
│  • insurance_leads (Embudo de ventas, datos de vehículo/salud, asesor asignado, estatus)               │
│  • insurance_policies (Pólizas emitidas, aseguradora, inicio/fin vigencia, primas, renovaciones)      │
│  • templates (Catálogo HSM, estado de aprobación Meta para avisos de renovación de póliza)            │
│  • webhook_events (Auditoría e idempotencia)                                                          │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼ Server-Sent Events (SSE)
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CAPA CLIENTE FRONTEND (React 19 + Tailwind CSS + Radix/Shadcn)                                        │
│                                                                                                       │
│  • App Shell con Navegación: /inbox, /leads, /policies, /templates, /knowledge, /agents, /users       │
│  • Inbox Centralizado: Supervisión de chats y transcripción del bot en tiempo real                     │
│  • Embudo de Leads (/leads): Vista Kanban (Nuevo -> Pendiente Asesor -> En Atención -> Cerrado)      │
│  • Ficha de Lead (/leads/[id]): Transcripción completa del bot, datos del prospecto y botón WhatsApp   │
│  • Cartera de Pólizas (/policies): Alertas de renovación a 30/15 días y control de vigencias           │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de Datos Relacional (Esquema Drizzle ORM)

### 4.1. Módulo de Usuarios y Autenticación
```typescript
// server/db/schema/auth.ts
import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "supervisor", "agent"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("agent").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 4.2. Módulo Omnicanal (Zernio) e Inbox
```typescript
// server/db/schema/messaging.ts
import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull(), // 'whatsapp' | 'instagram' | 'facebook'
  provider: text("provider").default("zernio").notNull(),
  externalId: text("external_id").notNull(), // Zernio conversation ID / Thread ID
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Datos del contacto en la red
  participantId: text("participant_id").notNull(), // Teléfono o IGSID / FB Page Scoped ID
  participantName: text("participant_name").notNull(),
  participantHandle: text("participant_handle"),
  participantAvatar: text("participant_avatar"),
  
  // Tiempos y estados
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }).defaultNow().notNull(),
  unreadCount: integer("unread_count").default(0).notNull(),
  status: text("status").default("open").notNull(), // 'open' | 'pending' | 'resolved' | 'snoozed'
  
  // Control de Inteligencia Artificial
  aiEnabled: boolean("ai_enabled").default(true).notNull(),
  needsHuman: boolean("needs_human").default(false).notNull(),
  needsHumanReason: text("needs_human_reason"),
  
  // Metadatos y etiquetas
  tags: jsonb("tags").default([]).notNull(), // ['urgente', 'nuevo_lead', 'cliente_vip']
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uqProviderExternal: uniqueIndex("uq_conv_provider_external").on(table.provider, table.externalId),
  idxChannel: index("idx_conv_channel").on(table.channel),
  idxLastMessage: index("idx_conv_last_message").on(table.lastMessageAt),
  idxAssigned: index("idx_conv_assigned").on(table.assignedUserId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  channel: text("channel").notNull(),
  provider: text("provider").default("zernio").notNull(),
  externalId: text("external_id"), // WAMID o Zernio Message ID
  
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  senderType: text("sender_type").notNull(), // 'contact' | 'agent' | 'ai' | 'system'
  senderId: text("sender_id"), // ID del usuario humano si fue enviado por asesor
  
  type: text("type").default("text").notNull(), // 'text' | 'image' | 'audio' | 'video' | 'document' | 'template'
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  templateName: text("template_name"),
  
  status: text("status").default("pending").notNull(), // 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  failureReason: text("failure_reason"),
  rawPayload: jsonb("raw_payload"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uqExternalId: uniqueIndex("uq_msg_external_id_partial").on(table.externalId).where(sql`external_id IS NOT NULL`),
  idxConvSent: index("idx_msg_conv_sent").on(table.conversationId, table.sentAt),
}));

export const contactIdentities = pgTable("contact_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull(),
  externalId: text("external_id").notNull(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  handle: text("handle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uqChannelExternal: uniqueIndex("uq_contact_id_channel_ext").on(table.channel, table.externalId),
}));

export const webhookEvents = pgTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  provider: text("provider").default("zernio").notNull(),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 4.3. Módulo de Agentes de IA por Canal y RAG Híbrido
```typescript
// server/db/schema/ai.ts
import { pgTable, uuid, text, boolean, jsonb, real, timestamp, customType } from "drizzle-orm/pg-core";

// Tipo para vector de pgvector (1536 dimensiones para embeddings estándar)
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return JSON.parse(value);
  },
});

export const agentConfigs = pgTable("agent_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull().unique(), // 'whatsapp' | 'instagram' | 'facebook'
  enabled: boolean("enabled").default(false).notNull(),
  model: text("model").default("google/gemini-2.5-flash").notNull(), // Vía OpenRouter
  fallbackModel: text("fallback_model").default("anthropic/claude-3.5-haiku"),
  temperature: real("temperature").default(0.3).notNull(),
  maxTokens: real("max_tokens").default(600).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  enabledTools: jsonb("enabled_tools").default(["check_availability", "create_booking", "search_faq", "escalate_to_human"]).notNull(),
  debounceSeconds: real("debounce_seconds").default(5.0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull(),
  fileSize: real("file_size").notNull(),
  mimeType: text("mime_type").notNull(), // 'application/pdf', 'application/vnd.openxmlformats-officedocument...', 'text/plain'
  storagePath: text("storage_path").notNull(),
  totalChunks: real("total_chunks").default(0).notNull(),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: real("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector1536("embedding"), // pgvector para similitud coseno
  // FTS tsvector se indexa con GIN nativo en PostgreSQL
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 4.4. Módulo de Leads de Seguros, Pólizas y Plantillas WhatsApp
```typescript
// server/db/schema/operations.ts
import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, real } from "drizzle-orm/pg-core";
import { conversations } from "./messaging";
import { users } from "./auth";

// Embudo de ventas (Pipeline Kanban)
export const insuranceLeads = pgTable("insurance_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }), // Asesor especialista
  
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientEmail: text("client_email"),
  
  insuranceType: text("insurance_type").notNull(), // 'auto' | 'gastos_medicos' | 'vida' | 'hogar' | 'empresa'
  qualificationData: jsonb("qualification_data").default({}).notNull(), // Datos del vehículo, coberturas, presupuesto
  notes: text("notes"),
  
  // Estados del Embudo
  status: text("status").default("nuevo").notNull(), 
  // 'nuevo' | 'pendiente_asesor' | 'en_atencion' | 'poliza_emitida' | 'perdido'
  lostReason: text("lost_reason"),
  
  leadScore: integer("lead_score").default(50),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  notificationSentAt: timestamp("notification_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Directorio de Clientes y Pólizas Emitidas (Cartera & Renovaciones)
export const insurancePolicies = pgTable("insurance_policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").references(() => insuranceLeads.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }), // Asesor responsable
  
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientEmail: text("client_email"),
  
  policyNumber: text("policy_number").notNull().unique(),
  insuranceCompany: text("insurance_company").notNull(), // 'GNP' | 'AXA' | 'Mapfre' | 'MetLife' | 'Quálitas' | etc.
  insuranceType: text("insurance_type").notNull(), // 'auto' | 'gastos_medicos' | 'vida' | 'hogar'
  premiumAmount: real("premium_amount").notNull(), // Prima anual
  
  startDate: timestamp("start_date", { withTimezone: true }).notNull(), // Inicio de vigencia
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),     // Fin de vigencia (Fecha de renovación)
  
  status: text("status").default("activa").notNull(), // 'activa' | 'por_renovar' | 'renovada' | 'cancelada'
  renewalReminderSentAt: timestamp("renewal_reminder_sent_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // Nombre identificador de Meta (snake_case)
  category: text("category").notNull(), // 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: text("language").default("es").notNull(),
  
  headerType: text("header_type").default("NONE").notNull(), // 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT'
  headerContent: text("header_content"),
  bodyText: text("body_text").notNull(), // Contiene variables {{1}}, {{2}}
  footerText: text("footer_text"),
  buttons: jsonb("buttons").default([]).notNull(), // Botones rápidos o URL
  
  status: text("status").default("PENDING").notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: text("rejection_reason"),
  metaTemplateId: text("meta_template_id"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 5. Especificación de los Subsistemas Críticos

### 5.1. Conectividad Zernio & SLA de Ingestión (< 150 ms)
- **Firma Criptográfica:** El endpoint `POST /api/webhooks/zernio` lee `request.text()` y efectúa `crypto.timingSafeEqual` con el HMAC-SHA256 generado usando el secreto de Zernio.
- **Idempotencia Atómica:** Si el `event_id` ya existe en `webhook_events`, se descarta al vuelo y devuelve `HTTP 200 { deduplicated: true }`.
- **Ejecución Desacoplada:** El procesamiento pesado (RAG, OpenRouter y respuesta automática) se delega a un background worker mediante `after()` de Next.js, respondiendo al webhook de Zernio en < 150 ms para evitar timeouts o desactivaciones de suscripción.

### 5.2. Control Estricto de la Ventana de 24 Horas de Meta
- **Regla Temporal:** `ventanaValida = (Date.now() - conversation.lastInboundAt) < 24 * 60 * 60 * 1000`.
- **En Frontend:**
  - Si la ventana está abierta: Caja de texto libre activa con contador dinámico en la cabecera (*"Ventana abierta: 18h 42m restantes"*).
  - Si la ventana expiró: Caja de texto libre bloqueada con advertencia y botón prominente *"Seleccionar Plantilla Aprobada"*.
- **En Backend (`deliverMessage`):**
  - Si el canal es WhatsApp y la ventana expiró, rechaza cualquier mensaje de texto libre con `422 WINDOW_EXPIRED` a menos que sea de tipo `template`.
  - Si el canal es Instagram o Messenger y han pasado entre 24h y 7 días, inyecta automáticamente la etiqueta `HUMAN_AGENT` en el payload de Zernio.

### 5.3. Agente de IA Calificador & Tool Calling con OpenRouter (Modelo Unificado)
- **Cerebro Central Unificado:** Utiliza `google/gemini-2.5-flash` (con fallback a `anthropic/claude-3.5-haiku`) como motor central agnóstico al canal, compartiendo el mismo prompt maestro de prospección y base documental en todas las redes.
- **Detección Dinámica de Redes Zernio:** El CRM consulta en vivo `/v1/accounts` y muestra únicamente las redes conectadas (WhatsApp, Instagram, Facebook), ocultando automáticamente cualquier canal inactivo o sin configurar.
- **Despliegue y Switches por Canal:** Permite encender o pausar las respuestas de la IA por red social independiente (ej. WhatsApp activo, Instagram en atención manual), además de contar con un switch maestro de apagado global.
- **Debounce de 5 Segundos:** Agrupa mensajes y audios sucesivos del usuario antes de invocar a OpenRouter, evitando fragmentación o duplicidad de respuestas.
- **Herramientas Disponibles para la IA (Function Calling):**
  1. `search_faq({ query })`: Consulta en el RAG híbrido folletos, deducibles, sumas aseguradas y coberturas de aseguradoras asociadas.
  2. `qualify_insurance_lead({ clientName, phone, email, insuranceType, vehicleOrHealthDetails, notes })`:
     - Identifica el ramo solicitado (`auto`, `gastos_medicos`, `vida`, `hogar`).
     - Extrae datos estructurados (ej. año, marca y modelo del vehículo, o edad de asegurados).
     - Inserta el registro en `insurance_leads` con estado `pendiente_asesor`.
     - Asigna automáticamente al asesor especialista según el ramo.
  3. `notify_advisor_email({ leadId, advisorEmail, advisorName, summary })`:
     - Despacha un correo transaccional (Resend / SMTP) al asesor especialista con los datos del lead y un enlace directo a `/leads/[id]`.
     - Comparte en el chat de WhatsApp al cliente el mensaje de confirmación: *"¡Excelente! He transferido tu información a nuestro especialista en [Ramo], quien se pondrá en contacto contigo a la brevedad"*.
- **Pausa Inmediata:** Una vez calificado y transferido, la IA se pausa automáticamente para dar paso a la gestión del asesor.

### 5.4. Motor de RAG Híbrido (Documentos a Respuestas)
- **Ingesta Documental:** Soporte para archivos `.pdf` (vía `pdf-parse`), `.docx` (vía `mammoth`) y `.txt`.
- **Chunking Semántico:** Fragmentos de 1,000 caracteres con 200 caracteres de solapamiento (*overlap*), respetando párrafos y puntuación.
- **Indexación Dual:**
  - Vectorial: Generación de embeddings con `text-embedding-3-small` (1536 dimensiones) indexados en `pgvector`.
  - Léxica: Columna `tsvector` con diccionario `spanish` e índice GIN.
- **Reciprocal Rank Fusion (RRF):** Al recibir una consulta del bot, se combinan los resultados de distancia coseno de `pgvector` con el ranking léxico `ts_rank_cd`. El contexto resultante se inyecta en el prompt del sistema antes de llamar a OpenRouter.

### 5.5. Sincronización en Tiempo Real mediante SSE (Server-Sent Events)
- **Ruta del Servidor:** `GET /api/realtime/stream`.
- **Eventos Emitidos:**
  - `message:new`: Nuevo mensaje entrante o saliente.
  - `lead:new`: Notificación en vivo al dashboard del CRM de un nuevo lead calificado por el bot.
  - `lead:status_changed`: Actualización de estado en el Embudo Kanban.
  - `policy:renewal_alert`: Alerta de póliza próxima a vencer (30 o 15 días).
- **Heartbeat / Keep-Alive Automático:** El servidor emite `:keepalive\n\n` cada 15 segundos para mantener vivas las conexiones.

### 5.6. Modo Sandbox / Simulación Dual
- Se implementa un interruptor en el panel de desarrollador/admin: `SIMULATION_MODE=true`.
- Permite abrir un chat virtual con un número ficticio (+52 55 0000 0000), escribir mensajes simulando ser un interesado en seguro de auto o gastos médicos, ver cómo el bot califica el prospecto, cómo consulta el RAG y cómo dispara la creación del lead y correo al asesor sin gastar saldo en Zernio.

### 5.7. Flujo Operativo Especializado: Correduría de Seguros (3 Asesores)
El CRM opera bajo una dinámica diseñada para maximizar conversiones y retención de cartera:
- **Asignación Especializada por Ramo:**
  - **Asesor 1 (Especialista Autos):** Pólizas individuales y de flotillas, cobertura amplia/limitada, deducibles.
  - **Asesor 2 (Especialista Gastos Médicos Mayores):** Pólizas individuales y familiares, tabuladores, deducibles y coaseguros.
  - **Asesor 3 (Especialista Vida y Ahorro):** Pólizas de vida, retiro, dótales e inversión.
- **Handoff Externo:** El asesor recibe el correo, abre la ficha del lead en el CRM para empaparse de la conversación del bot, contacta al cliente vía su propio WhatsApp con pleno contexto, y actualiza el estatus del lead en el embudo.
- **Cierre y Retención de Cartera:** Al cerrarse la venta, el asesor captura el número de póliza, la aseguradora y la vigencia fin. El CRM programa automáticamente los avisos de renovación a 30 y 15 días antes del vencimiento.
  - Etiquetas iniciales: `prospecto_calificado`, `demo_agendada`, `propuesta_enviada`, `cliente_vip`.

### 5.8. Estrategia Integral de Testing (Playwright E2E + Vitest)
Adoptando la mejor práctica de grado enterprise demostrada en la Ficha Técnica Alisha:
1. **Pruebas Unitarias y de Integración (Vitest):**
   - Validación matemática y temporal de la ventana de 24h de Meta (`meta-window.test.ts`).
   - Deduplicación atómica de eventos de webhook (`idempotency.test.ts`).
   - Hashing Argon2id y revocación de sesiones (`auth.test.ts`).
   - Debounce de mensajes entrantes y lógica de hand-off humano (`agent-orchestrator.test.ts`).
2. **Pruebas End-to-End en el Navegador (Playwright):**
   - Ejecutadas sobre el `SIMULATION_MODE` con base de datos en memoria o branch local.
   - Flujo 1: Emisión de webhook sintético -> Renderizado reactivo en el Inbox vía SSE -> Contador de 24h activo.
   - Flujo 2: Vencimiento forzado del timer de 24h -> Bloqueo del compositor -> Apertura de modal de plantillas HSM.
   - Flujo 3: El cliente escribe por chat virtual -> La IA responde con RAG -> El asesor escribe un mensaje manual -> Se verifica que la IA se pausa automáticamente (`ai_enabled = false`).
   - Cero saldo gastado en Meta o Zernio durante toda la ejecución de CI/CD.

---

## 6. Estructura de Directorios del Proyecto

```
crm-zernio-pro/
├── src/
│   ├── app/                                # Next.js 15 App Router
│   │   ├── (auth)/                         # Grupo de rutas de autenticación
│   │   │   ├── login/page.tsx
│   │   │   └── setup/page.tsx
│   │   ├── (dashboard)/                    # Layout principal protegido
│   │   │   ├── layout.tsx                  # App Shell con Sidebar y Header
│   │   │   ├── inbox/                      # Bandeja de entrada omnicanal
│   │   │   │   └── page.tsx                # Supervisión de chat en vivo y transcripciones
│   │   │   ├── leads/                      # Embudo de Ventas (Pipeline Kanban)
│   │   │   │   ├── page.tsx                # Tablero visual de prospectos por estados
│   │   │   │   └── [id]/page.tsx           # Ficha de contexto de lead con transcripción del bot
│   │   │   ├── policies/                   # Directorio de Clientes y Pólizas Emitidas
│   │   │   │   └── page.tsx                # Tabla de pólizas, vigencias y alertas de renovación
│   │   │   ├── templates/                  # Creador y gestor de plantillas WhatsApp
│   │   │   │   └── page.tsx
│   │   │   ├── knowledge/                  # Base de conocimientos RAG (folletos de seguros)
│   │   │   │   └── page.tsx
│   │   │   ├── agents/                     # Configuración de Agente IA Calificador
│   │   │   │   └── page.tsx
│   │   │   └── users/                      # Gestión de los 3 Asesores y Director
│   │   │       └── page.tsx
│   │   └── api/                            # Route Handlers
│   │       ├── auth/[...route]/route.ts    # Login, logout, me
│   │       ├── webhooks/zernio/route.ts    # Webhook Zernio HMAC y deduplicación
│   │       ├── realtime/stream/route.ts    # Server-Sent Events (SSE)
│   │       ├── leads/route.ts              # CRUD de leads y asignación
│   │       ├── policies/route.ts           # CRUD de pólizas y alertas
│   │       ├── templates/sync/route.ts     # Sincronización de plantillas con Meta
│   │       └── simulation/route.ts         # Endpoint de pruebas sintéticas
│   │
│   ├── components/                         # Componentes de UI modulares
│   │   ├── ui/                             # Primitivas Radix/Shadcn (Button, Dialog, etc.)
│   │   ├── inbox/                          # ChatList, ChatWindow, ContactDetail, WindowBadge
│   │   ├── leads/                          # KanbanBoard, LeadCard, LeadDetailModal
│   │   ├── policies/                       # PolicyTable, RenewalBadge, PolicyFormModal
│   │   ├── templates/                      # TemplateEditor, TemplatePreview, VariableInjector
│   │   └── knowledge/                      # DocumentUploader, ChunkInspector
│   │
│   ├── lib/                                # Lógica de Dominio y Servicios
│   │   ├── zernio/                         # Cliente SDK Zernio (envíos, cuentas, webhooks)
│   │   ├── meta/                           # Calculador de ventana 24h y tags de mensaje
│   │   ├── email/                          # Notificaciones transaccionales (Resend / SMTP)
│   │   ├── agent/                          # Orquestador OpenRouter, Prompts de Seguros, Debounce
│   │   │   ├── runner.ts
│   │   │   └── tools.ts                    # Function calling (qualify_lead, email_advisor, faq)
│   │   ├── rag/                            # Chunking, embeddings y búsqueda híbrida
│   │   ├── storage/                        # Adaptador de almacenamiento (Local / S3 / R2)
│   │   ├── auth/                           # Sesiones seguras Argon2id y middleware
│   │   └── realtime/                       # Broadcaster de eventos SSE
│   │
│   └── db/                                 # Base de datos Drizzle ORM
│       ├── schema/                         # Esquemas divididos (auth, messaging, ai, ops)
│       ├── migrations/                     # Migraciones generadas por Drizzle Kit
│       └── index.ts                        # Cliente de conexión PostgreSQL
│
├── uploads/                                # Almacenamiento local de medios y folletos
├── drizzle.config.ts                       # Configuración de Drizzle Kit
├── tailwind.config.ts                      # Configuración de temas y tokens de diseño
└── package.json
```

---

## 7. Plan de Implementación por Fases

### Fase 1: Cimientos, Base de Datos y Autenticación
- Configuración del proyecto Next.js 15+ con TypeScript y Tailwind CSS.
- Esquema Drizzle ORM completo con tablas de Seguros (`insurance_leads`, `insurance_policies`), `pgvector` y FTS.
- Sistema de autenticación nativa con Argon2id, roles (`admin`, `agent`) para el Director y los 3 Asesores.

### Fase 2: Pasarela Zernio y Sincronización en Tiempo Real
- Webhook unificado de Zernio con validación de firma HMAC-SHA256 y deduplicación en `webhook_events`.
- Implementación del pipeline de entrega `deliverMessage` con control de ventana 24h e inyección de tags.
- Hub de Server-Sent Events (SSE) en `/api/realtime/stream` con eventos en vivo para leads y mensajes.

### Fase 3: Inbox Centralizado y Gestor de Plantillas WhatsApp
- Pantalla de Inbox para supervisar conversaciones en vivo y transcripciones completas generadas por el bot.
- Indicador visual de la ventana de 24 horas y selector de plantillas HSM.
- Creador visual de plantillas WhatsApp HSM para reactivaciones y avisos de renovación.

### Fase 4: Base de Conocimientos (RAG Folletos) y Bot Calificador
- Subida de folletos y condiciones de aseguradoras (`.pdf`, `.docx`) con chunking semántico e indexación vectorial/FTS.
- Configuración del Bot Calificador con prompts especializados en prospección de seguros (Autos, Salud, Vida).
- Debounce de 5 segundos y Tool Calling para calificar leads y asignar al asesor según el ramo.

### Fase 5: Embudo de Leads, Cartera de Pólizas & Notificaciones por Email
- Dispatcher de correo electrónico (Resend / SMTP) que envía la alerta al asesor con enlace directo a `/leads/[id]`.
- Tablero Kanban interactivo (`/leads`) con estados: *Nuevo*, *Pendiente Asesor*, *En Atención*, *Póliza Emitida*, *Perdido*.
- Directorio de Clientes & Pólizas (`/policies`) con alertas automáticas de renovación anual a 30 y 15 días.
- Modo Sandbox de simulación para validar la calificación y el despacho de notificaciones sin costo.
