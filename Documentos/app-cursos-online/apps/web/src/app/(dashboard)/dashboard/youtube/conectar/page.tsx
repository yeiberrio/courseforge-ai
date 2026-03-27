"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { Youtube, Link, Shield, AlertCircle, Loader2 } from "lucide-react";

export default function ConectarYouTubePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam);

  const handleConnect = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.get<{ url: string }>("/youtube/auth-url", token);
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "No se pudo obtener la URL de autorización");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conectar YouTube</h1>
        <p className="text-sm text-gray-500">
          Vincula tu canal de YouTube para publicar contenido directamente
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Error de conexión</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <Youtube className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h2 className="mb-4 text-center text-xl font-semibold text-gray-900">
          Conecta tu canal de YouTube
        </h2>
        <p className="mb-8 text-center text-gray-500">
          Al conectar tu canal, podrás publicar los videos de tus cursos
          directamente desde la plataforma.
        </p>

        <div className="mb-8 space-y-4">
          <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
            <div className="rounded-lg bg-brand-100 p-2">
              <Link className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Publicación directa
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Sube y publica videos en tu canal sin salir de la plataforma.
                Configura títulos, descripciones y miniaturas desde aquí.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4">
            <div className="rounded-lg bg-brand-100 p-2">
              <Shield className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Conexión segura</h3>
              <p className="mt-1 text-sm text-gray-500">
                Usamos OAuth 2.0 de Google para una conexión segura. Puedes
                revocar el acceso en cualquier momento desde tu cuenta de Google
                o desde esta plataforma.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Youtube className="h-5 w-5" />
              Conectar canal de YouTube
            </>
          )}
        </button>
      </div>
    </div>
  );
}
