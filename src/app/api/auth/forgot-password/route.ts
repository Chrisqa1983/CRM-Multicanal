import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users, passwordResetCodes } from "@/db/schema/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendPasswordResetEmail } from "@/lib/email/sender";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email ? String(body.email).toLowerCase().trim() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Por favor ingresa tu correo electrónico." },
        { status: 400 }
      );
    }

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
        { success: false, message: "No encontramos ninguna cuenta registrada con este correo." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Esta cuenta se encuentra desactivada. Contacta al Administrador." },
        { status: 403 }
      );
    }

    // 1. Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 2. Invalidate previous unused codes for this user
    await db
      .update(passwordResetCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetCodes.userId, user.id),
          isNull(passwordResetCodes.usedAt)
        )
      );

    // 3. Save new OTP code in database
    await db.insert(passwordResetCodes).values({
      userId: user.id,
      codeHash,
      expiresAt,
    });

    // 4. Send email with OTP code
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      code: otp,
      expirationMinutes: 15,
    });

    console.log(`[AUTH] Código OTP generado para ${user.email}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: `Hemos enviado un código de seguridad de 6 dígitos a ${user.email}.`,
      user: {
        name: user.name,
        email: user.email,
      },
      // In development or simulation, return debug code to assist testing
      debugCode: emailResult.simulated ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
