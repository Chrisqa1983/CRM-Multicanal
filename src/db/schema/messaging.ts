import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull(), // 'whatsapp' | 'instagram' | 'facebook'
  provider: text("provider").default("zernio").notNull(),
  externalId: text("external_id").notNull(), // Zernio conversation ID / Thread ID
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  contactId: uuid("contact_id"), // FK added post-creation to avoid circular ref with contactIdentities
  
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
