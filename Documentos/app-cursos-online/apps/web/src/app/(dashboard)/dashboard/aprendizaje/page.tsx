"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { Enrollment } from "@/types";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AprendizajePage() {
  const { token } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get<Enrollment[]>("/enrollments", token)
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mi Aprendizaje</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No tienes inscripciones</h3>
          <p className="mt-1 text-sm text-gray-500">Explora el catálogo de cursos</p>
          <Link
            href="/cursos"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            Ver cursos
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="font-medium text-gray-900">{enrollment.course?.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                Inscrito el {new Date(enrollment.enrolled_at).toLocaleDateString("es")}
              </p>
              <Link
                href={`/dashboard/aprendizaje/curso?id=${enrollment.course_id}`}
                className="mt-3 inline-block rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
              >
                Continuar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
