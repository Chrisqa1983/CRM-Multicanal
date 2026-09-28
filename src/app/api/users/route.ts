import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions, passwordResetCodes } from "@/db/schema/auth";
import { conversations } from "@/db/schema/messaging";
import { insuranceLeads, insurancePolicies } from "@/db/schema/operations";
import { eq, ne, and, desc } from "drizzle-orm";
import { validateSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { ensureDefaultAdmin } from "@/lib/auth/seed-admin";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const data = await validateSessionToken(token);
  if (!data || data.user.role !== "admin") {
    return null;
  }
  return data.user;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Acceso no autorizado. Se requieren permisos de Administrador." },
        { status: 403 }
      );
    }

    const team = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      success: true,
      currentUserId: admin.id,
      users: team,
    });
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al obtener usuarios." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Acceso no autorizado. Solo los administradores pueden crear nuevos accesos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = body.name ? String(body.name).trim() : "";
    const email = body.email ? String(body.email).toLowerCase().trim() : "";
    const password = body.password ? String(body.password) : "";
    const role = body.role === "admin" ? "admin" : "agent";

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Nombre, correo y contraseña son campos obligatorios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Ya existe un usuario registrado con este correo electrónico." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json({
      success: true,
      message: `Usuario ${name} creado exitosamente con rol ${role === "admin" ? "Administrador" : "Asesor"}.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al registrar el usuario." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Acceso no autorizado. Se requieren permisos de Administrador." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = body.id ? String(body.id) : null;
    if (!id) {
      return NextResponse.json({ success: false, message: "ID de usuario requerido." }, { status: 400 });
    }

    // Check user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Usuario no encontrado." }, { status: 404 });
    }

    const name = body.name ? String(body.name).trim() : targetUser.name;
    const email = body.email ? String(body.email).toLowerCase().trim() : targetUser.email;
    const role = body.role === "admin" || body.role === "agent" ? body.role : targetUser.role;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : targetUser.isActive;
    const password = body.password ? String(body.password) : null;

    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Nombre y correo son obligatorios." }, { status: 400 });
    }

    // Validate email uniqueness if changed
    if (email !== targetUser.email) {
      const existingEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, id)))
        .limit(1);

      if (existingEmail.length > 0) {
        return NextResponse.json({ success: false, message: "Ya existe otro usuario con este correo electrónico." }, { status: 409 });
      }
    }

    // Check self-protection for current logged in admin
    if (id === admin.id) {
      if (role !== "admin") {
        return NextResponse.json({ success: false, message: "No puedes degradar tu propia cuenta de Administrador a Asesor." }, { status: 400 });
      }
      if (!isActive) {
        return NextResponse.json({ success: false, message: "No puedes desactivar tu propia cuenta activa." }, { status: 400 });
      }
    }

    // If demoting or deactivating an admin, ensure there is at least one active admin remaining
    if ((targetUser.role === "admin" && role !== "admin") || (targetUser.role === "admin" && !isActive)) {
      const activeAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, id)));

      if (activeAdmins.length === 0) {
        return NextResponse.json(
          { success: false, message: "No puedes desactivar ni degradar al único administrador activo del sistema." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name,
      email,
      role,
      isActive,
      updatedAt: new Date(),
    };

    if (password && password.trim() !== "") {
      if (password.length < 6) {
        return NextResponse.json({ success: false, message: "La nueva contraseña debe tener al menos 6 caracteres." }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json({
      success: true,
      message: `Usuario ${name} actualizado correctamente.`,
      user: updated,
    });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ success: false, message: error.message || "Error al actualizar usuario." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Acceso no autorizado. Se requieren permisos de Administrador." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, message: "ID de usuario requerido para eliminar." }, { status: 400 });
    }

    if (id === admin.id) {
      return NextResponse.json(
        { success: false, message: "No puedes eliminar tu propia cuenta mientras estás conectado." },
        { status: 400 }
      );
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Usuario no encontrado." }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      const remainingAdmins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.id, id)));

      if (remainingAdmins.length === 0) {
        return NextResponse.json({ success: false, message: "No puedes eliminar al único administrador del sistema." }, { status: 400 });
      }
    }

    // Clean up references safely
    try {
      await db.delete(sessions).where(eq(sessions.userId, id));
      await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, id));
      await db.update(conversations).set({ assignedUserId: null }).where(eq(conversations.assignedUserId, id));
      await db.update(insuranceLeads).set({ assignedUserId: null }).where(eq(insuranceLeads.assignedUserId, id));
      await db.update(insurancePolicies).set({ assignedUserId: null }).where(eq(insurancePolicies.assignedUserId, id));
    } catch (cleanupErr) {
      console.warn("Aviso al limpiar registros asociados:", cleanupErr);
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: `Usuario ${targetUser.name} eliminado exitosamente del CRM.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ success: false, message: error.message || "Error al eliminar usuario." }, { status: 500 });
  }
}
