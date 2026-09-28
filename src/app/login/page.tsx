"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Instagram,
  Bot,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  X,
  KeyRound,
  Check,
  RotateCcw
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/inbox";

  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password recovery modal states
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "password" | "done">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [verifiedName, setVerifiedName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Por favor completa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        setError(data.message || "Credenciales incorrectas.");
      }
    } catch (err: any) {
      setError(err.message || "Error de red al intentar conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  // Password Recovery: Step 1 Send OTP email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotFeedback({ type: "error", message: "Ingresa tu correo electrónico registrado." });
      return;
    }

    setForgotLoading(true);
    setForgotFeedback(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setVerifiedName(data.user.name);
        setForgotStep("password");
        setForgotFeedback({
          type: "success",
          message: data.message || `Código de seguridad enviado a ${forgotEmail}. Revisa tu bandeja de entrada.`,
        });
      } else {
        setForgotFeedback({
          type: "error",
          message: data.message || "No encontramos una cuenta registrada con este correo.",
        });
      }
    } catch (err: any) {
      setForgotFeedback({
        type: "error",
        message: "Error de red al enviar el código de recuperación.",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Password Recovery: Step 2 Verify OTP and Save new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setForgotFeedback({ type: "error", message: "Ingresa el código de 6 dígitos enviado a tu correo." });
      return;
    }

    if (otpCode.trim().length !== 6) {
      setForgotFeedback({ type: "error", message: "El código debe tener exactamente 6 dígitos." });
      return;
    }

    if (!newPassword || !confirmPassword) {
      setForgotFeedback({ type: "error", message: "Completa ambos campos de contraseña." });
      return;
    }

    if (newPassword.length < 6) {
      setForgotFeedback({ type: "error", message: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotFeedback({ type: "error", message: "Las contraseñas no coinciden. Verifica de nuevo." });
      return;
    }

    setForgotLoading(true);
    setForgotFeedback(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: otpCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setForgotStep("done");
        setEmail(forgotEmail.trim());
        setPassword("");
        setOtpCode("");
      } else {
        setForgotFeedback({
          type: "error",
          message: data.message || "Código incorrecto o expirado.",
        });
      }
    } catch (err: any) {
      setForgotFeedback({
        type: "error",
        message: "Error de red al restablecer la contraseña.",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Left Column: Brand, Value Proposition & Visual Excellence */}
      <div className="md:w-1/2 lg:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border-b md:border-b-0 md:border-r border-slate-800/80">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        {/* Top Header / Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
              Z
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Zernio CRM Pro
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">Plataforma Omnicanal para Corredurías & Asesores</p>
            </div>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="my-12 md:my-auto relative z-10 max-w-xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Gestión Inteligente de Pólizas & Prospectos
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Control total de tus clientes en una sola bandeja.
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Unifica WhatsApp, Instagram y redes sociales oficiales, clasifica prospectos con Inteligencia Artificial y asigna leads a tus asesores en segundos.
            </p>
          </div>

          {/* 3 Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* WhatsApp Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">WhatsApp Cloud API</h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                Conectividad directa sin intermediarios con la API oficial de Meta.
              </p>
            </div>

            {/* Instagram & Facebook Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-2.5">
                <Instagram className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Instagram & Redes</h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                Atención centralizada de mensajes directos (DM) y comentarios en un solo lugar.
              </p>
            </div>

            {/* Bot Calificador Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white mb-1">Bot Calificador 24/7</h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                Filtra prospectos, cotiza seguros y contesta preguntas frecuentes automáticamente con IA.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Security Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Acceso Seguro con Roles (Admin & Asesores)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Cifrado Argon2id</span>
        </div>
      </div>

      {/* 2. Right Column: Authentication Form */}
      <div className="md:w-1/2 lg:w-5/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-slate-950 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Ingresa tus credenciales autorizadas para acceder a tu bandeja de trabajo.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. tu-correo@ejemplo.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field with Forgot Password Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotStep("email");
                    setForgotEmail(email);
                    setOtpCode("");
                    setForgotFeedback(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                />
                <span>Recordar sesión (30 días)</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Verificando acceso...
                </>
              ) : (
                <>
                  Ingresar a la Plataforma
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Card for Testing */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                Acceso Rápido Inicial (Admin)
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                1 Clic
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Haz clic abajo para rellenar las credenciales creadas para tu usuario administrador inicial:
            </p>
            <button
              type="button"
              onClick={() => fillQuickCredentials("yiyodroid@gmail.com", "admin123")}
              className="w-full p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition">
                  yiyodroid@gmail.com
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Contraseña: admin123 • Rol: Administrador
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-400 group-hover:translate-x-0.5 transition">
                Rellenar →
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: RECUPERAR CONTRASEÑA CON CÓDIGO OTP POR CORREO */}
      {/* ========================================================= */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Recuperación Segura por Correo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enviaremos un código de seguridad de 6 dígitos a tu bandeja.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Alert */}
            {forgotFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 mb-4 border ${
                  forgotFeedback.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {forgotFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{forgotFeedback.message}</div>
              </div>
            )}

            {/* PASO 1: INGRESAR EMAIL Y ENVIAR CÓDIGO */}
            {forgotStep === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo Electrónico Registrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu-correo@empresa.com"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Por seguridad, enviaremos un código de verificación de 6 dígitos que solo tú podrás recibir en tu correo.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Enviando código...
                      </>
                    ) : (
                      <>
                        Enviar Código de Seguridad
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: INGRESAR CÓDIGO DE 6 DÍGITOS Y NUEVA CONTRASEÑA */}
            {forgotStep === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">
                      Código enviado a: <strong className="text-white">{forgotEmail}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={forgotLoading}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0 ml-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reenviar
                  </button>
                </div>

                {/* OTP Code Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Código de Seguridad (6 dígitos)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Válido 15 min</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[8px] font-mono text-xl py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400 font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setForgotStep("email")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || otpCode.length !== 6 || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Verificar Código y Guardar
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* PASO 3: ÉXITO */}
            {forgotStep === "done" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    ¡Contraseña Restablecida con Éxito!
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Tu código de seguridad fue validado y tu nueva contraseña ha sido guardada. Ya puedes ingresar al CRM.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(false);
                    setError(null);
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  Iniciar Sesión Ahora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
