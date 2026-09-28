"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MessageSquare, 
  ExternalLink, 
  Phone, 
  Mail, 
  Car, 
  HeartPulse, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Bot, 
  User, 
  Building2, 
  FileCheck2, 
  Sparkles,
  Calendar,
  DollarSign
} from "lucide-react";
import { INITIAL_LEADS, InsuranceLead, LeadStatus } from "@/lib/insurance/mock-data";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const initialLead = INITIAL_LEADS.find((l) => l.id === leadId) || INITIAL_LEADS[0];
  const [lead, setLead] = useState<InsuranceLead>(initialLead);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Formulario para emitir póliza
  const [policyNumber, setPolicyNumber] = useState(`POL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [insuranceCompany, setInsuranceCompany] = useState("GNP");
  const [premiumAmount, setPremiumAmount] = useState(14500);
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2027-09-15");
  const [policySaved, setPolicySaved] = useState(false);

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    setLead((prev) => ({ ...prev, status: newStatus }));
    if (newStatus === "poliza_emitida") {
      setShowPolicyModal(true);
    }
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaved(true);
    setTimeout(() => {
      setShowPolicyModal(false);
    }, 1500);
  };

  const cleanPhone = lead.clientPhone.replace(/\D/g, "");

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              title="Regresar al embudo"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {lead.clientName}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {lead.branchLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Expediente calificado automáticamente por el Bot de WhatsApp Central
              </p>
            </div>
          </div>

          {/* Status Switcher Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Estado del Lead:</span>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="nuevo">🤖 Nuevo (Bot Calificando)</option>
              <option value="pendiente_asesor">⏳ Pendiente de Asesor</option>
              <option value="en_atencion">💬 En Atención / Cotizando</option>
              <option value="poliza_emitida">🏆 Póliza Emitida (Venta)</option>
              <option value="perdido">❌ Perdido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chat Transcript (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Transcripción Oficial del Chat en WhatsApp
                </h2>
                <p className="text-[11px] text-slate-500">
                  Historial conversacional previo a la derivación al asesor
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> IA Calificada
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 space-y-4 bg-slate-50/50 overflow-y-auto">
            {lead.transcript.map((msg) => {
              const isClient = msg.sender === "client";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                    {isClient ? (
                      <>
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{lead.clientName}</span>
                      </>
                    ) : (
                      <>
                        <span>Bot Asistente de Seguros</span>
                        <Bot className="w-3 h-3 text-indigo-500" />
                      </>
                    )}
                    <span>• {msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      isClient
                        ? "bg-white text-slate-800 border border-slate-200 rounded-tl-sm"
                        : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transcript Footer Info */}
          <div className="p-3 bg-indigo-50/70 border-t border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              El bot pausó la IA y transfirió la conversación a {lead.assignedAdvisor.name}.
            </span>
            <span className="text-[11px] text-indigo-600 font-bold">
              WhatsApp Central Línea Oficial
            </span>
          </div>
        </div>

        {/* Right Column: Lead Dossier & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Quick Contact Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Acciones de Contacto Inmediato
            </h3>

            {/* Direct WhatsApp Action Button */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hola ${lead.clientName}, soy ${lead.assignedAdvisor.name}, asesor especialista en ${lead.branchLabel} de Aseguradora Central. Recibí tu solicitud sobre ${lead.qualificationData.itemOrProfile || "tu póliza"}. Con gusto te comparto la comparativa:`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all transform active:scale-95"
            >
              <MessageSquare className="w-5 h-5" />
              Abrir Chat de WhatsApp con el Cliente
              <ExternalLink className="w-4 h-4 opacity-70" />
            </a>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                {lead.clientPhone}
              </a>
              <a
                href={`mailto:${lead.clientEmail}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-colors truncate"
              >
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{lead.clientEmail}</span>
              </a>
            </div>
          </div>

          {/* Qualification Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ficha Extraída por la IA
              </h3>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                Ramo: {lead.branchLabel}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Bien o Perfil a Asegurar:</span>
                <span className="text-slate-900 font-bold text-sm">
                  {lead.qualificationData.itemOrProfile}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Código Postal:</span>
                  <span className="text-slate-800 font-semibold">{lead.qualificationData.zipCode || "No especificado"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">Presupuesto Estimado:</span>
                  <span className="text-slate-800 font-semibold">{lead.qualificationData.estimatedBudget || "Por cotizar"}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Cobertura Solicitada:</span>
                <span className="text-slate-800 font-medium">{lead.qualificationData.coverageDesired}</span>
              </div>

              {lead.qualificationData.preferredCompanies && (
                <div>
                  <span className="text-slate-400 font-medium block text-[11px] mb-1">Aseguradoras Sugeridas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.qualificationData.preferredCompanies.map((comp) => (
                      <span key={comp} className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                <span className="text-amber-800 font-bold block text-[11px] mb-0.5">
                  Resumen Clave para el Asesor:
                </span>
                <p className="text-amber-900/90 text-xs leading-relaxed">
                  {lead.qualificationData.botSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Advisor Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={lead.assignedAdvisor.avatar}
                alt={lead.assignedAdvisor.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Asesor Responsable</span>
                <h4 className="text-sm font-bold text-slate-900">{lead.assignedAdvisor.name}</h4>
                <p className="text-xs text-indigo-600 font-medium">{lead.assignedAdvisor.branchLabel}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Asignado
            </span>
          </div>

          {/* Quick Emit Policy Action */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg shadow-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">¿Cerraste la venta de la póliza?</h3>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Registra los datos de la póliza emitida para programar las alertas automáticas de renovación anual a 30 y 15 días.
            </p>
            <button
              onClick={() => setShowPolicyModal(true)}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Registrar Póliza Emitida
            </button>
          </div>

        </div>
      </div>

      {/* Modal: Registrar Póliza Emitida */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Registrar Póliza Emitida</h3>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {policySaved ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-slate-900">¡Póliza Registrada con Éxito!</h4>
                <p className="text-xs text-slate-500">
                  La póliza fue añadida al Directorio y el lead se actualizó a "Póliza Emitida".
                </p>
              </div>
            ) : (
              <form onSubmit={handleSavePolicy} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Número de Póliza:</label>
                  <input
                    type="text"
                    required
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                    onClick={() => setShowPolicyModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    Guardar y Activar Renovación
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
