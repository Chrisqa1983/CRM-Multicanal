import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { ensureDefaultAdmin } from "@/lib/auth/seed-admin";

export async function POST(request: NextRequest) {
  try {
    // Ensure default admin exists
    await ensureDefaultAdmin();

    const body = await request.json();
    const email = body.email ? String(body.email).toLowerCase().trim() : "";
    const password = body.password ? String(body.password) : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Por favor ingresa tu correo y contraseña." },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Credenciales inválidas. Verifica tu correo y contraseña." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Tu cuenta ha sido desactivada por el Administrador." },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Credenciales inválidas. Verifica tu correo y contraseña." },
        { status: 401 }
      );
    }

    // Create session in database
    const { token, expiresAt } = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno al iniciar sesión." },
      { status: 500 }
    );
  }
}
