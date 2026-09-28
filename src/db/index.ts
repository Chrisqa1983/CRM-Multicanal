import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as messagingSchema from "./schema/messaging";
import * as operationsSchema from "./schema/operations";
import * as aiSchema from "./schema/ai";

const schema = {
  ...authSchema,
  ...messagingSchema,
  ...operationsSchema,
  ...aiSchema,
};

const connectionString = process.env.DATABASE_URL || "";

// Disable prefetch/prepare for transaction poolers (like Supabase pgbouncer)
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
