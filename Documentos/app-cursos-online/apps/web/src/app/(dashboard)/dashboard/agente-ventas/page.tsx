"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Bot,
  MessageSquare,
  FileText,
  BarChart3,
  Plus,
  Trash2,
  Loader2,
  Send,
  Database,
  Target,
} from "lucide-react";

interface AgentStats {
  totalSessions: number;
  totalMessages: number;
  totalDocuments: number;
}

interface AgentDoc {
  title: string;
  chunks: number;
  firstId: string;
  createdAt: string;
}

export default function AgenteVentasPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [docs, setDocs] = useState<AgentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // New doc form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [s, d] = await Promise.all([
        api.get<AgentStats>("/agents/sales/stats", token),
        api.get<AgentDoc[]>("/agents/sales/documents", token),
      ]);
      setStats(s);
      setDocs(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleIngest = async () => {
    if (!token || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.post("/agents/sales/documents", {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }, token);
      setTitle("");
      setContent("");
      setTags("");
      fetchData();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (docTitle: string) => {
    if (!token || !confirm(`Eliminar "${docTitle}" del conocimiento del agente?`)) return;
    await api.delete(`/agents/sales/documents/${encodeURIComponent(docTitle)}`, token);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-7 w-7 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Agente de Ventas</h1>
        </div>
        <p className="text-sm text-gray-500">
          Agente inteligente que vende tus servicios de tecnologia y automatizacion usando IA y tu base de conocimiento.
        </p>
      </div>

      {/* Stats + Actions */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-brand-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
              <p className="text-xs text-gray-500">Sesiones de chat</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
              <p className="text-xs text-gray-500">Mensajes totales</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
              <p className="text-xs text-gray-500">Chunks en KB</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/agente-ventas/chat"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Send className="h-4 w-4" /> Probar chat
          </Link>
          <Link
            href="/dashboard/agente-ventas/leads"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            <Target className="h-4 w-4" /> Prospectos / Leads
          </Link>
          <Link
            href="/dashboard/agente-ventas/sesiones"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4" /> Ver sesiones
          </Link>
        </div>
      </div>

      {/* Add Document */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Plus className="h-5 w-5 text-brand-600" />
          Agregar conocimiento al agente
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Agrega informacion sobre tus servicios, precios, procesos, casos de exito, etc. El agente usara esta informacion para responder a los clientes.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulo del documento (ej: Servicios de automatizacion)"
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Contenido del documento... Describe detalladamente tus servicios, precios, beneficios, metodologia, etc."
            rows={8}
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags separados por coma (ej: automatizacion, RPA, workflows)"
            className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={handleIngest}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Procesando..." : "Agregar al conocimiento"}
          </button>
        </div>
      </div>

      {/* Documents list */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-gray-400" />
          Documentos del agente ({docs.length})
        </h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay documentos. Agrega informacion sobre tus servicios para que el agente pueda responder a los clientes.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.firstId} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <p className="text-xs text-gray-500">{doc.chunks} fragmentos</p>
                </div>
                <button
                  onClick={() => handleDelete(doc.title)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
