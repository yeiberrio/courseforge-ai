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
  Edit3,
  Users,
  Volume2,
  Target,
  Youtube,
  GraduationCap,
  Flame,
  Download,
  Database,
  Send,
  Scissors,
  ExternalLink,
  Star,
  Copy,
  Check,
} from "lucide-react";

type ContentLength = "EXTENSIVE" | "MEDIUM" | "REDUCED" | "MICRO";
type ContentGoal = "COURSE" | "VIRAL_VIDEO";
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
  visual_suggestions?: string[];
}

interface VideoSegment {
  start: string;
  end: string;
  start_seconds: number;
  title: string;
  summary: string;
  relevance: string;
  score: number;
  youtube_url: string;
  youtube_embed_url: string;
}

interface SegmentsResult {
  video: {
    id: string;
    youtubeVideoId: string;
    title: string;
    channelName: string;
    duration: string;
    durationSeconds: number;
  };
  segments: VideoSegment[];
  total_segments: number;
  video_coverage_percent: number;
  top_moment: string;
}

interface ProcessedDocument {
  id: string;
  title: string;
  description: string;
  targetAudience: string;
  modules: GeneratedModule[];
  contentLength: ContentLength;
  estimatedDuration: string;
  contentGoal: ContentGoal;
  seoTags?: string[];
  hooks?: string[];
  timestamps?: string[];
  callToAction?: string;
  thumbnailIdeas?: string[];
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
    description: "Curso completo con todos los temas, ejemplos, ejercicios y material complementario.",
    icon: Maximize2,
  },
  {
    key: "MEDIUM",
    label: "Medio",
    duration: "15 - 30 min",
    description: "Cobertura balanceada de los temas principales con explicaciones claras.",
    icon: BookOpen,
  },
  {
    key: "REDUCED",
    label: "Reducido",
    duration: "5 - 15 min",
    description: "Se enfoca en los puntos clave y conceptos esenciales.",
    icon: Minimize2,
  },
  {
    key: "MICRO",
    label: "Micro",
    duration: "1 - 5 min",
    description: "Resumen ultra compacto. Solo lo más importante en formato rápido.",
    icon: Zap,
  },
];

const TONE_OPTIONS = [
  { value: "educativo", label: "Educativo", description: "Claro, didáctico y profesional" },
  { value: "motivacional", label: "Motivacional", description: "Inspirador y energético" },
  { value: "conversacional", label: "Conversacional", description: "Cercano, como hablar con un amigo" },
  { value: "formal", label: "Formal", description: "Académico y estructurado" },
  { value: "divertido", label: "Divertido", description: "Ligero, con humor y entretenido" },
  { value: "narrativo", label: "Narrativo", description: "Storytelling, cuenta una historia" },
  { value: "técnico", label: "Técnico", description: "Detallado y especializado" },
  { value: "persuasivo", label: "Persuasivo", description: "Convincente, orientado a la acción" },
];

const AUDIENCE_OPTIONS = [
  { value: "público general", label: "Público general" },
  { value: "estudiantes universitarios", label: "Estudiantes universitarios" },
  { value: "profesionales", label: "Profesionales" },
  { value: "emprendedores", label: "Emprendedores" },
  { value: "niños y jóvenes", label: "Niños y jóvenes" },
  { value: "adultos mayores", label: "Adultos mayores" },
  { value: "técnicos especializados", label: "Técnicos especializados" },
  { value: "creadores de contenido", label: "Creadores de contenido" },
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

  // Step 2: Configuration
  const [contentLength, setContentLength] = useState<ContentLength>("MEDIUM");
  const [tone, setTone] = useState("educativo");
  const [customTone, setCustomTone] = useState("");
  const [targetAudience, setTargetAudience] = useState("público general");
  const [customAudience, setCustomAudience] = useState("");
  const [contentGoal, setContentGoal] = useState<ContentGoal>("COURSE");
  const [autoPublishYoutube, setAutoPublishYoutube] = useState(false);

  // Segments extraction
  const [extractingSegments, setExtractingSegments] = useState(false);
  const [segments, setSegments] = useState<SegmentsResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
      const message = err instanceof Error ? err.message : "Error al transcribir el video";
      setError(message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleExtractSegments = async () => {
    if (!token || !video) return;
    setError("");
    setExtractingSegments(true);

    try {
      const result = await api.post<SegmentsResult>(
        `/viral/videos/${video.id}/segments`,
        { transcription: transcription || undefined },
        token,
      );
      setSegments(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al extraer segmentos";
      setError(message);
    } finally {
      setExtractingSegments(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
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
          tone: customTone || tone,
          targetAudience: customAudience || targetAudience,
          contentGoal,
          autoPublishYoutube,
        },
        token,
      );

      const doc = raw.generatedDocument || raw;
      const result: ProcessedDocument = {
        id: raw.id,
        title: doc.title || "Contenido generado",
        description: doc.description || "",
        targetAudience: doc.target_audience || doc.targetAudience || "",
        modules: (doc.modules || []).map((m: any) => ({
          title: m.title || "",
          objectives: m.objectives || m.key_points || [],
          topics: m.key_points || m.topics || [],
          key_points: m.key_points || [],
          content: m.content || "",
          reflection_questions: m.reflection_questions || [],
          visual_suggestions: m.visual_suggestions || [],
        })),
        contentLength: raw.contentLength || contentLength,
        estimatedDuration: raw.targetDuration || "",
        contentGoal: raw.contentGoal || contentGoal,
        seoTags: doc.seo_tags || [],
        hooks: doc.hooks || [],
        timestamps: doc.timestamps || [],
        callToAction: doc.call_to_action || "",
        thumbnailIdeas: doc.thumbnail_ideas || [],
      };
      setDocument(result);
      setStep("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar el contenido";
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
        title: doc.title || "Contenido generado",
        description: doc.description || "",
        targetAudience: doc.target_audience || doc.targetAudience || "",
        modules: (doc.modules || []).map((m: any) => ({
          title: m.title || "",
          objectives: m.objectives || m.key_points || [],
          topics: m.key_points || m.topics || [],
          key_points: m.key_points || [],
          content: m.content || "",
        })),
        contentLength: raw.contentLength || newLength,
        estimatedDuration: raw.targetDuration || "",
        contentGoal: raw.contentGoal || contentGoal,
        seoTags: doc.seo_tags || [],
      };
      setDocument(result);
      setStep("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al reprocesar el contenido";
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
      contentGoal,
    });
    router.push(`/dashboard/cursos/generar?${params.toString()}`);
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  if (!videoId) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-900">Video no especificado</h2>
        <p className="mt-1 text-sm text-gray-500">No se proporcionó un ID de video para procesar.</p>
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
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/viral")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Contenido viral
      </button>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Procesar video viral</h1>
      <p className="mb-8 text-sm text-gray-500">
        Transcribe, configura opciones avanzadas y genera contenido con IA.
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
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs sm:block ${isActive ? "font-medium text-brand-700" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 transition-colors ${currentStepIndex > i ? "bg-brand-600" : "bg-gray-200"}`} />
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
          <button onClick={() => setError("")} className="ml-auto text-xs underline hover:no-underline">
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
                <img src={video.thumbnail} alt={video.title} className="h-44 w-full object-cover sm:h-full" />
                {video.duration && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                    {video.duration}
                  </span>
                )}
              </div>
              <div className="flex-1 p-5">
                <h2 className="mb-1 text-base font-semibold text-gray-900">{video.title}</h2>
                <p className="mb-3 text-sm text-gray-500">{video.channelTitle}</p>
                <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatNumber(video.viewCount)} vistas</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{formatNumber(video.likeCount)} likes</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(video.publishedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action cards: Transcribe + Extract segments */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Transcribe action */}
            <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-brand-300" />
              <h2 className="text-base font-semibold text-gray-900">Transcribir video</h2>
              <p className="mt-1 text-xs text-gray-500">
                Extrae los subtítulos del video y conviértelos en texto editable. Luego podrás procesarlo con IA para generar cursos o guiones virales.
              </p>
              <button
                onClick={handleTranscribe}
                disabled={transcribing || extractingSegments}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {transcribing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Transcribiendo...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Iniciar transcripción</>
                )}
              </button>
              {transcribing && (
                <p className="mt-3 text-xs text-gray-400">Procesando subtítulos. No cierres esta página.</p>
              )}
            </div>

            {/* Extract segments action */}
            <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
              <Scissors className="mx-auto mb-3 h-10 w-10 text-purple-300" />
              <h2 className="text-base font-semibold text-gray-900">Extraer segmentos clave</h2>
              <p className="mt-1 text-xs text-gray-500">
                La IA analiza el video e identifica los momentos más valiosos con timestamps y enlaces directos a YouTube.
              </p>
              <button
                onClick={handleExtractSegments}
                disabled={extractingSegments || transcribing}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {extractingSegments ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Extrayendo...</>
                ) : (
                  <><Scissors className="h-4 w-4" />Extraer segmentos</>
                )}
              </button>
              {extractingSegments && (
                <p className="mt-3 text-xs text-gray-400">Analizando video con IA. No cierres esta página.</p>
              )}
            </div>
          </div>

          {/* Segments results (shown inline in step 1) */}
          {segments && (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Scissors className="h-5 w-5 text-purple-600" />
                  Segmentos extraídos
                </h3>
                <button
                  onClick={handleExtractSegments}
                  disabled={extractingSegments}
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${extractingSegments ? "animate-spin" : ""}`} />
                  Reanalizar
                </button>
              </div>

              {/* Summary bar */}
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-purple-50 p-3">
                <span className="text-xs font-medium text-purple-700">
                  {segments.total_segments} segmentos encontrados
                </span>
                <span className="text-xs text-purple-600">
                  Cobertura: {segments.video_coverage_percent}% del video
                </span>
                {segments.top_moment && (
                  <span className="text-xs text-purple-600 italic">
                    Mejor momento: {segments.top_moment}
                  </span>
                )}
              </div>

              {/* Segments list */}
              <div className="space-y-2">
                {segments.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-purple-200 hover:bg-purple-50/50"
                  >
                    {/* Score badge */}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${
                        seg.score >= 8 ? "bg-green-500" : seg.score >= 5 ? "bg-yellow-500" : "bg-gray-400"
                      }`}>
                        {seg.score}
                      </div>
                      <Star className={`h-3 w-3 ${seg.score >= 8 ? "text-yellow-400" : "text-gray-300"}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{seg.title}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          seg.relevance === "hook" ? "bg-red-100 text-red-700" :
                          seg.relevance === "dato_clave" ? "bg-blue-100 text-blue-700" :
                          seg.relevance === "momento_viral" ? "bg-orange-100 text-orange-700" :
                          seg.relevance === "cta" ? "bg-green-100 text-green-700" :
                          seg.relevance === "storytelling" ? "bg-purple-100 text-purple-700" :
                          seg.relevance === "controversia" ? "bg-yellow-100 text-yellow-700" :
                          seg.relevance === "tutorial" ? "bg-cyan-100 text-cyan-700" :
                          seg.relevance === "humor" ? "bg-pink-100 text-pink-700" :
                          seg.relevance === "emocional" ? "bg-rose-100 text-rose-700" :
                          seg.relevance === "insight" ? "bg-indigo-100 text-indigo-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {seg.relevance}
                        </span>
                      </div>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600">{seg.summary}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-mono text-gray-700">
                          {seg.start} → {seg.end}
                        </span>
                        <a
                          href={seg.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver en YouTube
                        </a>
                        <button
                          onClick={() => handleCopyUrl(seg.youtube_url)}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                          {copiedUrl === seg.youtube_url ? (
                            <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copiado</span></>
                          ) : (
                            <><Copy className="h-3 w-3" />Copiar enlace</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Configure */}
      {!loadingVideo && step === "configure" && (
        <div className="space-y-6">
          {/* Editable Transcription */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Edit3 className="h-4 w-4 text-brand-600" />
                Transcripción (editable)
              </h3>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {transcription.split(/\s+/).length} palabras
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              Puedes modificar el contenido de la transcripción antes de procesarlo. Corrige errores, agrega información o ajusta el texto según necesites.
            </p>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-200 p-4 text-sm leading-relaxed text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Transcripción del video..."
            />
          </div>

          {/* Content Goal: Course vs Viral Video */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">Objetivo del contenido</h3>
            <p className="mb-5 text-sm text-gray-500">
              Elige si quieres crear un curso educativo o un video viral para YouTube.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setContentGoal("COURSE")}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  contentGoal === "COURSE"
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    contentGoal === "COURSE" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Curso educativo</p>
                    <p className="text-xs text-gray-500">Queda en la plataforma + base de conocimiento</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-500">
                  Genera un curso completo con módulos, ejercicios y material pedagógico. Se ingesta automáticamente en la base de conocimiento para entrenamiento RAG.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setContentGoal("VIRAL_VIDEO")}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  contentGoal === "VIRAL_VIDEO"
                    ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    contentGoal === "VIRAL_VIDEO" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Video viral YouTube</p>
                    <p className="text-xs text-gray-500">Optimizado para viralidad + SEO</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-gray-500">
                  Genera un guión viral con hooks, CTAs, SEO optimizado, timestamps y estrategias de marketing para YouTube. Publicación automática disponible.
                </p>
              </button>
            </div>

            {/* Auto-publish toggle for viral */}
            {contentGoal === "VIRAL_VIDEO" && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <Youtube className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Publicar automáticamente en YouTube</p>
                  <p className="text-xs text-gray-500">Después de la revisión, el video se publicará con SEO optimizado</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoPublishYoutube}
                    onChange={(e) => setAutoPublishYoutube(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>
            )}
          </div>

          {/* Content length selection */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">Extensión del contenido</h3>
            <p className="mb-5 text-sm text-gray-500">
              Selecciona qué tan extenso quieres que sea el {contentGoal === "COURSE" ? "curso" : "guión del video"}.
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
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isSelected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500"><Timer className="h-3 w-3" />{option.duration}</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Volume2 className="h-5 w-5 text-brand-600" />
              Tono del contenido
            </h3>
            <p className="mb-4 text-sm text-gray-500">Define el estilo de comunicación del contenido generado.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTone(opt.value); setCustomTone(""); }}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    tone === opt.value && !customTone
                      ? "border-brand-600 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-[10px] text-gray-500">{opt.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="O escribe un tono personalizado..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Target Audience */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="h-5 w-5 text-brand-600" />
              Público objetivo
            </h3>
            <p className="mb-4 text-sm text-gray-500">Define para quién va dirigido el contenido.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTargetAudience(opt.value); setCustomAudience(""); }}
                  className={`rounded-lg border p-3 text-center text-xs font-medium transition-all ${
                    targetAudience === opt.value && !customAudience
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={customAudience}
                onChange={(e) => setCustomAudience(e.target.value)}
                placeholder="O define un público personalizado..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={() => setStep("process")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700"
          >
            Continuar a procesamiento
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Process */}
      {!loadingVideo && step === "process" && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          {!processing && !document && (
            <>
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-brand-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Generar {contentGoal === "COURSE" ? "contenido del curso" : "guión viral para YouTube"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                La IA analizará la transcripción y generará{" "}
                {contentGoal === "COURSE" ? "la estructura del curso" : "un guión viral optimizado"} en formato{" "}
                <span className="font-medium text-brand-700">
                  {CONTENT_LENGTH_OPTIONS.find((o) => o.key === contentLength)?.label}
                </span>.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1">Tono: {customTone || tone}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">Audiencia: {customAudience || targetAudience}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  {contentGoal === "COURSE" ? "Curso educativo" : "Video viral"}
                </span>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setStep("configure")}
                  className="rounded-lg border px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cambiar configuración
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
              <h2 className="text-lg font-semibold text-gray-900">Procesando contenido...</h2>
              <p className="mt-1 text-sm text-gray-500">
                La IA está generando {contentGoal === "COURSE" ? "el curso" : "el guión viral"}.
              </p>
              <div className="mt-6">
                <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full animate-pulse rounded-full bg-brand-600" style={{ width: "60%" }} />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Este proceso puede tardar entre 30 segundos y 2 minutos. No cierres esta página.
              </p>
            </>
          )}
        </div>
      )}

      {/* STEP 4: Done */}
      {!loadingVideo && step === "done" && document != null && (
        <div className="space-y-6">
          {/* Success banner */}
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">Contenido generado exitosamente</p>
              <p className="text-xs text-green-600">
                {document.contentGoal === "COURSE" ? "Curso" : "Guión viral"} con{" "}
                {document.modules?.length || 0} {document.contentGoal === "COURSE" ? "módulos" : "secciones"}.{" "}
                Duración estimada: {document.estimatedDuration || "N/A"}.
                {document.contentGoal === "COURSE" && " Documento guardado automáticamente en la base de conocimiento."}
              </p>
            </div>
          </div>

          {/* KB + Document notification */}
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Database className="h-5 w-5 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-800">Documentos generados</p>
              <p className="text-xs text-blue-600">
                Se generó un documento TXT en la base de conocimiento y los datos están listos para cargar en el módulo de generación de {document.contentGoal === "COURSE" ? "cursos" : "videos"}.
              </p>
            </div>
          </div>

          {/* Document preview - Editable */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-gray-900">{document.title}</h2>
            <p className="mb-2 text-sm text-gray-500">{document.description}</p>
            {document.targetAudience && (
              <p className="mb-2 text-xs text-gray-400">Público objetivo: {document.targetAudience}</p>
            )}

            {/* SEO info for viral */}
            {document.contentGoal === "VIRAL_VIDEO" && (
              <div className="mb-4 space-y-2">
                {document.hooks && document.hooks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Hooks para intro:</p>
                    <ul className="mt-1 space-y-1">
                      {document.hooks.map((h, i) => (
                        <li key={i} className="text-xs text-gray-600">- {h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {document.timestamps && document.timestamps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Timestamps sugeridos:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {document.timestamps.map((t, i) => (
                        <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {document.callToAction && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Call to Action:</p>
                    <p className="text-xs text-gray-600">{document.callToAction}</p>
                  </div>
                )}
                {document.thumbnailIdeas && document.thumbnailIdeas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Ideas para thumbnail:</p>
                    <ul className="mt-1 space-y-0.5">
                      {document.thumbnailIdeas.map((t, i) => (
                        <li key={i} className="text-xs text-gray-600">- {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* SEO Tags */}
            {document.seoTags && document.seoTags.length > 0 && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium text-gray-500">Tags SEO:</p>
                <div className="flex flex-wrap gap-1">
                  {document.seoTags.map((tag, i) => (
                    <span key={i} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modules with editable content */}
            {document.modules && document.modules.length > 0 ? (
              <>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  {document.contentGoal === "COURSE" ? "Módulos" : "Secciones"} ({document.modules.length}):
                </h3>
                <div className="space-y-3">
                  {document.modules.map((mod, i) => (
                    <div key={i} className="rounded-lg border bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-gray-900">{mod.title}</p>
                      </div>

                      {/* Editable content area */}
                      {mod.content && (
                        <div className="mb-2">
                          <p className="mb-1 text-xs font-medium text-gray-500">Contenido (editable):</p>
                          <textarea
                            defaultValue={mod.content}
                            rows={4}
                            className="w-full rounded-lg border border-gray-200 p-3 text-xs leading-relaxed text-gray-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            onChange={(e) => {
                              const updated = [...document.modules];
                              updated[i] = { ...updated[i], content: e.target.value };
                              setDocument({ ...document, modules: updated });
                            }}
                          />
                        </div>
                      )}

                      {mod.key_points && mod.key_points.length > 0 && (
                        <div className="mb-2">
                          <p className="mb-1 text-xs font-medium text-gray-500">Puntos clave:</p>
                          <ul className="space-y-0.5">
                            {mod.key_points.map((p, j) => (
                              <li key={j} className="text-xs text-gray-500">- {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mod.reflection_questions && mod.reflection_questions.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">Preguntas de reflexión:</p>
                          <ul className="space-y-0.5">
                            {mod.reflection_questions.map((q, j) => (
                              <li key={j} className="text-xs text-gray-500">- {q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {mod.visual_suggestions && mod.visual_suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-medium text-gray-500">Sugerencias visuales:</p>
                          <ul className="space-y-0.5">
                            {mod.visual_suggestions.map((v, j) => (
                              <li key={j} className="text-xs text-gray-500">- {v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No se generaron módulos.</p>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Siguiente paso</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleCreateCourse}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700"
              >
                {contentGoal === "COURSE" ? (
                  <><GraduationCap className="h-4 w-4" />Crear curso con estos datos</>
                ) : (
                  <><Youtube className="h-4 w-4" />Generar video viral con IA</>
                )}
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
              <p className="mb-3 text-xs font-medium text-gray-500">Reprocesar con otra extensión:</p>
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
