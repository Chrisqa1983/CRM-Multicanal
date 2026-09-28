"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  X,
  UserCheck,
  Pencil,
  Trash2,
  AlertTriangle,
  UserX,
  KeyRound,
} from "lucide-react";

interface DBUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [team, setTeam] = useState<DBUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<DBUser | null>(null);

  // New User Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"agent" | "admin">("agent");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit User Form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"agent" | "admin">("agent");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete User state
  const [deleting, setDeleting] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setTeam(data.users);
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
      } else if (data.message) {
        setFeedback({ type: "error", message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: "Error al conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  // 1. CREATE USER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setFeedback({ type: "error", message: "Por favor completa todos los campos requeridos." });
      return;
    }

    setCreating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Usuario ${name} creado exitosamente.`,
        });
        setCreateModalOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("agent");
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al registrar el usuario.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al crear el usuario.",
      });
    } finally {
      setCreating(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const openEditModal = (user: DBUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditPassword("");
    setShowEditPassword(false);
    setFeedback(null);
  };

  // 3. UPDATE USER
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim() || !editEmail.trim()) {
      setFeedback({ type: "error", message: "Nombre y correo son obligatorios." });
      return;
    }

    if (editPassword && editPassword.length < 6) {
      setFeedback({ type: "error", message: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setUpdating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          isActive: editIsActive,
          password: editPassword || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Usuario ${editName} actualizado correctamente.`,
        });
        setEditingUser(null);
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al actualizar el usuario.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al actualizar.",
      });
    } finally {
      setUpdating(false);
    }
  };

  // 4. DELETE USER
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/users?id=${deletingUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Usuario ${deletingUser.name} eliminado del CRM.`,
        });
        setDeletingUser(null);
        await fetchUsers();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Error al eliminar el usuario.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error de red al eliminar.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Equipo y Roles de Asesores
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Gestión centralizada de accesos al CRM. Como administrador puedes crear, editar contraseñas, cambiar roles o dar de baja cuentas.
            </p>
          </div>
          <button
            onClick={() => {
              setFeedback(null);
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/25 shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Crear Nuevo Acceso
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Banner Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 border shadow-sm ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div className="flex-1">{feedback.message}</div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Roles Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Rol: Administrador</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Acceso total al sistema, configuración de Zernio API, edición y eliminación de asesores, y reportes globales.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Rol: Asesor</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Atención en bandeja multicanal WhatsApp/Instagram, gestión de prospectos y pólizas asignadas.
              </p>
            </div>
          </div>
        </div>

        {/* Users List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>Usuarios Registrados en Base de Datos ({team.length})</span>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold normal-case text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
              <span>Cargando usuarios desde la base de datos...</span>
            </div>
          ) : team.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No hay usuarios registrados. Usa el botón "Crear Nuevo Acceso" para agregar uno.
            </div>
          ) : (
            team.map((member) => {
              const isSelf = member.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-all"
                >
                  {/* User Profile */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl font-bold text-sm flex items-center justify-center shadow-sm shrink-0 ${
                        member.role === "admin"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : "bg-slate-900 text-white"
                      }`}
                    >
                      {member.name
                        ? member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "US"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>

                        {isSelf && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Tu cuenta
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            member.role === "admin"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          }`}
                        >
                          {member.role === "admin" ? "Administrador" : "Asesor"}
                        </span>

                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            member.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {member.isActive ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Activo
                            </>
                          ) : (
                            <>
                              <UserX className="w-2.5 h-2.5" />
                              Inactivo
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => openEditModal(member)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Modificar datos, rol o contraseña"
                    >
                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => setDeletingUser(member)}
                      disabled={isSelf}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 shadow-sm ${
                        isSelf
                          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                      }`}
                      title={isSelf ? "No puedes eliminar tu propia sesión activa" : "Eliminar este usuario del sistema"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Crear Nuevo Acceso */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Crear Nuevo Acceso</h3>
                  <p className="text-[11px] text-slate-500">
                    El usuario podrá iniciar sesión inmediatamente con estas credenciales.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Mariana Silva"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (Usuario)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. mariana@seguroscampestre.com"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña Inicial
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Rol de Usuario
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setRole("agent")}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      role === "agent"
                        ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      Asesor
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Atención de chats, leads y pólizas.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole("admin")}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      role === "admin"
                        ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      Administrador
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Control total, usuarios y ajustes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Guardar y Dar Acceso
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modificar Usuario Existente */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Usuario</h3>
                  <p className="text-[11px] text-slate-500">
                    Modifica los datos, rol o restablece la contraseña de este usuario.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Rol Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Rol en el Sistema
                  </label>
                  {editingUser.id === currentUserId && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      No puedes cambiar tu propio rol
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      if (editingUser.id !== currentUserId) setEditRole("agent");
                    }}
                    className={`p-3 rounded-xl border transition ${
                      editingUser.id === currentUserId ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      editRole === "agent"
                        ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      Asesor
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Módulo operativo y chats.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (editingUser.id !== currentUserId) setEditRole("admin");
                    }}
                    className={`p-3 rounded-xl border transition ${
                      editingUser.id === currentUserId ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      editRole === "admin"
                        ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600" />
                      Administrador
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Control total y configuración.
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado Activo / Inactivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Estado de Acceso
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {editIsActive ? "Cuenta Activa" : "Cuenta Desactivada / Bloqueada"}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {editIsActive
                        ? "El usuario puede iniciar sesión con normalidad."
                        : "El usuario no podrá ingresar al CRM hasta reactivarlo."}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={editingUser.id === currentUserId}
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      editingUser.id === currentUserId
                        ? "opacity-50 cursor-not-allowed bg-emerald-600"
                        : editIsActive
                        ? "bg-emerald-600 cursor-pointer"
                        : "bg-slate-300 cursor-pointer"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editIsActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña (Opcional) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  Nueva Contraseña (Opcional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Dejar en blanco para mantener la actual"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Si escribes una clave aquí, reemplazará de inmediato la contraseña anterior del usuario.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Guardando cambios...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación para Eliminar Usuario */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              ¿Eliminar usuario del sistema?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Estás a punto de eliminar a <strong className="text-slate-900">{deletingUser.name}</strong> (
              <span className="font-mono text-slate-700">{deletingUser.email}</span>).
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-4 text-[11px] text-amber-800 leading-snug">
              ⚠️ <strong>Atención:</strong> Esta acción es irreversible. Se cancelarán sus sesiones activas y se desasignarán los chats o prospectos que tuviera a su cargo.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sí, Eliminar Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
