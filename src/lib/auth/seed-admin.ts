import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { hashPassword } from "./password";

export const DEFAULT_ADMIN_EMAIL = "yiyodroid@gmail.com";
export const DEFAULT_ADMIN_NAME = "Christian Acosta";
export const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function ensureDefaultAdmin() {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, DEFAULT_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create the default admin
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    const [newAdmin] = await db
      .insert(users)
      .values({
        name: DEFAULT_ADMIN_NAME,
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log(`[AUTH] Admin inicial creado exitosamente: ${DEFAULT_ADMIN_EMAIL}`);
    return newAdmin;
  } catch (error) {
    console.error("[AUTH] Error al verificar/crear admin inicial:", error);
    return null;
  }
}
