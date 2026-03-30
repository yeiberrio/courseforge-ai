"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { Category } from "@/types";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Play,
  Volume2,
  Palette,
  Video,
  User,
  Monitor,
  Layout,
  PictureInPicture,
  Mic,
  Newspaper,
  PenTool,
} from "lucide-react";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace("/api/v1", "");

interface CourseStructure {
  title: string;
  description: string;
  targetAudience: string;
  modules: { title: string; objectives: string[] }[];
}

interface GenerationProgress {
  courseId: string;
  status: string;
  currentModule: number;
  totalModules: number;
  message: string;
}

interface DIDAvatar {
  id: string;
  name: string;
  gender: string;
  preview: string;
}

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  type: string;
}

interface HeyGenVoice {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  emotion_support: boolean;
}

interface SceneTemplate {
  id: string;
  name: string;
  description: string;
}

type Step = "upload" | "configure" | "generating" | "done";
type VideoType = "slides" | "avatar" | "heygen";

export default function GenerarCursoPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // Analysis result
  const [filePath, setFilePath] = useState("");
  const [structure, setStructure] = useState<CourseStructure | null>(null);

  // Content goal
  const [contentGoal, setContentGoal] = useState<"course" | "viral_video">("course");

  // Config
  const [categoryId, setCategoryId] = useState("");
  const [voice, setVoice] = useState("es-CO-GonzaloNeural");
  const [slideStyle, setSlideStyle] = useState<"minimal" | "branded" | "dark">("dark");
  const [targetDuration, setTargetDuration] = useState(5);
  const [videoType, setVideoType] = useState<VideoType>("slides");
  const [avatarId, setAvatarId] = useState("");
  const [avatars, setAvatars] = useState<DIDAvatar[]>([]);
  const [avatarAvailable, setAvatarAvailable] = useState(false);

  // HeyGen config
  const [heygenAvatars, setHeygenAvatars] = useState<HeyGenAvatar[]>([]);
  const [heygenAvailable, setHeygenAvailable] = useState(false);
  const [heygenAvatarId, setHeygenAvatarId] = useState("");
  const [heygenAvatarType, setHeygenAvatarType] = useState<"stock" | "instant" | "photo">("stock");
  const [heygenVoices, setHeygenVoices] = useState<HeyGenVoice[]>([]);
  const [heygenVoiceId, setHeygenVoiceId] = useState("");
  const [heygenVoiceSource, setHeygenVoiceSource] = useState<"heygen" | "edge_tts">("heygen");
  const [sceneTemplate, setSceneTemplate] = useState<string>("talking_head");
  const [sceneTemplates, setSceneTemplates] = useState<SceneTemplate[]>([]);
  const [pipPosition, setPipPosition] = useState("bottom_right");
  const [heygenBackground, setHeygenBackground] = useState("studio");
  const [heygenEmotion, setHeygenEmotion] = useState<string>("neutral");
  const [heygenSpeed, setHeygenSpeed] = useState(1.0);

  // Generation
  const [courseId, setCourseId] = useState("");
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<Category[]>("/categories", token).then(setCategories).catch(() => {});
    api.get<{ available: boolean; avatars: DIDAvatar[] }>("/generation/avatars", token)
      .then((data) => {
        setAvatarAvailable(data.available);
        setAvatars(data.avatars);
        if (data.avatars.length > 0) setAvatarId(data.avatars[0].id);
      })
      .catch(() => {});

    // Load HeyGen data
    api.get<{ available: boolean; avatars: HeyGenAvatar[] }>("/generation/heygen/avatars", token)
      .then((data) => {
        setHeygenAvailable(data.available);
        setHeygenAvatars(data.avatars);
        if (data.avatars.length > 0) setHeygenAvatarId(data.avatars[0].avatar_id);
      })
      .catch(() => {});
    api.get<{ voices: HeyGenVoice[] }>("/generation/heygen/voices?language=es", token)
      .then((data) => {
        setHeygenVoices(data.voices);
        if (data.voices.length > 0) setHeygenVoiceId(data.voices[0].voice_id);
      })
      .catch(() => {});
    api.get<{ templates: SceneTemplate[] }>("/generation/heygen/templates", token)
      .then((data) => setSceneTemplates(data.templates))
      .catch(() => {});
  }, [token]);

  // Poll progress
  useEffect(() => {
    if (step !== "generating" || !courseId || !token) return;

    const interval = setInterval(async () => {
      try {
        const p = await api.get<GenerationProgress>(
          `/generation/progress/${courseId}`,
          token
        );
        setProgress(p);
        if (p.status === "done" || p.status === "failed") {
          clearInterval(interval);
          if (p.status === "done") setStep("done");
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [step, courseId, token]);

  const handleFileUpload = async () => {
    if (!file || !token) return;
    setError("");
    setAnalyzing(true);

    try {
      const data = await api.uploadFile(
        "/generation/analyze-document",
        file,
        token,
      );
      setFilePath((data as any).filePath);
      setStructure((data as any).structure);
      setStep("configure");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!token || !filePath || !categoryId) return;
    setError("");

    try {
      const result = await api.post<any>(
        "/generation/create-course",
        {
          filePath,
          categoryId,
          contentGoal,
          voice: videoType === "heygen" && heygenVoiceSource === "heygen" ? undefined : voice,
          slideStyle,
          targetDurationMin: targetDuration,
          videoType,
          ...(videoType === "avatar" && avatarId ? { avatarId } : {}),
          ...(videoType === "heygen"
            ? {
                heygenConfig: {
                  avatarType: heygenAvatarType,
                  avatarId: heygenAvatarId,
                  avatarGender: heygenAvatars.find(a => a.avatar_id === heygenAvatarId)?.gender === "male" ? "male" : "female",
                  sceneTemplate,
                  pipPosition: sceneTemplate === "pip" ? pipPosition : undefined,
                  background: heygenBackground,
                  voiceSource: heygenVoiceSource,
                  heygenVoiceId: heygenVoiceSource === "heygen" ? heygenVoiceId : undefined,
                  emotion: heygenEmotion,
                  speed: heygenSpeed,
                },
              }
            : {}),
        },
        token
      );
      setCourseId(result.course.id);
      setStep("generating");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const progressPct =
    progress && progress.totalModules > 0
      ? Math.round((progress.currentModule / progress.totalModules) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.push("/dashboard/cursos")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Mis cursos
      </button>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {contentGoal === "viral_video" ? "Generar video viral con IA" : "Generar curso con IA"}
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        {contentGoal === "viral_video"
          ? "Sube un documento y generaremos un video viral optimizado para YouTube"
          : "Sube un documento y generaremos automaticamente los videos del curso"}
      </p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {["Subir documento", "Configurar", "Generando", "Listo"].map(
          (label, i) => {
            const steps: Step[] = ["upload", "configure", "generating", "done"];
            const isActive = steps.indexOf(step) >= i;
            return (
              <div key={i} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:block ${
                    isActive ? "text-brand-700 font-medium" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
                {i < 3 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      steps.indexOf(step) > i ? "bg-brand-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">
              Sube tu documento
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              PDF, DOCX, TXT o MD — máximo 20MB
            </p>
          </div>

          <div className="mt-6">
            <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-brand-400 hover:bg-brand-50/50">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-brand-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Click para seleccionar archivo
                </p>
              )}
            </label>
          </div>

          <button
            onClick={handleFileUpload}
            disabled={!file || analyzing}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analizando
                documento...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Analizar documento
              </>
            )}
          </button>
        </div>
      )}

      {/* STEP 2: Configure */}
      {step === "configure" && structure && (
        <div className="space-y-6">
          {/* Content Goal Selector */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Tipo de contenido
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setContentGoal("course")}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  contentGoal === "course"
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <FileText className="mb-2 h-8 w-8 text-brand-600" />
                <p className="text-sm font-semibold text-gray-900">Curso completo</p>
                <p className="mt-1 text-xs text-gray-500">
                  Multiples modulos con videos independientes. Ideal para plataformas educativas.
                </p>
                {contentGoal === "course" && structure.modules.length > 0 && (
                  <span className="mt-2 inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {structure.modules.length} modulos
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setContentGoal("viral_video")}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  contentGoal === "viral_video"
                    ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Play className="mb-2 h-8 w-8 text-red-500" />
                <p className="text-sm font-semibold text-gray-900">Video viral</p>
                <p className="mt-1 text-xs text-gray-500">
                  Un solo video optimizado para YouTube con hook, desarrollo y CTA.
                </p>
                {contentGoal === "viral_video" && (
                  <span className="mt-2 inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    1 video completo
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Structure preview */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              {structure.title}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {structure.description}
            </p>
            <p className="mb-4 text-xs text-gray-400">
              Publico objetivo: {structure.targetAudience}
            </p>
            {contentGoal === "course" ? (
              <>
                <h3 className="mb-2 text-sm font-medium text-gray-700">
                  Modulos detectados ({structure.modules.length}):
                </h3>
                <div className="space-y-2">
                  {structure.modules.map((mod, i) => (
                    <div key={i} className="rounded-lg border bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{mod.title}</p>
                      <ul className="mt-1 space-y-0.5">
                        {mod.objectives.map((obj, j) => (
                          <li key={j} className="text-xs text-gray-500">• {obj}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-gray-900">
                  Se generara un unico video viral
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Todo el contenido del documento se condensara en un solo video con estructura de hook + desarrollo + CTA, optimizado para engagement en YouTube.
                </p>
              </div>
            )}
          </div>

          {/* Config form */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Configuración de generación
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Categoría
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  required
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Type */}
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Video className="h-4 w-4" /> Tipo de video
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setVideoType("slides")}
                    className={`rounded-lg border-2 p-4 text-center transition ${
                      videoType === "slides"
                        ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Palette className="mx-auto mb-2 h-8 w-8 text-brand-600" />
                    <p className="text-sm font-medium text-gray-900">Presentación</p>
                    <p className="text-xs text-gray-500">Slides + voz narrada</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType("avatar")}
                    className={`rounded-lg border-2 p-4 text-center transition ${
                      videoType === "avatar"
                        ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                        : "border-gray-200 hover:border-gray-300"
                    } ${!avatarAvailable ? "opacity-50" : ""}`}
                    disabled={!avatarAvailable}
                  >
                    <User className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
                    <p className="text-sm font-medium text-gray-900">Avatar D-ID</p>
                    <p className="text-xs text-gray-500">
                      {avatarAvailable ? "Avatar básico" : "Requiere API Key D-ID"}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType("heygen")}
                    className={`rounded-lg border-2 p-4 text-center transition ${
                      videoType === "heygen"
                        ? "border-purple-600 bg-purple-50 ring-2 ring-purple-200"
                        : "border-gray-200 hover:border-gray-300"
                    } ${!heygenAvailable ? "opacity-50" : ""}`}
                    disabled={!heygenAvailable}
                  >
                    <Monitor className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                    <p className="text-sm font-medium text-gray-900">HeyGen</p>
                    <p className="text-xs text-gray-500">
                      {heygenAvailable ? "Avatar avanzado + escenas" : "Requiere API Key HeyGen"}
                    </p>
                  </button>
                </div>
              </div>

              {/* D-ID Avatar Selection */}
              {videoType === "avatar" && avatars.length > 0 && (
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4" /> Seleccionar avatar D-ID
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {avatars.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatarId(av.id)}
                        className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                          avatarId === av.id
                            ? "border-brand-600 bg-brand-50 ring-2 ring-brand-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{av.name}</p>
                        <p className="text-xs text-gray-500">{av.preview}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* HeyGen Configuration */}
              {videoType === "heygen" && (
                <div className="space-y-4 rounded-lg border-2 border-purple-200 bg-purple-50/50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                    <Monitor className="h-4 w-4" /> Configuración HeyGen
                  </h4>

                  {/* HeyGen Avatar Selection */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Avatar</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {heygenAvatars.map((av) => (
                        <button
                          key={av.avatar_id}
                          type="button"
                          onClick={() => {
                            setHeygenAvatarId(av.avatar_id);
                            setHeygenAvatarType(av.type as "stock" | "instant" | "photo");
                          }}
                          className={`rounded-lg border-2 p-2 text-center text-xs transition ${
                            heygenAvatarId === av.avatar_id
                              ? "border-purple-600 bg-purple-100 ring-2 ring-purple-200"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          {av.preview_image_url && (
                            <img
                              src={av.preview_image_url}
                              alt={av.avatar_name}
                              className="mx-auto mb-1 h-16 w-16 rounded-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <p className="font-medium text-gray-900">{av.avatar_name}</p>
                          <p className="text-gray-500">{av.gender} - {av.type}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scene Template */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Plantilla de escena</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {sceneTemplates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSceneTemplate(t.id)}
                          className={`rounded-lg border-2 p-3 text-left text-xs transition ${
                            sceneTemplate === t.id
                              ? "border-purple-600 bg-purple-100 ring-1 ring-purple-200"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <p className="font-medium text-gray-900">{t.name}</p>
                          <p className="mt-0.5 text-gray-500">{t.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PiP Position (only for pip template) */}
                  {sceneTemplate === "pip" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Posición del avatar</label>
                      <select
                        value={pipPosition}
                        onChange={(e) => setPipPosition(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="bottom_right">Abajo derecha</option>
                        <option value="bottom_left">Abajo izquierda</option>
                        <option value="top_right">Arriba derecha</option>
                        <option value="top_left">Arriba izquierda</option>
                      </select>
                    </div>
                  )}

                  {/* Voice Source */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Fuente de voz</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHeygenVoiceSource("heygen")}
                        className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                          heygenVoiceSource === "heygen"
                            ? "border-purple-600 bg-purple-100"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <Mic className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                        <p className="font-medium">Voces HeyGen</p>
                        <p className="text-xs text-gray-500">300+ voces nativas</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeygenVoiceSource("edge_tts")}
                        className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                          heygenVoiceSource === "edge_tts"
                            ? "border-purple-600 bg-purple-100"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <Volume2 className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                        <p className="font-medium">Edge TTS</p>
                        <p className="text-xs text-gray-500">Microsoft (gratis)</p>
                      </button>
                    </div>
                  </div>

                  {/* HeyGen Voice Selection */}
                  {heygenVoiceSource === "heygen" && heygenVoices.length > 0 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Voz HeyGen</label>
                      <select
                        value={heygenVoiceId}
                        onChange={(e) => setHeygenVoiceId(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        {heygenVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.name} ({v.language}, {v.gender})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Background */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Fondo</label>
                    <select
                      value={heygenBackground}
                      onChange={(e) => setHeygenBackground(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="studio">Estudio (oscuro)</option>
                      <option value="office">Oficina</option>
                      <option value="classroom">Aula</option>
                      <option value="gradient">Gradiente</option>
                      <option value="white">Blanco</option>
                    </select>
                  </div>

                  {/* Emotion & Speed */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Emoción</label>
                      <select
                        value={heygenEmotion}
                        onChange={(e) => setHeygenEmotion(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="neutral">Neutral</option>
                        <option value="enthusiastic">Entusiasta</option>
                        <option value="serious">Serio</option>
                        <option value="warm">Cálido</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Velocidad: {heygenSpeed}x
                      </label>
                      <input
                        type="range"
                        min={0.75}
                        max={1.5}
                        step={0.05}
                        value={heygenSpeed}
                        onChange={(e) => setHeygenSpeed(parseFloat(e.target.value))}
                        className="w-full accent-purple-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0.75x</span>
                        <span>1.5x</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Volume2 className="h-4 w-4" /> Voz
                </label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="es-CO-GonzaloNeural">
                    Gonzalo (Colombia, masculino)
                  </option>
                  <option value="es-CO-SalomeNeural">
                    Salomé (Colombia, femenino)
                  </option>
                  <option value="es-MX-JorgeNeural">
                    Jorge (México, masculino)
                  </option>
                  <option value="es-MX-DaliaNeural">
                    Dalia (México, femenino)
                  </option>
                  <option value="es-ES-AlvaroNeural">
                    Álvaro (España, masculino)
                  </option>
                  <option value="es-ES-ElviraNeural">
                    Elvira (España, femenino)
                  </option>
                </select>
              </div>

              {videoType === "slides" && <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Palette className="h-4 w-4" /> Estilo de slides
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: "minimal",
                        label: "Minimal",
                        desc: "Fondo blanco",
                        bg: "bg-white border-2",
                      },
                      {
                        id: "branded",
                        label: "Branded",
                        desc: "Fondo azul claro",
                        bg: "bg-indigo-50 border-2",
                      },
                      {
                        id: "dark",
                        label: "Dark",
                        desc: "Fondo oscuro",
                        bg: "bg-gray-900 border-2 text-white",
                      },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlideStyle(s.id)}
                      className={`rounded-lg p-3 text-center text-sm transition ${
                        s.bg
                      } ${
                        slideStyle === s.id
                          ? "border-brand-600 ring-2 ring-brand-200"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs opacity-60">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {contentGoal === "viral_video" ? "Duracion del video" : "Duracion por modulo"}: {targetDuration} min
                </label>
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={targetDuration}
                  onChange={(e) =>
                    setTargetDuration(parseInt(e.target.value))
                  }
                  className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2 min</span>
                  <span>15 min</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!categoryId}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> {contentGoal === "viral_video" ? "Generar video viral" : "Generar curso completo"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Generating */}
      {step === "generating" && (
        <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {contentGoal === "viral_video" ? "Generando tu video viral..." : "Generando tu curso..."}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {progress?.message || "Iniciando generacion..."}
          </p>

          {progress && progress.totalModules > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  {contentGoal === "viral_video"
                    ? "Generando video..."
                    : `Modulo ${progress.currentModule} de ${progress.totalModules}`}
                </span>
                <span className="font-medium text-brand-600">
                  {progressPct}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400">
            Este proceso puede tardar varios minutos. No cierres esta
            página.
          </p>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === "done" && (
        <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900">
            {contentGoal === "viral_video" ? "Video viral generado exitosamente!" : "Curso generado exitosamente!"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {contentGoal === "viral_video"
              ? "Se genero 1 video viral con audio y slides, listo para subir a YouTube."
              : `Se generaron ${progress?.totalModules || 0} modulos con video, audio y slides.`}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {contentGoal === "viral_video"
              ? "El video esta en estado Revision — revisalo antes de publicar."
              : <>El curso esta en estado <strong>Revision</strong> — revisa y aprueba cada modulo.</>}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() =>
                router.push(`/dashboard/cursos/detalle?id=${courseId}`)
              }
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Play className="h-4 w-4" /> Ver curso y videos
            </button>
            <button
              onClick={() => router.push("/dashboard/cursos")}
              className="rounded-lg border px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Mis cursos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
