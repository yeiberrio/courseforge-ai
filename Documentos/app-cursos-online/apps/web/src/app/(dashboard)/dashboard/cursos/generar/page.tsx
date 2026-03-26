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
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const BASE_URL = API_URL.replace("/api/v1", "");

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

type Step = "upload" | "configure" | "generating" | "done";

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

  // Config
  const [categoryId, setCategoryId] = useState("");
  const [voice, setVoice] = useState("es-CO-GonzaloNeural");
  const [slideStyle, setSlideStyle] = useState<"minimal" | "branded" | "dark">("dark");
  const [targetDuration, setTargetDuration] = useState(5);

  // Generation
  const [courseId, setCourseId] = useState("");
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get<Category[]>("/categories", token).then(setCategories).catch(() => {});
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/generation/analyze-document`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Error al analizar");
      }

      const data = await response.json();
      setFilePath(data.filePath);
      setStructure(data.structure);
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
          voice,
          slideStyle,
          targetDurationMin: targetDuration,
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
        Generar curso con IA
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Sube un documento y generaremos automáticamente los videos del curso
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
          {/* Structure preview */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              {structure.title}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {structure.description}
            </p>
            <p className="mb-4 text-xs text-gray-400">
              Público objetivo: {structure.targetAudience}
            </p>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Módulos detectados ({structure.modules.length}):
            </h3>
            <div className="space-y-2">
              {structure.modules.map((mod, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-gray-50 p-3"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {mod.title}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {mod.objectives.map((obj, j) => (
                      <li key={j} className="text-xs text-gray-500">
                        • {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

              <div>
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
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duración por módulo: {targetDuration} min
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
              <Sparkles className="h-4 w-4" /> Generar curso completo
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Generating */}
      {step === "generating" && (
        <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Generando tu curso...
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {progress?.message || "Iniciando generación..."}
          </p>

          {progress && progress.totalModules > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-500">
                  Módulo {progress.currentModule} de{" "}
                  {progress.totalModules}
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
            ¡Curso generado exitosamente!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Se generaron {progress?.totalModules || 0} módulos con video,
            audio y slides.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            El curso está en estado <strong>Revisión</strong> — revisa y
            aprueba cada módulo.
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
