"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Database,
  FileText,
  Tag,
  Calendar,
  Layers,
  Trash2,
  Loader2,
} from "lucide-react";

interface KBDocument {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  file_path: string;
  file_size_bytes: number | null;
  chunk_count: number | null;
  source_type: string;
  is_active: boolean;
  ingested_at: string | null;
  created_at: string;
  actual_chunk_count: number;
}

export default function ConocimientoDetallePage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [doc, setDoc] = useState<KBDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    api.get<KBDocument>(`/knowledge-base/${id}`, token)
      .then(setDoc)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id]);

  const handleDeactivate = async () => {
    if (!token || !id || !confirm("¿Desactivar este documento?")) return;
    await api.delete(`/knowledge-base/${id}`, token);
    router.push("/dashboard/conocimiento");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Documento no encontrado</p>
      </div>
    );
  }

  const sourceLabels: Record<string, string> = {
    COURSE: "Curso",
    VIRAL_CONTENT: "Contenido Viral",
    MANUAL_UPLOAD: "Subida Manual",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.push("/dashboard/conocimiento")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Base de conocimiento
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Database className="h-6 w-6 text-brand-600" />
            {doc.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Detalle del documento en la base de conocimiento RAG
          </p>
        </div>
        <button
          onClick={handleDeactivate}
          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Desactivar
        </button>
      </div>

      <div className="space-y-4">
        {/* Info card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Información</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Tipo fuente</p>
                <p className="text-sm font-medium text-gray-900">
                  {sourceLabels[doc.source_type] || doc.source_type}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Chunks RAG</p>
                <p className="text-sm font-medium text-gray-900">
                  {doc.actual_chunk_count || doc.chunk_count || 0} chunks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Categoría</p>
                <p className="text-sm font-medium text-gray-900">{doc.category || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Ingestado</p>
                <p className="text-sm font-medium text-gray-900">
                  {doc.ingested_at
                    ? new Date(doc.ingested_at).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Pendiente"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* File info */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Archivo</h3>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-700 font-mono">{doc.file_path}</p>
            {doc.file_size_bytes && (
              <p className="mt-1 text-xs text-gray-500">
                {(doc.file_size_bytes / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${doc.is_active ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm font-medium text-gray-700">
              {doc.is_active ? "Activo" : "Desactivado"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
