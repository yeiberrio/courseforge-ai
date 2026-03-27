"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  Youtube,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface YouTubeChannel {
  id: string;
  channelId: string;
  title: string;
  thumbnailUrl: string;
  connectedAt: string;
}

export default function CanalesYouTubePage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";

  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(
    justConnected ? "Canal de YouTube conectado exitosamente" : null,
  );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!token) return;
    api
      .get<YouTubeChannel[]>("/youtube/channels", token)
      .then(setChannels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleDisconnect = async (channelId: string) => {
    if (!token) return;
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas desconectar este canal?",
    );
    if (!confirmed) return;

    setDisconnecting(channelId);
    try {
      await api.delete(`/youtube/channels/${channelId}`, token);
      setChannels((prev) => prev.filter((c) => c.id !== channelId));
      setToast("Canal desconectado correctamente");
    } catch (err: any) {
      setToast(err.message || "Error al desconectar el canal");
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">{toast}</span>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Canales de YouTube
          </h1>
          <p className="text-sm text-gray-500">
            {channels.length} {channels.length === 1 ? "canal conectado" : "canales conectados"}
          </p>
        </div>
        <Link
          href="/dashboard/youtube/conectar"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Conectar nuevo canal
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <Youtube className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">
            No tienes canales conectados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Conecta tu canal de YouTube para empezar a publicar videos
          </p>
          <Link
            href="/dashboard/youtube/conectar"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Conectar canal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.title}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {channel.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Conectado el{" "}
                    {new Date(channel.connectedAt).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDisconnect(channel.id)}
                disabled={disconnecting === channel.id}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {disconnecting === channel.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Desconectar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
