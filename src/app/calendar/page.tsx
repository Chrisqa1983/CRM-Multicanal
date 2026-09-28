"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, ShieldCheck, ArrowRight, Info } from "lucide-react";

export default function CalendarRedirectPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg shadow-slate-200/50 space-y-5">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Layers className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-black text-slate-900">
            Módulo Adaptado a Seguros
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            De acuerdo con el modelo operativo de tu agencia, el calendario de citas fue sustituido por el <strong>Embudo de Leads (Kanban)</strong> y la <strong>Cartera de Pólizas & Renovaciones</strong>.
          </p>
        </div>

        <div className="pt-2 space-y-2.5">
          <Link
            href="/leads"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all"
          >
            <Layers className="w-4 h-4" />
            Ir al Embudo de Leads
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/policies"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Ver Cartera de Pólizas & Renovaciones
          </Link>
        </div>
      </div>
    </div>
  );
}
