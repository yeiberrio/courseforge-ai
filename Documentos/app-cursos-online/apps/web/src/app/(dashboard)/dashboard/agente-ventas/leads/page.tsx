"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Loader2,
  Trash2,
  Send,
  Calendar,
  Target,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  interest: string | null;
  notes: string | null;
  last_contact_at: string | null;
  next_followup: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "Contactado", color: "bg-yellow-100 text-yellow-700" },
  INTERESTED: { label: "Interesado", color: "bg-green-100 text-green-700" },
  MEETING_SCHEDULED: { label: "Reunion agendada", color: "bg-purple-100 text-purple-700" },
  PROPOSAL_SENT: { label: "Propuesta enviada", color: "bg-indigo-100 text-indigo-700" },
  NEGOTIATING: { label: "Negociando", color: "bg-orange-100 text-orange-700" },
  WON: { label: "Ganado", color: "bg-emerald-100 text-emerald-700" },
  LOST: { label: "Perdido", color: "bg-red-100 text-red-700" },
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, { label }]) => ({ value, label }));

export default function LeadsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  // New lead form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", interest: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Email modal
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchLeads = () => {
    if (!token) return;
    const url = filterStatus ? `/agents/leads?status=${filterStatus}` : "/agents/leads";
    api.get<Lead[]>(url, token).then(setLeads).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, [token, filterStatus]);

  const handleCreate = async () => {
    if (!token || !form.name.trim()) return;
    setSaving(true);
    await api.post("/agents/leads", form, token);
    setForm({ name: "", email: "", phone: "", company: "", interest: "", notes: "" });
    setShowForm(false);
    fetchLeads();
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!token) return;
    await api.post(`/agents/leads/${id}`, { status }, token);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Eliminar este lead?")) return;
    await api.delete(`/agents/leads/${id}`, token);
    fetchLeads();
  };

  const handleSendEmail = async () => {
    if (!token || !emailLead || !emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    try {
      const res = await api.post<{ sent: boolean; reason?: string }>(
        `/agents/leads/${emailLead.id}/email`,
        { subject: emailSubject, body: emailBody },
        token,
      );
      if (res.sent) {
        alert("Email enviado correctamente");
        setEmailLead(null);
        fetchLeads();
      } else {
        alert(`No se pudo enviar: ${res.reason}`);
      }
    } catch { alert("Error al enviar email"); }
    setSendingEmail(false);
  };

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard/agente-ventas")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Agente de Ventas
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
          <Target className="h-7 w-7 text-brand-600" />
          Prospectos / Leads
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <UserPlus className="h-4 w-4" /> Nuevo lead
        </button>
      </div>

      {/* New lead form */}
      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Nuevo prospecto</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre *" className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email" type="email" className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Telefono" className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Empresa" className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <input value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}
              placeholder="Servicio de interes" className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none sm:col-span-2" />
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas" rows={2} className="rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none sm:col-span-2" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Guardar
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="text-sm text-gray-500">{leads.length} leads</span>
      </div>

      {/* Leads list */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <Target className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">No hay leads. Agrega tu primer prospecto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const st = STATUS_LABELS[lead.status] || { label: lead.status, color: "bg-gray-100 text-gray-700" };
            return (
              <div key={lead.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-gray-900">{lead.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>}
                      {lead.company && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{lead.company}</span>}
                    </div>
                    {lead.interest && <p className="mt-1 text-xs text-gray-400">Interes: {lead.interest}</p>}
                    {lead.notes && <p className="mt-1 text-xs text-gray-400">{lead.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <select value={lead.status} onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="rounded border px-2 py-1 text-xs focus:outline-none">
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {lead.email && (
                      <button onClick={() => { setEmailLead(lead); setEmailSubject(""); setEmailBody(""); }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Enviar email">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(lead.id)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Email modal */}
      {emailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Enviar email a {emailLead.name}</h3>
              <button onClick={() => setEmailLead(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-sm text-gray-500">Para: {emailLead.email}</p>
            <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Asunto" className="mb-3 w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Cuerpo del email (soporta HTML)" rows={6}
              className="mb-4 w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEmailLead(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSendEmail} disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingEmail ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
