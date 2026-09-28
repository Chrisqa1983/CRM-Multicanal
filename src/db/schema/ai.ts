import { pgTable, uuid, text, boolean, jsonb, real, integer, timestamp, customType } from "drizzle-orm/pg-core";

// Tipo para vector de pgvector (1536 dimensiones para embeddings estándar)
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value.replace(/^\[|\]$/g, "").split(",").map(Number);
      }
    }
    return [];
  },
});

export const agentConfigs = pgTable("agent_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull().unique(), // 'whatsapp' | 'instagram' | 'facebook'
  enabled: boolean("enabled").default(false).notNull(),
  model: text("model").default("google/gemini-2.5-flash").notNull(), // Vía OpenRouter
  fallbackModel: text("fallback_model").default("anthropic/claude-3.5-haiku"),
  temperature: real("temperature").default(0.3).notNull(),
  maxTokens: integer("max_tokens").default(600).notNull(),
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
  totalChunks: integer("total_chunks").default(0).notNull(),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => knowledgeDocuments.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector1536("embedding"), // pgvector para similitud coseno
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
