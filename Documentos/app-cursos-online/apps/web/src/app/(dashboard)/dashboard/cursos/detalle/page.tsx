"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { Course, CourseModule } from "@/types";
import { ArrowLeft, Play, CheckCircle2, Clock, Film } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const BASE_URL = API_URL.replace("/api/v1", "");

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  GENERATING: { label: "Generando...", color: "bg-yellow-100 text-yellow-700" },
  REVIEW: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  PUBLISHED: { label: "Publicado", color: "bg-brand-100 text-brand-700" },
  ARCHIVED: { label: "Archivado", color: "bg-red-100 text-red-700" },
};

const moduleStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-gray-100 text-gray-600" },
  GENERATING: { label: "Generando...", color: "bg-yellow-100 text-yellow-700" },
  DONE: { label: "Listo", color: "bg-green-100 text-green-700" },
  FAILED: { label: "Error", color: "bg-red-100 text-red-700" },
};

export default function CursoDetallePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { token } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<CourseModule | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    api
      .get<Course>(`/courses/${id}`, token)
      .then((c) => {
        setCourse(c);
        // Auto-select first module with video
        const firstWithVideo = c.modules?.find((m) => m.video_url);
        if (firstWithVideo) setActiveModule(firstWithVideo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return (
      <p className="py-12 text-center text-gray-500">Curso no encontrado</p>
    );
  }

  const st = statusLabels[course.status] || statusLabels.DRAFT;

  return (
    <div>
      <Link
        href="/dashboard/cursos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a mis cursos
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {course.category?.name}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${st.color}`}
          >
            {st.label}
          </span>
        </div>

        {course.description_short && (
          <p className="mt-3 text-gray-600">{course.description_short}</p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {course.modules?.length || 0}
            </p>
            <p className="text-xs text-gray-500">Módulos</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {course._count?.enrollments || 0}
            </p>
            <p className="text-xs text-gray-500">Inscritos</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-gray-900">
              {course.price_cents > 0
                ? `$${(course.price_cents / 100).toFixed(2)}`
                : "Gratis"}
            </p>
            <p className="text-xs text-gray-500">Precio</p>
          </div>
        </div>
      </div>

      {/* Video player + Module list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video player */}
        <div className="lg:col-span-2">
          {activeModule?.video_url ? (
            <div className="overflow-hidden rounded-xl border bg-black shadow-sm">
              <video
                key={activeModule.id}
                controls
                autoPlay
                className="aspect-video w-full"
                src={`${BASE_URL}${activeModule.video_url}`}
              >
                Tu navegador no soporta video HTML5.
              </video>
              <div className="bg-white p-4">
                <h3 className="font-semibold text-gray-900">
                  #{activeModule.order} — {activeModule.title}
                </h3>
                {activeModule.duration_seconds && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {Math.floor(activeModule.duration_seconds / 60)} min
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border bg-gray-100">
              <div className="text-center">
                <Film className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Selecciona un módulo para ver el video
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modules list */}
        <div className="rounded-xl border bg-white shadow-sm">
          <h2 className="border-b px-4 py-3 text-sm font-semibold text-gray-900">
            Módulos del curso
          </h2>
          <div className="divide-y">
            {course.modules?.map((mod) => {
              const ms =
                moduleStatusLabels[mod.status] || moduleStatusLabels.PENDING;
              const isActive = activeModule?.id === mod.id;

              return (
                <button
                  key={mod.id}
                  onClick={() => mod.video_url && setActiveModule(mod)}
                  disabled={!mod.video_url}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-brand-50"
                      : mod.video_url
                      ? "hover:bg-gray-50"
                      : "opacity-50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-brand-600 text-white"
                        : mod.status === "DONE"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {mod.status === "DONE" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      mod.order
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        isActive
                          ? "font-semibold text-brand-700"
                          : "text-gray-900"
                      }`}
                    >
                      {mod.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ms.color}`}
                      >
                        {ms.label}
                      </span>
                      {mod.duration_seconds && (
                        <span className="text-[10px] text-gray-400">
                          {Math.floor(mod.duration_seconds / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                  {mod.video_url && (
                    <Play className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
