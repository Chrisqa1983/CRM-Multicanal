"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Bot,
  BookOpen,
  Layers,
  FileCode,
  Users,
  ShieldCheck,
  Settings,
  LogOut
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Mensajes", href: "/inbox", icon: MessageSquare },
  { name: "Embudo de Leads", href: "/leads", icon: Layers, badge: "Kanban" },
  { name: "Clientes & Pólizas", href: "/policies", icon: ShieldCheck, badge: "Cartera" },
  { name: "Ajustes de Bot", href: "/agents", icon: Bot, badge: "IA" },
  { name: "Folletos & RAG", href: "/knowledge", icon: BookOpen, badge: "Pólizas" },
  { name: "Plantillas HSM", href: "/templates", icon: FileCode, badge: "Meta" },
  { name: "Asesores & Roles", href: "/users", icon: Users, adminOnly: true },
  { name: "Conexión Zernio", href: "/settings", icon: Settings, badge: "API", adminOnly: true },
];

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    // Only fetch user if not on login page
    if (pathname !== "/login" && !pathname.startsWith("/login/")) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, [pathname]);

  // If on login page, do not render sidebar
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  // Filter items based on role (Admins see everything, Asesores only see operational modules)
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && user?.role === "agent") {
      return false;
    }
    return true;
  });

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "CA";

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/25">
          Z
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white truncate tracking-tight">
            Zernio CRM Pro
          </h1>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Sistema en Línea
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Módulos Principales
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                    isActive
                      ? "bg-indigo-700/80 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer with Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || "Christian Acosta"}
              </p>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {user?.role === "admin" ? "Administrador" : "Asesor"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
