"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play,
  Eye,
  ThumbsUp,
  Clock,
  FileText,
  Sparkles,
  RefreshCw,
  BookOpen,
  Zap,
  Timer,
  Minimize2,
  Maximize2,
  ArrowRight,
} from "lucide-react";

type ContentLength = "EXTENSIVE" | "MEDIUM" | "REDUCED" | "MICRO";

type Step = "transcribe" | "configure" | "process" | "done";

interface ViralVideo {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  duration: string;
  publishedAt: string;
  description?: string;
  transcription?: string;
}

interface GeneratedModule {
  title: string;
  objectives?: string[];
  topics?: string[];
  key_points?: string[];
  content?: string;
  reflection_questions?: string[];
}

interface ProcessedDocument {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  modules: GeneratedModule[];
  contentLength: ContentLength;
  estimatedDuration: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "transcribe", label: "Transcribir" },
  { key: "configure", label: "Configurar" },
  { key: "process", label: "Procesar" },
  { key: "done", label: "Listo" },
];

const CONTENT_LENGTH_OPTIONS: {
  key: ContentLength;
  label: string;
  duration: string;
  description: string;
  icon: typeof BookOpen;
}[] = [
  {
    key: "EXTENSIVE",
    label: "Extenso",
    duration: "30 - 60 min",
    description:
      "Curso completo y detallado. Incluye todos los temas del video con ejemplos adicionales, ejercicios y material complementario.",
    icon: Maximize2,
  },
  {
    key: "MEDIUM",
    label: "Medio",
    duration: "15 - 30 min",
    description:
      "Curso balanceado. Cubre los temas principales con explicaciones claras y algunos ejemplos practicos.",
    icon: BookOpen,
  },
  {
    key: "REDUCED",
    label: "Reducido",
    duration: "5 - 15 min",
    description:
      "Curso conciso. Se enfoca en los puntos clave y conceptos esenciales del video original.",
    icon: Minimize2,
  },
  {
    key: "MICRO",
    label: "Micro",
    duration: "1 - 5 min",
    description:
      "Resumen ultra compacto. Solo los conceptos mas importantes en formato rapido y directo.",
    icon: Zap,
  },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Build: 2026-03-28T08:30:00Z - Force new chunk hash
export default function ProcesarViralPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = searchParams.get("videoId");

  const [step, setStep] = useState<Step>("transcribe");
  const [error, setError] = useState("");

  // Video data
  const [video, setVideo] = useState<ViralVideo | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  // Step 1: Transcription
  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");

  // Step 2: Content length
  const [contentLength, setContentLength] = useState<ContentLength>("MEDIUM");

  // Step 3: Processing
  const [processing, setProcessing] = useState(false);
  const [document, setDocument] = useState<ProcessedDocument | null>(null);

  // Load video info
  useEffect(() => {
    if (!token || !videoId) return;

    setLoadingVideo(true);
    api
      .get<ViralVideo>(`/viral/videos/${videoId}`, token)
      .then((data) => {
        setVideo(data);
        if (data.transcription) {
          setTranscription(data.transcription);
          setStep("configure");
        }
      })
      .catch((err: Error) => {
        setError(err.message || "No se pudo cargar el video");
      })
      .finally(() => setLoadingVideo(false));
  }, [token, videoId]);

  const handleTranscribe = async () => {
    if (!token || !video) return;
    setError("");
    setTranscribing(true);

    try {
      const result = await api.post<{ transcription: string }>(
        `/viral/videos/${video.id}/transcribe`,
        {},
        token,
      );
      setTranscription(result.transcription);
      setStep("configure");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al transcribir el video";
      setError(message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleProcess = async () => {
    if (!token || !video || !transcription) return;
    setError("");
    setProcessing(true);

    try {
      const raw = await api.post<any>(
        "/viral/process",
        {
          viralVideoId: video.id,
          transcription,
          contentLength,
        },
        token,
      );
      // Map backend response to frontend format
      const doc = raw.generatedDocument || raw;
      const result: ProcessedDocument = {
        id: raw.id,
        title: doc.title || "Curso generado",
        description: doc.description || "",
        targetAudience: doc.target_audience || doc.targetAudience || "",
        modules: (doc.modules || []).map((m: any) => ({
          title: m.title || "",
          objectives: m.objectives || m.key_points || [],
          topics: m.key_points || m.topics || [],
          key_points: m.key_points || [],
        })),
        contentLength: raw.contentLength || contentLength,
        estimatedDuration: raw.targetDuration || "",
      };
      setDocument(result);
      setStep("done");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al procesar el contenido";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprocess = async (newLength: ContentLength) => {
    if (!token || !document) return;
    setError("");
    setContentLength(newLength);
    setProcessing(true);
    setStep("process");

    try {
      const raw = await api.patch<any>(
        `/viral/process/${document.id}/length`,
        { contentLength: newLength },
        token,
      );
      const doc = raw.generatedDocument || raw;
      const result: ProcessedDocument = {
        id: raw.id,
        title: doc.title || "Curso generado",
        description: doc.description || "",
        targetAudience: doc.target_audience || doc.targetAudience || "",
        modules: (doc.modules || []).map((m: any) => ({
          title: m.title || "",
          objectives: m.objectives || m.key_points || [],
          topics: m.key_points || m.topics || [],
          key_points: m.key_points || [],
        })),
        contentLength: raw.contentLength || newLength,
        estimatedDuration: raw.targetDuration || "",
      };
      setDocument(result);
      setStep("done");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al reprocesar el contenido";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateCourse = () => {
    if (!document) return;
    const params = new URLSearchParams({
      fromViral: "true",
      documentId: document.id,
      title: document.title,
      description: document.description,
    });
    router.push(`/dashboard/cursos/generar?${params.toString()}`);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  if (!videoId) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900">
          Video no especificado
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          No se proporciono un ID de video para procesar.
        </p>
        <button
          onClick={() => router.push("/dashboard/viral")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a contenido viral
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/viral")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Contenido viral
      </button>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Procesar video viral
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Transcribe el video, configura la extension del contenido y genera un
        curso completo con IA.
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = currentStepIndex >= i;
          const isCompleted = currentStepIndex > i;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-brand-600 text-white"
                    : isActive
                      ? "bg-brand-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-xs sm:block ${
                  isActive ? "font-medium text-brand-700" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors ${
                    currentStepIndex > i ? "bg-brand-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Loading video */}
      {loadingVideo && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      )}

      {/* STEP 1: Transcribe */}
      {!loadingVideo && step === "transcribe" && video && (
        <div className="space-y-6">
          {/* Video info card */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row">
              <div className="relative shrink-0 sm:w-64">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-44 w-full object-cover sm:h-full"
                />
                {video.duration && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                    {video.duration}
                  </span>
                )}
              </div>
              <div className="flex-1 p-5">
                <h2 className="mb-1 text-base font-semibold text-gray-900">
                  {video.title}
                </h2>
                <p className="mb-3 text-sm text-gray-500">
                  {video.channelTitle}
                </p>
                <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatNumber(video.viewCount)} vistas
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {formatNumber(video.likeCount)} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(video.publishedAt)}
                  </span>
                </div>
                {video.description && (
                  <p className="line-clamp-3 text-xs text-gray-400">
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transcribe action */}
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">
              Transcribir video
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Extraeremos el audio del video y lo convertiremos en texto usando
              IA. Este proceso puede tardar unos minutos.
            </p>

            <button
              onClick={handleTranscribe}
              disabled={transcribing}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {transcribing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribiendo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Iniciar transcripcion
                </>
              )}
            </button>

            {transcribing && (
              <p className="mt-4 text-xs text-gray-400">
                Descargando audio y procesando con Whisper. No cierres esta
                pagina.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Configure content length */}
      {!loadingVideo && step === "configure" && (
        <div className="space-y-6">
          {/* Transcription preview */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Transcripcion completada
              </h3>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {transcription.split(/\s+/).length} palabras
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
              {transcription}
            </div>
          </div>

          {/* Content length selection */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Extension del contenido
            </h3>
            <p className="mb-5 text-sm text-gray-500">
              Selecciona que tan extenso quieres que sea el curso generado a
              partir del video.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CONTENT_LENGTH_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = contentLength === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setContentLength(option.key)}
                    className={`rounded-xl border-2 p-5 text-left transition-all ${
                      isSelected
                        ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {option.label}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Timer className="h-3 w-3" />
                          {option.duration}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep("process")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Process */}
      {!loadingVideo && step === "process" && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          {!processing && !document && (
            <>
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Generar contenido del curso
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Claude analizara la transcripcion y generara la estructura del
                curso en formato{" "}
                <span className="font-medium text-brand-700">
                  {CONTENT_LENGTH_OPTIONS.find((o) => o.key === contentLength)
                    ?.label || contentLength}
                </span>{" "}
                ({CONTENT_LENGTH_OPTIONS.find((o) => o.key === contentLength)
                  ?.duration || ""}).
              </p>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setStep("configure")}
                  className="rounded-lg border px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cambiar extension
                </button>
                <button
                  onClick={handleProcess}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Procesar con IA
                </button>
              </div>
            </>
          )}

          {processing && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Procesando contenido...
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Claude esta analizando la transcripcion y generando la
                estructura del curso.
              </p>
              <div className="mt-6">
                <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: "60%" }} />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Este proceso puede tardar entre 30 segundos y 2 minutos. No
                cierres esta pagina.
              </p>
            </>
          )}
        </div>
      )}

      {/* STEP 4: Done — render generated document */}
      {!loadingVideo && step === "done" && document != null && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Contenido generado exitosamente
              </p>
              <p className="text-xs text-green-600">
                {"Se genero la estructura del curso con "}
                {Array.isArray(document.modules) ? document.modules.length : 0}
                {" modulos en formato "}
                {CONTENT_LENGTH_OPTIONS.find(
                  (o) => o.key === document.contentLength,
                )?.label || document.contentLength}
                {". Duracion estimada: "}
                {document.estimatedDuration || "N/A"}
                {"."}
              </p>
            </div>
          </div>

          {/* Document preview */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-gray-900">
              {document.title || "Sin titulo"}
            </h2>
            <p className="mb-2 text-sm text-gray-500">
              {document.description || ""}
            </p>
            {document.targetAudience && (
              <p className="mb-5 text-xs text-gray-400">
                Publico objetivo: {document.targetAudience}
              </p>
            )}

            {Array.isArray(document.modules) && document.modules.length > 0 ? (
              <>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Modulos del curso ({document.modules.length}):
                </h3>
                <div className="space-y-3">
                  {document.modules.map((mod, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {mod.title}
                        </p>
                      </div>
                      {Array.isArray(mod.objectives) && mod.objectives.length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Objetivos:
                          </p>
                          <ul className="space-y-0.5">
                            {mod.objectives.map((obj, j) => (
                              <li key={j} className="text-xs text-gray-500">
                                - {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(mod.topics) && mod.topics.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Temas:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.topics.map((topic, k) => (
                          <span
                            key={k}
                            className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No se generaron modulos.</p>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Siguiente paso
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleCreateCourse}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Play className="h-4 w-4" />
                Crear curso con estos datos
              </button>
              <button
                onClick={() => router.push("/dashboard/viral")}
                className="rounded-lg border px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
              >
                Volver a viral
              </button>
            </div>

            {/* Re-process with different length */}
            <div className="mt-6 border-t pt-4">
              <p className="mb-3 text-xs font-medium text-gray-500">
                Reprocesar con otra extension:
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTENT_LENGTH_OPTIONS.filter(
                  (o) => o.key !== document.contentLength,
                ).map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleReprocess(option.key)}
                    disabled={processing}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {option.label} ({option.duration})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
