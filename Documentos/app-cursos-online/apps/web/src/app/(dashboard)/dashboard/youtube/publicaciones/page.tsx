"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  Youtube,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  ArrowLeft,
} from "lucide-react";

interface Publication {
  id: string;
  course_id: string;
  youtube_video_id: string | null;
  youtube_url: string | null;
  privacy: string;
  status: string;
  metadata: any;
  published_at: string | null;
  created_at: string;
  channel: { channel_title: string; channel_thumbnail: string };
}

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  PENDING: { icon: Clock, label: "Pendiente", color: "text-yellow-600 bg-yellow-50" },
  UPLOADING: { icon: Loader2, label: "Subiendo", color: "text-blue-600 bg-blue-50" },
  PROCESSING: { icon: Loader2, label: "Procesando", color: "text-indigo-600 bg-indigo-50" },
  PUBLISHED: { icon: CheckCircle2, label: "Publicado", color: "text-green-600 bg-green-50" },
  FAILED: { icon: XCircle, label: "Fallido", color: "text-red-600 bg-red-50" },
};

export default function PublicacionesYouTubePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    // Get all publications (we fetch for a dummy courseId to get all - need to adjust)
    api.get<Publication[]>("/youtube/publications/all", token)
      .then(setPublications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Youtube className="h-6 w-6 text-red-600" /> Publicaciones YouTube
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial de videos publicados en YouTube
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : publications.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">Sin publicaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aún no has publicado videos en YouTube
          </p>
          <button
            onClick={() => router.push("/dashboard/cursos")}
            className="mt-4 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ir a mis cursos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {publications.map((pub) => {
            const config = statusConfig[pub.status] || statusConfig.PENDING;
            const StatusIcon = config.icon;
            return (
              <div key={pub.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {pub.metadata?.title || "Sin título"}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Canal: {pub.channel?.channel_title || "—"} | Privacidad: {pub.privacy}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
                        <StatusIcon className={`h-3 w-3 ${pub.status === "UPLOADING" || pub.status === "PROCESSING" ? "animate-spin" : ""}`} />
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(pub.created_at).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </div>
                  {pub.youtube_url && (
                    <a
                      href={pub.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      <ExternalLink className="h-4 w-4" /> Ver en YouTube
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
