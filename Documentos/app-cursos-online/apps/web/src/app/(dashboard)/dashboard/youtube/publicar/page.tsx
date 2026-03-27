"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Youtube,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  EyeOff,
} from "lucide-react";

interface Channel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
}

interface CourseModule {
  id: string;
  title: string;
  order: number;
  video_url: string | null;
  status: string;
}

export default function PublicarYouTubePage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") || "";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("UNLISTED");
  const [categoryId, setCategoryId] = useState("27");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !courseId) return;
    api.get<Channel[]>("/youtube/channels", token).then(setChannels).catch(() => {});
    api.get<any>(`/courses/${courseId}`, token).then((course) => {
      setTitle(course.title || "");
      setDescription(course.description_short || "");
    }).catch(() => {});
    api.get<any>(`/course-modules?courseId=${courseId}`, token).then((data) => {
      setModules(Array.isArray(data) ? data : data.data || []);
    }).catch(() => {});
  }, [token, courseId]);

  const handlePublish = async () => {
    if (!token || !selectedChannel) return;
    setError("");
    setPublishing(true);

    try {
      await api.post("/youtube/publish", {
        courseId,
        moduleId: selectedModule || undefined,
        channelDbId: selectedChannel,
        title,
        description,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        privacy,
        categoryId,
      }, token);
      setPublished(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (published) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">Video en proceso de subida</h2>
          <p className="mt-2 text-sm text-gray-500">
            El video se está subiendo a YouTube. Puedes ver el progreso en publicaciones.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/dashboard/youtube/publicaciones")}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Youtube className="mr-2 inline h-4 w-4" /> Ver publicaciones
            </button>
            <button
              onClick={() => router.push(`/dashboard/cursos/detalle?id=${courseId}`)}
              className="rounded-lg border px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Volver al curso
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Youtube className="h-6 w-6 text-red-600" /> Publicar en YouTube
      </h1>
      <p className="mb-6 text-sm text-gray-500">Sube el video de tu curso a YouTube</p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {channels.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <Youtube className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No tienes canales conectados</p>
          <button
            onClick={() => router.push("/dashboard/youtube/conectar")}
            className="mt-4 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Conectar canal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Configuración</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Canal</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">Selecciona un canal</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.channel_title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Módulo (opcional)</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">Curso completo (primer módulo)</option>
                  {modules.filter((m) => m.video_url && m.status === "DONE").map((m) => (
                    <option key={m.id} value={m.id}>Módulo {m.order}: {m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  maxLength={5000}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tags (separados por coma)</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="educación, curso, tutorial"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Privacidad</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "PUBLIC", label: "Público", icon: Globe, desc: "Visible para todos" },
                    { value: "UNLISTED", label: "No listado", icon: EyeOff, desc: "Solo con enlace" },
                    { value: "PRIVATE", label: "Privado", icon: Lock, desc: "Solo tú" },
                  ] as const).map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPrivacy(p.value)}
                      className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                        privacy === p.value
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p.icon className="mx-auto mb-1 h-5 w-5" />
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Categoría YouTube</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="27">Educación</option>
                  <option value="28">Ciencia y tecnología</option>
                  <option value="25">Noticias y política</option>
                  <option value="22">Gente y blogs</option>
                  <option value="26">Consejos y estilo</option>
                  <option value="29">ONG y activismo</option>
                </select>
              </div>
            </div>

            <button
              onClick={handlePublish}
              disabled={!selectedChannel || !title || publishing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {publishing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="h-4 w-4" /> Publicar en YouTube</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
