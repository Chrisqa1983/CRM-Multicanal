"use client";

import React, { useState } from "react";
import { FileCode, Plus, CheckCircle2, Clock, ShieldAlert, Sparkles, MessageSquare } from "lucide-react";

interface HSMTemplate {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  body: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  headerType: string;
}

const INITIAL_TEMPLATES: HSMTemplate[] = [
  {
    id: "t1",
    name: "recordatorio_cita_v1",
    category: "UTILITY",
    language: "es",
    body: "Hola {{1}}, te recordamos tu cita programada con Seguros Campestre el día {{2}} a las {{3}}. ¿Confirmas tu asistencia?",
    status: "APPROVED",
    headerType: "NONE",
  },
  {
    id: "t2",
    name: "cotizacion_renovacion_poliza",
    category: "MARKETING",
    language: "es",
    body: "Estimado/a {{1}}, tu póliza de {{2}} está próxima a vencer. Hemos preparado una oferta especial de renovación con 15% de descuento.",
    status: "APPROVED",
    headerType: "TEXT",
  },
  {
    id: "t3",
    name: "seguimiento_siniestro_abierto",
    category: "UTILITY",
    language: "es",
    body: "Hola {{1}}, el ajustador ha emitido el informe de tu siniestro #{{2}}. Puedes consultar el avance o contactar a tu asesor asignado.",
    status: "PENDING",
    headerType: "NONE",
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<HSMTemplate[]>(INITIAL_TEMPLATES);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCode className="w-6 h-6 text-indigo-600" />
            Catálogo de Plantillas HSM WhatsApp
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plantillas pre-aprobadas por Meta obligatorias para iniciar conversaciones o responder fuera de la ventana de 24 horas.
          </p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          Nueva Plantilla Meta
        </button>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-5xl space-y-6">
        {/* Banner de Ventana 24h */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 leading-relaxed">
            <span className="font-bold">Política Oficial de Meta WhatsApp:</span> Cuando transcurren más de 24 horas desde el último mensaje del cliente, la API de Zernio bloquea automáticamente el texto libre y únicamente permite el envío de estas plantillas HSM aprobadas para reabrir la ventana de conversación.
          </div>
        </div>

        {/* Grid de Plantillas */}
        <div className="grid grid-cols-2 gap-5">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-sm transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {tpl.name}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      tpl.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {tpl.status === "APPROVED" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Aprobada Meta
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" /> En Revisión
                      </>
                    )}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3 text-xs text-slate-700 font-sans leading-relaxed mb-4">
                  {tpl.body}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600">Categoría: {tpl.category}</span>
                <span className="uppercase">Idioma: {tpl.language}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
