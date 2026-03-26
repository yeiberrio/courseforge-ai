"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import Link from "next/link";
import type { Course, PaginatedResponse } from "@/types";
import { BookOpen, Plus, Eye } from "lucide-react";

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  GENERATING: { label: "Generando", color: "bg-yellow-100 text-yellow-700" },
  REVIEW: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Aprobado", color: "bg-green-100 text-green-700" },
  PUBLISHED: { label: "Publicado", color: "bg-brand-100 text-brand-700" },
  ARCHIVED: { label: "Archivado", color: "bg-red-100 text-red-700" },
};

export default function CursosPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get<PaginatedResponse<Course>>("/courses/my-courses", token)
      .then((res) => {
        setCourses(res.data);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-sm text-gray-500">{total} cursos en total</p>
        </div>
        <Link
          href="/dashboard/cursos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Nuevo curso
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No tienes cursos</h3>
          <p className="mt-1 text-sm text-gray-500">Crea tu primer curso con IA</p>
          <Link
            href="/dashboard/cursos/nuevo"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Crear curso
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="truncate font-medium text-gray-900">{course.title}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabels[course.status]?.color || "bg-gray-100"}`}>
                    {statusLabels[course.status]?.label || course.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {course.category?.name} · {course._count?.modules || 0} módulos · {course._count?.enrollments || 0} inscritos
                </p>
              </div>
              <Link
                href={`/dashboard/cursos/detalle?id=${course.id}`}
                className="ml-4 flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" /> Ver
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
