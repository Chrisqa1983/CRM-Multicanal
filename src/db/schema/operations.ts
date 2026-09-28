import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, real } from "drizzle-orm/pg-core";
import { conversations } from "./messaging";
import { users } from "./auth";

/**
 * Embudo de Ventas para Seguros (Pipeline Kanban)
 * Cada registro representa un prospecto calificado automáticamente por el bot de WhatsApp
 * y asignado al asesor correspondiente según el ramo.
 */
export const insuranceLeads = pgTable("insurance_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }), // Asesor especialista
  
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  clientEmail: text("client_email"),
  
  insuranceType: text("insurance_type").notNull(), // 'auto' | 'gastos_medicos' | 'vida' | 'hogar' | 'empresa'
  qualificationData: jsonb("qualification_data").default({}).notNull(), // Datos del vehículo, coberturas, deducibles, edad
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

/**
 * Directorio de Clientes y Pólizas Emitidas (Cartera & Renovaciones)
 * Capturado por el asesor cuando concreta la venta para monitorear retención
 * y programar alertas de renovación a 30 y 15 días del vencimiento.
 */
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
  premiumAmount: real("premium_amount").notNull(), // Monto de la prima anual
  
  startDate: timestamp("start_date", { withTimezone: true }).notNull(), // Inicio de vigencia
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),     // Fin de vigencia (Fecha clave para renovación)
  
  status: text("status").default("activa").notNull(), // 'activa' | 'por_renovar' | 'renovada' | 'cancelada'
  renewalReminderSentAt: timestamp("renewal_reminder_sent_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Plantillas WhatsApp HSM (Meta)
 * Utilizadas para recordatorios formales de renovación de póliza
 * una vez vencida la ventana de 24 horas.
 */
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
