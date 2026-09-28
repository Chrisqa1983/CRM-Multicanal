"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Car, 
  HeartPulse, 
  MessageSquare, 
  Send,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { INITIAL_POLICIES, ADVISORS, InsurancePolicy, PolicyStatus, InsuranceBranch } from "@/lib/insurance/mock-data";

export default function PoliciesDirectoryPage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>(INITIAL_POLICIES);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);
  const [reminderSentId, setReminderSentId] = useState<string | null>(null);

  // Formulario nueva póliza
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState<any>("GNP");
  const [insuranceType, setInsuranceType] = useState<InsuranceBranch>("auto");
  const [premiumAmount, setPremiumAmount] = useState(15000);
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2027-09-15");

  const filteredPolicies = policies.filter((pol) => {
    const matchesBranch = selectedBranch === "all" || pol.insuranceType === selectedBranch;
    const matchesCompany = selectedCompany === "all" || pol.insuranceCompany === selectedCompany;
    const matchesStatus = selectedStatus === "all" || pol.status === selectedStatus;
    const matchesSearch = 
      pol.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pol.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pol.clientPhone.includes(searchQuery);
    return matchesBranch && matchesCompany && matchesStatus && matchesSearch;
  });

  const totalCartera = policies.reduce((sum, p) => sum + p.premiumAmount, 0);
  const porRenovar = policies.filter((p) => p.status === "por_renovar").length;
  const renovadas = policies.filter((p) => p.status === "renovada").length;
  const activas = policies.filter((p) => p.status === "activa").length;

  const handleSendRenewalReminder = (polId: string) => {
    setReminderSentId(polId);
    setTimeout(() => {
      setReminderSentId(null);
      setPolicies((prev) =>
        prev.map((p) => (p.id === polId ? { ...p, status: "renovada" } : p))
      );
    }, 2000);
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const newPolicy: InsurancePolicy = {
      id: `pol-${Date.now()}`,
      clientName,
      clientPhone,
      clientEmail,
      policyNumber,
      insuranceCompany,
      insuranceType,
      branchLabel: insuranceType === "auto" ? "Seguro de Auto" : insuranceType === "gastos_medicos" ? "Gastos Médicos" : "Vida & Ahorro",
      premiumAmount,
      startDate,
      endDate,
      status: "activa",
      daysUntilExpiration: 365,
      assignedAdvisor: ADVISORS[0],
    };

    setPolicies([newPolicy, ...policies]);
    setShowNewPolicyModal(false);
  };

  const getCompanyColor = (company: string) => {
    switch (company) {
      case "GNP":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "AXA":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "Quálitas":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "MetLife":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Seguros Monterrey":
        return "bg-violet-100 text-violet-800 border-violet-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Clientes & Cartera de Pólizas
              </h1>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Control de Vigencias & Renovaciones
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de pólizas emitidas, retención de clientes y alertas automáticas de renovación anual.
            </p>
          </div>

          <button
            onClick={() => setShowNewPolicyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Registrar Póliza Manual
          </button>
        </div>

        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Cartera Activa</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              ${totalCartera.toLocaleString("es-MX")} <span className="text-xs font-semibold text-slate-500">MXN</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Por Renovar (&lt; 30 días)
            </div>
            <div className="text-lg font-black text-amber-800 mt-0.5">
              {porRenovar} <span className="text-xs font-semibold text-amber-600">pólizas</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-700">Pólizas Renovadas</div>
            <div className="text-lg font-black text-emerald-800 mt-0.5">
              {renovadas} <span className="text-xs font-semibold text-emerald-600">clientes retenidos</span>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="text-[10px] uppercase font-bold text-indigo-700">Total Vigentes</div>
            <div className="text-lg font-black text-indigo-800 mt-0.5">
              {activas + porRenovar} <span className="text-xs font-semibold text-indigo-600">pólizas en sistema</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por cliente, póliza o teléfono..."
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
              <option value="auto">🚗 Auto</option>
              <option value="gastos_medicos">🏥 Gastos Médicos</option>
              <option value="vida">🛡️ Vida & Retiro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Aseguradora:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas</option>
              <option value="GNP">GNP</option>
              <option value="AXA">AXA</option>
              <option value="Quálitas">Quálitas</option>
              <option value="MetLife">MetLife</option>
              <option value="Seguros Monterrey">Seguros Monterrey</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Estado:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos</option>
              <option value="por_renovar">⚠️ Por Renovar</option>
              <option value="activa">🟢 Activa</option>
              <option value="renovada">✅ Renovada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* Urgent Renewal Alerts Box */}
        {porRenovar > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-950">
                  {porRenovar} Pólizas requieren contacto para Renovación Anual
                </h2>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  Estas pólizas vencen en menos de 30 días. Envía recordatorio por WhatsApp con plantilla HSM aprobada o contacta al cliente.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStatus("por_renovar")}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              Ver Solo Pendientes de Renovación
            </button>
          </div>
        )}

        {/* Policies Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Póliza / Aseguradora</th>
                  <th className="py-3 px-4">Cliente / Contacto</th>
                  <th className="py-3 px-4">Ramo</th>
                  <th className="py-3 px-4">Prima Anual</th>
                  <th className="py-3 px-4">Vencimiento / Renovación</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Asesor</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPolicies.map((pol) => {
                  const isExpiringSoon = pol.daysUntilExpiration <= 30 && pol.status !== "renovada";
                  const cleanPhone = pol.clientPhone.replace(/\D/g, "");

                  return (
                    <tr key={pol.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Policy & Company */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {pol.policyNumber}
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-1 ${getCompanyColor(pol.insuranceCompany)}`}>
                          {pol.insuranceCompany}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{pol.clientName}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{pol.clientPhone}</div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                          {pol.insuranceType === "auto" && <Car className="w-3.5 h-3.5 text-blue-500" />}
                          {pol.insuranceType === "gastos_medicos" && <HeartPulse className="w-3.5 h-3.5 text-rose-500" />}
                          {pol.insuranceType === "vida" && <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />}
                          {pol.branchLabel}
                        </span>
                      </td>

                      {/* Premium */}
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        ${pol.premiumAmount.toLocaleString("es-MX")} MXN
                      </td>

                      {/* Expiration & Countdown */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {pol.endDate}
                        </div>
                        {isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 mt-0.5 animate-pulse">
                            <Clock className="w-3 h-3" /> Vence en {pol.daysUntilExpiration} días
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Vigente ({pol.daysUntilExpiration} días rest.)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {pol.status === "por_renovar" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Por Renovar
                          </span>
                        )}
                        {pol.status === "activa" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Activa
                          </span>
                        )}
                        {pol.status === "renovada" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Renovada
                          </span>
                        )}
                      </td>

                      {/* Advisor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={pol.assignedAdvisor.avatar}
                            alt={pol.assignedAdvisor.name}
                            className="w-5 h-5 rounded-full object-cover border border-slate-200"
                          />
                          <span className="text-slate-600 font-medium truncate max-w-[100px]">
                            {pol.assignedAdvisor.name}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isExpiringSoon && (
                            <button
                              onClick={() => handleSendRenewalReminder(pol.id)}
                              disabled={reminderSentId === pol.id}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-all flex items-center gap-1 shadow-sm"
                              title="Enviar plantilla WhatsApp de recordatorio de renovación"
                            >
                              <Send className="w-3 h-3" />
                              {reminderSentId === pol.id ? "Enviando..." : "Recordar Renovación"}
                            </button>
                          )}

                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                              `Estimado(a) ${pol.clientName}, le saludamos de Aseguradora Central. Le recordamos que su póliza ${pol.insuranceCompany} #${pol.policyNumber} tiene fecha de renovación el ${pol.endDate}. ¿Desea revisar las condiciones de renovación?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                            title="Chatear por WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Registrar Nueva Póliza */}
      {showNewPolicyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Nueva Póliza en Cartera</h3>
              </div>
              <button
                onClick={() => setShowNewPolicyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Cliente:</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Gómez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono WhatsApp:</label>
                  <input
                    type="text"
                    required
                    placeholder="+52 55..."
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Electrónico:</label>
                  <input
                    type="email"
                    placeholder="cliente@correo.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Número de Póliza:</label>
                  <input
                    type="text"
                    required
                    placeholder="GNP-12345"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Aseguradora:</label>
                  <select
                    value={insuranceCompany}
                    onChange={(e) => setInsuranceCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="GNP">GNP Seguros</option>
                    <option value="AXA">AXA Seguros</option>
                    <option value="Quálitas">Quálitas</option>
                    <option value="Mapfre">Mapfre</option>
                    <option value="MetLife">MetLife</option>
                    <option value="Seguros Monterrey">Seguros Monterrey</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ramo de Seguro:</label>
                  <select
                    value={insuranceType}
                    onChange={(e) => setInsuranceType(e.target.value as InsuranceBranch)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="auto">🚗 Seguro de Auto</option>
                    <option value="gastos_medicos">🏥 Gastos Médicos</option>
                    <option value="vida">🛡️ Vida & Retiro</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prima Anual (MXN):</label>
                  <input
                    type="number"
                    required
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Inicio Vigencia:</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fin / Renovación:</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPolicyModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  Registrar Póliza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
