import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users, sessions, passwordResetCodes } from "@/db/schema/auth";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email ? String(body.email).toLowerCase().trim() : "";
    const code = body.code ? String(body.code).trim() : "";
    const newPassword = body.newPassword ? String(body.newPassword) : "";

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Correo, código de seguridad y nueva contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (code.length !== 6) {
      return NextResponse.json(
        { success: false, message: "El código de seguridad debe tener exactamente 6 dígitos." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // 1. Find User
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Esta cuenta se encuentra desactivada." },
        { status: 403 }
      );
    }

    // 2. Verify OTP code against DB
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    const [validCode] = await db
      .select()
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, user.id),
          eq(passwordResetCodes.codeHash, codeHash),
          gt(passwordResetCodes.expiresAt, new Date()),
          isNull(passwordResetCodes.usedAt)
        )
      )
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1);

    if (!validCode) {
      return NextResponse.json(
        { success: false, message: "El código de 6 dígitos es incorrecto o ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    // 3. Mark code as used
    await db
      .update(passwordResetCodes)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetCodes.id, validCode.id));

    // 4. Hash new password with Argon2 and update user in DB
    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 5. Invalidate old sessions for security
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    console.log(`[AUTH] Contraseña restablecida exitosamente para ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión.",
    });
  } catch (error: any) {
    console.error("Error en reset-password:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al restablecer la contraseña." },
      { status: 500 }
    );
  }
}
