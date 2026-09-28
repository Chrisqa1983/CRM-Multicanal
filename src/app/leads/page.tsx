"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Layers, 
  Search, 
  Filter, 
  MessageSquare, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Car, 
  HeartPulse, 
  TrendingUp,
  UserCheck,
  ChevronRight,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { INITIAL_LEADS, ADVISORS, InsuranceLead, LeadStatus, InsuranceBranch } from "@/lib/insurance/mock-data";

const COLUMNS: { id: LeadStatus; label: string; icon: React.ReactNode; color: string; badgeBg: string }[] = [
  { 
    id: "nuevo", 
    label: "Nuevo (Bot Calificando)", 
    icon: <Sparkles className="w-3.5 h-3.5 text-blue-500" />,
    color: "border-blue-500/30 bg-blue-50/40 text-blue-800",
    badgeBg: "bg-blue-100 text-blue-700"
  },
  { 
    id: "pendiente_asesor", 
    label: "Pendiente de Asesor", 
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />,
    color: "border-amber-500/30 bg-amber-50/40 text-amber-800",
    badgeBg: "bg-amber-100 text-amber-700"
  },
  { 
    id: "en_atencion", 
    label: "En Atención / Cotizando", 
    icon: <Clock className="w-3.5 h-3.5 text-indigo-500" />,
    color: "border-indigo-500/30 bg-indigo-50/40 text-indigo-800",
    badgeBg: "bg-indigo-100 text-indigo-700"
  },
  { 
    id: "poliza_emitida", 
    label: "Póliza Emitida (Venta)", 
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    color: "border-emerald-500/30 bg-emerald-50/40 text-emerald-800",
    badgeBg: "bg-emerald-100 text-emerald-700"
  },
  { 
    id: "perdido", 
    label: "Perdido", 
    icon: <AlertCircle className="w-3.5 h-3.5 text-slate-400" />,
    color: "border-slate-300 bg-slate-50 text-slate-600",
    badgeBg: "bg-slate-200 text-slate-600"
  }
];

export default function LeadsPipelinePage() {
  const [leads, setLeads] = useState<InsuranceLead[]>(INITIAL_LEADS);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeads = leads.filter((lead) => {
    const matchesBranch = selectedBranch === "all" || lead.insuranceType === selectedBranch;
    const matchesAdvisor = selectedAdvisor === "all" || lead.assignedAdvisor.id === selectedAdvisor;
    const matchesSearch = 
      lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.clientPhone.includes(searchQuery) ||
      (lead.qualificationData.itemOrProfile?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesBranch && matchesAdvisor && matchesSearch;
  });

  const moveStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  };

  // Contadores métricas
  const totalLeads = leads.length;
  const pendientes = leads.filter((l) => l.status === "pendiente_asesor").length;
  const enAtencion = leads.filter((l) => l.status === "en_atencion").length;
  const vendidas = leads.filter((l) => l.status === "poliza_emitida").length;

  const getBranchBadge = (type: InsuranceBranch) => {
    switch (type) {
      case "auto":
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200"><Car className="w-3 h-3" /> Auto</span>;
      case "gastos_medicos":
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200"><HeartPulse className="w-3 h-3" /> Gastos Médicos</span>;
      case "vida":
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200"><ShieldCheck className="w-3 h-3" /> Vida & Retiro</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Seguro</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Embudo de Leads & Prospectos
              </h1>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Línea Oficial WhatsApp
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prospectos calificados automáticamente por el bot y canalizados a los 3 asesores por ramo.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Leads</div>
              <div className="text-lg font-black text-slate-800">{totalLeads}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-amber-600 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Pendientes
              </div>
              <div className="text-lg font-black text-amber-700">{pendientes}</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-indigo-600">En Atención</div>
              <div className="text-lg font-black text-indigo-700">{enAtencion}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Pólizas Vendidas</div>
              <div className="text-lg font-black text-emerald-700">{vendidas}</div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono o vehículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Ramo:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los Ramos</option>
              <option value="auto">🚗 Autos</option>
              <option value="gastos_medicos">🏥 Gastos Médicos</option>
              <option value="vida">🛡️ Vida & Retiro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Asesor:</span>
            <select
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los Asesores</option>
              {ADVISORS.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.name} ({adv.branchLabel})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full min-w-[1250px]">
          {COLUMNS.map((col) => {
            const columnLeads = filteredLeads.filter((l) => l.status === col.id);

            return (
              <div
                key={col.id}
                className="flex-1 flex flex-col bg-slate-100/80 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200 bg-white/70 backdrop-blur-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h2 className="text-xs font-bold text-slate-800">{col.label}</h2>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {columnLeads.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs text-center p-4">
                      Sin prospectos en esta etapa
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all group relative hover:border-indigo-300"
                      >
                        {/* Card Top: Client & Ramo */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {lead.clientName}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {lead.clientPhone}
                            </p>
                          </div>
                          {getBranchBadge(lead.insuranceType)}
                        </div>

                        {/* Vehicle / Needs Summary */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-3 text-xs text-slate-700">
                          <p className="font-semibold text-slate-800 line-clamp-1">
                            {lead.qualificationData.itemOrProfile}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {lead.qualificationData.botSummary}
                          </p>
                        </div>

                        {/* Advisor Info */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img
                              src={lead.assignedAdvisor.avatar}
                              alt={lead.assignedAdvisor.name}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200"
                            />
                            <span className="font-medium text-slate-600 truncate max-w-[110px]">
                              {lead.assignedAdvisor.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {lead.createdAt}
                          </span>
                        </div>

                        {/* Quick Actions Bar */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ver Ficha & Chat
                          </Link>

                          <a
                            href={`https://wa.me/${lead.clientPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                            title="Contactar directamente por WhatsApp"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Status Mover Dropdown */}
                        <div className="mt-2 flex items-center justify-end gap-1">
                          <select
                            value={lead.status}
                            onChange={(e) => moveStatus(lead.id, e.target.value as LeadStatus)}
                            className="text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5 focus:outline-none"
                          >
                            <option value="nuevo">🤖 Nuevo (Bot)</option>
                            <option value="pendiente_asesor">⏳ Pendiente Asesor</option>
                            <option value="en_atencion">💬 En Atención</option>
                            <option value="poliza_emitida">🏆 Póliza Vendida</option>
                            <option value="perdido">❌ Perdido</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
